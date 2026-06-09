'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, CheckCircle, Trash2, ExternalLink, BookOpen, Plus, RotateCcw, Barcode, AlertCircle, X } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { ApiResponse } from '@/types';
import { EmptyState } from '@/components/ui/StateDisplay';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useSchoolData } from '@/hooks/useSchoolData';

// ── Types ──────────────────────────────────────────────────────────────────

interface LibraryItem {
  id: number; title: string; description?: string; file_url: string;
  course?: string; class?: string; uploaded_by: string; approved: boolean; created_at: string;
}
interface Book { id: number; title: string; author: string; isbn?: string; barcode?: string; category?: string; copies: number; available: number; }
interface Borrow {
  id: number; borrowedAt: string; dueDate: string; returnedAt?: string; fine: number; finePaid: boolean; overdueDays: number;
  book: Book; student: { user: { uniqueId: string; firstName: string; lastName: string } };
}

type Tab = 'resources' | 'catalog' | 'borrows';

// ── Barcode scanner hook (ZXing) ─────────────────────────────────────────

function BarcodeScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let reader: any;
    import('@zxing/browser').then(({ BrowserMultiFormatReader }) => {
      reader = new BrowserMultiFormatReader();
      reader.decodeFromVideoDevice(undefined, videoRef.current!, (result: any, err: any) => {
        if (result) { onDetect(result.getText()); reader.reset(); }
        if (err && err.name !== 'NotFoundException') setError('Camera error: ' + err.message);
      });
    }).catch(() => setError('Failed to load scanner'));
    return () => { if (reader) try { reader.reset(); } catch {} };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">Scan Barcode</span>
          <button onClick={onClose}><X size={18} className="text-gray-500" /></button>
        </div>
        {error ? (
          <div className="p-6 text-center text-red-500 text-sm">{error}</div>
        ) : (
          <video ref={videoRef} className="w-full h-64 object-cover bg-black" />
        )}
        <div className="p-4">
          <p className="text-sm text-gray-500 text-center mb-2">Or enter manually:</p>
          <div className="flex gap-2">
            <input id="manual-barcode" placeholder="Enter barcode"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <button onClick={() => {
              const val = (document.getElementById('manual-barcode') as HTMLInputElement)?.value.trim();
              if (val) onDetect(val);
            }} className="px-3 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium">Use</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>('resources');

  // resources tab
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [resSearch, setResSearch] = useState('');
  const [resLoading, setResLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  // catalog tab
  const [books, setBooks] = useState<Book[]>([]);
  const [bookSearch, setBookSearch] = useState('');
  const [bookLoading, setBookLoading] = useState(false);
  const [showBookForm, setShowBookForm] = useState(false);
  const [bookForm, setBookForm] = useState({ title: '', author: '', isbn: '', barcode: '', category: '', copies: 1 });
  const [scanActive, setScanActive] = useState(false);
  const [scanTarget, setScanTarget] = useState<'catalog' | 'borrow'>('catalog');
  const [confirmBookId, setConfirmBookId] = useState<number | null>(null);

  // borrows tab
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [borrowStatus, setBorrowStatus] = useState('active');
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [borrowSearch, setBorrowSearch] = useState('');
  const [showBorrowForm, setShowBorrowForm] = useState(false);
  const [borrowForm, setBorrowForm] = useState({ bookIdOrBarcode: '', studentUniqueId: '', dueDays: 14 });
  const [borrowClass, setBorrowClass] = useState('');
  const [studentOptions, setStudentOptions] = useState<{ uniqueId: string; firstName: string; lastName: string }[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(false);

  const toast = useToast();
  const { classes } = useSchoolData();

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadResources = useCallback(() => {
    setResLoading(true);
    api.get<ApiResponse<{ library: LibraryItem[] }>>(endpoints.admin.library)
      .then(r => setItems(r.data.library ?? []))
      .catch(() => toast.error('Failed to load resources'))
      .finally(() => setResLoading(false));
  }, []);

  const loadBooks = useCallback(() => {
    setBookLoading(true);
    api.get<any>(endpoints.admin.books, bookSearch ? { search: bookSearch } : {})
      .then(r => setBooks(r.data ?? []))
      .catch(() => toast.error('Failed to load books'))
      .finally(() => setBookLoading(false));
  }, [bookSearch]);

  const loadBorrows = useCallback(() => {
    setBorrowLoading(true);
    api.get<any>(endpoints.admin.bookBorrows, { status: borrowStatus })
      .then(r => setBorrows(r.data ?? []))
      .catch(() => toast.error('Failed to load borrows'))
      .finally(() => setBorrowLoading(false));
  }, [borrowStatus]);

  useEffect(() => { loadResources(); }, [loadResources]);
  useEffect(() => { if (tab === 'catalog') loadBooks(); }, [tab, loadBooks]);
  useEffect(() => { if (tab === 'borrows') loadBorrows(); }, [tab, loadBorrows]);

  useEffect(() => {
    if (!showBorrowForm || !borrowClass) { setStudentOptions([]); return; }
    setStudentsLoading(true);
    api.get<any>(endpoints.admin.students, { class: borrowClass, search: studentSearch || undefined, per_page: 50 })
      .then(r => setStudentOptions((r.data ?? []).map((s: any) => ({ uniqueId: s.student_id ?? s.uniqueId, firstName: s.firstname ?? s.firstName, lastName: s.lastname ?? s.lastName }))))
      .catch(() => {})
      .finally(() => setStudentsLoading(false));
  }, [showBorrowForm, borrowClass, studentSearch]);

  // ── Barcode scan handler ──────────────────────────────────────────────────

  const onScanDetect = (code: string) => {
    setScanActive(false);
    if (scanTarget === 'catalog') setBookForm(f => ({ ...f, barcode: code }));
    if (scanTarget === 'borrow') setBorrowForm(f => ({ ...f, bookIdOrBarcode: code }));
    toast.success(`Scanned: ${code}`);
  };

  // ── Resource actions ──────────────────────────────────────────────────────

  const approveResource = async (id: number) => {
    try { await api.put(`${endpoints.admin.library}/${id}/approve`, {}); toast.success('Approved'); loadResources(); }
    catch { toast.error('Failed to approve'); }
  };

  const removeResource = async () => {
    if (!confirmId) return;
    try { await api.delete(`${endpoints.admin.library}/${confirmId}`); toast.success('Deleted'); loadResources(); }
    catch { toast.error('Failed to delete'); }
    finally { setConfirmId(null); }
  };

  // ── Book catalog actions ──────────────────────────────────────────────────

  const createBook = async () => {
    if (!bookForm.title.trim() || !bookForm.author.trim()) return toast.error('Title and author required');
    try {
      await api.post(endpoints.admin.books, { ...bookForm, copies: Number(bookForm.copies) });
      toast.success('Book added');
      setShowBookForm(false);
      setBookForm({ title: '', author: '', isbn: '', barcode: '', category: '', copies: 1 });
      loadBooks();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to add book'); }
  };

  const deleteBook = async () => {
    if (!confirmBookId) return;
    try { await api.delete(endpoints.admin.book(String(confirmBookId))); toast.success('Book deleted'); loadBooks(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to delete'); }
    finally { setConfirmBookId(null); }
  };

  // ── Borrow actions ────────────────────────────────────────────────────────

  const doBorrow = async () => {
    if (!borrowForm.bookIdOrBarcode || !borrowForm.studentUniqueId) return toast.error('Book and student required');
    try {
      await api.post(endpoints.admin.bookBorrows, borrowForm);
      toast.success('Book borrowed');
      setShowBorrowForm(false);
      setBorrowForm({ bookIdOrBarcode: '', studentUniqueId: '', dueDays: 14 });
      loadBorrows();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to borrow'); }
  };

  const doReturn = async (id: number) => {
    try {
      const r = await api.post<any>(endpoints.admin.bookReturn(String(id)), {});
      toast.success(r.message ?? 'Returned');
      loadBorrows();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to return'); }
  };

  const doFinePaid = async (id: number) => {
    try { await api.post(endpoints.admin.bookFinePaid(String(id)), {}); toast.success('Fine marked paid'); loadBorrows(); }
    catch { toast.error('Failed'); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const filteredRes = items.filter(i => !resSearch || `${i.title} ${i.course} ${i.class} ${i.uploaded_by}`.toLowerCase().includes(resSearch.toLowerCase()));
  const filteredBooks = books.filter(b => !bookSearch || `${b.title} ${b.author} ${b.isbn} ${b.barcode}`.toLowerCase().includes(bookSearch.toLowerCase()));
  const filteredBorrows = borrows.filter(b => !borrowSearch || `${b.book.title} ${b.student.user.firstName} ${b.student.user.lastName} ${b.student.user.uniqueId}`.toLowerCase().includes(borrowSearch.toLowerCase()));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Library</h1>

      <div className="flex gap-2 flex-wrap">
        {([['resources', 'Resources'], ['catalog', 'Book Catalog'], ['borrows', 'Borrows & Fines']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === key ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Resources tab ───────────────────────────────────────────────── */}
      {tab === 'resources' && (
        <>
          <div className="bg-white rounded-2xl card shadow-sm p-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={resSearch} onChange={e => setResSearch(e.target.value)}
                placeholder="Search resources..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Title', 'Course', 'Class', 'Uploaded By', 'Date', 'Status', 'Actions'].map(h => (
                      <th key={h} className="p-3 text-left font-medium text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {resLoading ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                  )) : filteredRes.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState icon={BookOpen} message="No items found." card={false} /></td></tr>
                  ) : filteredRes.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-3"><div className="font-medium text-gray-900">{item.title}</div>{item.description && <div className="text-gray-400 text-xs truncate max-w-48">{item.description}</div>}</td>
                      <td className="p-3 text-gray-600">{item.course ?? '—'}</td>
                      <td className="p-3 text-gray-600">{item.class ?? '—'}</td>
                      <td className="p-3 text-gray-600">{item.uploaded_by}</td>
                      <td className="p-3 text-gray-500 text-xs">{new Date(item.created_at).toLocaleDateString()}</td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.approved ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.approved ? 'Approved' : 'Pending'}</span></td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800"><ExternalLink size={16} /></a>
                          {!item.approved && <button onClick={() => approveResource(item.id)} className="text-blue-600 hover:text-blue-800"><CheckCircle size={16} /></button>}
                          <button onClick={() => setConfirmId(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {confirmId !== null && <ConfirmModal onConfirm={removeResource} onCancel={() => setConfirmId(null)} />}
        </>
      )}

      {/* ── Catalog tab ─────────────────────────────────────────────────── */}
      {tab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={bookSearch} onChange={e => setBookSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadBooks()}
                placeholder="Search title, author, ISBN, barcode…" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <button onClick={() => { setScanTarget('catalog'); setScanActive(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">
              <Barcode size={15} /> Scan
            </button>
            <button onClick={() => setShowBookForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">
              <Plus size={15} /> Add Book
            </button>
          </div>

          {showBookForm && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <h2 className="font-semibold text-gray-900">New Book</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[['title', 'Title *'], ['author', 'Author *'], ['isbn', 'ISBN'], ['category', 'Category']].map(([k, ph]) => (
                  <input key={k} value={(bookForm as any)[k]} onChange={e => setBookForm(f => ({ ...f, [k]: e.target.value }))}
                    placeholder={ph} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                ))}
                <div className="flex gap-2">
                  <input value={bookForm.barcode} onChange={e => setBookForm(f => ({ ...f, barcode: e.target.value }))}
                    placeholder="Barcode" className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  <button onClick={() => { setScanTarget('catalog'); setScanActive(true); }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm"><Barcode size={15} /></button>
                </div>
                <input type="number" min={1} value={bookForm.copies} onChange={e => setBookForm(f => ({ ...f, copies: Number(e.target.value) }))}
                  placeholder="Copies" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={createBook} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">Add</button>
                <button onClick={() => setShowBookForm(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Title', 'Author', 'ISBN', 'Barcode', 'Category', 'Copies', 'Available', ''].map(h => <th key={h} className="p-3 text-left font-medium text-gray-600">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bookLoading ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={8} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                  )) : filteredBooks.length === 0 ? (
                    <tr><td colSpan={8}><EmptyState icon={BookOpen} message="No books in catalog." card={false} /></td></tr>
                  ) : filteredBooks.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900">{b.title}</td>
                      <td className="p-3 text-gray-600">{b.author}</td>
                      <td className="p-3 text-gray-500 text-xs">{b.isbn ?? '—'}</td>
                      <td className="p-3 text-gray-500 text-xs font-mono">{b.barcode ?? '—'}</td>
                      <td className="p-3 text-gray-500">{b.category ?? '—'}</td>
                      <td className="p-3 text-center">{b.copies}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.available > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{b.available}</span>
                      </td>
                      <td className="p-3">
                        <button onClick={() => setConfirmBookId(b.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {confirmBookId !== null && <ConfirmModal onConfirm={deleteBook} onCancel={() => setConfirmBookId(null)} />}
        </div>
      )}

      {/* ── Borrows tab ──────────────────────────────────────────────────── */}
      {tab === 'borrows' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-2">
              {(['active', 'overdue', 'returned', ''] as const).map(s => (
                <button key={s} onClick={() => setBorrowStatus(s)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${borrowStatus === s ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'}`}>
                  {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={borrowSearch} onChange={e => setBorrowSearch(e.target.value)}
                placeholder="Search…" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <button onClick={() => { setScanTarget('borrow'); setScanActive(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">
              <Barcode size={15} /> Scan Book
            </button>
            <button onClick={() => setShowBorrowForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">
              <Plus size={15} /> Borrow
            </button>
          </div>

          {showBorrowForm && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <h2 className="font-semibold text-gray-900">Issue Book</h2>
              <div className="flex gap-2">
                <input value={borrowForm.bookIdOrBarcode} onChange={e => setBorrowForm(f => ({ ...f, bookIdOrBarcode: e.target.value }))}
                  placeholder="Book ID or barcode" className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <button onClick={() => { setScanTarget('borrow'); setScanActive(true); }} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm"><Barcode size={15} /></button>
              </div>
              <div className="flex gap-2">
                <select value={borrowClass} onChange={e => { setBorrowClass(e.target.value); setBorrowForm(f => ({ ...f, studentUniqueId: '' })); setStudentSearch(''); }}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Select class…</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" min={1} max={60} value={borrowForm.dueDays} onChange={e => setBorrowForm(f => ({ ...f, dueDays: Number(e.target.value) }))}
                  className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <span className="self-center text-sm text-gray-500">days</span>
              </div>
              {borrowClass && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                      placeholder="Search student…" className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {studentsLoading ? <div className="p-3 text-sm text-gray-400 text-center">Loading…</div>
                      : studentOptions.length === 0 ? <div className="p-3 text-sm text-gray-400 text-center">No students</div>
                      : studentOptions.map(s => (
                        <button key={s.uniqueId} onClick={() => setBorrowForm(f => ({ ...f, studentUniqueId: s.uniqueId }))}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${borrowForm.studentUniqueId === s.uniqueId ? 'bg-purple-50 text-purple-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                          {s.firstName} {s.lastName} <span className="text-gray-400 text-xs">{s.uniqueId}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={doBorrow} disabled={!borrowForm.bookIdOrBarcode || !borrowForm.studentUniqueId}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium">Issue</button>
                <button onClick={() => setShowBorrowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Book', 'Student', 'Borrowed', 'Due', 'Returned', 'Fine', 'Actions'].map(h => <th key={h} className="p-3 text-left font-medium text-gray-600">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {borrowLoading ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                  )) : filteredBorrows.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState icon={BookOpen} message="No borrow records." card={false} /></td></tr>
                  ) : filteredBorrows.map(b => {
                    const overdue = !b.returnedAt && new Date(b.dueDate) < new Date();
                    return (
                      <tr key={b.id} className={`hover:bg-gray-50 ${overdue ? 'bg-red-50/40' : ''}`}>
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{b.book.title}</div>
                          <div className="text-gray-400 text-xs">{b.book.author}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-800">{b.student.user.firstName} {b.student.user.lastName}</div>
                          <div className="text-gray-400 text-xs">{b.student.user.uniqueId}</div>
                        </td>
                        <td className="p-3 text-gray-500 text-xs">{new Date(b.borrowedAt).toLocaleDateString()}</td>
                        <td className="p-3 text-xs">
                          <span className={overdue ? 'text-red-600 font-medium' : 'text-gray-500'}>{new Date(b.dueDate).toLocaleDateString()}{overdue && <> · <AlertCircle size={11} className="inline" /> {b.overdueDays}d</>}</span>
                        </td>
                        <td className="p-3 text-gray-500 text-xs">{b.returnedAt ? new Date(b.returnedAt).toLocaleDateString() : '—'}</td>
                        <td className="p-3">
                          {Number(b.fine) > 0 ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.finePaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              ₦{Number(b.fine).toLocaleString()} {b.finePaid ? '✓' : ''}
                            </span>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {!b.returnedAt && (
                              <button onClick={() => doReturn(b.id)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">
                                <RotateCcw size={12} /> Return
                              </button>
                            )}
                            {Number(b.fine) > 0 && !b.finePaid && (
                              <button onClick={() => doFinePaid(b.id)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium">
                                <CheckCircle size={12} /> Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {scanActive && <BarcodeScanner onDetect={onScanDetect} onClose={() => setScanActive(false)} />}
    </div>
  );
}

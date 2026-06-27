'use client';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useToast } from '@/components/ui/Toast';
import { useSchoolData } from '@/hooks/useSchoolData';
import { api, endpoints } from '@/lib/api';
import type { LibraryItem } from '@/types';
import { AlertCircle, BookOpen, CheckCircle, Download, FileText, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type Tab = 'resources' | 'catalog' | 'borrows';
interface Book { id: number; title: string; author: string; isbn?: string; barcode?: string; category?: string; copies: number; available: number; }
interface Borrow {
  id: number; borrowedAt: string; dueDate: string; returnedAt?: string; fine: number; finePaid: boolean; overdueDays: number;
  book: Book; student: { user: { uniqueId: string; firstName: string; lastName: string } };
}

export default function StaffLibrary() {
  const [tab, setTab] = useState<Tab>('resources');

  // resources
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [resLoading, setResLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', course: '', class: '' });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // catalog
  const [books, setBooks] = useState<Book[]>([]);
  const [bookSearch, setBookSearch] = useState('');
  const [bookLoading, setBookLoading] = useState(false);

  // borrows
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [borrowStatus, setBorrowStatus] = useState('active');
  const [borrowSearch, setBorrowSearch] = useState('');
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [showBorrowForm, setShowBorrowForm] = useState(false);
  const [borrowForm, setBorrowForm] = useState({ bookIdOrBarcode: '', studentUniqueId: '', dueDays: 14 });
  const [borrowClass, setBorrowClass] = useState('');
  const [studentOptions, setStudentOptions] = useState<{ uniqueId: string; firstName: string; lastName: string }[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  const toast = useToast();
  const { classes, subjects } = useSchoolData();

  const loadResources = useCallback(() => {
    setResLoading(true);
    api.get<any>(endpoints.staff.library).then(r => setItems(r.data ?? [])).catch(() => toast.error('Failed to load')).finally(() => setResLoading(false));
  }, []);

  const loadBooks = useCallback(() => {
    setBookLoading(true);
    api.get<any>(endpoints.staff.books, bookSearch ? { search: bookSearch } : {})
      .then(r => setBooks(r.data ?? [])).catch(() => toast.error('Failed to load books')).finally(() => setBookLoading(false));
  }, [bookSearch]);

  const loadBorrows = useCallback(() => {
    setBorrowLoading(true);
    api.get<any>(endpoints.staff.bookBorrows, { status: borrowStatus })
      .then(r => setBorrows(r.data ?? [])).catch(() => toast.error('Failed to load borrows')).finally(() => setBorrowLoading(false));
  }, [borrowStatus]);

  useEffect(() => { loadResources(); }, [loadResources]);
  useEffect(() => { if (tab === 'catalog') loadBooks(); }, [tab, loadBooks]);
  useEffect(() => { if (tab === 'borrows') loadBorrows(); }, [tab, loadBorrows]);

  useEffect(() => {
    if (!showBorrowForm || !borrowClass) { setStudentOptions([]); return; }
    api.get<any>(endpoints.admin.students, { class: borrowClass, search: studentSearch || undefined, per_page: 50 })
      .then(r => setStudentOptions((r.data ?? []).map((s: any) => ({ uniqueId: s.student_id ?? s.uniqueId, firstName: s.firstname ?? s.firstName, lastName: s.lastname ?? s.lastName }))))
      .catch(() => {});
  }, [showBorrowForm, borrowClass, studentSearch]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a file'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('pdf', file);
      await api.upload(endpoints.staff.library, fd);
      toast.success('Document uploaded');
      setShowForm(false);
      setForm({ title: '', description: '', course: '', class: '' });
      setFile(null);
      loadResources();
    } catch { toast.error('Failed to upload'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this document?')) return;
    try { await api.delete(`${endpoints.staff.library}/${id}`); toast.success('Deleted'); loadResources(); }
    catch { toast.error('Failed to delete'); }
  };

  const doBorrow = async () => {
    if (!borrowForm.bookIdOrBarcode || !borrowForm.studentUniqueId) return toast.error('Book and student required');
    try {
      await api.post(endpoints.staff.bookBorrows, borrowForm);
      toast.success('Book issued'); setShowBorrowForm(false);
      setBorrowForm({ bookIdOrBarcode: '', studentUniqueId: '', dueDays: 14 }); loadBorrows();
    } catch (e: any) { toast.error(e?.message ?? 'Failed'); }
  };

  const doReturn = async (id: number) => {
    try { const r = await api.post<any>(endpoints.staff.bookReturn(String(id)), {}); toast.success(r.message ?? 'Returned'); loadBorrows(); }
    catch (e: any) { toast.error(e?.message ?? 'Failed'); }
  };

  const doFinePaid = async (id: number) => {
    try { await api.post(endpoints.staff.bookFinePaid(String(id)), {}); toast.success('Fine marked paid'); loadBorrows(); }
    catch { toast.error('Failed'); }
  };

  const filteredBorrows = borrows.filter(b => !borrowSearch || `${b.book.title} ${b.student.user.firstName} ${b.student.user.lastName}`.toLowerCase().includes(borrowSearch.toLowerCase()));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Library</h1>

      <div className="flex gap-2 flex-wrap">
        {([['resources', 'Resources'], ['catalog', 'Book Catalog'], ['borrows', 'Borrows & Fines']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === key ? 'btn-brand text-white' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm border border-gray-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Resources */}
      {tab === 'resources' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium">
              <Plus size={16} /> Upload Document
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-2xl card shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Document</h2>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                    <select required value={form.course} onChange={e => setForm(p => ({ ...p, course: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">Select course</option>
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                    <select value={form.class} onChange={e => setForm(p => ({ ...p, class: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">Select class</option>
                      {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File <span className="text-red-500">*</span></label>
                  <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={e => setFile(e.target.files?.[0] ?? null)} className="text-sm text-gray-600" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="btn-brand text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
                    {submitting ? 'Uploading…' : 'Upload'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="border border-gray-200 px-5 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-2xl card shadow-sm p-6">
            {resLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : items.length === 0 ? <EmptyState icon={FileText} message="No documents yet." card={false} /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => (
                  <div key={item.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0"><FileText size={18} className="text-blue-600" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{item.title}</p>
                        {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {item.course && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{item.course}</span>}
                          {item.class && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.class}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{new Date(item.createdAt ?? item.created_at).toLocaleDateString()}</span>
                      <div className="flex gap-2">
                        <a href={item.file_url?.startsWith('http') ? item.file_url : `/api${item.file_url}`} download target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Download size={15} /></a>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Book Catalog */}
      {tab === 'catalog' && (
        <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={bookSearch} onChange={e => setBookSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadBooks()}
                placeholder="Search title, author, ISBN…" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={loadBooks} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">Search</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Title', 'Author', 'Category', 'Copies', 'Available'].map(h => <th key={h} className="p-3 text-left font-medium text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                )) : books.length === 0 ? (
                  <tr><td colSpan={5}><EmptyState icon={BookOpen} message="No books found." card={false} /></td></tr>
                ) : books.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{b.title}</td>
                    <td className="p-3 text-gray-600">{b.author}</td>
                    <td className="p-3 text-gray-500">{b.category ?? '—'}</td>
                    <td className="p-3 text-center">{b.copies}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.available > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{b.available}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Borrows & Fines */}
      {tab === 'borrows' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-2">
              {(['active', 'overdue', 'returned', ''] as const).map(s => (
                <button key={s} onClick={() => setBorrowStatus(s)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${borrowStatus === s ? 'btn-brand text-white' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm border border-gray-100'}`}>
                  {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={borrowSearch} onChange={e => setBorrowSearch(e.target.value)} placeholder="Search…"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={() => setShowBorrowForm(v => !v)} className="flex items-center gap-2 btn-brand text-white px-4 py-2 rounded-xl text-sm font-medium">
              <Plus size={15} /> Issue Book
            </button>
          </div>

          {showBorrowForm && (
            <div className="bg-white rounded-2xl card shadow-sm p-4 space-y-3">
              <h2 className="font-semibold text-gray-900">Issue Book</h2>
              <input value={borrowForm.bookIdOrBarcode} onChange={e => setBorrowForm(f => ({ ...f, bookIdOrBarcode: e.target.value }))}
                placeholder="Book ID or barcode" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-2">
                <select value={borrowClass} onChange={e => { setBorrowClass(e.target.value); setBorrowForm(f => ({ ...f, studentUniqueId: '' })); }}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select class…</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" min={1} max={60} value={borrowForm.dueDays} onChange={e => setBorrowForm(f => ({ ...f, dueDays: Number(e.target.value) }))}
                  className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="self-center text-sm text-gray-500">days</span>
              </div>
              {borrowClass && (
                <div className="space-y-2">
                  <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search student…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {studentOptions.length === 0 ? <div className="p-3 text-sm text-gray-400 text-center">No students</div>
                      : studentOptions.map(s => (
                        <button key={s.uniqueId} onClick={() => setBorrowForm(f => ({ ...f, studentUniqueId: s.uniqueId }))}
                          className={`w-full text-left px-3 py-2 text-sm ${borrowForm.studentUniqueId === s.uniqueId ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                          {s.firstName} {s.lastName} <span className="text-gray-400 text-xs">{s.uniqueId}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={doBorrow} disabled={!borrowForm.bookIdOrBarcode || !borrowForm.studentUniqueId}
                  className="px-4 py-2 btn-brand text-white rounded-xl text-sm font-medium disabled:opacity-50">Issue</button>
                <button onClick={() => setShowBorrowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
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
                        <td className="p-3"><div className="font-medium text-gray-900">{b.book.title}</div><div className="text-gray-400 text-xs">{b.book.author}</div></td>
                        <td className="p-3"><div className="text-gray-800">{b.student.user.firstName} {b.student.user.lastName}</div><div className="text-gray-400 text-xs">{b.student.user.uniqueId}</div></td>
                        <td className="p-3 text-gray-500 text-xs">{new Date(b.borrowedAt).toLocaleDateString()}</td>
                        <td className="p-3 text-xs"><span className={overdue ? 'text-red-600 font-medium' : 'text-gray-500'}>{new Date(b.dueDate).toLocaleDateString()}{overdue && <> · <AlertCircle size={11} className="inline" /> {b.overdueDays}d</>}</span></td>
                        <td className="p-3 text-gray-500 text-xs">{b.returnedAt ? new Date(b.returnedAt).toLocaleDateString() : '—'}</td>
                        <td className="p-3">{Number(b.fine) > 0 ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.finePaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>₦{Number(b.fine).toLocaleString()} {b.finePaid ? '✓' : ''}</span> : <span className="text-gray-400 text-xs">—</span>}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {!b.returnedAt && <button onClick={() => doReturn(b.id)} className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"><RotateCcw size={12} /> Return</button>}
                            {Number(b.fine) > 0 && !b.finePaid && <button onClick={() => doFinePaid(b.id)} className="flex items-center gap-1 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium"><CheckCircle size={12} /> Paid</button>}
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
    </div>
  );
}

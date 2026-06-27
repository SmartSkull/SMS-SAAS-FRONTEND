'use client';
import { BookOpen, Download, Search } from 'lucide-react';
import { useLibrary } from '@/hooks/student';
import { EmptyState } from '@/components/ui/StateDisplay';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useCallback, useEffect, useState } from 'react';

type Tab = 'resources' | 'catalog' | 'borrows';
interface Book { id: number; title: string; author: string; isbn?: string; category?: string; copies: number; available: number; }
interface Borrow { id: number; borrowedAt: string; dueDate: string; returnedAt?: string; fine: number; finePaid: boolean; overdueDays: number; book: Book; }

function fileHref(path?: string) {
  if (!path) return '#';
  if (path.startsWith('http')) return path;
  return path.startsWith('/api') ? path : `/api/uploads/${path.replace(/^\/?(uploads\/)?/, '')}`;
}

export default function StudentLibrary() {
  const [tab, setTab] = useState<Tab>('resources');
  const { items, loading: resLoading } = useLibrary();

  // catalog
  const [books, setBooks] = useState<Book[]>([]);
  const [bookSearch, setBookSearch] = useState('');
  const [bookLoading, setBookLoading] = useState(false);

  // borrows
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [borrowLoading, setBorrowLoading] = useState(false);

  const toast = useToast();

  const loadBooks = useCallback(() => {
    setBookLoading(true);
    api.get<any>(endpoints.student.books, bookSearch ? { search: bookSearch } : {})
      .then(r => setBooks(r.data ?? [])).catch(() => toast.error('Failed to load books')).finally(() => setBookLoading(false));
  }, [bookSearch]);

  const loadBorrows = useCallback(() => {
    setBorrowLoading(true);
    api.get<any>(endpoints.student.myBorrows)
      .then(r => setBorrows(r.data ?? [])).catch(() => toast.error('Failed to load borrows')).finally(() => setBorrowLoading(false));
  }, []);

  useEffect(() => { if (tab === 'catalog') loadBooks(); }, [tab, loadBooks]);
  useEffect(() => { if (tab === 'borrows') loadBorrows(); }, [tab, loadBorrows]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Library</h1>

      <div className="flex gap-2 flex-wrap">
        {([['resources', 'Resources'], ['catalog', 'Book Catalog'], ['borrows', 'My Borrows']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === key ? 'btn-brand text-white' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm border border-gray-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Resources */}
      {tab === 'resources' && (
        resLoading ? (
          <div className="grid md:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
        ) : items.length === 0 ? <EmptyState icon={BookOpen} message="No documents available." /> : (
          <div className="grid md:grid-cols-3 gap-4">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><BookOpen size={18} className="text-blue-600" /></div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                  {item.course && <p className="text-xs text-gray-400 mt-0.5">{item.course}</p>}
                </div>
                <a href={fileHref(item.file_url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-600 font-medium hover:text-blue-700">
                  <Download size={14} /> Download
                </a>
              </div>
            ))}
          </div>
        )
      )}

      {/* Book Catalog */}
      {tab === 'catalog' && (
        <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={bookSearch} onChange={e => setBookSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadBooks()}
                placeholder="Search books…" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={loadBooks} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">Search</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Title', 'Author', 'Category', 'Available'].map(h => <th key={h} className="p-3 text-left font-medium text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={4} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                )) : books.length === 0 ? (
                  <tr><td colSpan={4}><EmptyState icon={BookOpen} message="No books found." card={false} /></td></tr>
                ) : books.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{b.title}</td>
                    <td className="p-3 text-gray-600">{b.author}</td>
                    <td className="p-3 text-gray-500">{b.category ?? '—'}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.available > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{b.available > 0 ? `${b.available} available` : 'Not available'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* My Borrows */}
      {tab === 'borrows' && (
        <div className="bg-white rounded-2xl card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Book', 'Borrowed', 'Due', 'Returned', 'Fine'].map(h => <th key={h} className="p-3 text-left font-medium text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {borrowLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="p-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                )) : borrows.length === 0 ? (
                  <tr><td colSpan={5}><EmptyState icon={BookOpen} message="No borrowed books." card={false} /></td></tr>
                ) : borrows.map(b => {
                  const overdue = !b.returnedAt && new Date(b.dueDate) < new Date();
                  return (
                    <tr key={b.id} className={`hover:bg-gray-50 ${overdue ? 'bg-red-50/40' : ''}`}>
                      <td className="p-3"><div className="font-medium text-gray-900">{b.book.title}</div><div className="text-gray-400 text-xs">{b.book.author}</div></td>
                      <td className="p-3 text-gray-500 text-xs">{new Date(b.borrowedAt).toLocaleDateString()}</td>
                      <td className="p-3 text-xs"><span className={overdue ? 'text-red-600 font-medium' : 'text-gray-500'}>{new Date(b.dueDate).toLocaleDateString()}{overdue && ` · ${b.overdueDays}d overdue`}</span></td>
                      <td className="p-3 text-gray-500 text-xs">{b.returnedAt ? new Date(b.returnedAt).toLocaleDateString() : <span className="text-amber-600 font-medium">Pending</span>}</td>
                      <td className="p-3">{Number(b.fine) > 0 ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.finePaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>₦{Number(b.fine).toLocaleString()} {b.finePaid ? '(paid)' : '(unpaid)'}</span> : <span className="text-gray-400 text-xs">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Search, MessageSquare, Plus, X, Users, GraduationCap, ChevronRight, ChevronLeft, Pencil, Trash2, Check } from 'lucide-react';
import { api, endpoints, getImageUrl } from '@/lib/api';
import type { ApiResponse } from '@/types';
import { useToast } from '@/components/ui/Toast';
import clsx from 'clsx';

function Avatar({ name, image, size = 10 }: { name?: string; image?: string | null; size?: number }) {
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center overflow-hidden shrink-0 bg-blue-100`}>
      {image ? <img src={getImageUrl(image) ?? ''} className="w-full h-full object-cover" />
        : <span className="text-blue-600 font-semibold text-sm">{name?.[0]?.toUpperCase()}</span>}
    </div>
  );
}

function UserList({ users, onSelect }: { users: any[]; onSelect: (id: string) => void }) {
  const PAGE = 10;
  const [page, setPage] = useState(1);
  const pages = Math.ceil(users.length / PAGE);
  const slice = users.slice((page - 1) * PAGE, page * PAGE);
  return (
    <>
      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
        {slice.map(u => (
          <button key={u.id} onClick={() => onSelect(u.id)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
            <Avatar name={u.firstname} image={u.image} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{u.firstname} {u.lastname}</p>
              {u.class && <p className="text-xs text-gray-400">{u.class}</p>}
            </div>
            <ChevronRight size={14} className="text-gray-300" />
          </button>
        ))}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-gray-500">{page} / {pages} · {users.length} total</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </>
  );
}

export default function StaffMessages() {
  const [convos, setConvos] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [partnerLastLogin, setPartnerLastLogin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newRole, setNewRole] = useState<'student' | 'staff' | null>(null);
  const [newClass, setNewClass] = useState('');
  const [classes, setClasses] = useState<string[]>([]);
  const [userList, setUserList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingMsg, setEditingMsg] = useState<{ id: string; text: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const activeConvo = convos.find(c => c.user_id === active);
  const filtered = convos.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    api.get<ApiResponse<any[]>>(endpoints.staff.messages)
      .then(r => setConvos(r.data ?? []))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));
  }, []);

  const openConvo = async (userId: string) => {
    setActive(userId);
    try {
      const r = await api.get<ApiResponse<any>>(`${endpoints.staff.messages}/thread`, { uid: userId });
      setMessages(r.data?.messages ?? r.data ?? []);
      setPartnerLastLogin(r.data?.partner_last_login_at ?? null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { toast.error('Failed to load conversation'); }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    try { await api.post(endpoints.staff.messages, { receiver_id: active, message: text }); setText(''); openConvo(active); }
    catch { toast.error('Failed to send'); }
  };

  const deleteMsg = async (id: string) => {
    try { await api.delete(`/staff/messages/${id}`); setMessages(p => p.map(m => m.id === id ? { ...m, message: '', deleted: true } : m)); }
    catch {}
  };

  const saveEdit = async (id: string) => {
    if (!editingMsg?.text.trim()) return;
    try {
      await api.put(`/staff/messages/${id}`, { message: editingMsg.text });
      setMessages(p => p.map(m => m.id === id ? { ...m, message: editingMsg.text, edited: true } : m));
      setEditingMsg(null);
    } catch {}
  };

  useEffect(() => {
    if (newRole !== 'student') return;
    api.get<ApiResponse<{ name: string }[]>>(endpoints.public.classes)
      .then(r => setClasses((r.data ?? []).map((c: any) => c.name)))
      .catch(() => {});
  }, [newRole]);

  useEffect(() => {
    if (!newRole) return;
    if (newRole === 'student' && !newClass) return;
    setLoadingUsers(true);
    const params: any = { role: newRole };
    if (newClass) params.class = newClass;
    api.get<ApiResponse<any[]>>(endpoints.staff.users, params)
      .then(r => setUserList(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, [newRole, newClass]);

  const startChat = async (userId: string) => {
    setShowNew(false); setNewRole(null); setNewClass(''); setUserList([]);
    await openConvo(userId);
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
      {/* Sidebar */}
      <div className={clsx('flex flex-col border-r border-gray-100 transition-all',
        active || showNew ? 'hidden md:flex md:w-72 md:shrink-0' : 'flex w-full md:w-72 md:shrink-0')}>
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 text-base">Messages</h2>
            <button onClick={() => { setShowNew(true); setNewRole(null); setNewClass(''); setUserList([]); }}
              className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700">
              <Plus size={15} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-xl text-sm focus:outline-none border border-transparent focus:border-blue-200" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <MessageSquare size={28} className="opacity-30" />
              <p className="text-sm">{search ? 'No results' : 'No conversations yet'}</p>
            </div>
          ) : filtered.map(c => (
            <button key={c.user_id} onClick={() => openConvo(c.user_id)}
              className={clsx('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                active === c.user_id ? 'bg-blue-50 border-r-2 border-blue-500' : 'hover:bg-gray-50')}>
              <Avatar name={c.name} image={c.image} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{c.last_message || 'No messages yet'}</p>
              </div>
              {c.unread > 0 && <span className="w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">{c.unread}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className={clsx('flex flex-col min-w-0', active || showNew ? 'flex flex-1' : 'hidden md:flex md:flex-1')}>
        {showNew ? (
          <div className="flex-1 flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setShowNew(false)} className="md:hidden p-1 -ml-1 text-gray-400"><ChevronLeft size={20} /></button>
                <h3 className="font-semibold text-gray-900">New Conversation</h3>
              </div>
              <button onClick={() => setShowNew(false)} className="hidden md:block text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Who do you want to message?</p>
                <div className="grid grid-cols-2 gap-3">
                  {([{ role: 'student' as const, label: 'Student', icon: GraduationCap }, { role: 'staff' as const, label: 'Staff', icon: Users }]).map(({ role, label, icon: Icon }) => (
                    <button key={role} onClick={() => { setNewRole(role); setNewClass(''); setUserList([]); }}
                      className={clsx('flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                        newRole === role ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200 bg-gray-50')}>
                      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', newRole === role ? 'bg-blue-500 text-white' : 'bg-white text-gray-500')}><Icon size={20} /></div>
                      <span className={clsx('text-sm font-semibold', newRole === role ? 'text-blue-700' : 'text-gray-600')}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {newRole === 'student' && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Select Class</p>
                  <div className="grid grid-cols-3 gap-2">
                    {classes.map(cls => (
                      <button key={cls} onClick={() => setNewClass(cls)}
                        className={clsx('py-2 px-3 rounded-xl text-sm font-medium border transition-all',
                          newClass === cls ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200')}>
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {((newRole === 'staff') || (newRole === 'student' && newClass)) && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    {newRole === 'staff' ? 'Staff Members' : `Students in ${newClass}`}
                  </p>
                  {loadingUsers ? <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
                    : userList.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No users found</p>
                    : <UserList users={userList} onSelect={startChat} />}
                </div>
              )}
            </div>
          </div>
        ) : !active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <MessageSquare size={28} className="opacity-40" />
            </div>
            <p className="text-sm font-medium">Select a conversation or start a new one</p>
            <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              <Plus size={14} /> New Chat
            </button>
          </div>
        ) : (
          <>
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 bg-white">
              <button onClick={() => setActive(null)} className="p-1 -ml-1 text-gray-400 hover:text-gray-600"><ChevronLeft size={20} /></button>
              <Avatar name={activeConvo?.name} image={activeConvo?.image} />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{activeConvo?.name}</p>
                {(() => {
                  if (!partnerLastLogin) return <p className="text-xs text-gray-400">Offline</p>;
                  const diff = Date.now() - new Date(partnerLastLogin).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 5) return <p className="text-xs text-green-500 font-medium">Online</p>;
                  if (mins < 60) return <p className="text-xs text-gray-400">Last seen {mins}m ago</p>;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return <p className="text-xs text-gray-400">Last seen {hrs}h ago</p>;
                  return <p className="text-xs text-gray-400">Last seen {new Date(partnerLastLogin).toLocaleDateString()}</p>;
                })()}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
              {messages.map((m: any) => (
                <div key={m.id} className={`flex items-end gap-2 group ${m.isMe ? 'justify-end' : 'justify-start'}`}>
                  {m.isMe && !m.deleted && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                      <button onClick={() => setEditingMsg({ id: m.id, text: m.message })}
                        className="p-1 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-blue-500 shadow-sm"><Pencil size={11} /></button>
                      <button onClick={() => deleteMsg(m.id)}
                        className="p-1 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-500 shadow-sm"><Trash2 size={11} /></button>
                    </div>
                  )}
                  <div className={clsx('max-w-xs lg:max-w-md rounded-2xl text-sm shadow-sm',
                    m.isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm border border-gray-100')}>
                    {editingMsg?.id === m.id ? (
                      <div className="flex items-center gap-1.5 px-3 py-2">
                        <input autoFocus value={editingMsg?.text ?? ''}
                          onChange={e => setEditingMsg(p => p ? { ...p, text: e.target.value } : null)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(m.id); if (e.key === 'Escape') setEditingMsg(null); }}
                          className="bg-blue-500 text-white placeholder-blue-200 outline-none text-sm w-40 rounded" />
                        <button onClick={() => saveEdit(m.id)} className="text-white/80 hover:text-white"><Check size={14} /></button>
                        <button onClick={() => setEditingMsg(null)} className="text-white/60 hover:text-white"><X size={14} /></button>
                      </div>
                    ) : m.deleted ? (
                      <p className="px-4 py-2.5 italic opacity-50 text-xs">This message was deleted</p>
                    ) : (
                      <div className="px-4 py-2.5">
                        <p>{m.message}</p>
                        {m.edited && <p className="text-[10px] opacity-50 mt-0.5">edited</p>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={sendMessage} className="px-4 py-3 border-t border-gray-100 flex gap-2 bg-white">
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message…"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-colors" />
              <button type="submit" disabled={!text.trim()} className="p-2.5 bg-blue-600 text-white rounded-xl disabled:opacity-40 hover:bg-blue-700">
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

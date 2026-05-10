'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Send, Search } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { ApiResponse } from '@/types';

interface Conversation {
  user_id: string; name: string; image?: string;
  last_message: string; unread: number; created_at: string;
}

interface Message {
  id: number; sender_id: string; receiver_id: string;
  message: string; read: boolean; created_at: string;
}

interface MessagesData {
  conversations?: Conversation[];
  messages?: Message[];
  user_id?: string;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeUser, setActiveUser] = useState<Conversation | null>(null);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const loadConversations = useCallback(() => {
    api.get<ApiResponse<MessagesData>>(endpoints.admin.messages)
      .then((r) => {
        setConversations(r.data.conversations ?? []);
        if (r.data.user_id) setMyId(r.data.user_id);
      })
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const openConversation = async (conv: Conversation) => {
    setActiveUser(conv);
    try {
      const r = await api.get<ApiResponse<MessagesData>>(endpoints.admin.messages, { user_id: conv.user_id });
      setMessages(r.data.messages ?? []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { toast.error('Failed to load conversation'); }
  };

  const send = async () => {
    if (!text.trim() || !activeUser) return;
    setSending(true);
    try {
      await api.post(endpoints.admin.messages, { receiver_id: activeUser.user_id, message: text });
      setText('');
      await openConversation(activeUser);
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const filtered = conversations.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Messages</h1>

      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..." className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-3 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-sm text-gray-400">No conversations</p>
              ) : filtered.map((c) => (
                <button key={c.user_id} onClick={() => openConversation(c)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left transition-colors ${activeUser?.user_id === c.user_id ? 'bg-purple-50' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 text-purple-600 font-semibold text-sm">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 text-sm truncate">{c.name}</span>
                      {c.unread > 0 && <span className="w-5 h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">{c.unread}</span>}
                    </div>
                    <p className="text-gray-400 text-xs truncate">{c.last_message}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeUser ? (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm">
                    {activeUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900">{activeUser.name}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m) => {
                    const isMe = m.sender_id === myId;
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                          {m.message}
                          <div className={`text-xs mt-1 ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                <div className="p-4 border-t border-gray-100 flex gap-3">
                  <input value={text} onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                    placeholder="Type a message..." className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  <button onClick={send} disabled={sending || !text.trim()}
                    className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center hover:bg-purple-700 disabled:opacity-60">
                    <Send size={16} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Send size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Select a conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

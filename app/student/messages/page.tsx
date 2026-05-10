'use client';
import { useEffect, useState, useRef } from 'react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Send, User, MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/StateDisplay';
import type { ApiResponse, Conversation, Message } from '@/types';

export default function StudentMessages() {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    api.get<ApiResponse<Conversation[]>>(endpoints.student.messages)
      .then((r) => setConvos(r.data))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));
  }, []);

  const openConvo = async (userId: string) => {
    setActive(userId);
    try {
      const r = await api.get<ApiResponse<Message[]>>(`${endpoints.student.messages}/${userId}`);
      setMessages(r.data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { toast.error('Failed to load conversation'); }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    try {
      await api.post(endpoints.student.messages, { receiver_id: active, message: text });
      setText('');
      openConvo(active);
    } catch { toast.error('Failed to send message'); }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Conversations */}
      <div className="w-72 bg-white rounded-2xl card shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 font-semibold text-gray-900">Messages</div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="p-4 text-center text-gray-400 text-sm">Loading…</div> :
            convos.length === 0 ? <EmptyState icon={MessageSquare} message="No conversations" /> :
            convos.map((c) => (
              <button key={c.user_id} onClick={() => openConvo(c.user_id)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left ${active === c.user_id ? 'bg-blue-50' : ''}`}>
                <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 truncate">{c.last_message}</p>
                </div>
                {c.unread > 0 && <span className="w-5 h-5 btn-brand text-white text-xs rounded-full flex items-center justify-center">{c.unread}</span>}
              </button>
            ))
          }
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 bg-white rounded-2xl card shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Select a conversation</div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_id === active ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${m.sender_id === active ? 'bg-gray-100 text-gray-900' : 'bg-blue-600 text-white'}`}>
                    {m.message}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500" />
              <button type="submit" className="p-2.5 btn-brand text-white rounded-xl  transition-colors">
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

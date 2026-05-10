'use client';
import { useEffect, useState, useRef } from 'react';
import { Send, Paperclip, MessageSquare } from 'lucide-react';
import { api, endpoints } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/StateDisplay';
import { useAuth } from '@/hooks/useAuth';
import type { ApiResponse, Conversation, Message } from '@/types';

export default function StaffMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    api.get<ApiResponse<{ conversations: Conversation[] }>>(endpoints.staff.messages)
      .then((r) => setConversations(r.data.conversations ?? []))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));
  }, []);

  const openConversation = (conv: Conversation) => {
    setSelected(conv);
    api.get<ApiResponse<{ messages: Message[] }>>(endpoints.staff.messages, { user_id: conv.user_id })
      .then((r) => {
        setMessages(r.data.messages ?? []);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .catch(() => toast.error('Failed to load conversation'));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || (!text.trim() && !file)) return;
    setSending(true);
    try {
      if (file) {
        const fd = new FormData();
        fd.append('receiver_id', selected.user_id);
        if (text.trim()) fd.append('message', text.trim());
        fd.append('file', file);
        await api.upload(endpoints.staff.messages, fd);
      } else {
        await api.post(endpoints.staff.messages, { receiver_id: selected.user_id, message: text.trim() });
      }
      setText('');
      setFile(null);
      openConversation(selected);
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Messages</h1>

      <div className="bg-white rounded-2xl card shadow-sm overflow-hidden flex h-[calc(100vh-200px)] min-h-96">
        {/* Sidebar */}
        <div className="w-72 border-r border-gray-100 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Conversations</p>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState icon={MessageSquare} message="No conversations" />
          ) : (
            <div className="flex-1 overflow-y-auto">
              {conversations.map((c) => (
                <button key={c.user_id} onClick={() => openConversation(c)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 text-left transition-colors ${
                    selected?.user_id === c.user_id ? 'bg-blue-50' : ''
                  }`}>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {c.image ? <img src={c.image} alt="" className="w-full h-full object-cover" /> :
                      <span className="text-blue-600 font-semibold text-sm">{c.name[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                      {c.unread > 0 && (
                        <span className="w-5 h-5 btn-brand text-white text-xs rounded-full flex items-center justify-center shrink-0">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{c.last_message}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                  {selected.image ? <img src={selected.image} alt="" className="w-full h-full object-cover" /> :
                    <span className="text-blue-600 font-semibold text-sm">{selected.name[0]}</span>}
                </div>
                <p className="font-semibold text-gray-800">{selected.name}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => {
                  const isMe = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                        isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}>
                        {m.message && <p>{m.message}</p>}
                        {m.file_url && (
                          <a href={m.file_url} target="_blank" rel="noreferrer"
                            className={`flex items-center gap-1.5 text-xs mt-1 underline ${isMe ? 'text-blue-200' : 'text-blue-600'}`}>
                            <Paperclip size={12} /> Attachment
                          </a>
                        )}
                        <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} className="p-4 border-t border-gray-100 flex items-end gap-2">
                <label className="p-2 text-gray-400 hover:text-blue-600 cursor-pointer">
                  <Paperclip size={18} />
                  <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
                <div className="flex-1">
                  {file && <p className="text-xs text-blue-600 mb-1 truncate">{file.name}</p>}
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button type="submit" disabled={sending || (!text.trim() && !file)}
                  className="p-2.5 btn-brand text-white rounded-xl  disabled:opacity-50">
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

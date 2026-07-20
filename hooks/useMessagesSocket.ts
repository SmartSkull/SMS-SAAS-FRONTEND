import { io, type Socket } from 'socket.io-client';
import { useCallback, useEffect, useRef } from 'react';
import { auth } from '@/lib/auth';

export function useMessagesSocket(onNewMessage?: () => void) {
  const socketRef = useRef<Socket | null>(null);
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;

  useEffect(() => {
    const user = auth.getUser();
    if (!user?.id) return;

    let baseUrl: string;
    if (typeof window !== 'undefined') {
      const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/api$/, '').replace(/\/$/, '');
      baseUrl = apiBase || window.location.origin;
    } else {
      baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080').replace(/\/api$/, '').replace(/\/$/, '');
    }

    const socket = io(`${baseUrl}/messages`, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('user:join', { userId: String(user.id) });
    });

    socket.on('new:message', () => {
      onNewMessageRef.current?.();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);
}

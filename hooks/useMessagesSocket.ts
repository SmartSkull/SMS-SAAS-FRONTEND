import { io, type Socket } from 'socket.io-client';
import { useCallback, useEffect, useRef } from 'react';
import { auth } from '@/lib/auth';

export function useMessagesSocket(
  onNewMessage?: () => void,
  onIncomingMessage?: (msg: any) => void,
  activeConvoIdRef?: React.MutableRefObject<string | null>,
) {
  const socketRef = useRef<Socket | null>(null);
  const onNewMessageRef = useRef(onNewMessage);
  const onIncomingMessageRef = useRef(onIncomingMessage);
  onNewMessageRef.current = onNewMessage;
  onIncomingMessageRef.current = onIncomingMessage;

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
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('user:join', { userId: String(user.id) });
    });

    socket.on('new:message', (msg: any) => {
      const myUniqueId = user.uniqueId ?? user.unique_id;
      const partnerId = activeConvoIdRef?.current;

      // If this message belongs to the currently open conversation, append it directly
      if (
        partnerId &&
        (msg.senderUniqueId === partnerId || msg.receiverUniqueId === partnerId)
      ) {
        onIncomingMessageRef.current?.({
          ...msg,
          message: msg.message ?? msg.body,
          isMe: msg.senderUniqueId === myUniqueId,
          edited: false,
          deleted: false,
          createdAt: msg.createdAt ?? new Date().toISOString(),
        });
      }

      // Always refresh the convo list sidebar
      onNewMessageRef.current?.();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);
}

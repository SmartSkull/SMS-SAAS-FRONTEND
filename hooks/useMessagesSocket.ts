import { io, type Socket } from 'socket.io-client';
import { useCallback, useEffect, useRef } from 'react';
import { auth } from '@/lib/auth';

export function useMessagesSocket(
  onNewMessage?: () => void,
  onIncomingMessage?: (msg: any) => void,
  activeConvoIdRef?: React.MutableRefObject<string | null>,
  onPresenceChange?: (userId: string, online: boolean) => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const onNewMessageRef = useRef(onNewMessage);
  const onIncomingMessageRef = useRef(onIncomingMessage);
  const onPresenceChangeRef = useRef(onPresenceChange);
  onNewMessageRef.current = onNewMessage;
  onIncomingMessageRef.current = onIncomingMessage;
  onPresenceChangeRef.current = onPresenceChange;

  const checkPresence = useCallback((userId: string) => {
    socketRef.current?.emit('user:status', { userId });
  }, []);

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
      const myUniqueId = user.uniqueId;
      const partnerId = activeConvoIdRef?.current;

      // Append to open conversation immediately
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

    // Presence events — broadcast to whoever is listening
    socket.on('user:online', ({ userId }: { userId: string }) => {
      onPresenceChangeRef.current?.(userId, true);
    });

    socket.on('user:offline', ({ userId }: { userId: string }) => {
      onPresenceChangeRef.current?.(userId, false);
    });

    // user:status is the response to a point-in-time query
    socket.on('user:status', ({ userId, online }: { userId: string; online: boolean }) => {
      onPresenceChangeRef.current?.(userId, online);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { checkPresence };
}

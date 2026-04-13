import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPatch } from '../api/apiClient';
import { API_BASE_URL } from '../config/env';

const normalizeNotifications = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

const normalizeNotification = (notification) => ({
  id: String(notification?.id || ''),
  type: notification?.type || '',
  title: notification?.title || 'Notification',
  message: notification?.message || '',
  link: notification?.link || '',
  isRead: Boolean(notification?.isRead),
  createdAt: notification?.createdAt || new Date().toISOString(),
});

const toWsUrl = () => {
  const base = String(API_BASE_URL || '').replace(/\/+$/, '');
  if (!base) return '';
  if (base.startsWith('https://')) return `${base.replace('https://', 'wss://')}/ws`;
  if (base.startsWith('http://')) return `${base.replace('http://', 'ws://')}/ws`;
  return `${base}/ws`;
};

const buildStompFrame = (command, headers = {}, body = '') => {
  const headerLines = Object.entries(headers).map(([key, value]) => `${key}:${value}`);
  return `${command}\n${headerLines.join('\n')}\n\n${body}\0`;
};

const parseStompFrame = (rawFrame) => {
  const frame = String(rawFrame || '').replace(/\u0000/g, '').trim();
  if (!frame) return null;

  const [headerBlock, ...bodyParts] = frame.split('\n\n');
  const headerLines = headerBlock.split('\n');
  const command = headerLines.shift()?.trim();
  const headers = {};

  headerLines.forEach((line) => {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) return;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    headers[key] = value;
  });

  return {
    command,
    headers,
    body: bodyParts.join('\n\n').trim(),
  };
};

export const useNotifications = (user) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const subscriptionIdRef = useRef(`notifications-${Math.random().toString(36).slice(2, 10)}`);

  const syncNotifications = useCallback((nextNotifications) => {
    const normalized = nextNotifications.map(normalizeNotification);
    setNotifications(normalized);
    setUnreadCount(normalized.filter((item) => !item.isRead).length);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      syncNotifications([]);
      return;
    }

    try {
      const response = await apiGet('/notifications');
      const normalized = normalizeNotifications(response).map(normalizeNotification);
      syncNotifications(normalized);
    } catch {
      syncNotifications([]);
    }
  }, [syncNotifications, user]);

  const markRead = useCallback(async (id) => {
    if (!id) return;

    setNotifications((prev) => {
      const next = prev.map((notification) => (
        notification.id === String(id)
          ? { ...notification, isRead: true }
          : notification
      ));
      setUnreadCount(next.filter((item) => !item.isRead).length);
      return next;
    });

    try {
      await apiPatch(`/notifications/${encodeURIComponent(id)}/read`);
    } catch {
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
    setUnreadCount(0);

    try {
      await apiPatch('/notifications/read-all');
    } catch {
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) {
      syncNotifications([]);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return undefined;
    }

    let isMounted = true;
    const wsUrl = toWsUrl();
    const accessToken = localStorage.getItem('accessToken');

    fetchNotifications();

    const connect = () => {
      if (!isMounted || !wsUrl || !accessToken) return;

      try {
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          socket.send(buildStompFrame('CONNECT', {
            'accept-version': '1.2',
            'heart-beat': '10000,10000',
            Authorization: `Bearer ${accessToken}`,
          }));
        };

        socket.onmessage = (event) => {
          const chunks = String(event.data || '').split('\0').filter(Boolean);

          chunks.forEach((chunk) => {
            const frame = parseStompFrame(chunk);
            if (!frame) return;

            if (frame.command === 'CONNECTED') {
              socket.send(buildStompFrame('SUBSCRIBE', {
                id: subscriptionIdRef.current,
                destination: '/user/queue/notifications',
              }));
              return;
            }

            if (frame.command !== 'MESSAGE') return;

            try {
              const incoming = normalizeNotification(JSON.parse(frame.body));
              setNotifications((prev) => {
                const existing = prev.find((item) => item.id === incoming.id);
                const next = existing
                  ? prev.map((item) => (item.id === incoming.id ? incoming : item))
                  : [incoming, ...prev];
                setUnreadCount(next.filter((item) => !item.isRead).length);
                return next;
              });
            } catch {
              // Ignore malformed frames and keep bell usable with REST history.
            }
          });
        };

        socket.onclose = () => {
          if (!isMounted) return;
          reconnectTimerRef.current = window.setTimeout(connect, 5000);
        };

        socket.onerror = () => {
          socket.close();
        };
      } catch {
        // Ignore websocket bootstrap issues and keep REST notifications working.
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [fetchNotifications, syncNotifications, user]);

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    refetch: fetchNotifications,
  };
};

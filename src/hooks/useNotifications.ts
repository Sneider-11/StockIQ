import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { getSupabaseListo } from '../lib/supabase';
import { dbGetNotifications, dbMarkNotificationsRead, dbMarkAllNotificationsRead } from '../lib/db';
import type { Notification } from '../constants/data';

export function useNotifications(cedula: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!cedula || !getSupabaseListo()) return;
    setLoading(true);
    try {
      const data = await dbGetNotifications(cedula);
      setNotifications(data);
    } catch {
      // sin conexión — mantiene las anteriores
    } finally {
      setLoading(false);
    }
  }, [cedula]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Re-fetch al volver al primer plano
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') fetchNotifications();
    });
    return () => sub.remove();
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await dbMarkNotificationsRead([id]).catch(() => {});
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await dbMarkAllNotificationsRead(cedula).catch(() => {});
  }, [cedula]);

  return { notifications, unreadCount, loading, markRead, markAllRead, refresh: fetchNotifications };
}

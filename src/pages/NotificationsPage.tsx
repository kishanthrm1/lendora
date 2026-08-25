import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, Clock, CheckCircle2, XCircle, Calendar, AlertCircle } from 'lucide-react';
import { supabase, type Notification } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  booking_received: Calendar,
  booking_approved: CheckCircle2,
  booking_rejected: XCircle,
  booking_cancelled: XCircle,
  return_approaching: AlertCircle,
};

const typeColors: Record<string, string> = {
  booking_received: 'bg-amber-100 text-amber-600',
  booking_approved: 'bg-teal-100 text-teal-600',
  booking_rejected: 'bg-red-100 text-red-600',
  booking_cancelled: 'bg-red-100 text-red-600',
  return_approaching: 'bg-blue-100 text-blue-600',
};

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (!user) return;
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setNotifications(data as Notification[]);
        setLoading(false);
      });
  }, [user, authLoading, navigate]);

  const markAllRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm">
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Bell className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-500">No notifications yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type] || Clock;
            return (
              <div
                key={n.id}
                className={`card flex items-start gap-3 p-4 transition-colors ${
                  !n.read ? 'border-teal-200 bg-teal-50/30' : ''
                }`}
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${typeColors[n.type] || 'bg-gray-100 text-gray-500'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-teal-500" />}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-teal-600"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

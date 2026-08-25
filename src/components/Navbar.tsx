import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, LayoutGrid, Plus, LayoutDashboard, LogOut, User, Menu, X, RefreshCw, Bell, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const navItems = [
    { to: '/', label: 'Browse', icon: Search },
    { to: '/categories', label: 'Categories', icon: LayoutGrid },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setUnreadMessages(0);
      return;
    }

    // Load unread notifications
    const loadUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('read', false);
      setUnreadCount(count || 0);
    };

    // Load unread messages
    const loadUnreadMessages = async () => {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .or(`participant_a.eq.${user!.id},participant_b.eq.${user!.id}`);
      if (!convs || convs.length === 0) {
        setUnreadMessages(0);
        return;
      }
      const convIds = convs.map((c) => c.id);
      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .neq('sender_id', user!.id)
        .eq('read', false);
      setUnreadMessages(msgCount || 0);
    };

    loadUnread();
    loadUnreadMessages();

    // Poll for new notifications/messages every 15 seconds
    const interval = setInterval(() => {
      loadUnread();
      loadUnreadMessages();
    }, 15000);

    return () => clearInterval(interval);
  }, [user, location.pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white">
              <RefreshCw className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold text-gray-900">
              <span className="text-teal-600">Lendora</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(item.to)
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Messages */}
              <Link
                to="/messages"
                className="relative hidden rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 md:block"
                title="Messages"
              >
                <MessageSquare className="h-5 w-5" />
                {unreadMessages > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-bold text-white">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>

              {/* Notifications */}
              <Link
                to="/notifications"
                className="relative hidden rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 md:block"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              <Link to="/list-item" className="hidden btn-primary sm:inline-flex">
                <Plus className="h-4 w-4" />
                List an Item
              </Link>
              <div className="relative hidden md:block">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
                    {profile?.full_name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {profile?.full_name?.split(' ')[0] || 'Account'}
                  </span>
                </Link>
              </div>
              <button
                onClick={handleSignOut}
                className="hidden rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 md:block"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn-primary">
              Sign In
            </Link>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-50 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white md:hidden animate-fade-in">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive(item.to)
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            {user && (
              <>
                <Link
                  to="/notifications"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <Bell className="h-4 w-4" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/messages"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  Messages
                  {unreadMessages > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1.5 text-xs font-bold text-white">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
                <Link
                  to="/list-item"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                  List an Item
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

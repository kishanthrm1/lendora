import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, Calendar, Plus, Clock, CheckCircle2, XCircle, ArrowRight,
  ArrowLeft, Trash2, ShoppingBag, RefreshCw, Star,
} from 'lucide-react';
import { supabase, type Item, type Booking } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  active: { label: 'Active', color: 'bg-teal-100 text-teal-700', icon: RefreshCw },
  returned: { label: 'Returned', color: 'bg-gray-100 text-gray-700', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  purchased: { label: 'Purchased', color: 'bg-green-100 text-green-700', icon: ShoppingBag },
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'items' | 'borrowing' | 'lending'>('items');
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [borrowBookings, setBorrowBookings] = useState<Booking[]>([]);
  const [lendBookings, setLendBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (!user) return;

    async function loadData() {
      const [{ data: items }, { data: borrows }, { data: lends }] = await Promise.all([
        supabase.from('items').select('*, category:categories(*)').eq('owner_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('bookings').select('*, item:items(*)').eq('borrower_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('bookings').select('*, item:items(*), borrower:profiles(*)').eq('owner_id', user!.id).order('created_at', { ascending: false }),
      ]);
      setMyItems(items as Item[]);
      setBorrowBookings(borrows as Booking[]);
      setLendBookings(lends as Booking[]);
      setLoading(false);
    }
    loadData();
  }, [user, authLoading, navigate]);

  const updateBookingStatus = async (bookingId: string, status: string) => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
    if (!error) {
      setLendBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
      setBorrowBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this listing?')) return;
    const { error } = await supabase.from('items').delete().eq('id', itemId);
    if (!error) {
      setMyItems((prev) => prev.filter((i) => i.id !== itemId));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">Manage your items, bookings, and transactions.</p>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">My Listings</p>
              <p className="font-display text-2xl font-bold text-gray-900">{myItems.length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Package className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Borrowing</p>
              <p className="font-display text-2xl font-bold text-gray-900">{borrowBookings.length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Lending</p>
              <p className="font-display text-2xl font-bold text-gray-900">{lendBookings.length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <RefreshCw className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 border-b border-gray-200">
        {[
          { key: 'items', label: 'My Listings' },
          { key: 'borrowing', label: 'My Borrows' },
          { key: 'lending', label: 'Lending Requests' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`relative px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.key ? 'text-teal-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-teal-600" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {tab === 'items' && (
          <div>
            <div className="mb-4 flex justify-end">
              <Link to="/list-item" className="btn-primary">
                <Plus className="h-4 w-4" />
                List New Item
              </Link>
            </div>
            {myItems.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No listings yet"
                desc="Start earning by listing items you own."
                action={<Link to="/list-item" className="btn-primary">List your first item</Link>}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myItems.map((item) => (
                  <div key={item.id} className="card overflow-hidden">
                    <div className="relative aspect-[4/3] bg-gray-100">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-50 to-gray-100">
                          <span className="text-3xl opacity-30">📦</span>
                        </div>
                      )}
                      <div className="absolute right-2 top-2">
                        <span className={`badge ${item.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {item.available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="truncate font-display text-sm font-bold text-gray-900">{item.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        ${Number(item.daily_rate).toFixed(0)}/day
                        {item.purchase_price && ` · Buy $${Number(item.purchase_price).toFixed(0)}`}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Link to={`/item/${item.id}`} className="btn-secondary flex-1 text-xs">
                          View
                        </Link>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'borrowing' && (
          <div>
            {borrowBookings.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No borrow requests"
                desc="Browse the marketplace and request to borrow something."
                action={<Link to="/browse" className="btn-primary">Browse items</Link>}
              />
            ) : (
              <div className="space-y-3">
                {borrowBookings.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    role="borrower"
                    onUpdateStatus={updateBookingStatus}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'lending' && (
          <div>
            {lendBookings.length === 0 ? (
              <EmptyState
                icon={RefreshCw}
                title="No lending requests"
                desc="When someone requests to borrow your item, it'll show up here."
                action={<Link to="/list-item" className="btn-primary">List an item</Link>}
              />
            ) : (
              <div className="space-y-3">
                {lendBookings.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    role="owner"
                    onUpdateStatus={updateBookingStatus}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{desc}</p>
      <div className="mt-4">{action}</div>
    </div>
  );
}

function BookingRow({
  booking,
  role,
  onUpdateStatus,
}: {
  booking: Booking;
  role: 'borrower' | 'owner';
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const status = statusConfig[booking.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="card p-4">
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
          {booking.item?.image_url ? (
            <img src={booking.item.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-teal-50">
              <span className="text-xl opacity-30">📦</span>
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link to={`/item/${booking.item_id}`} className="font-display text-sm font-bold text-gray-900 hover:text-teal-700">
                {booking.item?.title || 'Item'}
              </Link>
              <p className="mt-0.5 text-xs text-gray-500">
                {new Date(booking.start_date).toLocaleDateString()} — {new Date(booking.end_date).toLocaleDateString()}
              </p>
            </div>
            <span className={`badge ${status.color}`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="font-semibold text-gray-900">${Number(booking.total_price).toFixed(2)}</span>
              {role === 'owner' && booking.borrower && (
                <span>from {booking.borrower.full_name || 'User'}</span>
              )}
              {booking.message && (
                <span className="hidden truncate italic sm:inline">"{booking.message}"</span>
              )}
            </div>

            {role === 'owner' && booking.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdateStatus(booking.id, 'approved')}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => onUpdateStatus(booking.id, 'cancelled')}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Decline
                </button>
              </div>
            )}
            {role === 'owner' && booking.status === 'approved' && (
              <button
                onClick={() => onUpdateStatus(booking.id, 'active')}
                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
              >
                Mark Active
              </button>
            )}
            {role === 'owner' && booking.status === 'active' && (
              <button
                onClick={() => onUpdateStatus(booking.id, 'returned')}
                className="rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-700"
              >
                Mark Returned
              </button>
            )}
            {role === 'borrower' && booking.status === 'pending' && (
              <button
                onClick={() => onUpdateStatus(booking.id, 'cancelled')}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

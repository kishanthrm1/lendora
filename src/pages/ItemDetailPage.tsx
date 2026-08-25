import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin, Star, Calendar, ArrowLeft, Shield, RefreshCw, ShoppingBag,
  CheckCircle2, MessageSquare, User,
} from 'lucide-react';
import { supabase, type Item, type Review, type Profile } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const conditionLabels: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
};

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const { data } = await supabase
        .from('items')
        .select('*, category:categories(*)')
        .eq('id', id)
        .maybeSingle();
      if (!data) {
        setLoading(false);
        return;
      }
      setItem(data as Item);

      // Load owner profile
      if ((data as Item).owner_id) {
        const { data: ownerData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', (data as Item).owner_id)
          .maybeSingle();
        setOwner(ownerData as Profile);
      }

      // Load reviews for this item's bookings
      const { data: bookingIds } = await supabase
        .from('bookings')
        .select('id')
        .eq('item_id', id);
      if (bookingIds && bookingIds.length > 0) {
        const ids = bookingIds.map((b) => b.id);
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('*, reviewer:profiles(*)')
          .in('booking_id', ids)
          .order('created_at', { ascending: false });
        setReviews(reviewData as Review[]);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  const calculateTotal = () => {
    if (!item || !startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    if (days >= 7 && item.weekly_rate > 0) {
      const weeks = Math.floor(days / 7);
      const extraDays = days % 7;
      return weeks * item.weekly_rate + extraDays * item.daily_rate;
    }
    return days * item.daily_rate;
  };

  const handleBooking = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!item || !startDate || !endDate) return;
    if (item.owner_id === user.id) {
      setBookingError("You can't book your own item.");
      return;
    }
    setSubmitting(true);
    setBookingError(null);

    const total = calculateTotal();

    const { error } = await supabase.from('bookings').insert({
      item_id: item.id,
      borrower_id: user.id,
      owner_id: item.owner_id,
      start_date: startDate,
      end_date: endDate,
      total_price: total,
      status: 'pending',
      message: message || null,
    });

    if (error) {
      setBookingError(error.message);
      setSubmitting(false);
    } else {
      setBookingSuccess(true);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-gray-500">Item not found.</p>
        <Link to="/browse" className="btn-primary mt-4">Browse items</Link>
      </div>
    );
  }

  const isOwner = user?.id === item.owner_id;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/browse" className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Back to browse
      </Link>

      {bookingSuccess ? (
        <div className="card mx-auto max-w-lg p-8 text-center animate-scale-in">
          <CheckCircle2 className="mx-auto h-16 w-16 text-teal-600" />
          <h2 className="mt-4 font-display text-2xl font-bold text-gray-900">Booking request sent!</h2>
          <p className="mt-2 text-gray-500">
            The owner will review your request and respond shortly. You can track the status in your dashboard.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
            <Link to="/browse" className="btn-secondary">Keep Browsing</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left — image + details */}
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              <div className="aspect-[16/10] bg-gray-100">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-50 to-gray-100">
                    <span className="text-6xl opacity-30">📦</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-gray-900">{item.title}</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    {item.category?.name} · {conditionLabels[item.condition] || item.condition}
                  </p>
                </div>
              </div>

              {item.location && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin className="h-4 w-4" />
                  {item.location}
                </p>
              )}

              <div className="mt-6">
                <h3 className="font-display text-lg font-bold text-gray-900">Description</h3>
                <p className="mt-2 whitespace-pre-wrap text-gray-600">{item.description}</p>
              </div>

              {/* Features */}
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
                  <Shield className="h-5 w-5 text-teal-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Security deposit</p>
                    <p className="text-xs text-gray-500">${Number(item.deposit).toFixed(0)} refundable</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
                  <RefreshCw className="h-5 w-5 text-teal-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Try before you buy</p>
                    <p className="text-xs text-gray-500">Borrow first, decide later</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="mt-8">
              <h3 className="font-display text-lg font-bold text-gray-900">
                Reviews ({reviews.length})
              </h3>
              {reviews.length === 0 ? (
                <p className="mt-3 text-sm text-gray-400">No reviews yet.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="card p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
                          {review.reviewer?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {review.reviewer?.full_name || 'Anonymous'}
                          </p>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3.5 w-3.5 ${
                                  star <= review.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="mt-3 text-sm text-gray-600">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — booking panel */}
          <div className="lg:col-span-1">
            <div className="card sticky top-20 p-6">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="font-display text-3xl font-bold text-gray-900">
                    ${Number(item.daily_rate).toFixed(0)}
                    <span className="text-base font-normal text-gray-400">/day</span>
                  </p>
                  {item.weekly_rate > 0 && (
                    <p className="mt-1 text-sm text-gray-500">
                      ${Number(item.weekly_rate).toFixed(0)}/week
                    </p>
                  )}
                </div>
                {item.purchase_price && (
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Buy outright</p>
                    <p className="font-display text-xl font-bold text-teal-600">
                      ${Number(item.purchase_price).toFixed(0)}
                    </p>
                  </div>
                )}
              </div>

              {isOwner ? (
                <div className="mt-6 rounded-xl bg-teal-50 p-4 text-center">
                  <p className="text-sm font-medium text-teal-700">This is your item</p>
                  <Link to="/dashboard" className="btn-secondary mt-3 w-full">
                    View in Dashboard
                  </Link>
                </div>
              ) : !item.available ? (
                <div className="mt-6 rounded-xl bg-gray-100 p-4 text-center">
                  <p className="text-sm font-medium text-gray-500">Currently unavailable</p>
                </div>
              ) : showBooking ? (
                <div className="mt-6 space-y-4 animate-fade-in">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Start date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">End date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Message to owner (optional)
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      placeholder="Tell the owner what you need it for..."
                      className="input-field resize-none"
                    />
                  </div>

                  {startDate && endDate && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Borrowing cost</span>
                        <span className="font-semibold text-gray-900">${calculateTotal().toFixed(2)}</span>
                      </div>
                      {item.deposit > 0 && (
                        <div className="mt-1 flex justify-between text-sm">
                          <span className="text-gray-500">Security deposit</span>
                          <span className="font-semibold text-gray-900">${Number(item.deposit).toFixed(0)}</span>
                        </div>
                      )}
                      <div className="mt-2 border-t border-gray-200 pt-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-gray-900">Total due</span>
                          <span className="font-bold text-teal-600">
                            ${(calculateTotal() + Number(item.deposit)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {bookingError && (
                    <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                      {bookingError}
                    </div>
                  )}

                  <button
                    onClick={handleBooking}
                    disabled={submitting || !startDate || !endDate}
                    className="btn-primary w-full"
                  >
                    {submitting ? 'Sending...' : 'Send Booking Request'}
                    <Calendar className="h-4 w-4" />
                  </button>
                  <button onClick={() => setShowBooking(false)} className="btn-secondary w-full">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <button onClick={() => setShowBooking(true)} className="btn-primary w-full">
                    <Calendar className="h-4 w-4" />
                    Request to Borrow
                  </button>
                  {item.purchase_price && (
                    <button className="btn-accent w-full">
                      <ShoppingBag className="h-4 w-4" />
                      Buy Now
                    </button>
                  )}
                </div>
              )}

              {/* Owner info */}
              <div className="mt-6 border-t border-gray-100 pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
                    {owner?.full_name?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {owner?.full_name || 'Owner'}
                    </p>
                    <p className="text-xs text-gray-400">Listed on BorrowBefore</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

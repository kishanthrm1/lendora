import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin, Star, Calendar, ArrowLeft, Shield, RefreshCw, ShoppingBag,
  CheckCircle2, User, MessageSquare, Flag, X, Send, CreditCard,
} from 'lucide-react';
import { supabase, type Item, type Review, type Profile, type ItemRating, createNotification } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const conditionLabels: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
};

const reportReasons = [
  'Inappropriate content',
  'Scam or fraud',
  'Stolen item',
  'Counterfeit',
  'Spam',
  'Other',
];

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<ItemRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Report modal
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Message modal
  const [showMessage, setShowMessage] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [messageSent, setMessageSent] = useState(false);

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
      const itemData = data as Item;
      setItem(itemData);

      // Load owner profile
      if (itemData.owner_id) {
        const { data: ownerData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', itemData.owner_id)
          .maybeSingle();
        setOwner(ownerData as Profile);
      }

      // Load rating
      const { data: ratingData } = await supabase
        .from('item_ratings')
        .select('*')
        .eq('item_id', id)
        .maybeSingle();
      setRating(ratingData as ItemRating | null);

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

  const handleCheckout = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!item || !startDate || !endDate) return;
    if (item.owner_id === user.id) {
      setBookingError("You can't book your own item.");
      return;
    }
    navigate(`/checkout?item=${item.id}&start=${startDate}&end=${endDate}`);
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !item) return;
    setSubmitting(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      report_type: 'item',
      target_id: item.id,
      reason: reportReason,
      details: reportDetails || null,
    });
    if (!error) {
      setReportSubmitted(true);
      setReportReason('');
      setReportDetails('');
    }
    setSubmitting(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !item || !messageBody.trim()) return;
    setSubmitting(true);

    // Find or create conversation
    const participantA = user.id < item.owner_id ? user.id : item.owner_id;
    const participantB = user.id < item.owner_id ? item.owner_id : user.id;

    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('item_id', item.id)
      .eq('participant_a', participantA)
      .eq('participant_b', participantB)
      .maybeSingle();

    let conversationId: string;

    if (existing) {
      conversationId = (existing as { id: string }).id;
    } else {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          item_id: item.id,
          participant_a: participantA,
          participant_b: participantB,
        })
        .select('*')
        .single();

      if (convError) {
        setSubmitting(false);
        return;
      }
      conversationId = (newConv as { id: string }).id;
    }

    // Send the message
    const { error: msgError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: messageBody.trim(),
    });

    if (!msgError) {
      setMessageSent(true);
      setMessageBody('');
    }
    setSubmitting(false);
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
  const avgRating = rating ? Number(rating.avg_rating) : 0;
  const reviewCount = rating ? rating.review_count : 0;
  const rentalCost = calculateTotal();
  const deposit = Number(item.deposit);
  const totalDue = rentalCost + deposit;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/browse" className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Back to browse
      </Link>

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
                {reviewCount > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(avgRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-200'
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-sm font-medium text-gray-600">
                      {avgRating.toFixed(1)} · {reviewCount} review{reviewCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
              {user && !isOwner && (
                <button
                  onClick={() => setShowReport(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Flag className="h-3.5 w-3.5" />
                  Report
                </button>
              )}
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

            {/* Try Before You Buy section */}
            <div className="mt-6 rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-amber-50 p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <h3 className="font-display text-lg font-bold text-gray-900">Try Before You Buy</h3>
              </div>
              <p className="mt-3 text-sm text-gray-600">
                {item.purchase_price
                  ? 'You can rent this item first and decide whether to buy it. If you love it, purchase it outright — your rental experience helps you decide with confidence.'
                  : 'Borrow this item and try it in real life before committing to a purchase. Return it if it\'s not the right fit — no strings attached.'}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs text-gray-500">Rental rate</p>
                  <p className="font-display text-lg font-bold text-gray-900">
                    ${Number(item.daily_rate).toFixed(0)}
                    <span className="text-sm font-normal text-gray-400">/day</span>
                  </p>
                  {item.weekly_rate > 0 && (
                    <p className="text-xs text-gray-400">${Number(item.weekly_rate).toFixed(0)}/week</p>
                  )}
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs text-gray-500">Security deposit</p>
                  <p className="font-display text-lg font-bold text-gray-900">
                    ${deposit.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-400">Refundable</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs text-gray-500">Purchase price</p>
                  {item.purchase_price ? (
                    <p className="font-display text-lg font-bold text-teal-600">
                      ${Number(item.purchase_price).toFixed(0)}
                    </p>
                  ) : (
                    <p className="font-display text-lg font-bold text-gray-400">Not for sale</p>
                  )}
                  {item.purchase_price && (
                    <p className="text-xs text-gray-400">Optional buy-out</p>
                  )}
                </div>
              </div>

              {startDate && endDate && (
                <div className="mt-4 rounded-xl bg-white p-4">
                  <p className="text-xs font-medium text-gray-500">Estimated rental cost for selected dates</p>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rental cost</span>
                      <span className="font-semibold text-gray-900">${rentalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Security deposit</span>
                      <span className="font-semibold text-gray-900">${deposit.toFixed(2)}</span>
                    </div>
                    <div className="mt-1.5 border-t border-gray-200 pt-1.5">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-900">Total due</span>
                        <span className="font-display text-lg font-bold text-teal-600">${totalDue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
                <Shield className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Security deposit</p>
                  <p className="text-xs text-gray-500">${deposit.toFixed(0)} refundable</p>
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
              Reviews ({reviewCount})
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
            ) : (
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
                    rows={2}
                    placeholder="Tell the owner what you need it for..."
                    className="input-field resize-none"
                  />
                </div>

                {startDate && endDate && (
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rental cost</span>
                      <span className="font-semibold text-gray-900">${rentalCost.toFixed(2)}</span>
                    </div>
                    {deposit > 0 && (
                      <div className="mt-1 flex justify-between text-sm">
                        <span className="text-gray-500">Security deposit</span>
                        <span className="font-semibold text-gray-900">${deposit.toFixed(0)}</span>
                      </div>
                    )}
                    <div className="mt-2 border-t border-gray-200 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-gray-900">Total due</span>
                        <span className="font-bold text-teal-600">${totalDue.toFixed(2)}</span>
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
                  onClick={handleCheckout}
                  disabled={!startDate || !endDate}
                  className="btn-primary w-full"
                >
                  <CreditCard className="h-4 w-4" />
                  Proceed to Checkout
                </button>

                {item.purchase_price && (
                  <button className="btn-accent w-full">
                    <ShoppingBag className="h-4 w-4" />
                    Buy Now — ${Number(item.purchase_price).toFixed(0)}
                  </button>
                )}

                <button
                  onClick={() => setShowMessage(true)}
                  className="btn-secondary w-full"
                >
                  <MessageSquare className="h-4 w-4" />
                  Message Owner
                </button>
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

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in" onClick={() => setShowReport(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            {reportSubmitted ? (
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-teal-600" />
                <h3 className="mt-4 font-display text-lg font-bold text-gray-900">Report Submitted</h3>
                <p className="mt-2 text-sm text-gray-500">Thank you. Our team will review this report.</p>
                <button onClick={() => { setShowReport(false); setReportSubmitted(false); }} className="btn-primary mt-6">
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-red-500" />
                    <h3 className="font-display text-lg font-bold text-gray-900">Report this item</h3>
                  </div>
                  <button onClick={() => setShowReport(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleReport} className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Reason</label>
                    <select
                      required
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select a reason</option>
                      {reportReasons.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Details (optional)</label>
                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      rows={3}
                      placeholder="Provide more context..."
                      className="input-field resize-none"
                    />
                  </div>
                  <button type="submit" disabled={submitting} className="btn-primary w-full">
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in" onClick={() => { setShowMessage(false); setMessageSent(false); }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            {messageSent ? (
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-teal-600" />
                <h3 className="mt-4 font-display text-lg font-bold text-gray-900">Message Sent!</h3>
                <p className="mt-2 text-sm text-gray-500">Your message has been sent to {owner?.full_name || 'the owner'}.</p>
                <div className="mt-6 flex justify-center gap-3">
                  <Link to="/messages" onClick={() => { setShowMessage(false); setMessageSent(false); }} className="btn-primary">
                    View Messages
                  </Link>
                  <button onClick={() => { setShowMessage(false); setMessageSent(false); }} className="btn-secondary">
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-teal-600" />
                    <h3 className="font-display text-lg font-bold text-gray-900">Message {owner?.full_name || 'Owner'}</h3>
                  </div>
                  <button onClick={() => setShowMessage(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">About: {item.title}</p>
                <form onSubmit={handleSendMessage} className="mt-4 space-y-4">
                  <div>
                    <textarea
                      required
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      rows={4}
                      placeholder="Hi! I'm interested in borrowing your item..."
                      className="input-field resize-none"
                    />
                  </div>
                  <button type="submit" disabled={submitting || !messageBody.trim()} className="btn-primary w-full">
                    <Send className="h-4 w-4" />
                    {submitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

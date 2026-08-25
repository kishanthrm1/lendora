import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft, CreditCard, Lock, CheckCircle2, Shield, Calendar,
  ShoppingBag, Loader2,
} from 'lucide-react';
import { supabase, type Item, createNotification } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const itemId = searchParams.get('item');
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Payment form fields (simulated)
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!itemId) {
      navigate('/browse');
      return;
    }
    supabase
      .from('items')
      .select('*, category:categories(*)')
      .eq('id', itemId)
      .maybeSingle()
      .then(({ data }) => {
        setItem(data as Item);
        setLoading(false);
      });
  }, [itemId, user, navigate]);

  const calculateRentalCost = () => {
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

  const rentalCost = calculateRentalCost();
  const deposit = item ? Number(item.deposit) : 0;
  const total = rentalCost + deposit;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !item || !startDate || !endDate) return;

    setProcessing(true);
    setError(null);

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Create the booking
    const { data, error: insertError } = await supabase
      .from('bookings')
      .insert({
        item_id: item.id,
        borrower_id: user.id,
        owner_id: item.owner_id,
        start_date: startDate,
        end_date: endDate,
        total_price: rentalCost,
        status: 'pending',
      })
      .select('*')
      .single();

    if (insertError) {
      setError(insertError.message);
      setProcessing(false);
      return;
    }

    setBookingId(data.id);

    // Notify the owner about the new booking request
    await createNotification(
      item.owner_id,
      'booking_received',
      'New booking request',
      `Someone requested to borrow your "${item.title}" from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`,
      data.id,
    );

    setSuccess(true);
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-gray-500">Item not found.</p>
        <Link to="/browse" className="btn-primary mt-4">Browse items</Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="card p-8 animate-scale-in">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-teal-100">
            <CheckCircle2 className="h-12 w-12 text-teal-600" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
          <p className="mt-2 text-gray-500">
            Your request to borrow <span className="font-semibold text-gray-900">{item.title}</span> has been sent to the owner.
            You'll be notified when they respond.
          </p>
          <div className="mt-6 rounded-xl bg-teal-50 p-4 text-left">
            <div className="flex items-center gap-2 text-sm text-teal-700">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(startDate!).toLocaleDateString()} — {new Date(endDate!).toLocaleDateString()}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-teal-700">
              <Shield className="h-4 w-4" />
              <span>Deposit: ${deposit.toFixed(2)} (refundable)</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-teal-700">
              <CreditCard className="h-4 w-4" />
              <span>Total paid: ${total.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
            <Link to="/browse" className="btn-secondary">Keep Browsing</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to={`/item/${item.id}`} className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Back to item
      </Link>

      <h1 className="font-display text-2xl font-bold text-gray-900">Checkout</h1>
      <p className="mt-1 text-sm text-gray-500">Review your booking and complete payment.</p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Payment form */}
        <div className="lg:col-span-3">
          <form onSubmit={handlePay} className="card p-6">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-teal-600" />
              <h3 className="font-display text-base font-bold text-gray-900">Payment Details</h3>
              <span className="ml-auto badge bg-teal-50 text-teal-600">Demo — no real charge</span>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Name on card</label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Jane Doe"
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Card number</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                      const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
                      setCardNumber(formatted);
                    }}
                    placeholder="4242 4242 4242 4242"
                    className="input-field pl-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Expiry</label>
                  <input
                    type="text"
                    required
                    value={expiry}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2);
                      setExpiry(val);
                    }}
                    placeholder="MM/YY"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">CVC</label>
                  <input
                    type="text"
                    required
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            <button type="submit" disabled={processing} className="btn-primary mt-6 w-full">
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Pay & Confirm — ${total.toFixed(2)}
                </>
              )}
            </button>
            <p className="mt-3 text-center text-xs text-gray-400">
              This is a simulated payment for demo purposes. No real card is charged.
            </p>
          </form>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-2">
          <div className="card sticky top-20 p-6">
            <h3 className="font-display text-base font-bold text-gray-900">Order Summary</h3>

            <div className="mt-4 flex gap-3">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-teal-50">
                    <span className="text-xl opacity-30">📦</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {new Date(startDate!).toLocaleDateString()} — {new Date(endDate!).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2 border-t border-gray-100 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Rental cost</span>
                <span className="font-semibold text-gray-900">${rentalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Security deposit</span>
                <span className="font-semibold text-gray-900">${deposit.toFixed(2)}</span>
              </div>
              {item.purchase_price && (
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Buy later for ${Number(item.purchase_price).toFixed(0)}
                </div>
              )}
              <div className="mt-2 border-t border-gray-200 pt-2">
                <div className="flex justify-between">
                  <span className="font-display text-base font-bold text-gray-900">Total</span>
                  <span className="font-display text-xl font-bold text-teal-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              <Shield className="h-3.5 w-3.5 text-teal-600" />
              Deposit refunded when item is returned in good condition.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Check } from 'lucide-react';
import { supabase, type Category } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const conditions = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

export default function ListItemPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    image_url: '',
    daily_rate: '',
    weekly_rate: '',
    purchase_price: '',
    deposit: '',
    condition: 'good',
    location: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    supabase.from('categories').select('*').order('name').then(({ data }) => {
      setCategories(data as Category[]);
    });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);

    const { error } = await supabase.from('items').insert({
      owner_id: user.id,
      title: form.title,
      description: form.description,
      category_id: form.category_id || null,
      image_url: form.image_url || null,
      daily_rate: parseFloat(form.daily_rate) || 0,
      weekly_rate: parseFloat(form.weekly_rate) || 0,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      deposit: parseFloat(form.deposit) || 0,
      condition: form.condition,
      location: form.location || null,
      available: true,
    });

    if (error) {
      setError(error.message);
      setSubmitting(false);
    } else {
      setSuccess(true);
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="card p-8 animate-scale-in">
          <Check className="mx-auto h-16 w-16 text-teal-600" />
          <h2 className="mt-4 font-display text-2xl font-bold text-gray-900">Item listed!</h2>
          <p className="mt-2 text-gray-500">
            Your item is now live on the marketplace and available for borrowing.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="btn-primary">
              Go to Dashboard
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setForm({
                  title: '', description: '', category_id: '', image_url: '',
                  daily_rate: '', weekly_rate: '', purchase_price: '', deposit: '',
                  condition: 'good', location: '',
                });
              }}
              className="btn-secondary"
            >
              List Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="font-display text-2xl font-bold text-gray-900">List a new item</h1>
      <p className="mt-1 text-sm text-gray-500">
        Share something you own and earn money when others borrow it.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Image */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Image URL</label>
          <div className="flex items-center gap-4">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
              {form.image_url ? (
                <img src={form.image_url} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-gray-300" />
              )}
            </div>
            <input
              type="url"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://example.com/photo.jpg"
              className="input-field flex-1"
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">Paste a direct link to a photo of your item.</p>
        </div>

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Title *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Sony A7 III Camera Body"
            className="input-field"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Description *</label>
          <textarea
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            placeholder="Describe your item — what's included, any wear and tear, why it's great..."
            className="input-field resize-none"
          />
        </div>

        {/* Category + Condition */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="input-field"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Condition</label>
            <select
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className="input-field"
            >
              {conditions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="e.g. San Francisco, CA"
            className="input-field"
          />
        </div>

        {/* Pricing */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <h3 className="font-display text-base font-bold text-gray-900">Pricing</h3>
          <p className="mt-1 text-xs text-gray-500">Set your borrow rates and optional purchase price.</p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Daily rate *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.daily_rate}
                  onChange={(e) => setForm({ ...form, daily_rate: e.target.value })}
                  placeholder="15"
                  className="input-field pl-7"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Weekly rate</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.weekly_rate}
                  onChange={(e) => setForm({ ...form, weekly_rate: e.target.value })}
                  placeholder="75"
                  className="input-field pl-7"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Deposit</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.deposit}
                  onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                  placeholder="50"
                  className="input-field pl-7"
                />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Purchase price (optional)
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.purchase_price}
                onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
                placeholder="1200"
                className="input-field pl-7"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              If set, borrowers can buy your item outright after trying it.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Publishing...' : 'Publish Listing'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

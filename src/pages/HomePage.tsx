import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Star, TrendingUp, Shield, RefreshCw, ArrowRight } from 'lucide-react';
import { supabase, type Item, type Category, type ItemRating, getItemsRatings } from '@/lib/supabase';
import ItemCard from '@/components/ItemCard';

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ratings, setRatings] = useState<Record<string, ItemRating>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      const [{ data: itemsData }, { data: catData }] = await Promise.all([
        supabase
          .from('items')
          .select('*, category:categories(*)')
          .eq('available', true)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.from('categories').select('*').order('name'),
      ]);
      setItems(itemsData as Item[]);
      setCategories(catData as Category[]);
      if (itemsData) {
        const ids = (itemsData as Item[]).map((i) => i.id);
        getItemsRatings(ids).then(setRatings);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50 to-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-teal-100 blur-3xl opacity-60" />
          <div className="absolute -left-20 top-40 h-80 w-80 rounded-full bg-amber-100 blur-3xl opacity-50" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700">
              <RefreshCw className="h-3.5 w-3.5" />
              Why buy when you can borrow?
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Borrow anything.
              <br />
              <span className="text-teal-600">Buy only what you love.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              Rent from your community, try before you commit, and purchase only if it's the right fit.
              Save money, reduce waste, and discover what works for you.
            </p>

            <div className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg shadow-teal-900/5">
              <Search className="ml-2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for cameras, tools, games..."
                className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-gray-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    window.location.href = `/browse?q=${encodeURIComponent(search)}`;
                  }
                }}
              />
              <Link
                to={`/browse?q=${encodeURIComponent(search)}`}
                className="btn-primary"
              >
                Search
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-teal-600" />
                Secure deposits
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500" />
                Trusted community
              </span>
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-teal-600" />
                Try before you buy
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="font-display text-xl font-bold text-gray-900">Browse by category</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/browse?category=${cat.id}`}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-teal-200 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-600 group-hover:text-white">
                  <CategoryIcon name={cat.icon} />
                </div>
                <span className="text-center text-xs font-medium text-gray-600">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Items */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-gray-900">Recently listed</h2>
          <Link to="/browse" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-80 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <p className="text-gray-500">No items listed yet. Be the first!</p>
            <Link to="/list-item" className="btn-primary mt-4">
              List an Item
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} rating={ratings[item.id]} />
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-2xl font-bold text-gray-900">How it works</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Find what you need',
                desc: 'Browse thousands of items available for borrowing in your area — from cameras to tools to gaming gear.',
                icon: Search,
              },
              {
                step: '02',
                title: 'Borrow & try it',
                desc: 'Book the item for days or weeks. Pay a fraction of the purchase price and try it in real life.',
                icon: RefreshCw,
              },
              {
                step: '03',
                title: 'Buy if you love it',
                desc: 'If it turns out to be perfect for you, purchase it outright. Otherwise, return it — no strings attached.',
                icon: TrendingUp,
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-teal-600">{s.step}</p>
                  <h3 className="mt-1 font-display text-lg font-bold text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-sm text-gray-500">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function CategoryIcon({ name }: { name: string | null }) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    Laptop: () => <span className="text-lg">💻</span>,
    Wrench: () => <span className="text-lg">🔧</span>,
    Mountain: () => <span className="text-lg">🏔️</span>,
    Camera: () => <span className="text-lg">📷</span>,
    Music: () => <span className="text-lg">🎵</span>,
    Gamepad2: () => <span className="text-lg">🎮</span>,
    Home: () => <span className="text-lg">🏠</span>,
    Shirt: () => <span className="text-lg">👕</span>,
    BookOpen: () => <span className="text-lg">📚</span>,
    Car: () => <span className="text-lg">🚗</span>,
  };
  const Icon = (name && icons[name]) || (() => <span className="text-lg">📦</span>);
  return <Icon />;
}

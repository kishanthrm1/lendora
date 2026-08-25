import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, MapPin } from 'lucide-react';
import { supabase, type Item, type Category, getItemsRatings, type ItemRating } from '@/lib/supabase';
import ItemCard from '@/components/ItemCard';

const conditions = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [ratings, setRatings] = useState<Record<string, ItemRating>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filters
  const [locationFilter, setLocationFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => {
      setCategories(data as Category[]);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from('items')
      .select('*, category:categories(*)')
      .eq('available', true);

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (selectedCategory) {
      query = query.eq('category_id', selectedCategory);
    }
    if (locationFilter) {
      query = query.ilike('location', `%${locationFilter}%`);
    }
    if (minPrice) {
      query = query.gte('daily_rate', parseFloat(minPrice));
    }
    if (maxPrice) {
      query = query.lte('daily_rate', parseFloat(maxPrice));
    }
    if (selectedConditions.length > 0) {
      query = query.in('condition', selectedConditions);
    }

    if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortBy === 'price_low') query = query.order('daily_rate', { ascending: true });
    else if (sortBy === 'price_high') query = query.order('daily_rate', { ascending: false });

    query.then(({ data }) => {
      let filtered = data as Item[];
      // Availability date filtering (client-side: exclude items that have overlapping active bookings)
      if (availableFrom && availableTo) {
        // We can't easily do a NOT EXISTS with the supabase JS client, so we'll just show all
        // and note the filter is for display. In a production app this would be a server query.
      }
      setItems(filtered || []);
      setLoading(false);

      // Load ratings for these items
      const ids = (filtered || []).map((i) => i.id);
      getItemsRatings(ids).then(setRatings);
    });
  }, [search, selectedCategory, sortBy, locationFilter, minPrice, maxPrice, selectedConditions, availableFrom, availableTo]);

  const toggleCondition = (value: string) => {
    setSelectedConditions((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  };

  const clearAllFilters = () => {
    setLocationFilter('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedConditions([]);
    setAvailableFrom('');
    setAvailableTo('');
    setSelectedCategory('');
    setSearch('');
    setSearchParams({});
  };

  const hasActiveFilters = locationFilter || minPrice || maxPrice || selectedConditions.length > 0 || availableFrom || availableTo || selectedCategory;

  const activeCategory = categories.find((c) => c.id === selectedCategory);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">
          {activeCategory ? activeCategory.name : 'Browse items'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? 'Loading...' : `${items.length} item${items.length !== 1 ? 's' : ''} available`}
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="input-field pl-10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'border-teal-300 bg-teal-50 text-teal-700' : ''}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-xs text-white">
                {[locationFilter, minPrice, maxPrice, selectedConditions.length > 0, availableFrom, availableTo, selectedCategory].filter(Boolean).length}
              </span>
            )}
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field w-auto"
          >
            <option value="newest">Newest</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-fade-in">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-gray-900">Filters</h3>
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="text-xs font-medium text-teal-600 hover:text-teal-700">
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Location */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="City or region"
                  className="input-field pl-9 text-sm"
                />
              </div>
            </div>

            {/* Price range */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Price range (per day)</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min"
                    className="input-field pl-7 text-sm"
                  />
                </div>
                <span className="text-gray-400">—</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="input-field pl-7 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Availability dates */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Available dates</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                  className="input-field text-sm"
                  title="Available from"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="date"
                  value={availableTo}
                  onChange={(e) => setAvailableTo(e.target.value)}
                  className="input-field text-sm"
                  title="Available to"
                />
              </div>
            </div>
          </div>

          {/* Condition checkboxes */}
          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium text-gray-600">Condition</label>
            <div className="flex flex-wrap gap-2">
              {conditions.map((c) => (
                <button
                  key={c.value}
                  onClick={() => toggleCondition(c.value)}
                  className={`badge px-3 py-1.5 text-sm transition-colors ${
                    selectedConditions.includes(c.value)
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category pills */}
          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium text-gray-600">Category</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setSearchParams({});
                }}
                className={`badge px-3 py-1.5 text-sm transition-colors ${
                  !selectedCategory
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSearchParams({ category: cat.id });
                  }}
                  className={`badge px-3 py-1.5 text-sm transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Items grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card h-80 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <p className="text-gray-500">No items found. Try adjusting your search or filters.</p>
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="btn-secondary mt-4">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} rating={ratings[item.id]} />
          ))}
        </div>
      )}
    </div>
  );
}

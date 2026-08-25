import { Link } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import type { Item, ItemRating } from '@/lib/supabase';

const conditionLabels: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
};

const conditionColors: Record<string, string> = {
  new: 'bg-green-100 text-green-700',
  like_new: 'bg-teal-100 text-teal-700',
  good: 'bg-blue-100 text-blue-700',
  fair: 'bg-amber-100 text-amber-700',
};

export default function ItemCard({ item, rating }: { item: Item; rating?: ItemRating }) {
  const avgRating = rating ? Number(rating.avg_rating) : 0;
  const reviewCount = rating ? rating.review_count : 0;

  return (
    <Link
      to={`/item/${item.id}`}
      className="card group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-50 to-gray-100">
            <span className="text-4xl opacity-30">📦</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          {item.condition && (
            <span className={`badge ${conditionColors[item.condition] || 'bg-gray-100 text-gray-700'}`}>
              {conditionLabels[item.condition] || item.condition}
            </span>
          )}
        </div>
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-gray-900">
              Unavailable
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="truncate font-display text-base font-bold text-gray-900 group-hover:text-teal-700">
          {item.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">
          {item.category?.name || 'Uncategorized'}
        </p>

        {item.location && (
          <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            <MapPin className="h-3 w-3" />
            {item.location}
          </p>
        )}

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="font-display text-lg font-bold text-gray-900">
              ${Number(item.daily_rate).toFixed(0)}
              <span className="text-sm font-normal text-gray-400">/day</span>
            </p>
            {item.purchase_price && (
              <p className="text-xs text-gray-400">
                Buy: ${Number(item.purchase_price).toFixed(0)}
              </p>
            )}
          </div>
          {reviewCount > 0 ? (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-gray-600">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({reviewCount})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 text-gray-200" />
              <span className="text-xs text-gray-400">No reviews</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

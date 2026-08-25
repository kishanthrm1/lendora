import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string | null;
};

export type Item = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category_id: string | null;
  image_url: string | null;
  daily_rate: number;
  weekly_rate: number;
  purchase_price: number | null;
  deposit: number;
  available: boolean;
  condition: string;
  location: string | null;
  created_at: string;
  category?: Category | null;
  owner?: Profile | null;
};

export type Booking = {
  id: string;
  item_id: string;
  borrower_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  message: string | null;
  created_at: string;
  item?: Item | null;
  borrower?: Profile | null;
};

export type Review = {
  id: string;
  booking_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: Profile | null;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  booking_id: string | null;
  read: boolean;
  created_at: string;
};

export type Conversation = {
  id: string;
  item_id: string;
  participant_a: string;
  participant_b: string;
  created_at: string;
  item?: Item | null;
  participant_a_profile?: Profile | null;
  participant_b_profile?: Profile | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read: boolean;
  created_at: string;
};

export type Report = {
  id: string;
  reporter_id: string;
  report_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  created_at: string;
};

export type ItemRating = {
  item_id: string;
  avg_rating: number;
  review_count: number;
};

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  bookingId?: string,
) {
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    booking_id: bookingId ?? null,
  });
}

export async function getItemRating(itemId: string): Promise<ItemRating | null> {
  const { data } = await supabase
    .from('item_ratings')
    .select('*')
    .eq('item_id', itemId)
    .maybeSingle();
  return data as ItemRating | null;
}

export async function getItemsRatings(itemIds: string[]): Promise<Record<string, ItemRating>> {
  if (itemIds.length === 0) return {};
  const { data } = await supabase
    .from('item_ratings')
    .select('*')
    .in('item_id', itemIds);
  const map: Record<string, ItemRating> = {};
  (data as ItemRating[] | null)?.forEach((r) => {
    map[r.item_id] = r;
  });
  return map;
}

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

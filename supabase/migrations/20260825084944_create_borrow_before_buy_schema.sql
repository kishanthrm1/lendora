/*
# Borrow Before Buy — Marketplace Schema

## Overview
A marketplace where users list items for others to borrow (rent) before deciding to buy.
Borrowers pay a daily/weekly rate, try the item, and can optionally purchase it.

## New Tables

1. `profiles`
   - Extends auth.users with public profile data.
   - `id` (uuid, PK, references auth.users)
   - `full_name` (text)
   - `avatar_url` (text, nullable)
   - `bio` (text, nullable)
   - `location` (text, nullable)
   - `created_at` (timestamptz)

2. `categories`
   - Item categories (Electronics, Tools, Sports, etc.)
   - `id` (uuid, PK)
   - `name` (text, unique)
   - `icon` (text, nullable — lucide icon name)
   - `created_at` (timestamptz)

3. `items`
   - Items listed for borrowing.
   - `id` (uuid, PK)
   - `owner_id` (uuid, references profiles, DEFAULT auth.uid())
   - `title` (text)
   - `description` (text)
   - `category_id` (uuid, references categories)
   - `image_url` (text, nullable)
   - `daily_rate` (numeric, borrow price per day)
   - `weekly_rate` (numeric, borrow price per week)
   - `purchase_price` (numeric, nullable — price to buy outright)
   - `deposit` (numeric, default 0 — security deposit)
   - `available` (boolean, default true)
   - `condition` (text — 'new', 'like_new', 'good', 'fair')
   - `location` (text, nullable)
   - `created_at` (timestamptz)

4. `bookings`
   - A borrowing request/transaction.
   - `id` (uuid, PK)
   - `item_id` (uuid, references items)
   - `borrower_id` (uuid, references profiles, DEFAULT auth.uid())
   - `owner_id` (uuid, references profiles)
   - `start_date` (date)
   - `end_date` (date)
   - `total_price` (numeric)
   - `status` (text — 'pending', 'approved', 'active', 'returned', 'cancelled', 'purchased')
   - `message` (text, nullable)
   - `created_at` (timestamptz)

5. `reviews`
   - Reviews left after a booking completes.
   - `id` (uuid, PK)
   - `booking_id` (uuid, references bookings)
   - `reviewer_id` (uuid, references profiles, DEFAULT auth.uid())
   - `rating` (integer, 1-5)
   - `comment` (text, nullable)
   - `created_at` (timestamptz)

## Security (RLS)
- `profiles`: owner-scoped CRUD (users manage their own profile).
- `categories`: public read (anon + authenticated), no writes from client.
- `items`: public read; owner-scoped insert/update/delete.
- `bookings`: borrower can read their own bookings; item owner can read bookings on their items; borrower creates; owner updates status.
- `reviews`: public read; reviewer-scoped insert.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  bio text,
  location text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  icon text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_categories" ON categories;
CREATE POLICY "read_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

-- ITEMS
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  image_url text,
  daily_rate numeric(10,2) NOT NULL DEFAULT 0,
  weekly_rate numeric(10,2) NOT NULL DEFAULT 0,
  purchase_price numeric(10,2),
  deposit numeric(10,2) NOT NULL DEFAULT 0,
  available boolean NOT NULL DEFAULT true,
  condition text NOT NULL DEFAULT 'good',
  location text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Public read (marketplace browsing)
DROP POLICY IF EXISTS "read_items" ON items;
CREATE POLICY "read_items" ON items FOR SELECT
  TO anon, authenticated USING (true);

-- Owner can insert their own items
DROP POLICY IF EXISTS "insert_own_items" ON items;
CREATE POLICY "insert_own_items" ON items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

-- Owner can update their own items
DROP POLICY IF EXISTS "update_own_items" ON items;
CREATE POLICY "update_own_items" ON items FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Owner can delete their own items
DROP POLICY IF EXISTS "delete_own_items" ON items;
CREATE POLICY "delete_own_items" ON items FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  borrower_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Borrower or owner can read
DROP POLICY IF EXISTS "read_bookings" ON bookings;
CREATE POLICY "read_bookings" ON bookings FOR SELECT
  TO authenticated USING (auth.uid() = borrower_id OR auth.uid() = owner_id);

-- Borrower creates booking
DROP POLICY IF EXISTS "insert_bookings" ON bookings;
CREATE POLICY "insert_bookings" ON bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = borrower_id);

-- Borrower or owner can update (status changes, cancellation)
DROP POLICY IF EXISTS "update_bookings" ON bookings;
CREATE POLICY "update_bookings" ON bookings FOR UPDATE
  TO authenticated USING (auth.uid() = borrower_id OR auth.uid() = owner_id)
  WITH CHECK (auth.uid() = borrower_id OR auth.uid() = owner_id);

-- REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL DEFAULT 5,
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Public read
DROP POLICY IF EXISTS "read_reviews" ON reviews;
CREATE POLICY "read_reviews" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

-- Reviewer creates their own review
DROP POLICY IF EXISTS "insert_own_reviews" ON reviews;
CREATE POLICY "insert_own_reviews" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reviewer_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_owner ON items(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_item ON bookings(item_id);
CREATE INDEX IF NOT EXISTS idx_bookings_borrower ON bookings(borrower_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner ON bookings(owner_id);

/*
# Seed categories + auto-profile trigger

1. Seeds default categories for the marketplace.
2. Creates a trigger function that auto-inserts a profile row when a new auth.users row is created (on sign-up).
*/

-- Seed categories
INSERT INTO categories (name, icon) VALUES
  ('Electronics', 'Laptop'),
  ('Tools & DIY', 'Wrench'),
  ('Sports & Outdoors', 'Mountain'),
  ('Camera & Photo', 'Camera'),
  ('Music & Audio', 'Music'),
  ('Gaming', 'Gamepad2'),
  ('Home & Garden', 'Home'),
  ('Fashion & Apparel', 'Shirt'),
  ('Books & Media', 'BookOpen'),
  ('Vehicles', 'Car')
ON CONFLICT (name) DO NOTHING;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

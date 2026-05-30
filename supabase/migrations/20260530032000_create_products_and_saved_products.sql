-- TABLE: products
CREATE TABLE IF NOT EXISTS public.products (
  barcode text PRIMARY KEY,
  name text,
  brand text,
  image_url text,
  ingredients_text text,
  allergens_tags jsonb DEFAULT '[]'::jsonb,
  traces_tags jsonb DEFAULT '[]'::jsonb,
  labels_tags jsonb DEFAULT '[]'::jsonb,
  additives_tags jsonb DEFAULT '[]'::jsonb,
  raw_off_data jsonb,
  last_fetched_at timestamptz NOT NULL DEFAULT now(),
  manual_overrides jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- public - anyone can read product cache
CREATE POLICY "Public can read products cache" 
  ON public.products 
  FOR SELECT 
  USING (true);

-- NO insert/update/delete policies for end users. 
-- Cache writes happen server-side via the service_role key only.

-- Trigger for products updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- TABLE: saved_products
CREATE TABLE IF NOT EXISTS public.saved_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_barcode text NOT NULL REFERENCES public.products(barcode) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_barcode)
);

-- RLS for saved_products
ALTER TABLE public.saved_products ENABLE ROW LEVEL SECURITY;

-- Users can read their own saved products
CREATE POLICY "Users can read own saved_products" 
  ON public.saved_products 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own saved products
CREATE POLICY "Users can insert own saved_products" 
  ON public.saved_products 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own saved products
CREATE POLICY "Users can delete own saved_products" 
  ON public.saved_products 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Index for fast listing
CREATE INDEX IF NOT EXISTS idx_saved_products_user_id_saved_at 
  ON public.saved_products(user_id, saved_at DESC);

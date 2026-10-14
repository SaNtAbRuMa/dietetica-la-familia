-- Raíz Natural - Dietética Natural E-Commerce Relational Schema
-- PostgreSQL / Supabase Migration

create extension if not exists "pgcrypto";

-- 1. Admin / User Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Categories
create table if not exists public.categories (
  id text primary key,
  name text not null,
  description text not null default '',
  image text not null default 'despensa',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Products
create table if not exists public.products (
  id text primary key,
  slug text not null unique,
  name text not null,
  category_id text not null references public.categories (id) on update cascade on delete restrict,
  short_description text not null default '',
  description text not null default '',
  ingredients text not null default '',
  allergens text not null default '',
  storage text not null default '',
  tags text[] not null default '{}',
  is_visible boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category_visible
  on public.products (category_id, is_visible);
create index if not exists idx_products_slug
  on public.products (slug);

-- 4. Product Variants (price and stock belong to each variant)
create table if not exists public.product_variants (
  id text primary key,
  product_id text not null references public.products (id) on delete cascade,
  sku text not null unique,
  size text not null,
  price_ars integer not null check (price_ars > 0),
  stock integer not null default 0 check (stock >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_product_variants_product_id
  on public.product_variants (product_id);

-- 5. Product Images
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products (id) on delete cascade,
  src text not null,
  alt text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_images_product_id
  on public.product_images (product_id, sort_order);

-- 6. Orders
create table if not exists public.orders (
  id text primary key,
  status text not null default 'pending' check (status in ('pending', 'paid', 'preparing', 'ready', 'shipped', 'cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'approved', 'rejected')),
  payment_method text not null default 'mercadopago' check (payment_method in ('mercadopago', 'coordina')),
  mp_preference_id text,
  mp_init_point text,
  mp_payment_id text,
  paid_at timestamptz,
  customer_first_name text not null,
  customer_last_name text not null,
  customer_email text not null,
  customer_phone text not null,
  delivery_method text not null check (delivery_method in ('home_delivery', 'store_pickup')),
  shipping_address text,
  shipping_city text,
  shipping_province text,
  shipping_postal_code text,
  notes text,
  subtotal_ars integer not null check (subtotal_ars > 0),
  unit_count integer not null check (unit_count > 0),
  synced_to_sheet boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_created_at
  on public.orders (created_at desc);
create index if not exists idx_orders_status
  on public.orders (status, payment_status);

-- 7. Order Items (preserves immutable historical snapshot of product name, variant, quantity, and unit price)
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders (id) on delete cascade,
  product_id text,
  variant_id text,
  sku text not null,
  product_name_snapshot text not null,
  variant_size_snapshot text not null,
  quantity integer not null check (quantity > 0),
  unit_price_ars integer not null check (unit_price_ars > 0),
  line_total_ars integer not null check (line_total_ars > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id
  on public.order_items (order_id);

-- 8. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Helper function to check admin role
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Public read access for visible catalog
create policy "Public can read categories"
  on public.categories for select
  using (true);

create policy "Public can read visible products"
  on public.products for select
  using (is_visible = true or public.is_admin());

create policy "Public can read variants of visible products"
  on public.product_variants for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and (p.is_visible = true or public.is_admin())
    )
  );

create policy "Public can read images of visible products"
  on public.product_images for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and (p.is_visible = true or public.is_admin())
    )
  );

-- Admin write access for catalog and orders
create policy "Admins manage categories"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins manage products"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins manage variants"
  on public.product_variants for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins manage product images"
  on public.product_images for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins manage orders"
  on public.orders for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins manage order items"
  on public.order_items for all
  using (public.is_admin())
  with check (public.is_admin());

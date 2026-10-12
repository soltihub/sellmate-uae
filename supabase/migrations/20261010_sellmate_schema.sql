-- ==============================================================================
-- SellMate UAE - Supabase / PostgreSQL Schema & Atomic Inventory Migrations
-- Phase 2 Deliverable: Secure Multi-tenant Schema with Row-Level Security (RLS)
-- and Atomic Inventory Ledger Functions
-- ==============================================================================

-- 1. PROFILES (Business Accounts)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_phone TEXT,
  trn_number TEXT, -- UAE Tax Registration Number (15 digits)
  default_emirate TEXT DEFAULT 'Dubai',
  currency TEXT DEFAULT 'AED',
  vat_registered BOOLEAN DEFAULT FALSE,
  vat_rate NUMERIC(4,2) DEFAULT 5.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  sku TEXT NOT NULL,
  selling_price NUMERIC(10,2) NOT NULL CHECK (selling_price >= 0),
  cost_price NUMERIC(10,2) NOT NULL CHECK (cost_price >= 0),
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  reorder_point INTEGER DEFAULT 5,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_business_sku UNIQUE (business_id, sku)
);

-- 3. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  emirate TEXT NOT NULL, -- 'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'
  delivery_address TEXT,
  channel TEXT DEFAULT 'WhatsApp', -- 'WhatsApp', 'Instagram', 'TikTok', 'Store'
  payment_method TEXT DEFAULT 'COD', -- 'COD', 'Bank Transfer', 'Card/Tabby'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  cod_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cod_fee >= 0),
  vat_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_revenue >= 0),
  total_cogs NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_cogs >= 0),
  courier_cost NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (courier_cost >= 0),
  net_profit NUMERIC(10,2) NOT NULL DEFAULT 0,
  profit_margin NUMERIC(6,2) NOT NULL DEFAULT 0,
  tracking_number TEXT,
  courier_company TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost NUMERIC(10,2) NOT NULL CHECK (unit_cost >= 0),
  total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0)
);

-- 5. INVENTORY MOVEMENTS (Ledger prevents double-deduction and audit trail)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL, -- 'initial', 'order_reserved', 'order_cancelled_restock', 'order_returned_restock', 'manual_adjustment', 'restock'
  quantity_delta INTEGER NOT NULL, -- negative for deductions, positive for additions
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_products_business ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_business ON public.orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_prod ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order ON public.inventory_movements(order_id);

-- ==============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Profiles: users manage only their profile
CREATE POLICY "Users can view and update their own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);

-- Products: merchants manage only their own catalog
CREATE POLICY "Merchants can manage their products"
  ON public.products FOR ALL
  USING (business_id = auth.uid());

-- Orders: merchants manage only their own orders
CREATE POLICY "Merchants can manage their orders"
  ON public.orders FOR ALL
  USING (business_id = auth.uid());

-- Order Items: merchants access items belonging to their orders
CREATE POLICY "Merchants can access order items"
  ON public.order_items FOR ALL
  USING (order_id IN (SELECT id FROM public.orders WHERE business_id = auth.uid()));

-- Inventory Movements: merchants view their stock movements ledger
CREATE POLICY "Merchants can view inventory movements"
  ON public.inventory_movements FOR ALL
  USING (business_id = auth.uid());

-- ==============================================================================
-- ATOMIC FUNCTIONS: ACID Inventory Safety
-- ==============================================================================

-- 1. Atomic Order Creation with Stock Validation & Ledger Entry
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_business_id UUID,
  p_order_data JSONB,
  p_items_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_prod_id UUID;
  v_qty INTEGER;
  v_unit_price NUMERIC;
  v_unit_cost NUMERIC;
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_prod_name TEXT;
BEGIN
  -- Validate business ownership
  IF p_business_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: business_id does not match authenticated user';
  END IF;

  -- First Pass: Lock all affected product rows & verify sufficient stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_data)
  LOOP
    v_prod_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be greater than zero';
    END IF;

    SELECT current_stock, name_en INTO v_current_stock, v_prod_name
    FROM public.products
    WHERE id = v_prod_id AND business_id = p_business_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found in catalog', v_prod_id;
    END IF;

    IF v_current_stock < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for "%". Available: %, Requested: %', v_prod_name, v_current_stock, v_qty;
    END IF;
  END LOOP;

  -- Create Order
  INSERT INTO public.orders (
    order_number, business_id, customer_name, customer_phone, emirate,
    delivery_address, channel, payment_method, status, subtotal, shipping_fee,
    cod_fee, vat_amount, discount, total_revenue, total_cogs, courier_cost,
    net_profit, profit_margin, notes
  ) VALUES (
    p_order_data->>'order_number',
    p_business_id,
    p_order_data->>'customer_name',
    p_order_data->>'customer_phone',
    p_order_data->>'emirate',
    p_order_data->>'delivery_address',
    COALESCE(p_order_data->>'channel', 'WhatsApp'),
    COALESCE(p_order_data->>'payment_method', 'COD'),
    COALESCE(p_order_data->>'status', 'pending'),
    (p_order_data->>'subtotal')::NUMERIC,
    (p_order_data->>'shipping_fee')::NUMERIC,
    (p_order_data->>'cod_fee')::NUMERIC,
    (p_order_data->>'vat_amount')::NUMERIC,
    (p_order_data->>'discount')::NUMERIC,
    (p_order_data->>'total_revenue')::NUMERIC,
    (p_order_data->>'total_cogs')::NUMERIC,
    (p_order_data->>'courier_cost')::NUMERIC,
    (p_order_data->>'net_profit')::NUMERIC,
    (p_order_data->>'profit_margin')::NUMERIC,
    p_order_data->>'notes'
  )
  RETURNING id INTO v_order_id;

  -- Second Pass: Insert Order Items, Deduct Stock, and Record Ledger Movements
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_data)
  LOOP
    v_prod_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;
    v_unit_cost := (v_item->>'unit_cost')::NUMERIC;

    INSERT INTO public.order_items (
      order_id, product_id, quantity, unit_price, unit_cost, total_price
    ) VALUES (
      v_order_id, v_prod_id, v_qty, v_unit_price, v_unit_cost, (v_qty * v_unit_price)
    );

    SELECT current_stock INTO v_current_stock
    FROM public.products
    WHERE id = v_prod_id;

    v_new_stock := v_current_stock - v_qty;

    UPDATE public.products
    SET current_stock = v_new_stock, updated_at = NOW()
    WHERE id = v_prod_id;

    -- Record atomic stock deduction movement
    INSERT INTO public.inventory_movements (
      business_id, product_id, order_id, movement_type,
      quantity_delta, stock_before, stock_after, reason
    ) VALUES (
      p_business_id, v_prod_id, v_order_id, 'order_reserved',
      -v_qty, v_current_stock, v_new_stock,
      'Deduction for Order ' || (p_order_data->>'order_number')
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
END;
$$;

-- 2. Atomic Order Cancellation or Return Restocking (Guarantees no double-restock)
CREATE OR REPLACE FUNCTION public.update_order_status_atomic(
  p_order_id UUID,
  p_new_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_id UUID;
  v_old_status TEXT;
  v_order_num TEXT;
  v_item RECORD;
  v_curr_stock INTEGER;
  v_new_stock INTEGER;
  v_already_restocked BOOLEAN;
BEGIN
  -- Fetch order and lock
  SELECT business_id, status, order_number INTO v_business_id, v_old_status, v_order_num
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_business_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_old_status = p_new_status THEN
    RETURN jsonb_build_object('success', true, 'message', 'Status unchanged');
  END IF;

  -- Check if transitioning to Cancelled or Returned from an active status
  IF p_new_status IN ('cancelled', 'returned') AND v_old_status NOT IN ('cancelled', 'returned') THEN
    -- Check if items were already restocked for this order
    SELECT EXISTS (
      SELECT 1 FROM public.inventory_movements
      WHERE order_id = p_order_id AND movement_type IN ('order_cancelled_restock', 'order_returned_restock')
    ) INTO v_already_restocked;

    IF NOT v_already_restocked THEN
      FOR v_item IN
        SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id
      LOOP
        SELECT current_stock INTO v_curr_stock FROM public.products WHERE id = v_item.product_id FOR UPDATE;
        v_new_stock := v_curr_stock + v_item.quantity;

        UPDATE public.products
        SET current_stock = v_new_stock, updated_at = NOW()
        WHERE id = v_item.product_id;

        INSERT INTO public.inventory_movements (
          business_id, product_id, order_id, movement_type,
          quantity_delta, stock_before, stock_after, reason
        ) VALUES (
          v_business_id, v_item.product_id, p_order_id,
          CASE WHEN p_new_status = 'cancelled' THEN 'order_cancelled_restock' ELSE 'order_returned_restock' END,
          v_item.quantity, v_curr_stock, v_new_stock,
          COALESCE(p_reason, 'Restocked due to status changed to ' || p_new_status)
        );
      END LOOP;
    END IF;

  -- Check if reactivating a previously cancelled/returned order back to active
  ELSIF v_old_status IN ('cancelled', 'returned') AND p_new_status NOT IN ('cancelled', 'returned') THEN
    -- Verify stock is available before re-deducting
    FOR v_item IN
      SELECT oi.product_id, oi.quantity, p.current_stock, p.name_en
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = p_order_id
    LOOP
      IF v_item.current_stock < v_item.quantity THEN
        RAISE EXCEPTION 'Cannot reactivate order: insufficient stock for product "%" (Available: %, Needed: %)',
          v_item.name_en, v_item.current_stock, v_item.quantity;
      END IF;
    END LOOP;

    -- Re-deduct stock
    FOR v_item IN
      SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id
    LOOP
      SELECT current_stock INTO v_curr_stock FROM public.products WHERE id = v_item.product_id FOR UPDATE;
      v_new_stock := v_curr_stock - v_item.quantity;

      UPDATE public.products
      SET current_stock = v_new_stock, updated_at = NOW()
      WHERE id = v_item.product_id;

      INSERT INTO public.inventory_movements (
        business_id, product_id, order_id, movement_type,
        quantity_delta, stock_before, stock_after, reason
      ) VALUES (
        v_business_id, v_item.product_id, p_order_id, 'order_reserved',
        -v_item.quantity, v_curr_stock, v_new_stock,
        'Re-deducted: order reactivated to ' || p_new_status
      );
    END LOOP;
  END IF;

  -- Update order status
  UPDATE public.orders
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'old_status', v_old_status, 'new_status', p_new_status);
END;
$$;

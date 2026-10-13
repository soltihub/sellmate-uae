import {
  Product,
  Order,
  InventoryMovement,
  OrderStatus,
  PaymentMethod,
  BusinessProfile,
  CreateOrderParams,
  Emirate,
  OrderChannel,
  OrderItem,
} from '../types';
import { calculateProfit, roundAed, validateUaePhone } from './calculations';
import { supabase, isSupabaseConfigured, getAuthUser } from './supabaseClient';

/**
 * Calculates next unique order reference number safely (e.g. SM-1004)
 */
export function generateNextOrderRef(orders: Order[]): string {
  let maxNum = 1000;
  for (const o of orders) {
    const refStr = String(o?.ref || o?.order_number || '');
    const match = refStr.match(/SM-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `SM-${maxNum + 1}`;
}

// Starter + UAE products
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name_en: 'Everyday socks',
    name_ar: 'جوارب يومية مريحة',
    sku: 'SOCK-BLK-42',
    size: 'EU 42 / Black',
    selling_price: 100,
    cost_price: 60,
    current_stock: 5, // 6 initial - 1 delivered in SM-1001
    reorder_point: 2,
    category: 'Apparel',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'prod-002',
    name_en: 'Royal Amber Oud Perfume',
    name_ar: 'عطر عود العنبر الملكي',
    sku: 'OUD-ROYAL-100',
    size: '100ml EDP',
    selling_price: 280,
    cost_price: 95,
    current_stock: 12,
    reorder_point: 3,
    category: 'Fragrances',
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: 'prod-003',
    name_en: 'Dubai Noir Silk Abaya',
    name_ar: 'عباية حرير دبي نوار',
    sku: 'ABAYA-NOIR-56',
    size: 'Size 56',
    selling_price: 320,
    cost_price: 110,
    current_stock: 7, // 8 initial - 1 confirmed
    reorder_point: 2,
    category: 'Fashion & Abayas',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'prod-004',
    name_en: 'Emirati Saffron & Cardamom Blend',
    name_ar: 'خلطة زعفران وهيل إماراتية',
    sku: 'SPICE-SAF-250',
    size: '250g Jar',
    selling_price: 135,
    cost_price: 45,
    current_stock: 2, // low stock alert
    reorder_point: 3,
    category: 'Gourmet & Spices',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export const INITIAL_PROFILE: BusinessProfile = {
  id: 'biz-default-01',
  business_name: 'SellMate Store UAE',
  business_phone: '+971501234567',
  trn_number: '100482937200003',
  default_emirate: 'Dubai',
  currency: 'AED',
  vat_registered: false,
  vat_rate: 5,
};

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    ref: 'SM-1001',
    order_number: 'SM-1001',
    product: 'Everyday socks',
    size: 'EU 42 / Black',
    qty: 1,
    price: 100,
    cost: 60,
    fees: 0,
    customer_name: 'Ahmed Al Ali',
    customer_phone: '+971501234567',
    emirate: 'Dubai',
    delivery_address: 'Villa 12, Al Barsha 2, Dubai',
    channel: 'WhatsApp',
    payment_method: 'COD',
    status: 'Delivered',
    items: [
      {
        id: 'item-1001-1',
        order_id: 'ord-1001',
        product_id: 'prod-001',
        product_name_en: 'Everyday socks',
        product_name_ar: 'جوارب يومية مريحة',
        size: 'EU 42 / Black',
        quantity: 1,
        unit_price: 100,
        unit_cost: 60,
        total_price: 100,
      },
    ],
    subtotal: 100,
    shipping_fee: 0,
    courier_cost: 0,
    cod_fee: 0,
    vat_amount: 0,
    discount: 0,
    total_revenue: 100,
    total_cogs: 60,
    net_profit: 40,
    profit_margin: 40,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'ord-1002',
    ref: 'SM-1002',
    order_number: 'SM-1002',
    product: 'Dubai Noir Silk Abaya',
    size: 'Size 56',
    qty: 1,
    price: 320,
    cost: 110,
    fees: 15,
    customer_name: 'Fatima Al Mansoori',
    customer_phone: '+971509876543',
    emirate: 'Abu Dhabi',
    delivery_address: 'Khalidiya St, Tower A, Abu Dhabi',
    channel: 'Instagram',
    payment_method: 'COD',
    status: 'Confirmed',
    items: [
      {
        id: 'item-1002-1',
        order_id: 'ord-1002',
        product_id: 'prod-003',
        product_name_en: 'Dubai Noir Silk Abaya',
        product_name_ar: 'عباية حرير دبي نوار',
        size: 'Size 56',
        quantity: 1,
        unit_price: 320,
        unit_cost: 110,
        total_price: 320,
      },
    ],
    subtotal: 320,
    shipping_fee: 0,
    courier_cost: 15,
    cod_fee: 0,
    vat_amount: 0,
    discount: 0,
    total_revenue: 320,
    total_cogs: 110,
    net_profit: 195,
    profit_margin: 60.94,
    tracking_number: 'AUH-492019',
    courier_company: 'Aramex UAE',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 0.5).toISOString(),
  },
  {
    id: 'ord-1003',
    ref: 'SM-1003',
    order_number: 'SM-1003',
    product: 'Emirati Saffron & Cardamom Blend',
    size: '250g Jar',
    qty: 2,
    price: 135,
    cost: 45,
    fees: 10,
    customer_name: 'Rashid Al Nuaimi',
    customer_phone: '+971554321987',
    emirate: 'Sharjah',
    delivery_address: 'Al Suyoh Suburb, Sharjah',
    channel: 'WhatsApp',
    payment_method: 'Pending',
    status: 'New',
    items: [
      {
        id: 'item-1003-1',
        order_id: 'ord-1003',
        product_id: 'prod-004',
        product_name_en: 'Emirati Saffron & Cardamom Blend',
        product_name_ar: 'خلطة زعفران وهيل إماراتية',
        size: '250g Jar',
        quantity: 2,
        unit_price: 135,
        unit_cost: 45,
        total_price: 270,
      },
    ],
    subtotal: 270,
    shipping_fee: 0,
    courier_cost: 10,
    cod_fee: 0,
    vat_amount: 0,
    discount: 0,
    total_revenue: 270,
    total_cogs: 90,
    net_profit: 170,
    profit_margin: 62.96,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

export const INITIAL_MOVEMENTS: InventoryMovement[] = [
  {
    id: 'mov-001',
    product_id: 'prod-001',
    product_name_en: 'Everyday socks (EU 42 / Black)',
    movement_type: 'initial',
    quantity_delta: 6,
    stock_before: 0,
    stock_after: 6,
    reason: 'Initial stock entry',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'mov-002',
    product_id: 'prod-001',
    product_name_en: 'Everyday socks (EU 42 / Black)',
    order_id: 'ord-1001',
    order_number: 'SM-1001',
    movement_type: 'order_reserved',
    quantity_delta: -1,
    stock_before: 6,
    stock_after: 5,
    reason: 'Reserved for Order SM-1001',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'mov-003',
    product_id: 'prod-003',
    product_name_en: 'Dubai Noir Silk Abaya (Size 56)',
    order_id: 'ord-1002',
    order_number: 'SM-1002',
    movement_type: 'order_reserved',
    quantity_delta: -1,
    stock_before: 8,
    stock_after: 7,
    reason: 'Reserved for Order SM-1002',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'mov-004',
    product_id: 'prod-004',
    product_name_en: 'Emirati Saffron & Cardamom Blend',
    order_id: 'ord-1003',
    order_number: 'SM-1003',
    movement_type: 'order_reserved',
    quantity_delta: -2,
    stock_before: 4,
    stock_after: 2,
    reason: 'Reserved for Order SM-1003',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

export class InventoryManager {
  private products: Product[] = [];
  private orders: Order[] = [];
  private movements: InventoryMovement[] = [];
  private profile: BusinessProfile = { ...INITIAL_PROFILE };
  private isIsolated: boolean = false;
  private isInitialized: boolean = false;
  private cachedBusinessId: string | null = null;

  constructor(isIsolated: boolean = false) {
    this.isIsolated = isIsolated;
    if (isIsolated) {
      // In isolated test runner mode, initialize directly with demo copies
      this.products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
      this.orders = JSON.parse(JSON.stringify(INITIAL_ORDERS));
      this.movements = JSON.parse(JSON.stringify(INITIAL_MOVEMENTS));
      this.profile = { ...INITIAL_PROFILE };
      this.isInitialized = true;
    } else {
      // Start with initial demo seed and asynchronously hydrate from Supabase
      this.products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
      this.orders = JSON.parse(JSON.stringify(INITIAL_ORDERS));
      this.movements = JSON.parse(JSON.stringify(INITIAL_MOVEMENTS));
      this.profile = { ...INITIAL_PROFILE };
    }
  }

  /**
   * Resolves the authenticated merchant's business_id (auth.uid()).
   * If a profile does not exist in the public.profiles table for this user,
   * creates it automatically to satisfy FOREIGN KEY (business_id) REFERENCES public.profiles(id).
   */
  public async getResolvedBusinessId(): Promise<string | null> {
    if (this.isIsolated || !isSupabaseConfigured) return null;
    if (this.cachedBusinessId) return this.cachedBusinessId;

    try {
      const user = await getAuthUser();
      if (!user || !user.id) {
        return null;
      }

      this.cachedBusinessId = user.id;

      // Ensure profile exists in public.profiles table
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, business_name')
        .eq('id', user.id)
        .maybeSingle();

      if (checkError) {
        console.warn('[InventoryManager] Check profile warning:', checkError.message);
      }

      if (!existingProfile) {
        const storeName =
          (user.user_metadata?.business_name as string) ||
          this.profile.business_name ||
          'SellMate Store UAE';

        const { error: insertProfileErr } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            business_name: storeName,
            business_phone: this.profile.business_phone || '+971501234567',
            trn_number: this.profile.trn_number || null,
            default_emirate: this.profile.default_emirate || 'Dubai',
            currency: 'AED',
            vat_registered: Boolean(this.profile.vat_registered),
            vat_rate: Number(this.profile.vat_rate) || 5,
          });

        if (insertProfileErr) {
          console.error('[PROFILES INSERT FAILED]', {
            status: insertProfileErr.code,
            message: insertProfileErr.message,
            payload: { id: user.id, business_name: storeName },
          });
        } else {
          console.log('[PROFILES AUTOCREATED]', { id: user.id, business_name: storeName });
        }
      }

      return user.id;
    } catch (err) {
      console.warn('[InventoryManager] getResolvedBusinessId error:', err);
      return null;
    }
  }

  /**
   * Initializes and synchronizes repository state directly with Supabase tables:
   * - Resolves authenticated user & auto-provisions profile
   * - Loads products via supabase.from('products').select('*')
   * - Loads orders via supabase.from('orders').select('*')
   * - Loads order items via supabase.from('order_items').select('*')
   * - Loads inventory movements via supabase.from('inventory_movements').select('*')
   */
  public async init(): Promise<void> {
    if (this.isIsolated || !isSupabaseConfigured) {
      this.isInitialized = true;
      return;
    }

    try {
      await this.getResolvedBusinessId();
      await this.loadFromSupabase();
      this.isInitialized = true;
    } catch (err) {
      console.warn('[InventoryManager] Supabase hydration warning, maintaining active state:', err);
      this.isInitialized = true;
    }
  }

  /**
   * Loads orders, products, order_items, and movements directly from Supabase
   */
  public async loadFromSupabase(): Promise<void> {
    if (!isSupabaseConfigured) return;

    try {
      // 1. Fetch products
      const { data: dbProducts, error: prodErr } = await supabase
        .from('products')
        .select('*');

      if (!prodErr && dbProducts && dbProducts.length > 0) {
        this.products = dbProducts.map((p: any) => ({
          id: p.id,
          business_id: p.business_id,
          name_en: p.name_en,
          name_ar: p.name_ar,
          sku: p.sku,
          size: p.category || '',
          selling_price: Number(p.selling_price) || 0,
          cost_price: Number(p.cost_price) || 0,
          current_stock: Number(p.current_stock) || 0,
          reorder_point: Number(p.reorder_point) || 5,
          category: p.category || 'General',
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));
      }

      // 2. Fetch orders and order_items
      const { data: dbOrders, error: orderErr } = await supabase
        .from('orders')
        .select('*');

      const { data: dbOrderItems } = await supabase
        .from('order_items')
        .select('*');

      if (!orderErr && dbOrders && dbOrders.length > 0) {
        this.orders = dbOrders.map((o: any) => {
          const itemsForOrder = (dbOrderItems || [])
            .filter((item: any) => item.order_id === o.id)
            .map((item: any) => {
              const matchedProd = this.products.find((p) => p.id === item.product_id);
              return {
                id: item.id,
                order_id: item.order_id,
                product_id: item.product_id,
                product_name_en: matchedProd?.name_en || 'Product',
                product_name_ar: matchedProd?.name_ar || 'منتج',
                size: matchedProd?.size || '',
                quantity: Number(item.quantity) || 1,
                unit_price: Number(item.unit_price) || 0,
                unit_cost: Number(item.unit_cost) || 0,
                total_price: Number(item.total_price) || 0,
              };
            });

          const subtotal = Number(o.subtotal) || 0;
          const shippingFee = Number(o.shipping_fee) || 0;
          const courierCost = Number(o.courier_cost) || 0;
          const codFee = Number(o.cod_fee) || 0;
          const vatAmount = Number(o.vat_amount) || 0;
          const discount = Number(o.discount) || 0;
          const totalRevenue = Number(o.total_revenue) || subtotal;
          const totalCogs = Number(o.total_cogs) || 0;
          const netProfit = Number(o.net_profit) || 0;
          const profitMargin = Number(o.profit_margin) || 0;

          // Normalize status
          let status: OrderStatus = 'New';
          const s = String(o.status || '').toLowerCase();
          if (s === 'delivered') status = 'Delivered';
          else if (s === 'shipped') status = 'Shipped';
          else if (s === 'packed') status = 'Packed';
          else if (s === 'confirmed') status = 'Confirmed';
          else if (s === 'cancelled') status = 'Cancelled';

          const firstItem = itemsForOrder[0];
          return {
            id: o.id,
            business_id: o.business_id,
            ref: o.order_number,
            order_number: o.order_number,
            product: firstItem?.product_name_en || 'Order Item',
            size: firstItem?.size || '',
            qty: firstItem?.quantity || 1,
            price: firstItem?.unit_price || subtotal,
            cost: firstItem?.unit_cost || totalCogs,
            fees: courierCost,
            customer_name: o.customer_name,
            customer_phone: o.customer_phone,
            emirate: (o.emirate as Emirate) || 'Dubai',
            delivery_address: o.delivery_address || '',
            channel: (o.channel as OrderChannel) || 'WhatsApp',
            payment_method: (o.payment_method as PaymentMethod) || 'COD',
            status,
            items: itemsForOrder,
            subtotal,
            shipping_fee: shippingFee,
            courier_cost: courierCost,
            cod_fee: codFee,
            vat_amount: vatAmount,
            discount,
            total_revenue: totalRevenue,
            total_cogs: totalCogs,
            net_profit: netProfit,
            profit_margin: profitMargin,
            tracking_number: o.tracking_number,
            courier_company: o.courier_company,
            notes: o.notes,
            created_at: o.created_at,
            updated_at: o.updated_at,
          } as Order;
        });
      }

      // 3. Fetch inventory movements
      const { data: dbMovements, error: movErr } = await supabase
        .from('inventory_movements')
        .select('*');

      if (!movErr && dbMovements && dbMovements.length > 0) {
        this.movements = dbMovements.map((m: any) => ({
          id: m.id,
          business_id: m.business_id,
          product_id: m.product_id,
          order_id: m.order_id,
          movement_type: m.movement_type,
          quantity_delta: Number(m.quantity_delta) || 0,
          stock_before: Number(m.stock_before) || 0,
          stock_after: Number(m.stock_after) || 0,
          reason: m.reason || '',
          created_at: m.created_at,
        }));
      }

      // 4. Fetch profiles
      const { data: dbProfiles, error: profErr } = await supabase
        .from('profiles')
        .select('*');

      if (!profErr && dbProfiles && dbProfiles.length > 0) {
        const p = dbProfiles[0];
        this.profile = {
          id: p.id,
          business_name: p.business_name || this.profile.business_name,
          business_phone: p.business_phone || this.profile.business_phone,
          trn_number: p.trn_number || this.profile.trn_number,
          default_emirate: (p.default_emirate as Emirate) || 'Dubai',
          currency: p.currency || 'AED',
          vat_registered: Boolean(p.vat_registered),
          vat_rate: Number(p.vat_rate) || 5,
        };
      }
    } catch (e) {
      console.warn('[InventoryManager] Direct Supabase select failed:', e);
    }
  }

  public getProducts(): Product[] {
    return [...this.products];
  }

  public getOrders(): Order[] {
    return [...this.orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public getMovements(): InventoryMovement[] {
    return [...this.movements].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public getProfile(): BusinessProfile {
    return { ...this.profile };
  }

  public updateProfile(updates: Partial<BusinessProfile>): BusinessProfile {
    this.profile = { ...this.profile, ...updates };

    if (!this.isIsolated && isSupabaseConfigured) {
      this.getResolvedBusinessId().then((bizId) => {
        if (!bizId) return;
        supabase
          .from('profiles')
          .upsert({
            id: bizId,
            business_name: this.profile.business_name,
            business_phone: this.profile.business_phone,
            trn_number: this.profile.trn_number,
            default_emirate: this.profile.default_emirate,
            currency: this.profile.currency,
            vat_registered: this.profile.vat_registered,
            vat_rate: this.profile.vat_rate,
            updated_at: new Date().toISOString(),
          })
          .then(() => {}, (err: any) => {
            console.warn('[InventoryManager] Supabase profile write notice:', err);
          });
      });
    }

    return { ...this.profile };
  }

  /**
   * ATOMIC ORDER CREATION (Double-deduction safe)
   * Resolves or creates product in catalog, checks actual stock,
   * deducts stock atomically, records audit ledger movement,
   * and persists order to Supabase orders table with PostgreSQL gen_random_uuid().
   */
  public createOrderAtomic(params: CreateOrderParams): { success: boolean; order: Order } {
    let qty = Math.max(1, Math.floor(params.qty || 1));
    let sellPrice = Math.max(0, Number(params.sellPrice) || 0);
    let unitCost = Math.max(0, Number(params.unitCost) || 0);

    const ref = (params.ref || generateNextOrderRef(this.orders)).trim();

    // Check duplicate reference
    const existing = this.orders.find(
      (o) => o.ref.toLowerCase() === ref.toLowerCase() || o.order_number.toLowerCase() === ref.toLowerCase()
    );
    if (existing) {
      throw new Error(`Order reference "${ref}" already exists. Please choose another reference.`);
    }

    // Validate UAE Phone
    const phone = (params.customerPhone || '').trim();
    const phoneCheck = validateUaePhone(phone);
    if (!phoneCheck.valid) {
      throw new Error(phoneCheck.errorEn || 'Invalid UAE mobile phone number.');
    }

    // Step 1: Resolve Target Product
    const firstParamItem = params.items?.[0];
    if (firstParamItem) {
      qty = Math.max(1, Math.floor(firstParamItem.quantity || 1));
    }

    let targetProduct = firstParamItem?.productId
      ? this.products.find((p) => p.id === firstParamItem.productId)
      : undefined;

    const prodName = (targetProduct?.name_en || params.productName || 'General Product').trim();
    const prodSize = (targetProduct?.size || params.productSize || '').trim();
    const prodKey = `${prodName}|${prodSize}`.toLowerCase();

    if (!targetProduct) {
      targetProduct = this.products.find(
        (p) => `${p.name_en}|${p.size || ''}`.toLowerCase() === prodKey
      );
    }

    if (targetProduct) {
      sellPrice = sellPrice || targetProduct.selling_price;
      unitCost = unitCost || targetProduct.cost_price;
    }

    if (!targetProduct) {
      const stockBefore = Math.max(0, Number(params.stockBefore ?? qty));
      targetProduct = {
        id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name_en: prodName,
        name_ar: prodName,
        sku: `SKU-${Date.now().toString(36).toUpperCase()}`,
        size: prodSize,
        selling_price: sellPrice,
        cost_price: unitCost,
        current_stock: stockBefore,
        reorder_point: 2,
        category: 'Custom Product',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.products.push(targetProduct);

      // Async write new product to Supabase with authenticated business_id
      if (!this.isIsolated && isSupabaseConfigured) {
        this.getResolvedBusinessId().then((bizId) => {
          if (!bizId) {
            console.warn('[PRODUCTS INSERT SKIPPED] No authenticated merchant session (auth.uid() required by RLS).');
            return;
          }

          const productPayload = {
            business_id: bizId,
            name_en: targetProduct!.name_en,
            name_ar: targetProduct!.name_ar,
            sku: targetProduct!.sku,
            selling_price: targetProduct!.selling_price,
            cost_price: targetProduct!.cost_price,
            current_stock: targetProduct!.current_stock,
            reorder_point: targetProduct!.reorder_point,
            category: targetProduct!.category,
          };

          supabase
            .from('products')
            .insert(productPayload)
            .select('id')
            .single()
            .then(({ data, error, status }) => {
              if (error) {
                console.error('[PRODUCTS INSERT FAILED]', {
                  statusCode: status,
                  supabaseError: error,
                  payload: productPayload,
                });
              } else if (data && data.id) {
                targetProduct!.id = data.id;
              }
            }, (e: any) => console.error('[PRODUCTS INSERT EXCEPTION]', e));
        });
      }
    }

    // Step 2: Stock Availability Check
    const isCancelledInitial = params.status === 'Cancelled';
    if (!isCancelledInitial) {
      if (targetProduct.current_stock < qty) {
        throw new Error(
          `Insufficient stock for "${targetProduct.name_en}". Current stock is ${targetProduct.current_stock}, but requested ${qty}.`
        );
      }
    }

    // Step 3: Compute Profit & Totals
    const fees = Math.max(0, Number(params.fees) || 0);
    const courierCost = Math.max(0, Number(params.courierCostMerchant ?? fees));
    const shippingFeeCharged = Math.max(0, Number(params.shippingFeeCustomer ?? 0));
    const codFee = Math.max(0, Number(params.codFee ?? 0));
    const discount = Math.max(0, Number(params.discount ?? 0));
    const subtotal = roundAed(sellPrice * qty);
    const totalCogs = roundAed(unitCost * qty);

    const profitData = calculateProfit({
      subtotal,
      totalCogs,
      shippingFeeChargedToCustomer: shippingFeeCharged,
      courierCostPaidByMerchant: courierCost,
      codFee,
      discount,
      vatRegistered: this.profile.vat_registered,
      vatRate: this.profile.vat_rate,
    });

    const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const orderItem: OrderItem = {
      id: `item-${Date.now()}-1`,
      order_id: orderId,
      product_id: targetProduct.id,
      product_name_en: targetProduct.name_en,
      product_name_ar: targetProduct.name_ar,
      size: targetProduct.size,
      quantity: qty,
      unit_price: sellPrice,
      unit_cost: unitCost,
      total_price: subtotal,
    };

    const order: Order = {
      id: orderId,
      ref,
      order_number: ref,
      product: `${prodName}${prodSize ? ` (${prodSize})` : ''}`,
      size: prodSize,
      qty,
      price: sellPrice,
      cost: unitCost,
      fees: courierCost,
      customer_name: (params.customerName || 'Customer').trim(),
      customer_phone: phoneCheck.normalized,
      emirate: params.emirate || this.profile.default_emirate,
      delivery_address: (params.deliveryAddress || '').trim(),
      channel: params.channel || 'WhatsApp',
      payment_method: params.paymentMethod || 'COD',
      status: params.status || 'New',
      items: [orderItem],
      subtotal,
      shipping_fee: shippingFeeCharged,
      courier_cost: courierCost,
      cod_fee: codFee,
      vat_amount: profitData.vatAmount,
      discount,
      total_revenue: profitData.totalRevenue,
      total_cogs: profitData.totalCogs,
      net_profit: profitData.netProfit,
      profit_margin: profitData.profitMargin,
      notes: (params.notes || '').trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Step 4: Deduct stock atomically if not cancelled
    if (!isCancelledInitial) {
      const stockBefore = targetProduct.current_stock;
      const stockAfter = stockBefore - qty;
      targetProduct.current_stock = stockAfter;
      targetProduct.updated_at = new Date().toISOString();

      const movement: InventoryMovement = {
        id: `mov-${Date.now()}-res`,
        product_id: targetProduct.id,
        product_name_en: `${prodName} ${prodSize ? `(${prodSize})` : ''}`.trim(),
        order_id: orderId,
        order_number: ref,
        movement_type: 'order_reserved',
        quantity_delta: -qty,
        stock_before: stockBefore,
        stock_after: stockAfter,
        reason: `Reserved for Order ${ref}`,
        created_at: new Date().toISOString(),
      };
      this.movements.push(movement);
    }

    this.orders.push(order);

    // Step 5: Save order to Supabase orders table
    // Omitting orders.id to allow PostgreSQL to generate gen_random_uuid()
    if (!this.isIsolated && isSupabaseConfigured) {
      this.getResolvedBusinessId().then((bizId) => {
        if (!bizId) {
          console.warn(
            '[ORDERS INSERT SKIPPED] No authenticated merchant session (auth.uid() required by RLS).'
          );
          return;
        }

        order.business_id = bizId;

        const orderPayload = {
          order_number: order.order_number,
          business_id: bizId,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          emirate: order.emirate,
          delivery_address: order.delivery_address,
          channel: order.channel,
          payment_method: order.payment_method,
          status: order.status.toLowerCase(),
          subtotal: order.subtotal,
          shipping_fee: order.shipping_fee,
          cod_fee: order.cod_fee,
          vat_amount: order.vat_amount,
          discount: order.discount,
          total_revenue: order.total_revenue,
          total_cogs: order.total_cogs,
          courier_cost: order.courier_cost,
          net_profit: order.net_profit,
          profit_margin: order.profit_margin,
          notes: order.notes,
        };

        supabase
          .from('orders')
          .insert(orderPayload)
          .select('id')
          .single()
          .then(({ data, error, status }) => {
            if (error) {
              console.error('ORDERS INSERT FAILED', {
                statusCode: status,
                supabaseError: error,
                requestPayload: orderPayload,
              });
            } else if (data && data.id) {
              const remoteUuid = data.id;
              order.id = remoteUuid;

              // Insert order_items with generated remoteUuid and UUID product_id check
              const isUuidProduct = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                orderItem.product_id
              );

              if (isUuidProduct) {
                const itemPayload = {
                  order_id: remoteUuid,
                  product_id: orderItem.product_id,
                  quantity: orderItem.quantity,
                  unit_price: orderItem.unit_price,
                  unit_cost: orderItem.unit_cost,
                  total_price: orderItem.total_price,
                };

                supabase
                  .from('order_items')
                  .insert(itemPayload)
                  .then(({ error: itemErr, status: itemStatus }) => {
                    if (itemErr) {
                      console.error('[ORDER_ITEMS INSERT FAILED]', {
                        statusCode: itemStatus,
                        supabaseError: itemErr,
                        requestPayload: itemPayload,
                      });
                    }
                  });
              }

              // Insert inventory movement
              const isUuidMoveProduct = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                targetProduct!.id
              );

              if (!isCancelledInitial && isUuidMoveProduct) {
                const movePayload = {
                  business_id: bizId,
                  product_id: targetProduct!.id,
                  order_id: remoteUuid,
                  movement_type: 'order_reserved',
                  quantity_delta: -qty,
                  stock_before: targetProduct!.current_stock + qty,
                  stock_after: targetProduct!.current_stock,
                  reason: `Reserved for Order ${ref}`,
                };

                supabase
                  .from('inventory_movements')
                  .insert(movePayload)
                  .then(({ error: moveErr, status: moveStatus }) => {
                    if (moveErr) {
                      console.error('[INVENTORY_MOVEMENTS INSERT FAILED]', {
                        statusCode: moveStatus,
                        supabaseError: moveErr,
                        requestPayload: movePayload,
                      });
                    }
                  });

                // Update product stock in Supabase
                supabase
                  .from('products')
                  .update({ current_stock: targetProduct!.current_stock, updated_at: new Date().toISOString() })
                  .eq('id', targetProduct!.id)
                  .then(() => {}, () => {});
              }
            }
          }, (e: any) => {
            console.error('ORDERS INSERT FAILED', {
              statusCode: 500,
              supabaseError: e,
              requestPayload: orderPayload,
            });
          });
      });
    }

    return { success: true, order };
  }

  /**
   * ATOMIC STATUS TRANSITION (Double-Deduction and Restock Safe)
   */
  public updateOrderStatusAtomic(
    orderId: string,
    newStatusInput: OrderStatus | string,
    reason?: string
  ): { success: boolean; message: string; order: Order } {
    const orderIndex = this.orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error(`Order ${orderId} not found`);
    }

    const order = this.orders[orderIndex];
    const oldStatus = order.status;

    // Normalize status input
    const lower = String(newStatusInput).toLowerCase();
    let newStatus: OrderStatus = 'New';
    if (lower === 'cancelled') newStatus = 'Cancelled';
    else if (lower === 'delivered') newStatus = 'Delivered';
    else if (lower === 'shipped') newStatus = 'Shipped';
    else if (lower === 'packed') newStatus = 'Packed';
    else if (lower === 'confirmed') newStatus = 'Confirmed';
    else newStatus = 'New';

    if (oldStatus === newStatus) {
      return {
        success: true,
        message: `Order ${order.ref} is already in status ${newStatus}. No change needed.`,
        order,
      };
    }

    const item = order.items?.[0];
    const targetProduct = item
      ? this.products.find((p) => p.id === item.product_id)
      : this.products.find(
          (p) =>
            `${p?.name_en || ''}|${p?.size || ''}`.toLowerCase() ===
            `${order?.product || ''}|${order?.size || ''}`.toLowerCase()
        );

    // Case 1: Active -> Cancelled (RESTOCK)
    if (newStatus === 'Cancelled' && oldStatus !== 'Cancelled') {
      if (targetProduct) {
        const stockBefore = targetProduct.current_stock;
        const stockAfter = stockBefore + order.qty;
        targetProduct.current_stock = stockAfter;
        targetProduct.updated_at = new Date().toISOString();

        const mov: InventoryMovement = {
          id: `mov-${Date.now()}-restock`,
          product_id: targetProduct.id,
          product_name_en: `${targetProduct.name_en} ${targetProduct.size ? `(${targetProduct.size})` : ''}`.trim(),
          order_id: order.id,
          order_number: order.ref,
          movement_type: 'order_cancelled_restock',
          quantity_delta: order.qty,
          stock_before: stockBefore,
          stock_after: stockAfter,
          reason: reason || `Restocked: Order ${order.ref} cancelled`,
          created_at: new Date().toISOString(),
        };
        this.movements.push(mov);

        if (!this.isIsolated && isSupabaseConfigured) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetProduct.id);
          if (isUuid) {
            supabase
              .from('products')
              .update({ current_stock: stockAfter, updated_at: new Date().toISOString() })
              .eq('id', targetProduct.id)
              .then(() => {}, () => {});
          }
        }
      }

      order.subtotal = 0;
      order.total_revenue = 0;
      order.total_cogs = 0;
      order.net_profit = 0;
      order.profit_margin = 0;
    }

    // Case 2: Cancelled -> Active (RE-DEDUCT)
    else if (oldStatus === 'Cancelled' && newStatus !== 'Cancelled') {
      if (!targetProduct) {
        throw new Error(
          `Cannot reactivate order ${order.ref}: Associated product "${order.product}" no longer exists in catalog.`
        );
      }

      if (targetProduct.current_stock < order.qty) {
        throw new Error(
          `Cannot reactivate order ${order.ref}: Insufficient stock for "${targetProduct.name_en}". Available: ${targetProduct.current_stock}, Required: ${order.qty}.`
        );
      }

      const stockBefore = targetProduct.current_stock;
      const stockAfter = stockBefore - order.qty;
      targetProduct.current_stock = stockAfter;
      targetProduct.updated_at = new Date().toISOString();

      const mov: InventoryMovement = {
        id: `mov-${Date.now()}-rededuct`,
        product_id: targetProduct.id,
        product_name_en: `${targetProduct.name_en} ${targetProduct.size ? `(${targetProduct.size})` : ''}`.trim(),
        order_id: order.id,
        order_number: order.ref,
        movement_type: 'order_reserved',
        quantity_delta: -order.qty,
        stock_before: stockBefore,
        stock_after: stockAfter,
        reason: reason || `Re-deducted: Order ${order.ref} reactivated to ${newStatus}`,
        created_at: new Date().toISOString(),
      };
      this.movements.push(mov);

      const subtotal = roundAed(order.price * order.qty);
      const totalCogs = roundAed(order.cost * order.qty);
      const profitData = calculateProfit({
        subtotal,
        totalCogs,
        shippingFeeChargedToCustomer: order.shipping_fee,
        courierCostPaidByMerchant: order.courier_cost,
        codFee: order.cod_fee,
        discount: order.discount,
        vatRegistered: this.profile.vat_registered,
        vatRate: this.profile.vat_rate,
      });

      order.subtotal = subtotal;
      order.total_cogs = totalCogs;
      order.total_revenue = profitData.totalRevenue;
      order.net_profit = profitData.netProfit;
      order.profit_margin = profitData.profitMargin;

      if (!this.isIsolated && isSupabaseConfigured) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetProduct.id);
        if (isUuid) {
          supabase
            .from('products')
            .update({ current_stock: stockAfter, updated_at: new Date().toISOString() })
            .eq('id', targetProduct.id)
            .then(() => {}, () => {});
        }
      }
    }

    order.status = newStatus;
    order.updated_at = new Date().toISOString();

    if (!this.isIsolated && isSupabaseConfigured) {
      const isUuidOrder = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);
      if (isUuidOrder) {
        supabase
          .from('orders')
          .update({
            status: newStatus.toLowerCase(),
            net_profit: order.net_profit,
            profit_margin: order.profit_margin,
            total_revenue: order.total_revenue,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id)
          .then(() => {}, () => {});
      }
    }

    return {
      success: true,
      message: `Order ${order.ref} updated to ${newStatus}`,
      order,
    };
  }

  /**
   * DELETE ORDER SAFELY: Restores stock if the order was active
   */
  public deleteOrder(orderId: string): boolean {
    const orderIndex = this.orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) return false;

    const order = this.orders[orderIndex];

    if (order.status !== 'Cancelled') {
      const item = order.items?.[0];
      const product = item
        ? this.products.find((p) => p.id === item.product_id)
        : this.products.find(
            (p) =>
              `${p?.name_en || ''}|${p?.size || ''}`.toLowerCase() ===
              `${order?.product || ''}|${order?.size || ''}`.toLowerCase()
          );
      if (product) {
        const stockBefore = product.current_stock;
        const stockAfter = stockBefore + order.qty;
        product.current_stock = stockAfter;
        product.updated_at = new Date().toISOString();

        const mov: InventoryMovement = {
          id: `mov-${Date.now()}-del`,
          product_id: product.id,
          product_name_en: `${product.name_en} ${product.size ? `(${product.size})` : ''}`.trim(),
          order_id: order.id,
          order_number: order.ref,
          movement_type: 'order_cancelled_restock',
          quantity_delta: order.qty,
          stock_before: stockBefore,
          stock_after: stockAfter,
          reason: `Restocked: Order ${order.ref} deleted`,
          created_at: new Date().toISOString(),
        };
        this.movements.push(mov);

        if (!this.isIsolated && isSupabaseConfigured) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);
          if (isUuid) {
            supabase
              .from('products')
              .update({ current_stock: stockAfter, updated_at: new Date().toISOString() })
              .eq('id', product.id)
              .then(() => {}, () => {});
          }
        }
      }
    }

    this.orders.splice(orderIndex, 1);

    if (!this.isIsolated && isSupabaseConfigured) {
      const isUuidOrder = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      if (isUuidOrder) {
        supabase
          .from('orders')
          .delete()
          .eq('id', orderId)
          .then(() => {}, () => {});
      }
    }

    return true;
  }

  /**
   * Add new product to catalog
   */
  public addProduct(prodData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Product {
    const initialStock = Math.max(0, Math.floor(Number(prodData.current_stock) || 0));
    const sellingPrice = Math.max(0, roundAed(Number(prodData.selling_price) || 0));
    const costPrice = Math.max(0, roundAed(Number(prodData.cost_price) || 0));
    const reorderPoint = Math.max(0, Math.floor(Number(prodData.reorder_point) || 0));

    const newProd: Product = {
      id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...prodData,
      current_stock: initialStock,
      selling_price: sellingPrice,
      cost_price: costPrice,
      reorder_point: reorderPoint,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.products.push(newProd);

    if (newProd.current_stock > 0) {
      const mov: InventoryMovement = {
        id: `mov-${Date.now()}-init`,
        product_id: newProd.id,
        product_name_en: `${newProd.name_en} ${newProd.size ? `(${newProd.size})` : ''}`.trim(),
        movement_type: 'initial',
        quantity_delta: newProd.current_stock,
        stock_before: 0,
        stock_after: newProd.current_stock,
        reason: 'Initial catalog creation',
        created_at: new Date().toISOString(),
      };
      this.movements.push(mov);
    }

    if (!this.isIsolated && isSupabaseConfigured) {
      this.getResolvedBusinessId().then((bizId) => {
        if (!bizId) return;

        supabase
          .from('products')
          .insert({
            business_id: bizId,
            name_en: newProd.name_en,
            name_ar: newProd.name_ar,
            sku: newProd.sku,
            selling_price: newProd.selling_price,
            cost_price: newProd.cost_price,
            current_stock: newProd.current_stock,
            reorder_point: newProd.reorder_point,
            category: newProd.category,
          })
          .select('id')
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error('[PRODUCTS INSERT FAILED]', error);
            } else if (data && data.id) {
              newProd.id = data.id;
            }
          }, () => {});
      });
    }

    return newProd;
  }

  /**
   * Adjust stock manually
   */
  public adjustStock(
    productId: string,
    delta: number,
    reason: string
  ): { success: boolean; product: Product } {
    const product = this.products.find((p) => p.id === productId);
    if (!product) throw new Error(`Product ${productId} not found`);

    const intDelta = Math.round(Number(delta) || 0);
    if (intDelta === 0) {
      return { success: true, product };
    }

    const stockBefore = product.current_stock;
    const stockAfter = stockBefore + intDelta;
    if (stockAfter < 0) {
      throw new Error(
        `Adjustment would result in negative stock (${stockAfter}) for product "${product.name_en}"`
      );
    }

    product.current_stock = stockAfter;
    product.updated_at = new Date().toISOString();

    const mov: InventoryMovement = {
      id: `mov-${Date.now()}-adj`,
      product_id: product.id,
      product_name_en: `${product.name_en} ${product.size ? `(${product.size})` : ''}`.trim(),
      movement_type: intDelta >= 0 ? 'restock' : 'manual_adjustment',
      quantity_delta: intDelta,
      stock_before: stockBefore,
      stock_after: stockAfter,
      reason: reason || 'Manual adjustment',
      created_at: new Date().toISOString(),
    };
    this.movements.push(mov);

    if (!this.isIsolated && isSupabaseConfigured) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);
      if (isUuid) {
        supabase
          .from('products')
          .update({ current_stock: stockAfter, updated_at: new Date().toISOString() })
          .eq('id', product.id)
          .then(() => {}, () => {});
      }
    }

    return { success: true, product };
  }

  /**
   * Clear all orders
   */
  public clearAllOrders(): void {
    this.orders = [];

    if (!this.isIsolated && isSupabaseConfigured) {
      this.getResolvedBusinessId().then((bizId) => {
        if (!bizId) return;
        supabase
          .from('orders')
          .delete()
          .eq('business_id', bizId)
          .then(() => {}, (e: any) => {
            console.warn('[InventoryManager] Clear orders notice:', e);
          });
      });
    }
  }

  /**
   * Reset prototype data back to fresh starter state
   */
  public resetToDemoData(): void {
    this.products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
    this.orders = JSON.parse(JSON.stringify(INITIAL_ORDERS));
    this.movements = JSON.parse(JSON.stringify(INITIAL_MOVEMENTS));
    this.profile = { ...INITIAL_PROFILE };
  }

  /**
   * Export SQL for Supabase PostgreSQL Migration (Phase 2)
   */
  public exportSupabaseDataSql(): string {
    const lines: string[] = [];
    lines.push('-- =========================================================');
    lines.push('-- SellMate UAE: Exported Supabase Data');
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push('-- =========================================================\n');

    lines.push('-- 1. Export Products');
    for (const p of this.products) {
      const nameEn = p.name_en.replace(/'/g, "''");
      const nameAr = p.name_ar.replace(/'/g, "''");
      lines.push(
        `INSERT INTO public.products (name_en, name_ar, sku, selling_price, cost_price, current_stock, reorder_point, category, business_id) ` +
        `VALUES ('${nameEn}', '${nameAr}', '${p.sku}', ${p.selling_price}, ${p.cost_price}, ${p.current_stock}, ${p.reorder_point}, '${p.category || 'General'}', auth.uid());`
      );
    }

    lines.push('\n-- 2. Export Orders');
    for (const o of this.orders) {
      const custName = o.customer_name.replace(/'/g, "''");
      const addr = (o.delivery_address || '').replace(/'/g, "''");
      lines.push(
        `INSERT INTO public.orders (order_number, business_id, customer_name, customer_phone, emirate, delivery_address, channel, payment_method, status, subtotal, shipping_fee, courier_cost, cod_fee, vat_amount, total_revenue, total_cogs, net_profit, profit_margin) ` +
        `VALUES ('${o.ref}', auth.uid(), '${custName}', '${o.customer_phone}', '${o.emirate}', '${addr}', '${o.channel}', '${o.payment_method}', '${o.status.toLowerCase()}', ${o.subtotal}, ${o.shipping_fee}, ${o.courier_cost}, ${o.cod_fee}, ${o.vat_amount}, ${o.total_revenue}, ${o.total_cogs}, ${o.net_profit}, ${o.profit_margin});`
      );
    }

    return lines.join('\n');
  }
}

export const inventoryManager = new InventoryManager();

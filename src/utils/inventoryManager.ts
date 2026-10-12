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
} from '../types';
import { calculateProfit, roundAed, validateUaePhone } from './calculations';

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

const STORAGE_KEYS = {
  PRODUCTS: 'sellmate_uae_products',
  ORDERS: 'sellmate_uae_orders',
  MOVEMENTS: 'sellmate_uae_movements',
  PROFILE: 'sellmate_uae_profile',
  LANGUAGE: 'sellmate_uae_lang',
};

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
    size: '100ml Bottle',
    selling_price: 240,
    cost_price: 75,
    current_stock: 18,
    reorder_point: 4,
    category: 'Fragrances & Oud',
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: 'prod-003',
    name_en: 'Dubai Noir Silk Abaya',
    name_ar: 'عباية حرير دبي نوار',
    sku: 'ABY-NOIR-56',
    size: 'Size 56',
    selling_price: 320,
    cost_price: 110,
    current_stock: 7, // 8 initial - 1 shipped in SM-1002
    reorder_point: 3,
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
    profit_margin: 40.0,
    notes: 'Delivered successfully',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
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
    customer_phone: '+971529876543',
    emirate: 'Abu Dhabi',
    delivery_address: 'Al Raha Beach, Apt 402',
    channel: 'Instagram',
    payment_method: 'Paid',
    status: 'Shipped',
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
  private profile: BusinessProfile = INITIAL_PROFILE;
  private isIsolated: boolean = false;

  constructor(isIsolated: boolean = false) {
    this.isIsolated = isIsolated;
    if (!isIsolated) {
      this.loadFromStorage();
    }
  }

  private loadFromStorage() {
    if (typeof localStorage === 'undefined') {
      this.products = [...INITIAL_PRODUCTS];
      this.orders = [...INITIAL_ORDERS];
      this.movements = [...INITIAL_MOVEMENTS];
      this.profile = { ...INITIAL_PROFILE };
      return;
    }
    try {
      const prodJson = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const rawProducts = prodJson ? JSON.parse(prodJson) : INITIAL_PRODUCTS;
      this.products = Array.isArray(rawProducts) ? rawProducts : [...INITIAL_PRODUCTS];

      const orderJson = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const rawOrders = orderJson ? JSON.parse(orderJson) : INITIAL_ORDERS;
      this.orders = Array.isArray(rawOrders)
        ? rawOrders.map((o: Record<string, unknown>) => {
            const items = Array.isArray(o.items) ? o.items : [];
            const price = Number(o.price) || 0;
            const qty = Number(o.qty) || 1;
            const subtotal = Number(o.subtotal) || price * qty;
            const cost = Number(o.cost) || 0;
            const fees = Number(o.fees) || 0;
            const totalCogs = Number(o.total_cogs) || cost * qty;
            const netProfit = typeof o.net_profit === 'number' ? o.net_profit : subtotal - totalCogs - fees;

            return {
              ...o,
              ref: String(o.ref || o.order_number || `SM-${o.id || '1001'}`),
              order_number: String(o.order_number || o.ref || `SM-${o.id || '1001'}`),
              product: String(o.product || (items[0] as Record<string, unknown>)?.product_name_en || 'Product'),
              size: String(o.size || (items[0] as Record<string, unknown>)?.size || ''),
              qty,
              price,
              cost,
              fees,
              subtotal,
              shipping_fee: Number(o.shipping_fee) || 0,
              courier_cost: Number(o.courier_cost) || fees,
              cod_fee: Number(o.cod_fee) || 0,
              vat_amount: Number(o.vat_amount) || 0,
              discount: Number(o.discount) || 0,
              total_revenue: Number(o.total_revenue) || subtotal,
              total_cogs: totalCogs,
              net_profit: netProfit,
              profit_margin: typeof o.profit_margin === 'number' ? o.profit_margin : 0,
              status: (o.status as OrderStatus) || 'New',
              payment_method: (o.payment_method as PaymentMethod) || 'COD',
              items,
            } as Order;
          })
        : [...INITIAL_ORDERS];

      const movJson = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
      const rawMovements = movJson ? JSON.parse(movJson) : INITIAL_MOVEMENTS;
      this.movements = Array.isArray(rawMovements) ? rawMovements : [...INITIAL_MOVEMENTS];

      const profJson = localStorage.getItem(STORAGE_KEYS.PROFILE);
      this.profile = profJson ? JSON.parse(profJson) : INITIAL_PROFILE;
    } catch (e) {
      console.warn('Storage read failed, using in-memory state', e);
      this.products = [...INITIAL_PRODUCTS];
      this.orders = [...INITIAL_ORDERS];
      this.movements = [...INITIAL_MOVEMENTS];
      this.profile = { ...INITIAL_PROFILE };
    }
  }

  private persist() {
    if (this.isIsolated || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products));
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(this.orders));
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(this.movements));
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(this.profile));
    } catch (e) {
      console.warn('Storage write failed', e);
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
    this.persist();
    return { ...this.profile };
  }

  /**
   * ATOMIC ORDER CREATION (Double-deduction safe)
   * Resolves or creates product in catalog, checks actual stock,
   * deducts stock atomically, and records audit ledger movement.
   */
  public createOrderAtomic(params: CreateOrderParams): { success: boolean; order: Order } {
    let qty = Math.max(1, Math.floor(params.qty || 1));
    let sellPrice = Math.max(0, Number(params.sellPrice) || 0);
    let unitCost = Math.max(0, Number(params.unitCost) || 0);
    let prodName = (params.productName || '').trim();
    let prodSize = (params.productSize || '').trim();

    let targetProduct: Product | undefined;

    // If items array is provided, resolve product and pricing from items
    if (params.items && params.items.length > 0) {
      const first = params.items[0];
      targetProduct = this.products.find((p) => p.id === first.productId);
      if (targetProduct) {
        prodName = targetProduct.name_en;
        prodSize = targetProduct.size || '';
        qty = Math.max(1, Math.floor(first.quantity || 1));
        sellPrice = targetProduct.selling_price;
        unitCost = targetProduct.cost_price;
      } else {
        throw new Error(`Product ${first.productId} not found`);
      }
    }

    const ref = (params.ref || generateNextOrderRef(this.orders)).trim();

    // Check duplicate order ref safely
    if (
      this.orders.some((o) => {
        const existingRef = String(o?.ref || o?.order_number || '').trim().toLowerCase();
        return existingRef && existingRef === ref.toLowerCase();
      })
    ) {
      throw new Error(`Order reference "${ref}" already exists.`);
    }

    // If not found yet, find by name+size or create
    if (!targetProduct) {
      if (!prodName) {
        throw new Error('Product name is required');
      }
      const prodKey = `${prodName}|${prodSize}`.toLowerCase();
      targetProduct = this.products.find(
        (p) => `${p?.name_en || ''}|${p?.size || ''}`.toLowerCase() === prodKey
      );

      if (!targetProduct) {
        const initialStock = Math.max(qty, Number(params.stockBefore) || qty);
        targetProduct = {
          id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name_en: prodName,
          name_ar: prodName,
          sku: `SKU-${Date.now().toString(36).toUpperCase().slice(-4)}`,
          size: prodSize,
          selling_price: sellPrice,
          cost_price: unitCost,
          current_stock: initialStock,
          reorder_point: 2,
          category: 'General',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.products.push(targetProduct);

        this.movements.push({
          id: `mov-${Date.now()}-init`,
          product_id: targetProduct.id,
          product_name_en: `${prodName} ${prodSize ? `(${prodSize})` : ''}`.trim(),
          movement_type: 'initial',
          quantity_delta: initialStock,
          stock_before: 0,
          stock_after: initialStock,
          reason: 'Initial stock intake',
          created_at: new Date().toISOString(),
        });
      }
    }

    // Step 2: Validate available stock
    const isCancelledInitial = params.status === 'Cancelled';
    if (!isCancelledInitial && targetProduct.current_stock < qty) {
      throw new Error(
        `Quantity (${qty}) exceeds available stock (${targetProduct.current_stock}) for "${prodName}". Available: ${targetProduct.current_stock}`
      );
    }

    const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const revenue = sellPrice * qty;
    const cogs = unitCost * qty;
    const fees = Math.max(0, Number(params.fees || params.courierCostMerchant) || 0);
    const shippingFeeCustomer = Math.max(0, Number(params.shippingFeeCustomer) || 0);
    const codFee = Math.max(0, Number(params.codFee) || 0);
    const discount = Math.max(0, Number(params.discount) || 0);

    const profitData = calculateProfit({
      subtotal: revenue,
      totalCogs: cogs,
      shippingFeeChargedToCustomer: shippingFeeCustomer,
      courierCostPaidByMerchant: fees,
      codFee: codFee,
      discount: discount,
      vatRegistered: this.profile.vat_registered,
      vatRate: this.profile.vat_rate,
    });

    let customerPhone = (params.customerPhone || '+971501234567').trim();
    const phoneValidation = validateUaePhone(customerPhone);
    if (phoneValidation.valid) {
      customerPhone = phoneValidation.normalized;
    }

    const order: Order = {
      id: orderId,
      ref,
      order_number: ref,
      product: prodName,
      size: prodSize,
      qty,
      price: sellPrice,
      cost: unitCost,
      fees,
      customer_name: (params.customerName || 'Customer').trim(),
      customer_phone: customerPhone,
      emirate: params.emirate || this.profile.default_emirate || 'Dubai',
      delivery_address: (params.deliveryAddress || '').trim(),
      channel: params.channel || 'WhatsApp',
      payment_method: params.paymentMethod || 'COD',
      status: params.status || 'New',
      items: [
        {
          id: `item-${orderId}`,
          order_id: orderId,
          product_id: targetProduct.id,
          product_name_en: prodName,
          size: prodSize,
          quantity: qty,
          unit_price: sellPrice,
          unit_cost: unitCost,
          total_price: revenue,
        },
      ],
      subtotal: revenue,
      shipping_fee: shippingFeeCustomer,
      courier_cost: fees,
      cod_fee: codFee,
      vat_amount: profitData.vatAmount,
      discount: discount,
      total_revenue: profitData.totalRevenue,
      total_cogs: profitData.totalCogs,
      net_profit: isCancelledInitial ? 0 : profitData.netProfit,
      profit_margin: isCancelledInitial ? 0 : profitData.profitMargin,
      notes: params.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Step 3: Deduct stock atomically if not cancelled
    if (!isCancelledInitial) {
      const stockBefore = targetProduct.current_stock;
      const stockAfter = stockBefore - qty;
      targetProduct.current_stock = stockAfter;
      targetProduct.updated_at = new Date().toISOString();

      this.movements.push({
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
      });
    }

    this.orders.push(order);
    this.persist();

    return { success: true, order };
  }

  /**
   * ATOMIC STATUS TRANSITION (Double-Deduction and Restock Safe)
   * - Transition to Cancelled: Restocks once and logs audit entry. Duplicate calls do nothing.
   * - Transition from Cancelled to active: Verifies stock and re-deducts once.
   * - Transition between active states: Zero stock change (No double-deduction).
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
      return { success: true, message: 'Status is unchanged', order };
    }

    const isOldActive = oldStatus !== 'Cancelled';
    const isNewActive = newStatus !== 'Cancelled';

    // Find affected product
    const item = order.items?.[0];
    const product = item
      ? this.products.find((p) => p.id === item.product_id)
      : this.products.find(
          (p) =>
            `${p?.name_en || ''}|${p?.size || ''}`.toLowerCase() ===
            `${order?.product || ''}|${order?.size || ''}`.toLowerCase()
        );

    // Case 1: Active -> Cancelled (RESTOCK SAFELY ONCE)
    if (isOldActive && !isNewActive) {
      const alreadyRestocked = this.movements.some(
        (m) => m.order_id === order.id && m.movement_type === 'order_cancelled_restock'
      );

      if (!alreadyRestocked && product) {
        const stockBefore = product.current_stock;
        const stockAfter = stockBefore + order.qty;
        product.current_stock = stockAfter;
        product.updated_at = new Date().toISOString();

        this.movements.push({
          id: `mov-${Date.now()}-cancel`,
          product_id: product.id,
          product_name_en: `${product.name_en} ${product.size ? `(${product.size})` : ''}`.trim(),
          order_id: order.id,
          order_number: order.ref,
          movement_type: 'order_cancelled_restock',
          quantity_delta: order.qty,
          stock_before: stockBefore,
          stock_after: stockAfter,
          reason: reason || `Restocked: Order ${order.ref} cancelled`,
          created_at: new Date().toISOString(),
        });
      }

      order.net_profit = 0;
      order.profit_margin = 0;
    }

    // Case 2: Cancelled -> Active (RE-DEDUCT SAFELY)
    else if (!isOldActive && isNewActive) {
      if (product) {
        if (product.current_stock < order.qty) {
          throw new Error(
            `Cannot reactivate order: insufficient stock for "${product.name_en}". Available: ${product.current_stock}, Needed: ${order.qty}`
          );
        }

        const stockBefore = product.current_stock;
        const stockAfter = stockBefore - order.qty;
        product.current_stock = stockAfter;
        product.updated_at = new Date().toISOString();

        this.movements.push({
          id: `mov-${Date.now()}-reactivate`,
          product_id: product.id,
          product_name_en: `${product.name_en} ${product.size ? `(${product.size})` : ''}`.trim(),
          order_id: order.id,
          order_number: order.ref,
          movement_type: 'order_reserved',
          quantity_delta: -order.qty,
          stock_before: stockBefore,
          stock_after: stockAfter,
          reason: `Re-deducted: Order ${order.ref} reactivated to ${newStatus}`,
          created_at: new Date().toISOString(),
        });

        // Recalculate profit with all order fee attributes
        const profitData = calculateProfit({
          subtotal: order.subtotal || order.price * order.qty,
          totalCogs: order.total_cogs || order.cost * order.qty,
          shippingFeeChargedToCustomer: order.shipping_fee || 0,
          courierCostPaidByMerchant: order.courier_cost || order.fees || 0,
          codFee: order.cod_fee || 0,
          discount: order.discount || 0,
          vatRegistered: this.profile.vat_registered,
          vatRate: this.profile.vat_rate,
        });
        order.vat_amount = profitData.vatAmount;
        order.total_revenue = profitData.totalRevenue;
        order.net_profit = profitData.netProfit;
        order.profit_margin = profitData.profitMargin;
      }
    }

    // Case 3: Active -> Active (e.g. New -> Confirmed -> Packed -> Shipped -> Delivered)
    // ZERO INVENTORY CHANGE! Stock is already deducted, never double-deducts.

    order.status = newStatus;
    order.updated_at = new Date().toISOString();
    this.persist();

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

    // If order was active (not cancelled), restore its inventory
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

        this.movements.push({
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
        });
      }
    }

    this.orders.splice(orderIndex, 1);
    this.persist();
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
      this.movements.push({
        id: `mov-${Date.now()}-init`,
        product_id: newProd.id,
        product_name_en: `${newProd.name_en} ${newProd.size ? `(${newProd.size})` : ''}`.trim(),
        movement_type: 'initial',
        quantity_delta: newProd.current_stock,
        stock_before: 0,
        stock_after: newProd.current_stock,
        reason: 'Initial catalog creation',
        created_at: new Date().toISOString(),
      });
    }

    this.persist();
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

    this.movements.push({
      id: `mov-${Date.now()}-adj`,
      product_id: product.id,
      product_name_en: `${product.name_en} ${product.size ? `(${product.size})` : ''}`.trim(),
      movement_type: intDelta >= 0 ? 'restock' : 'manual_adjustment',
      quantity_delta: intDelta,
      stock_before: stockBefore,
      stock_after: stockAfter,
      reason: reason || 'Manual adjustment',
      created_at: new Date().toISOString(),
    });

    this.persist();
    return { success: true, product };
  }

  /**
   * Clear all orders
   */
  public clearAllOrders() {
    this.orders = [];
    this.persist();
  }

  /**
   * Reset prototype data back to fresh starter state
   */
  public resetToDemoData() {
    this.products = [...INITIAL_PRODUCTS];
    this.orders = [...INITIAL_ORDERS];
    this.movements = [...INITIAL_MOVEMENTS];
    this.profile = { ...INITIAL_PROFILE };
    this.persist();
  }

  /**
   * Export SQL for Supabase PostgreSQL Migration (Phase 2)
   */
  public exportSupabaseDataSql(): string {
    const lines: string[] = [];
    lines.push('-- =========================================================');
    lines.push('-- SellMate UAE: Exported Prototype Data for Supabase Cloud');
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push('-- =========================================================\n');

    lines.push('-- 1. Export Products');
    for (const p of this.products) {
      const nameEn = p.name_en.replace(/'/g, "''");
      const nameAr = p.name_ar.replace(/'/g, "''");
      lines.push(
        `INSERT INTO public.products (id, business_id, name_en, name_ar, sku, selling_price, cost_price, current_stock, reorder_point, category) ` +
        `VALUES ('${p.id}', auth.uid(), '${nameEn}', '${nameAr}', '${p.sku}', ${p.selling_price}, ${p.cost_price}, ${p.current_stock}, ${p.reorder_point}, '${p.category || 'General'}') ` +
        `ON CONFLICT (business_id, sku) DO UPDATE SET current_stock = EXCLUDED.current_stock;`
      );
    }

    lines.push('\n-- 2. Export Orders');
    for (const o of this.orders) {
      const custName = o.customer_name.replace(/'/g, "''");
      const addr = (o.delivery_address || '').replace(/'/g, "''");
      lines.push(
        `INSERT INTO public.orders (id, order_number, business_id, customer_name, customer_phone, emirate, delivery_address, channel, payment_method, status, subtotal, shipping_fee, courier_cost, cod_fee, vat_amount, total_revenue, total_cogs, net_profit, profit_margin) ` +
        `VALUES ('${o.id}', '${o.ref}', auth.uid(), '${custName}', '${o.customer_phone}', '${o.emirate}', '${addr}', '${o.channel}', '${o.payment_method}', '${o.status.toLowerCase()}', ${o.subtotal}, ${o.shipping_fee}, ${o.courier_cost}, ${o.cod_fee}, ${o.vat_amount}, ${o.total_revenue}, ${o.total_cogs}, ${o.net_profit}, ${o.profit_margin}) ` +
        `ON CONFLICT (id) DO NOTHING;`
      );
    }

    return lines.join('\n');
  }
}

export const inventoryManager = new InventoryManager();

export type Emirate =
  | 'Dubai'
  | 'Abu Dhabi'
  | 'Sharjah'
  | 'Ajman'
  | 'Ras Al Khaimah'
  | 'Fujairah'
  | 'Umm Al Quwain';

export type OrderStatus =
  | 'New'
  | 'Confirmed'
  | 'Packed'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export type PaymentMethod =
  | 'COD'
  | 'Paid'
  | 'Pending';

export type OrderChannel = 'WhatsApp' | 'Instagram' | 'TikTok' | 'Store / Direct' | 'Other';

export interface Product {
  id: string;
  name_en: string;
  name_ar: string;
  sku: string;
  size?: string;
  selling_price: number; // in AED
  cost_price: number; // in AED
  current_stock: number;
  reorder_point: number;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name_en?: string;
  product_name_ar?: string;
  size?: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total_price: number;
}

export interface Order {
  id: string;
  ref: string; // starter code order reference (e.g. SM-1001)
  order_number: string;
  product: string;
  size?: string;
  qty: number;
  price: number;
  cost: number;
  fees: number;
  customer_name: string;
  customer_phone: string;
  emirate: Emirate;
  delivery_address: string;
  channel: OrderChannel;
  payment_method: PaymentMethod;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number; // fee charged to customer
  courier_cost: number; // actual fee paid to courier
  cod_fee: number; // courier COD surcharge (usually 5-15 AED in UAE)
  vat_amount: number; // UAE VAT 5%
  discount: number;
  total_revenue: number;
  total_cogs: number;
  net_profit: number;
  profit_margin: number; // percentage
  tracking_number?: string;
  courier_company?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type MovementType =
  | 'initial'
  | 'order_reserved'
  | 'order_cancelled_restock'
  | 'order_returned_restock'
  | 'manual_adjustment'
  | 'restock';

export interface InventoryMovement {
  id: string;
  product_id: string;
  product_name_en?: string;
  product_name_ar?: string;
  order_id?: string;
  order_number?: string;
  movement_type: MovementType;
  quantity_delta: number; // - for deduction, + for addition
  stock_before: number;
  stock_after: number;
  reason: string;
  created_at: string;
}

export interface BusinessProfile {
  id: string;
  business_name: string;
  business_phone: string;
  trn_number?: string;
  default_emirate: Emirate;
  currency: string;
  vat_registered: boolean;
  vat_rate: number; // usually 5
}

export interface ProfitBreakdown {
  subtotal: number;
  shippingFee: number;
  courierCost: number;
  codFee: number;
  discount: number;
  vatAmount: number;
  totalRevenue: number;
  totalCogs: number;
  netProfit: number;
  profitMargin: number;
}

export interface TestCaseAssertion {
  name: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
  message?: string;
}

export interface CreateOrderParams {
  ref?: string;
  productName?: string;
  productSize?: string;
  qty?: number;
  sellPrice?: number;
  unitCost?: number;
  stockBefore?: number;
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  fees?: number;
  customerName?: string;
  customerPhone?: string;
  emirate?: Emirate;
  deliveryAddress?: string;
  notes?: string;
  channel?: OrderChannel;
  shippingFeeCustomer?: number;
  courierCostMerchant?: number;
  codFee?: number;
  discount?: number;
  items?: { productId: string; quantity: number }[];
}

export interface TestCaseResult {
  id: string;
  suiteNameEn: string;
  suiteNameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  passed: boolean;
  assertions: TestCaseAssertion[];
  durationMs: number;
}

export interface TestSuiteStats {
  total: number;
  passed: number;
  allPassed: boolean;
}

import React, { useState, useMemo } from 'react';
import { translations } from '../utils/translations';
import { Order, Product, OrderStatus, PaymentMethod, Emirate, InventoryMovement, CreateOrderParams } from '../types';
import { formatAed, ALL_EMIRATES, validateUaePhone } from '../utils/calculations';
import { generateNextOrderRef } from '../utils/inventoryManager';
import { Sparkles, History, X, Search, Filter, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface OrdersViewProps {
  orders: Order[];
  products: Product[];
  movements: InventoryMovement[];
  language: 'en' | 'ar';
  onSaveOrder: (orderData: CreateOrderParams) => void;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  onClearAllOrders: () => void;
  onSelectOrderForReply: (order: Order) => void;
  onAdjustStock: (productId: string, delta: number, reason: string) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  products,
  movements,
  language,
  onSaveOrder,
  onUpdateStatus,
  onDeleteOrder,
  onClearAllOrders,
  onSelectOrderForReply,
  onAdjustStock,
}) => {
  const isAr = language === 'ar';

  // Form State
  const [orderRef, setOrderRef] = useState(() => generateNextOrderRef(orders));
  const [productName, setProductName] = useState('Everyday socks');
  const [productSize, setProductSize] = useState('EU 42 / Black');
  const [orderQty, setOrderQty] = useState<number>(1);
  const [sellPrice, setSellPrice] = useState<number>(100);
  const [unitCost, setUnitCost] = useState<number>(60);
  const [currentStock, setCurrentStock] = useState<number>(6);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('New');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [orderFees, setOrderFees] = useState<number>(0);
  const [customerName, setCustomerName] = useState('Ahmed Al Ali');
  const [customerPhone, setCustomerPhone] = useState('+971501234567');
  const [emirate, setEmirate] = useState<Emirate>('Dubai');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'All'>('All');

  // Modal / Drawer States
  const [showLedgerDrawer, setShowLedgerDrawer] = useState(false);
  const [selectedProductForLedger, setSelectedProductForLedger] = useState<string | null>(null);
  const [restockProductId, setRestockProductId] = useState<string | null>(null);
  const [restockDelta, setRestockDelta] = useState<number>(10);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // When user selects an existing product from dropdown, autofill price, cost, and live stock!
  const handleProductSelect = (selectedId: string) => {
    const prod = products.find((p) => p.id === selectedId);
    if (prod) {
      setProductName(prod.name_en);
      setProductSize(prod.size || '');
      setSellPrice(prod.selling_price);
      setUnitCost(prod.cost_price);
      setCurrentStock(prod.current_stock);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderRef.trim() || !productName.trim()) {
      showToast(isAr ? 'يرجى إكمال الحقول المطلوبة.' : 'Please complete the required fields.');
      return;
    }

    if (orderQty < 1) {
      showToast(isAr ? 'الكمية يجب أن تكون 1 على الأقل.' : 'Quantity must be at least 1.');
      return;
    }

    if (customerPhone.trim()) {
      const pCheck = validateUaePhone(customerPhone.trim());
      if (!pCheck.valid && pCheck.errorEn) {
        showToast(isAr ? pCheck.errorAr! : pCheck.errorEn);
        return;
      }
    }

    // Preemptive stock check for active orders
    const matchingProd = products.find(
      (p) =>
        `${p?.name_en || ''}|${p?.size || ''}`.toLowerCase() ===
        `${productName.trim()}|${productSize.trim()}`.toLowerCase()
    );
    if (matchingProd && orderStatus !== 'Cancelled' && matchingProd.current_stock < orderQty) {
      showToast(
        isAr
          ? `الكمية المطلوبة (${orderQty}) تتجاوز المخزون المتوفر (${matchingProd.current_stock}) للمنتج "${matchingProd.name_en}".`
          : `Requested quantity (${orderQty}) exceeds available stock (${matchingProd.current_stock}) for "${matchingProd.name_en}".`
      );
      return;
    }

    try {
      onSaveOrder({
        ref: orderRef.trim(),
        productName: productName.trim(),
        productSize: productSize.trim(),
        qty: orderQty,
        sellPrice: Number(sellPrice) || 0,
        unitCost: Number(unitCost) || 0,
        stockBefore: Number(currentStock) || orderQty,
        status: orderStatus,
        paymentMethod,
        fees: Number(orderFees) || 0,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        emirate,
      });

      showToast(isAr ? 'تم حفظ الطلب وتحديث المخزون بأمان.' : 'Order saved. Inventory updated safely.');

      // Prepare next reference
      setOrderRef(generateNextOrderRef([...orders, { ref: orderRef } as any]));
      setOrderQty(1);
    } catch (err: any) {
      showToast(err.message || (isAr ? 'حدث خطأ في حفظ الطلب' : 'Failed to save order'));
    }
  };

  const handleReset = () => {
    setOrderRef(generateNextOrderRef(orders));
    setProductName('');
    setProductSize('');
    setOrderQty(1);
    setSellPrice(100);
    setUnitCost(60);
    setCurrentStock(6);
    setOrderFees(0);
    setOrderStatus('New');
    setPaymentMethod('COD');
  };

  const handleExecuteRestock = (productId: string) => {
    if (restockDelta <= 0) return;
    onAdjustStock(productId, restockDelta, 'Stock intake restock');
    setRestockProductId(null);
    showToast(isAr ? 'تمت إضافة الكمية إلى المخزون بنجاح.' : 'Stock restocked successfully.');
  };

  // Status mapping
  const statusLabels: Record<OrderStatus, { en: string; ar: string }> = {
    New: { en: 'New', ar: 'جديد' },
    Confirmed: { en: 'Confirmed', ar: 'مؤكد' },
    Packed: { en: 'Packed', ar: 'تم التجهيز' },
    Shipped: { en: 'Shipped', ar: 'تم الشحن' },
    Delivered: { en: 'Delivered', ar: 'تم التسليم' },
    Cancelled: { en: 'Cancelled', ar: 'ملغي' },
  };

  const paymentLabels: Record<PaymentMethod, { en: string; ar: string }> = {
    COD: { en: 'Cash on delivery', ar: 'الدفع عند الاستلام' },
    Paid: { en: 'Paid online / bank transfer', ar: 'مدفوع إلكترونياً / تحويل' },
    Pending: { en: 'Payment pending', ar: 'الدفع قيد الانتظار' },
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: orders.length };
    for (const o of orders) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
      if (!matchesStatus) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (o.ref || '').toLowerCase().includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.customer_phone || '').toLowerCase().includes(q) ||
        (o.product || '').toLowerCase().includes(q) ||
        (o.emirate || '').toLowerCase().includes(q)
      );
    });
  }, [orders, filterStatus, searchQuery]);

  const statusTabItems: { id: OrderStatus | 'All'; labelEn: string; labelAr: string }[] = [
    { id: 'All', labelEn: 'All', labelAr: 'الكل' },
    { id: 'New', labelEn: 'New', labelAr: 'جديد' },
    { id: 'Confirmed', labelEn: 'Confirmed', labelAr: 'مؤكد' },
    { id: 'Packed', labelEn: 'Packed', labelAr: 'تم التجهيز' },
    { id: 'Shipped', labelEn: 'Shipped', labelAr: 'تم الشحن' },
    { id: 'Delivered', labelEn: 'Delivered', labelAr: 'تم التسليم' },
    { id: 'Cancelled', labelEn: 'Cancelled', labelAr: 'ملغي' },
  ];

  return (
    <div className="space-y-4">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between animate-fadeIn z-30">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2-Column Layout: Add Order Form + Stock Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Panel: Add an Order (1.35fr -> 7/12 cols) */}
        <div
          className="lg:col-span-7 bg-white rounded-[17px] p-5 border shadow-xs"
          style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow)' }}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 m-0 tracking-tight">
                {isAr ? 'إضافة طلب' : 'Add an order'}
              </h3>
              <p className="text-xs m-0 mt-1" style={{ color: 'var(--muted)' }}>
                {isAr
                  ? 'سجّل كل عملية بيع مع تحديث المخزون تلقائياً.'
                  : 'Record each sale and adjust stock automatically.'}
              </p>
            </div>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ backgroundColor: '#f0f3f0', color: '#536158' }}
            >
              {orders.length} {isAr ? 'طلبات' : orders.length === 1 ? 'order' : 'orders'}
            </span>
          </div>

          {/* Quick Product Preset Picker */}
          {products.length > 0 && (
            <div className="mb-3 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center gap-2">
              <span className="font-semibold text-slate-600 shrink-0">
                {isAr ? 'اختر من المنتجات المتوفرة:' : 'Pick product:'}
              </span>
              <select
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800 cursor-pointer"
              >
                <option value="">{isAr ? '-- اختر منتجاً لتعبئة السعر والمخزون --' : '-- Choose to autofill price & stock --'}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_en} {p.size ? `(${p.size})` : ''} - {p.current_stock} in stock ({p.selling_price} AED)
                  </option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Order Reference */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                  {isAr ? 'رقم الطلب' : 'Order reference'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SM-1001"
                  value={orderRef}
                  onChange={(e) => setOrderRef(e.target.value)}
                  className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  style={{ borderColor: '#dce3dd' }}
                />
              </div>

              {/* Product */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                  {isAr ? 'المنتج' : 'Product'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Everyday socks"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  style={{ borderColor: '#dce3dd' }}
                />
              </div>

              {/* Size / Variant */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                  {isAr ? 'المقاس / النوع' : 'Size / variant'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. EU 42 / Black"
                  value={productSize}
                  onChange={(e) => setProductSize(e.target.value)}
                  className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  style={{ borderColor: '#dce3dd' }}
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                  {isAr ? 'الكمية' : 'Quantity'} *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={orderQty}
                  onChange={(e) => setOrderQty(parseInt(e.target.value) || 1)}
                  className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  style={{ borderColor: '#dce3dd' }}
                />
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                  {isAr ? 'سعر البيع للوحدة (درهم)' : 'Selling price per unit (AED)'} *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={sellPrice}
                  onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
                  className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  style={{ borderColor: '#dce3dd' }}
                />
              </div>

              {/* Cost Price */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                  {isAr ? 'تكلفة المنتج للوحدة (درهم)' : 'Product cost per unit (AED)'} *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={unitCost}
                  onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                  className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  style={{ borderColor: '#dce3dd' }}
                />
              </div>

              {/* Current Stock */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                  {isAr ? 'المخزون المتوفر' : 'Current stock before order'} *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={currentStock}
                  onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
                  className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  style={{ borderColor: '#dce3dd' }}
                />
              </div>

              {/* Order Status */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                  {isAr ? 'حالة الطلب' : 'Order status'}
                </label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                  className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-medium focus:outline-none cursor-pointer"
                  style={{ borderColor: '#dce3dd' }}
                >
                  <option value="New">{statusLabels.New[language]}</option>
                  <option value="Confirmed">{statusLabels.Confirmed[language]}</option>
                  <option value="Packed">{statusLabels.Packed[language]}</option>
                  <option value="Shipped">{statusLabels.Shipped[language]}</option>
                  <option value="Delivered">{statusLabels.Delivered[language]}</option>
                  <option value="Cancelled">{statusLabels.Cancelled[language]}</option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                  {isAr ? 'طريقة الدفع' : 'Payment method'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-medium focus:outline-none cursor-pointer"
                  style={{ borderColor: '#dce3dd' }}
                >
                  <option value="COD">{paymentLabels.COD[language]}</option>
                  <option value="Paid">{paymentLabels.Paid[language]}</option>
                  <option value="Pending">{paymentLabels.Pending[language]}</option>
                </select>
              </div>

              {/* Other Fees */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                  {isAr ? 'رسوم أخرى لهذا الطلب (درهم)' : 'Other fees for this order (AED)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderFees}
                  onChange={(e) => setOrderFees(parseFloat(e.target.value) || 0)}
                  className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  style={{ borderColor: '#dce3dd' }}
                />
              </div>
            </div>

            {/* Customer Details Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                  {isAr ? 'اسم العميل (اختياري)' : 'Customer Name (optional)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fatima"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border rounded-[10px] p-2 text-slate-900 bg-white"
                  style={{ borderColor: '#dce3dd' }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                  {isAr ? 'رقم الهاتف' : 'UAE Phone'}
                </label>
                <input
                  type="text"
                  placeholder="050 123 4567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full border rounded-[10px] p-2 text-slate-900 bg-white font-mono"
                  style={{ borderColor: '#dce3dd' }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                  {isAr ? 'الإمارة' : 'Emirate'}
                </label>
                <select
                  value={emirate}
                  onChange={(e) => setEmirate(e.target.value as Emirate)}
                  className="w-full border rounded-[10px] p-2 text-slate-900 bg-white cursor-pointer"
                  style={{ borderColor: '#dce3dd' }}
                >
                  {ALL_EMIRATES.map((em) => (
                    <option key={em} value={em}>
                      {em}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2.5 text-white font-bold rounded-[11px] shadow-xs cursor-pointer transition-colors"
                style={{ backgroundColor: 'var(--green)' }}
              >
                {isAr ? 'حفظ الطلب' : 'Save order'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-[11px] hover:bg-slate-50 cursor-pointer transition-colors"
              >
                {isAr ? 'مسح الحقول' : 'Clear form'}
              </button>
            </div>

            {/* Stock Accounting Note */}
            <div
              className="p-3 text-xs rounded-r-[9px] rtl:rounded-r-none rtl:rounded-l-[9px] border-l-3 rtl:border-l-0 rtl:border-r-3 leading-relaxed mt-3"
              style={{
                borderColor: '#8cae83',
                backgroundColor: '#f5f8f3',
                color: '#58645c',
              }}
            >
              {isAr
                ? '✅ نظام المخزون المحسّن: خصم الكمية يتم بشكل ذري ودقيق. تغيير الحالات أو الإلغاء لا يكرر الخصم إطلاقاً، وإلغاء الطلب يعيد الوحدات تلقائياً إلى المخزون.'
                : '✅ Upgraded stock ledger: Stock is deducted atomically once upon save. Cancellations restore stock safely without double-deducting on repeated updates.'}
            </div>
          </form>
        </div>

        {/* Right Panel: Stock Overview (0.8fr -> 5/12 cols) */}
        <div
          className="lg:col-span-5 bg-white rounded-[17px] p-5 border shadow-xs flex flex-col justify-between"
          style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow)' }}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0 tracking-tight">
                  {isAr ? 'ملخص المخزون' : 'Stock overview'}
                </h3>
                <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--muted)' }}>
                  {isAr
                    ? 'الكميات المتبقية حسب الطلبات المحفوظة.'
                    : 'Remaining units based on saved orders.'}
                </p>
              </div>

              {/* View Ledger Button */}
              <button
                onClick={() => {
                  setSelectedProductForLedger(null);
                  setShowLedgerDrawer(true);
                }}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="View stock movement ledger"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isAr ? 'سجل الحركات' : 'Ledger'}
                </span>
              </button>
            </div>

            {/* Products stock list */}
            {products.length === 0 ? (
              <div className="p-6 text-center text-xs" style={{ color: 'var(--muted)' }}>
                {isAr ? 'لا توجد بيانات مخزون بعد.' : 'No stock recorded yet.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto pr-1">
                {products.map((p) => {
                  const isOut = p.current_stock <= 0;
                  const isLow = p.current_stock <= p.reorder_point && !isOut;
                  const maxBenchmark = Math.max(10, p.current_stock + 5);
                  const pct = Math.min(100, Math.round((p.current_stock / maxBenchmark) * 100));

                  return (
                    <div key={p.id} className="py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-xs text-slate-900 truncate">
                          {p.name_en}
                        </strong>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            isOut
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOut
                            ? isAr ? 'نفد المخزون' : 'Out of stock'
                            : isLow
                            ? isAr ? 'مخزون منخفض' : 'Low stock'
                            : isAr ? 'متوفر' : 'In stock'}
                        </span>
                      </div>

                      <div
                        className="text-[11px] mt-0.5 flex items-center justify-between"
                        style={{ color: 'var(--muted)' }}
                      >
                        <span>
                          {p.size || 'Standard'} · {p.current_stock}{' '}
                          {isAr ? 'متبقية' : 'remaining'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRestockProductId(p.id)}
                          className="text-emerald-800 hover:text-emerald-950 font-bold hover:underline"
                        >
                          +{isAr ? 'إعادة تزويد' : 'Restock'}
                        </button>
                      </div>

                      {/* Stock Bar */}
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: isOut
                              ? 'var(--red)'
                              : isLow
                              ? 'var(--amber)'
                              : '#80a96e',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Data Note */}
          <div
            className="p-3 text-xs rounded-r-[9px] rtl:rounded-r-none rtl:rounded-l-[9px] border-l-3 rtl:border-l-0 rtl:border-r-3 leading-relaxed mt-4"
            style={{
              borderColor: '#8cae83',
              backgroundColor: '#f5f8f3',
              color: '#58645c',
            }}
          >
            {isAr
              ? 'تُحفظ البيانات محلياً في متصفحك مجاناً (0 درهم). يمكنك تفعيل الربط السحابي مع Supabase من خلال زر "الربط السحابي" في الأعلى.'
              : 'Your data is securely stored locally in this browser. To sync across devices, use the Cloud Setup tab to connect Supabase PostgreSQL (AED 0 free tier).'}
          </div>
        </div>
      </div>

      {/* Full Width Bottom Panel: Saved orders */}
      <div
        className="bg-white rounded-[17px] p-5 border shadow-xs space-y-3.5"
        style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 m-0 tracking-tight">
              {isAr ? 'الطلبات المحفوظة' : 'Saved orders'}
            </h3>
            <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--muted)' }}>
              {isAr ? 'البحث وتصفية أحدث سجلات الطلبات.' : 'Track, search, and update order records.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {orders.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      isAr
                        ? 'هل تريد حذف جميع الطلبات؟ لا يمكن التراجع عن ذلك.'
                        : 'Delete all saved orders? This cannot be undone.'
                    )
                  ) {
                    onClearAllOrders();
                    showToast(isAr ? 'تم مسح جميع الطلبات.' : 'All orders cleared.');
                  }
                }}
                className="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-[11px] cursor-pointer transition-colors"
              >
                {isAr ? 'مسح الكل' : 'Clear all'}
              </button>
            )}
          </div>
        </div>

        {/* Search Bar & Status Filter Pills */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pt-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالرقم، العميل، الهاتف، المنتج...' : 'Search by Ref, customer, phone, product...'}
              className="w-full pl-9 pr-8 rtl:pl-8 rtl:pr-9 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30 text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {statusTabItems.map((tab) => {
              const isSelected = filterStatus === tab.id;
              const count = statusCounts[tab.id] || 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1 border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                  <span
                    className={`text-[10px] px-1 rounded-full font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table wrapper */}
        <div className="overflow-x-auto border rounded-xl" style={{ borderColor: 'var(--line)' }}>
          <table className="w-full text-xs text-left rtl:text-right border-collapse min-w-[620px]">
            <thead>
              <tr style={{ backgroundColor: '#fafbfa', color: 'var(--muted)' }}>
                <th scope="col" className="p-3 font-bold border-b border-slate-200">
                  {isAr ? 'الرقم' : 'Reference'}
                </th>
                <th scope="col" className="p-3 font-bold border-b border-slate-200">
                  {isAr ? 'المنتج' : 'Product'}
                </th>
                <th scope="col" className="p-3 font-bold border-b border-slate-200">
                  {isAr ? 'الكمية' : 'Qty'}
                </th>
                <th scope="col" className="p-3 font-bold border-b border-slate-200">
                  {isAr ? 'المبيعات' : 'Sales'}
                </th>
                <th scope="col" className="p-3 font-bold border-b border-slate-200">
                  {isAr ? 'الحالة' : 'Status'}
                </th>
                <th scope="col" className="p-3 font-bold border-b border-slate-200">
                  {isAr ? 'الربح التقديري' : 'Est. profit'}
                </th>
                <th scope="col" className="p-3 font-bold border-b border-slate-200 text-center">
                  {isAr ? 'إجراء' : 'Action'}
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs" style={{ color: 'var(--muted)' }}>
                    {isAr
                      ? 'لا توجد طلبات بعد. أضف أول طلب أعلاه.'
                      : 'No orders yet. Add your first order above.'}
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs space-y-2" style={{ color: 'var(--muted)' }}>
                    <p className="font-semibold text-slate-600 m-0">
                      {isAr ? 'لا توجد نتائج تطابق معايير البحث أو التصفية.' : 'No orders match your filter criteria.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterStatus('All');
                      }}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      {isAr ? 'إعادة ضبط التصفية' : 'Reset filters'}
                    </button>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60 border-b border-slate-100 last:border-b-0">
                    <td className="p-3 align-top">
                      <strong className="font-bold text-slate-900 block font-mono">
                        {o.ref || o.order_number}
                      </strong>
                      <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                        {paymentLabels[o.payment_method]?.[language] || o.payment_method} · {o.emirate}
                      </div>
                      {o.customer_name && (
                        <div className="text-[11px] text-slate-700 mt-0.5">
                          {o.customer_name} {o.customer_phone ? `(${o.customer_phone})` : ''}
                        </div>
                      )}
                    </td>

                    <td className="p-3 align-top">
                      <span className="font-semibold text-slate-800">{o.product}</span>
                      {o.size && (
                        <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                          {o.size}
                        </div>
                      )}
                    </td>

                    <td className="p-3 align-top font-bold text-slate-900">
                      {o.qty}
                    </td>

                    <td className="p-3 align-top font-bold text-slate-900 font-mono">
                      {formatAed(o.total_revenue || o.price * o.qty, language)}
                    </td>

                    <td className="p-3 align-top">
                      {/* Status Dropdown with Atomic Safety */}
                      <select
                        aria-label={isAr ? `تغيير حالة الطلب ${o.ref}` : `Change status for order ${o.ref}`}
                        value={o.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as OrderStatus;
                          onUpdateStatus(o.id, newStatus);
                          if (newStatus === 'Cancelled') {
                            showToast(
                              isAr
                                ? 'تم إلغاء الطلب وإرجاع المنتجات للمخزون تلقائياً.'
                                : 'Order cancelled and stock safely restocked.'
                            );
                          } else {
                            showToast(`Status updated to ${newStatus}. Inventory safely tracked.`);
                          }
                        }}
                        className="p-1.5 bg-white border rounded-lg text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                        style={{ borderColor: 'var(--line)' }}
                      >
                        <option value="New">{statusLabels.New[language]}</option>
                        <option value="Confirmed">{statusLabels.Confirmed[language]}</option>
                        <option value="Packed">{statusLabels.Packed[language]}</option>
                        <option value="Shipped">{statusLabels.Shipped[language]}</option>
                        <option value="Delivered">{statusLabels.Delivered[language]}</option>
                        <option value="Cancelled">{statusLabels.Cancelled[language]}</option>
                      </select>
                    </td>

                    <td className="p-3 align-top font-bold font-mono">
                      <span style={{ color: o.net_profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {formatAed(o.net_profit, language)}
                      </span>
                    </td>

                    <td className="p-3 align-top text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectOrderForReply(o)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border flex items-center gap-1 cursor-pointer transition-colors"
                          style={{
                            backgroundColor: 'var(--soft)',
                            borderColor: '#dce8d3',
                            color: 'var(--green)',
                          }}
                          title={isAr ? 'إنشاء مسودة رد بالذكاء الاصطناعي' : 'Generate AI customer reply draft'}
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>{isAr ? 'رد' : 'Reply'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(isAr ? 'هل تريد حذف هذا الطلب؟' : 'Delete this order?')) {
                              onDeleteOrder(o.id);
                              showToast(isAr ? 'تم حذف الطلب.' : 'Order deleted.');
                            }
                          }}
                          className="px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                        >
                          {isAr ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Prompt Modal */}
      {restockProductId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm">
              {isAr ? 'إعادة تزويد المخزون' : 'Restock Units'}
            </h4>
            <div className="space-y-2 text-xs">
              <label className="block text-slate-600 font-medium">
                {isAr ? 'الكمية المراد إضافتها:' : 'Units to add:'}
              </label>
              <div className="flex gap-2">
                {[5, 10, 20, 50].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setRestockDelta(qty)}
                    className={`px-3 py-1.5 rounded-lg font-bold border ${
                      restockDelta === qty
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    +{qty}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRestockProductId(null)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 font-semibold text-xs"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleExecuteRestock(restockProductId)}
                className="px-4 py-1.5 text-white font-bold rounded-lg text-xs"
                style={{ backgroundColor: 'var(--green)' }}
              >
                {isAr ? 'تأكيد' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Movements Ledger Drawer */}
      {showLedgerDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-5 space-y-4 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {isAr ? 'سجل حركات المخزون' : 'Inventory Movements Ledger'}
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                    {isAr
                      ? 'توثيق غير قابل للتكرار لكل خصم وإرجاع للمخزن.'
                      : 'Audit ledger proving zero double-deduction on status changes.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowLedgerDrawer(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {movements.length === 0 ? (
                <div className="py-12 text-center text-xs" style={{ color: 'var(--muted)' }}>
                  {isAr ? 'لا توجد حركات مسجلة بعد.' : 'No movements logged yet.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {movements.map((mov) => {
                    const isNeg = mov.quantity_delta < 0;
                    return (
                      <div
                        key={mov.id}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {mov.product_name_en}
                          </span>
                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded-full ${
                              isNeg ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {mov.quantity_delta > 0 ? `+${mov.quantity_delta}` : mov.quantity_delta}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--muted)' }}>
                          <span>
                            {mov.stock_before} &rarr; <strong>{mov.stock_after} units</strong>
                          </span>
                          <span className="font-mono text-[10px]">
                            {new Date(mov.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 bg-white p-1.5 rounded border border-slate-200">
                          {mov.reason}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowLedgerDrawer(false)}
              className="w-full py-2.5 text-white font-bold rounded-xl text-xs"
              style={{ backgroundColor: 'var(--green)' }}
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import { TestCaseResult, TestCaseAssertion, Product } from '../types';
import { calculateProfit, roundAed, validateUaePhone } from './calculations';
import { InventoryManager } from './inventoryManager';

export async function runAllSystemTests(): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = [];

  // =========================================================================
  // SUITE 1: Profit Calculations & UAE Net Margin
  // =========================================================================
  {
    const start = performance.now();
    const assertions: TestCaseAssertion[] = [];

    // Order calculation: Subtotal 200 AED, COGS 60 AED, Customer Shipping 20 AED, Courier Cost 18 AED, COD fee 8 AED, 5% VAT registered
    const profit = calculateProfit({
      subtotal: 200,
      totalCogs: 60,
      shippingFeeChargedToCustomer: 20,
      courierCostPaidByMerchant: 18,
      codFee: 8,
      vatRegistered: true,
      vatRate: 5,
    });

    // 1. VAT: (200 + 20) * 0.05 = 11.00 AED
    assertions.push({
      name: 'UAE VAT 5% on Subtotal + Shipping',
      expected: 11.0,
      actual: profit.vatAmount,
      passed: profit.vatAmount === 11.0,
    });

    // 2. Total Revenue: 200 + 20 + 11 = 231.00 AED
    assertions.push({
      name: 'Total Revenue Collected (Subtotal + Shipping + VAT)',
      expected: 231.0,
      actual: profit.totalRevenue,
      passed: profit.totalRevenue === 231.0,
    });

    // 3. Direct Costs: 60 (COGS) + 18 (Courier) + 8 (COD fee) + 11 (VAT) = 97.00 AED
    // Net Profit: 231 - 97 = 134.00 AED
    assertions.push({
      name: 'Net Profit in AED',
      expected: 134.0,
      actual: profit.netProfit,
      passed: profit.netProfit === 134.0,
    });

    // 4. Net Margin: (134 / 231) * 100 = 58.01%
    const expectedMargin = roundAed((134 / 231) * 100);
    assertions.push({
      name: 'Net Profit Margin Percentage',
      expected: expectedMargin,
      actual: profit.profitMargin,
      passed: profit.profitMargin === expectedMargin,
    });

    results.push({
      id: 'suite-1-profit-math',
      suiteNameEn: 'Profit & Net Margin Calculations (UAE VAT & COD)',
      suiteNameAr: 'حسابات صافي الربح وضريبة القيمة المضافة وعمولات الشحن',
      descriptionEn: 'Validates AED revenue, COGS, courier delivery fees, COD surcharge, and 5% UAE VAT accuracy.',
      descriptionAr: 'التحقق من صحة الإيرادات، التكلفة المباشرة، رسوم التوصيل، عمولة الدفع عند الاستلام، والضريبة 5%.',
      passed: assertions.every((a) => a.passed),
      assertions,
      durationMs: roundAed(performance.now() - start),
    });
  }

  // =========================================================================
  // SUITE 2: Zero Revenue & Loss / Division-by-Zero Safety
  // =========================================================================
  {
    const start = performance.now();
    const assertions: TestCaseAssertion[] = [];

    // Zero revenue order (e.g. Free warranty replacement or promotion)
    // Merchant pays COGS 40 AED, Courier 20 AED, Customer pays 0 AED
    const zeroRevProfit = calculateProfit({
      subtotal: 0,
      totalCogs: 40,
      shippingFeeChargedToCustomer: 0,
      courierCostPaidByMerchant: 20,
      codFee: 0,
      vatRegistered: false,
    });

    // 1. Total revenue is 0
    assertions.push({
      name: 'Zero Revenue is preserved without NaN',
      expected: 0,
      actual: zeroRevProfit.totalRevenue,
      passed: zeroRevProfit.totalRevenue === 0,
    });

    // 2. Net profit is -60 AED (loss)
    assertions.push({
      name: 'Net Loss is calculated accurately (-60 AED)',
      expected: -60,
      actual: zeroRevProfit.netProfit,
      passed: zeroRevProfit.netProfit === -60,
    });

    // 3. Margin does not crash with division by zero (must not be NaN or Infinity)
    const isSafeNumber = !isNaN(zeroRevProfit.profitMargin) && isFinite(zeroRevProfit.profitMargin);
    assertions.push({
      name: 'Zero division safety: Margin is finite and safe',
      expected: true,
      actual: isSafeNumber,
      passed: isSafeNumber,
    });

    results.push({
      id: 'suite-2-zero-revenue',
      suiteNameEn: 'Zero Revenue & Loss Protection',
      suiteNameAr: 'حماية الإيراد الصفري ومنع أخطاء القسمة على صفر',
      descriptionEn: 'Ensures free replacements, discounts, and loss orders handle negative profits safely without NaN or crashes.',
      descriptionAr: 'التأكد من معالجة الطلبات المجانية وبدائل الضمان واحتساب الخسارة بأمان دون أخطاء برمجية.',
      passed: assertions.every((a) => a.passed),
      assertions,
      durationMs: roundAed(performance.now() - start),
    });
  }

  // =========================================================================
  // SUITE 3: Inventory Deductions & Lifecycle Progression
  // =========================================================================
  {
    const start = performance.now();
    const assertions: TestCaseAssertion[] = [];

    // Create an isolated fresh test instance of InventoryManager
    const testMgr = new InventoryManager(true);
    const testSku = `TEST-PROD-${Date.now()}`;
    const testProduct: Product = testMgr.addProduct({
      name_en: 'Test Luxury Musk (50ml)',
      name_ar: 'مسك فاخر تجريبي (50 مل)',
      sku: testSku,
      selling_price: 150,
      cost_price: 50,
      current_stock: 10,
      reorder_point: 3,
    });

    // Initial stock is 10
    assertions.push({
      name: 'Product initial stock established at 10 units',
      expected: 10,
      actual: testProduct.current_stock,
      passed: testProduct.current_stock === 10,
    });

    // Place order for 3 units
    const { order } = testMgr.createOrderAtomic({
      customerName: 'Test Customer',
      customerPhone: '+971500000001',
      emirate: 'Dubai',
      deliveryAddress: 'Business Bay',
      channel: 'WhatsApp',
      paymentMethod: 'COD',
      items: [{ productId: testProduct.id, quantity: 3 }],
    });

    // Current stock after order creation should be 7
    const productAfterOrder = testMgr.getProducts().find((p) => p.id === testProduct.id)!;
    assertions.push({
      name: 'Stock deducted to 7 upon order reservation',
      expected: 7,
      actual: productAfterOrder.current_stock,
      passed: productAfterOrder.current_stock === 7,
    });

    // Update status to 'confirmed' -> stock should remain 7 (no double deduction)
    testMgr.updateOrderStatusAtomic(order.id, 'confirmed');
    const productAfterConfirmed = testMgr.getProducts().find((p) => p.id === testProduct.id)!;
    assertions.push({
      name: 'Status -> Confirmed: Stock remains 7 (No double-deduction)',
      expected: 7,
      actual: productAfterConfirmed.current_stock,
      passed: productAfterConfirmed.current_stock === 7,
    });

    // Update status to 'shipped' -> stock should remain 7 (no double deduction)
    testMgr.updateOrderStatusAtomic(order.id, 'shipped');
    const productAfterShipped = testMgr.getProducts().find((p) => p.id === testProduct.id)!;
    assertions.push({
      name: 'Status -> Shipped: Stock remains 7 (No double-deduction)',
      expected: 7,
      actual: productAfterShipped.current_stock,
      passed: productAfterShipped.current_stock === 7,
    });

    // Update status to 'delivered' -> stock should remain 7
    testMgr.updateOrderStatusAtomic(order.id, 'delivered');
    const productAfterDelivered = testMgr.getProducts().find((p) => p.id === testProduct.id)!;
    assertions.push({
      name: 'Status -> Delivered: Stock remains 7 (Fulfilled)',
      expected: 7,
      actual: productAfterDelivered.current_stock,
      passed: productAfterDelivered.current_stock === 7,
    });

    results.push({
      id: 'suite-3-lifecycle-deduction',
      suiteNameEn: 'Lifecycle Stock Guard (Zero Double-Deduction)',
      suiteNameAr: 'حماية المخزون عبر مراحل الطلب (منع الخصم المكرر)',
      descriptionEn: 'Guarantees that transitioning orders through Pending -> Confirmed -> Shipped -> Delivered never deducts stock more than once.',
      descriptionAr: 'يضمن أن تحديث حالة الطلب عبر مراحله المتتابعة لا يخصم المخزون سوى مرة واحدة فقط.',
      passed: assertions.every((a) => a.passed),
      assertions,
      durationMs: roundAed(performance.now() - start),
    });
  }

  // =========================================================================
  // SUITE 4: Order Cancellation & Restocking Safety
  // =========================================================================
  {
    const start = performance.now();
    const assertions: TestCaseAssertion[] = [];

    const testMgr = new InventoryManager(true);
    const cancelSku = `TEST-CANCEL-${Date.now()}`;
    const product = testMgr.addProduct({
      name_en: 'Test Oud Blend',
      name_ar: 'خلطة عود تجريبية',
      sku: cancelSku,
      selling_price: 200,
      cost_price: 80,
      current_stock: 5,
      reorder_point: 2,
    });

    // Place order for 2 units (stock goes from 5 -> 3)
    const { order } = testMgr.createOrderAtomic({
      customerName: 'Cancel Test Customer',
      customerPhone: '+971500000002',
      emirate: 'Abu Dhabi',
      deliveryAddress: 'Corniche',
      channel: 'Instagram',
      paymentMethod: 'COD',
      items: [{ productId: product.id, quantity: 2 }],
    });

    const stockAfterOrder = testMgr.getProducts().find((p) => p.id === product.id)!.current_stock;
    assertions.push({
      name: 'Stock decreased from 5 to 3 on order placement',
      expected: 3,
      actual: stockAfterOrder,
      passed: stockAfterOrder === 3,
    });

    // 1. Cancel the order -> Stock should be restored from 3 back to 5
    testMgr.updateOrderStatusAtomic(order.id, 'cancelled', 'Customer changed mind');
    const stockAfterCancel = testMgr.getProducts().find((p) => p.id === product.id)!.current_stock;
    assertions.push({
      name: 'Cancellation restores stock back to 5 units',
      expected: 5,
      actual: stockAfterCancel,
      passed: stockAfterCancel === 5,
    });

    // 2. Call cancel AGAIN (Simulating accidental repeated cancellation or network retry)
    testMgr.updateOrderStatusAtomic(order.id, 'cancelled', 'Duplicate cancel signal');
    const stockAfterDuplicateCancel = testMgr.getProducts().find((p) => p.id === product.id)!.current_stock;
    assertions.push({
      name: 'Repeated cancellation does NOT double-restock (Stock stays 5)',
      expected: 5,
      actual: stockAfterDuplicateCancel,
      passed: stockAfterDuplicateCancel === 5,
    });

    // 3. Reactivate order back to 'confirmed' -> Should safely re-deduct back to 3
    testMgr.updateOrderStatusAtomic(order.id, 'confirmed', 'Reactivated by merchant');
    const stockAfterReactivate = testMgr.getProducts().find((p) => p.id === product.id)!.current_stock;
    assertions.push({
      name: 'Order reactivation re-deducts stock back to 3 units',
      expected: 3,
      actual: stockAfterReactivate,
      passed: stockAfterReactivate === 3,
    });

    results.push({
      id: 'suite-4-cancellation-restock',
      suiteNameEn: 'Cancellation Restock & Double-Restock Prevention',
      suiteNameAr: 'إرجاع المخزون عند الإلغاء ومنع الإرجاع المزدوج',
      descriptionEn: 'Validates that cancelling an order restores inventory exactly once and prevents duplicate restock triggers.',
      descriptionAr: 'يتحقق من أن إلغاء الطلب يعيد الكميات للمخزن بدقة ويمنع تكرار الإعادة عند تكرار الإشارة.',
      passed: assertions.every((a) => a.passed),
      assertions,
      durationMs: roundAed(performance.now() - start),
    });
  }

  // =========================================================================
  // SUITE 5: Insufficient Stock Rejection Guard
  // =========================================================================
  {
    const start = performance.now();
    const assertions: TestCaseAssertion[] = [];

    const testMgr = new InventoryManager(true);
    const limitedSku = `TEST-LIMIT-${Date.now()}`;
    const product = testMgr.addProduct({
      name_en: 'Limited Edition UAE Silk Scarf',
      name_ar: 'وشاح حرير إماراتي محدود',
      sku: limitedSku,
      selling_price: 180,
      cost_price: 60,
      current_stock: 2, // only 2 in stock
      reorder_point: 1,
    });

    // Attempt to order 5 units when only 2 are available
    let errorCaught = false;
    let errorMessage = '';

    try {
      testMgr.createOrderAtomic({
        customerName: 'Overlimit Customer',
        customerPhone: '+971500000003',
        emirate: 'Sharjah',
        deliveryAddress: 'Al Majaz',
        channel: 'WhatsApp',
        paymentMethod: 'COD',
        items: [{ productId: product.id, quantity: 5 }],
      });
    } catch (err: any) {
      errorCaught = true;
      errorMessage = err.message;
    }

    assertions.push({
      name: 'Rejects order when requested quantity exceeds available stock',
      expected: true,
      actual: errorCaught,
      passed: errorCaught,
    });

    assertions.push({
      name: 'Stock remains unchanged at 2 units after rejected attempt',
      expected: 2,
      actual: testMgr.getProducts().find((p) => p.id === product.id)!.current_stock,
      passed: testMgr.getProducts().find((p) => p.id === product.id)!.current_stock === 2,
    });

    assertions.push({
      name: 'Error message mentions insufficient stock and available count',
      expected: true,
      actual: errorMessage.includes('Insufficient stock') || errorMessage.includes('exceeds available stock') || errorMessage.includes('Available: 2'),
      passed: errorMessage.includes('Insufficient stock') || errorMessage.includes('exceeds available stock') || errorMessage.includes('Available: 2'),
    });

    results.push({
      id: 'suite-5-stock-limits',
      suiteNameEn: 'Stock Sufficiency & Atomic Rollback Guard',
      suiteNameAr: 'التحقق الذري من كفاية المخزون ومنع الطلبات الزائدة',
      descriptionEn: 'Confirms that orders exceeding available stock are rejected atomically without deducting partial inventory.',
      descriptionAr: 'يؤكد رفض الطلبات التي تتجاوز المخزون بشكل ذري دون ترك أي خصم جزئي معلق.',
      passed: assertions.every((a) => a.passed),
      assertions,
      durationMs: roundAed(performance.now() - start),
    });
  }

  // =========================================================================
  // SUITE 6: Order Deletion & Inventory Recovery Guard
  // =========================================================================
  {
    const start = performance.now();
    const assertions: TestCaseAssertion[] = [];

    const testMgr = new InventoryManager(true);
    const testProduct = testMgr.addProduct({
      name_en: 'Test Recovery Perfume',
      name_ar: 'عطر تجريبي للاسترجاع',
      sku: `DEL-TEST-${Date.now()}`,
      selling_price: 250,
      cost_price: 90,
      current_stock: 10,
      reorder_point: 2,
    });

    // 1. Create active order for 4 units (stock becomes 6)
    const { order } = testMgr.createOrderAtomic({
      customerName: 'Delete Test Customer',
      customerPhone: '+971500000004',
      items: [{ productId: testProduct.id, quantity: 4 }],
    });

    const stockAfterOrder = testMgr.getProducts().find((p) => p.id === testProduct.id)!.current_stock;
    assertions.push({
      name: 'Stock deducted from 10 to 6 on order placement',
      expected: 6,
      actual: stockAfterOrder,
      passed: stockAfterOrder === 6,
    });

    // 2. Delete the active order -> stock must be recovered to 10
    const deleted = testMgr.deleteOrder(order.id);
    const stockAfterDelete = testMgr.getProducts().find((p) => p.id === testProduct.id)!.current_stock;
    assertions.push({
      name: 'Deleting active order restores stock back to 10',
      expected: 10,
      actual: stockAfterDelete,
      passed: deleted && stockAfterDelete === 10,
    });

    // 3. Deleting non-existent order returns false safely
    const nonExistentDeleted = testMgr.deleteOrder('invalid-order-id-xyz');
    assertions.push({
      name: 'Safe failure when deleting non-existent order (returns false)',
      expected: false,
      actual: nonExistentDeleted,
      passed: nonExistentDeleted === false,
    });

    results.push({
      id: 'suite-6-order-deletion',
      suiteNameEn: 'Order Deletion & Stock Recovery Guard',
      suiteNameAr: 'حماية استعادة المخزون عند حذف الطلبات',
      descriptionEn: 'Validates that deleting active orders safely restores reserved inventory while preventing phantom restocks on non-existent records.',
      descriptionAr: 'يضمن استرجاع المخزون بدقة عند حذف أي طلب نشط مع معالجة آمنة للمعرفات غير الموجودة.',
      passed: assertions.every((a) => a.passed),
      assertions,
      durationMs: roundAed(performance.now() - start),
    });
  }

  // =========================================================================
  // SUITE 7: Manual Stock Adjustment & Negative Stock Guard
  // =========================================================================
  {
    const start = performance.now();
    const assertions: TestCaseAssertion[] = [];

    const testMgr = new InventoryManager(true);
    const testProduct = testMgr.addProduct({
      name_en: 'Test Adjustment Abaya',
      name_ar: 'عباية تجريبية للتعديل',
      sku: `ADJ-TEST-${Date.now()}`,
      selling_price: 300,
      cost_price: 100,
      current_stock: 5,
      reorder_point: 2,
    });

    // 1. Add +15 units
    testMgr.adjustStock(testProduct.id, 15, 'Supplier delivery received');
    const stockAfterAdd = testMgr.getProducts().find((p) => p.id === testProduct.id)!.current_stock;
    assertions.push({
      name: 'Stock incremented from 5 to 20 (+15 units)',
      expected: 20,
      actual: stockAfterAdd,
      passed: stockAfterAdd === 20,
    });

    // 2. Deduct -8 units
    testMgr.adjustStock(testProduct.id, -8, 'Showroom display units reserved');
    const stockAfterSub = testMgr.getProducts().find((p) => p.id === testProduct.id)!.current_stock;
    assertions.push({
      name: 'Stock decremented from 20 to 12 (-8 units)',
      expected: 12,
      actual: stockAfterSub,
      passed: stockAfterSub === 12,
    });

    // 3. Attempt excessive deduction (-25 units when only 12 available)
    let negativeErrorCaught = false;
    try {
      testMgr.adjustStock(testProduct.id, -25, 'Excessive deduction');
    } catch {
      negativeErrorCaught = true;
    }

    const stockAfterRejectedSub = testMgr.getProducts().find((p) => p.id === testProduct.id)!.current_stock;
    assertions.push({
      name: 'Rejects adjustment leading to negative stock and retains 12 units',
      expected: true,
      actual: negativeErrorCaught && stockAfterRejectedSub === 12,
      passed: negativeErrorCaught && stockAfterRejectedSub === 12,
    });

    // 4. Zero adjustment is a safe no-op
    testMgr.adjustStock(testProduct.id, 0, 'No change');
    const stockAfterZero = testMgr.getProducts().find((p) => p.id === testProduct.id)!.current_stock;
    assertions.push({
      name: 'Zero adjustment is safely handled without mutation (remains 12)',
      expected: 12,
      actual: stockAfterZero,
      passed: stockAfterZero === 12,
    });

    results.push({
      id: 'suite-7-stock-adjustment',
      suiteNameEn: 'Manual Stock Adjustments & Negative Stock Guard',
      suiteNameAr: 'التعديل اليدوي للمخزون ومنع المخزون السالب',
      descriptionEn: 'Ensures manual inventory adjustments update ledger correctly and strictly reject changes causing negative quantities.',
      descriptionAr: 'يضمن صحة التعديلات اليدوية للمخزون ورفض أي تعديل يؤدي إلى كميات سالبة.',
      passed: assertions.every((a) => a.passed),
      assertions,
      durationMs: roundAed(performance.now() - start),
    });
  }

  // =========================================================================
  // SUITE 8: UAE Mobile Phone Validation & Normalization
  // =========================================================================
  {
    const start = performance.now();
    const assertions: TestCaseAssertion[] = [];

    // Local 050 format
    const localRes = validateUaePhone('050 123 4567');
    assertions.push({
      name: 'Normalizes "050 123 4567" to "+971501234567"',
      expected: '+971501234567',
      actual: localRes.normalized,
      passed: localRes.valid && localRes.normalized === '+971501234567',
    });

    // International +971 format
    const intlRes = validateUaePhone('+971 52 987 6543');
    assertions.push({
      name: 'Accepts "+971 52 987 6543" as valid',
      expected: '+971529876543',
      actual: intlRes.normalized,
      passed: intlRes.valid && intlRes.normalized === '+971529876543',
    });

    // 00971 format
    const doubleZeroRes = validateUaePhone('00971554321987');
    assertions.push({
      name: 'Accepts "00971554321987" and normalizes to "+971554321987"',
      expected: '+971554321987',
      actual: doubleZeroRes.normalized,
      passed: doubleZeroRes.valid && doubleZeroRes.normalized === '+971554321987',
    });

    // Invalid non-mobile or landline number (e.g. 04 123 4567)
    const landlineRes = validateUaePhone('04 123 4567');
    assertions.push({
      name: 'Rejects landline "04 123 4567" (must be mobile 05X)',
      expected: false,
      actual: landlineRes.valid,
      passed: landlineRes.valid === false,
    });

    // Empty string
    const emptyRes = validateUaePhone('');
    assertions.push({
      name: 'Rejects empty phone number with error message',
      expected: false,
      actual: emptyRes.valid,
      passed: emptyRes.valid === false && Boolean(emptyRes.errorEn),
    });

    results.push({
      id: 'suite-8-phone-validation',
      suiteNameEn: 'UAE Mobile Phone Validation & E.164 Normalization',
      suiteNameAr: 'التحقق من أرقام الهواتف الإماراتية والتوحيد القياسي',
      descriptionEn: 'Validates UAE mobile prefixes (050, 052, 054, 055, 056, 058), rejects landlines/invalid lengths, and formats to E.164.',
      descriptionAr: 'يتحقق من صحة بادئات الهواتف النقالة الإماراتية ويرفض الأرقام الأرضية ويحولها إلى الصيغة الدولية الموحدة.',
      passed: assertions.every((a) => a.passed),
      assertions,
      durationMs: roundAed(performance.now() - start),
    });
  }

  // =========================================================================
  // SUITE 9: Comprehensive Multi-Fee Profit & Margin Accuracy
  // =========================================================================
  {
    const start = performance.now();
    const assertions: TestCaseAssertion[] = [];

    // Order: Subtotal 500 AED, COGS 150 AED, Shipping charged 25 AED, Courier cost 22 AED, COD fee 10 AED, Discount 30 AED, 5% VAT registered
    const multiProfit = calculateProfit({
      subtotal: 500,
      totalCogs: 150,
      shippingFeeChargedToCustomer: 25,
      courierCostPaidByMerchant: 22,
      codFee: 10,
      discount: 30,
      vatRegistered: true,
      vatRate: 5,
    });

    // Discounted subtotal: 500 - 30 = 470
    // Taxable base: 470 + 25 = 495
    // VAT (5%): 495 * 0.05 = 24.75 AED
    assertions.push({
      name: 'Multi-fee VAT (5% on 470 net subtotal + 25 delivery)',
      expected: 24.75,
      actual: multiProfit.vatAmount,
      passed: multiProfit.vatAmount === 24.75,
    });

    // Total Revenue: 470 + 25 + 24.75 = 519.75 AED
    assertions.push({
      name: 'Multi-fee Total Revenue Collected (470 + 25 + 24.75)',
      expected: 519.75,
      actual: multiProfit.totalRevenue,
      passed: multiProfit.totalRevenue === 519.75,
    });

    // Direct Costs: 150 (COGS) + 22 (Courier) + 10 (COD) + 24.75 (VAT) = 206.75 AED
    // Net Profit: 519.75 - 206.75 = 313.00 AED
    assertions.push({
      name: 'Multi-fee Net Profit in AED (519.75 - 206.75 = 313.00)',
      expected: 313.0,
      actual: multiProfit.netProfit,
      passed: multiProfit.netProfit === 313.0,
    });

    // Net Margin: (313.00 / 519.75) * 100 = 60.22%
    const expectedMultiMargin = roundAed((313.0 / 519.75) * 100);
    assertions.push({
      name: 'Multi-fee Net Margin Percentage (60.22%)',
      expected: expectedMultiMargin,
      actual: multiProfit.profitMargin,
      passed: multiProfit.profitMargin === expectedMultiMargin,
    });

    results.push({
      id: 'suite-9-multi-fee-profit',
      suiteNameEn: 'Comprehensive Multi-Fee Profit & Margin Accuracy',
      suiteNameAr: 'دقة حساب الأرباح الشاملة مع الخصومات ورسوم الدفع والشحن',
      descriptionEn: 'Rigorous validation of complex retail math: merchant discounts, customer delivery fees, merchant courier costs, COD surcharge, and 5% VAT liability.',
      descriptionAr: 'التحقق الصارم من الحسابات التجارية المعقدة: خصومات المتجر، رسوم شحن العميل، تكلفة المندوب، عمولة التحصيل، وضريبة القيمة المضافة.',
      passed: assertions.every((a) => a.passed),
      assertions,
      durationMs: roundAed(performance.now() - start),
    });
  }

  return results;
}

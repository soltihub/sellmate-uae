import { ProfitBreakdown, Emirate } from '../types';

/**
 * Standard typical courier cost benchmarks in the UAE
 */
export const EMIRATE_COURIER_BENCHMARKS: Record<Emirate, { typicalCost: number; standardDeliveryDays: string }> = {
  'Dubai': { typicalCost: 18, standardDeliveryDays: 'Same-day / Next-day' },
  'Abu Dhabi': { typicalCost: 25, standardDeliveryDays: '1-2 Days' },
  'Sharjah': { typicalCost: 20, standardDeliveryDays: '1-2 Days' },
  'Ajman': { typicalCost: 20, standardDeliveryDays: '1-2 Days' },
  'Ras Al Khaimah': { typicalCost: 28, standardDeliveryDays: '2 Days' },
  'Fujairah': { typicalCost: 28, standardDeliveryDays: '2 Days' },
  'Umm Al Quwain': { typicalCost: 25, standardDeliveryDays: '2 Days' },
};

export const ALL_EMIRATES: Emirate[] = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Ras Al Khaimah',
  'Fujairah',
  'Umm Al Quwain',
];

/**
 * Calculates profit and margins for an order or simulation.
 * All calculations round cleanly to 2 decimal places (AED standard).
 * Protects against division-by-zero for zero revenue orders.
 */
export function calculateProfit(params: {
  subtotal: number;
  totalCogs: number;
  shippingFeeChargedToCustomer?: number;
  courierCostPaidByMerchant?: number;
  codFee?: number;
  discount?: number;
  vatRegistered?: boolean;
  vatRate?: number; // e.g. 5
}): ProfitBreakdown {
  const subtotal = Math.max(0, Number(params.subtotal) || 0);
  const totalCogs = Math.max(0, Number(params.totalCogs) || 0);
  const shippingFee = Math.max(0, Number(params.shippingFeeChargedToCustomer) || 0);
  const courierCost = Math.max(0, Number(params.courierCostPaidByMerchant) || 0);
  const codFee = Math.max(0, Number(params.codFee) || 0);
  const discount = Math.max(0, Number(params.discount) || 0);
  const vatRegistered = Boolean(params.vatRegistered);
  const vatRate = Number(params.vatRate) || 5;

  // Net subtotal after merchant discount
  const discountedSubtotal = Math.max(0, subtotal - discount);

  // UAE VAT 5% calculation
  // If merchant is VAT registered, 5% applies to taxable supplies
  const vatAmount = vatRegistered
    ? roundAed((discountedSubtotal + shippingFee) * (vatRate / 100))
    : 0;

  // Total Revenue collected from customer
  const totalRevenue = roundAed(discountedSubtotal + shippingFee + vatAmount);

  // Total Direct Costs = COGS + Courier Shipping Cost + COD Payment Collection Surcharge + VAT liability
  const totalDirectCosts = totalCogs + courierCost + codFee + vatAmount;

  // Net Profit in AED
  const netProfit = roundAed(totalRevenue - totalDirectCosts);

  // Profit Margin percentage
  // Zero revenue case: returns 0% (or negative loss percentage if costs > 0)
  let profitMargin = 0;
  if (totalRevenue > 0) {
    profitMargin = roundAed((netProfit / totalRevenue) * 100);
  } else if (totalDirectCosts > 0) {
    profitMargin = -100;
  }

  return {
    subtotal: roundAed(subtotal),
    shippingFee: roundAed(shippingFee),
    courierCost: roundAed(courierCost),
    codFee: roundAed(codFee),
    discount: roundAed(discount),
    vatAmount: roundAed(vatAmount),
    totalRevenue: roundAed(totalRevenue),
    totalCogs: roundAed(totalCogs),
    netProfit: roundAed(netProfit),
    profitMargin: profitMargin,
  };
}

/**
 * Rounds numbers to 2 decimal places for AED currency standards
 */
export function roundAed(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a currency number in AED with comma separation
 */
export function formatAed(amount: number, locale = 'en'): string {
  const rounded = roundAed(amount);
  const formatted = rounded.toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${locale === 'ar' ? 'د.إ' : 'AED'}`;
}

/**
 * Validates UAE phone numbers (e.g. +971 50 123 4567 or 0501234567)
 */
export function validateUaePhone(phone: string): { valid: boolean; normalized: string; errorEn?: string; errorAr?: string } {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  if (!cleaned) {
    return {
      valid: false,
      normalized: '',
      errorEn: 'Phone number is required',
      errorAr: 'رقم الهاتف مطلوب',
    };
  }

  // Matches +9715XXXXXXXX, 009715XXXXXXXX, or 05XXXXXXXX
  const uaeRegex = /^(?:\+971|00971|0)?(5\d{8})$/;
  const match = cleaned.match(uaeRegex);

  if (match) {
    const localPart = match[1]; // e.g. 501234567
    const normalized = `+971${localPart}`;
    return { valid: true, normalized };
  }

  return {
    valid: false,
    normalized: cleaned,
    errorEn: 'Please enter a valid UAE mobile number (e.g. 050 123 4567 or +971 50 123 4567)',
    errorAr: 'يرجى إدخال رقم هاتف إماراتي صحيح (مثال: 050 123 4567 أو +971 50 123 4567)',
  };
}

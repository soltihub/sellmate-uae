import React from 'react';
import { Order, Product } from '../types';
import { formatAed, roundAed } from '../utils/calculations';

interface HeroStatsProps {
  orders: Order[];
  products: Product[];
  language: 'en' | 'ar';
}

export const HeroStats: React.FC<HeroStatsProps> = ({ orders, products, language }) => {
  const isAr = language === 'ar';

  const nonCancelledOrders = orders.filter((o) => o.status !== 'Cancelled');
  const openOrdersCount = orders.filter(
    (o) => !['Delivered', 'Cancelled'].includes(o.status)
  ).length;

  const totalSales = roundAed(
    nonCancelledOrders.reduce(
      (sum, o) => sum + (typeof o.total_revenue === 'number' ? o.total_revenue : o.price * o.qty),
      0
    )
  );
  const totalProfit = roundAed(
    nonCancelledOrders.reduce((sum, o) => sum + (Number(o.net_profit) || 0), 0)
  );
  const totalStockUnits = products.reduce((sum, p) => sum + Math.max(0, p.current_stock || 0), 0);

  return (
    <div className="space-y-4 mb-4">
      {/* Hero Section */}
      <section
        className="rounded-[22px] p-5 sm:p-6 text-white flex items-center justify-between gap-5 overflow-hidden shadow-xs"
        style={{ backgroundColor: 'var(--green)' }}
      >
        <div className="max-w-xl">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight mb-2 leading-tight">
            {isAr ? 'أدر متجرك بمهام أقل.' : 'Run your shop with less busywork.'}
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#d7e3da' }}>
            {isAr
              ? 'تابع الطلبات، واحسب أرباحك، وجهّز ردود العملاء بالعربية أو الإنجليزية من مكان واحد مع ضمان أمان المخزون ومنع الخصم المكرر.'
              : 'Track orders, understand your profit, and prepare customer replies in English or Arabic from one simple workspace.'}
          </p>
        </div>

        {/* Lime Orb icon */}
        <div
          className="hidden sm:grid place-items-center w-20 h-20 md:w-24 md:h-24 rounded-[30px] font-black text-3xl md:text-4xl shrink-0 select-none transform rotate-6 shadow-sm"
          style={{ backgroundColor: 'var(--lime)', color: 'var(--green)' }}
        >
          ↗
        </div>
      </section>

      {/* 4 Stats Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Open Orders */}
        <div
          className="bg-white rounded-[17px] p-4 border shadow-xs"
          style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow)' }}
        >
          <span className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
            {isAr ? 'الطلبات المفتوحة' : 'Open orders'}
          </span>
          <strong className="block text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            {openOrdersCount}
          </strong>
          <small className="block text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
            {isAr ? 'بانتظار التجهيز' : 'Awaiting fulfilment'}
          </small>
        </div>

        {/* Sales Recorded */}
        <div
          className="bg-white rounded-[17px] p-4 border shadow-xs"
          style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow)' }}
        >
          <span className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
            {isAr ? 'إجمالي المبيعات' : 'Sales recorded'}
          </span>
          <strong className="block text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            {formatAed(totalSales, language)}
          </strong>
          <small className="block text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
            {isAr ? 'من الطلبات المحفوظة' : 'From saved orders'}
          </small>
        </div>

        {/* Estimated Profit */}
        <div
          className="bg-white rounded-[17px] p-4 border shadow-xs"
          style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow)' }}
        >
          <span className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
            {isAr ? 'الربح التقديري' : 'Estimated profit'}
          </span>
          <strong
            className="block text-xl sm:text-2xl font-extrabold tracking-tight"
            style={{ color: totalProfit >= 0 ? 'var(--green)' : 'var(--red)' }}
          >
            {formatAed(totalProfit, language)}
          </strong>
          <small className="block text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
            {isAr ? 'بعد التكاليف المسجلة' : 'After recorded costs'}
          </small>
        </div>

        {/* Units in Stock */}
        <div
          className="bg-white rounded-[17px] p-4 border shadow-xs"
          style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow)' }}
        >
          <span className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
            {isAr ? 'الوحدات المتوفرة' : 'Units in stock'}
          </span>
          <strong className="block text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            {totalStockUnits}
          </strong>
          <small className="block text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
            {isAr ? 'لكل المنتجات' : 'Across all products'}
          </small>
        </div>
      </section>
    </div>
  );
};

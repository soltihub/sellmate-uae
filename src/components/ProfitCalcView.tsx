import React, { useState, useMemo } from 'react';
import { translations } from '../utils/translations';
import { formatAed, roundAed } from '../utils/calculations';

interface ProfitCalcViewProps {
  language: 'en' | 'ar';
}

export const ProfitCalcView: React.FC<ProfitCalcViewProps> = ({ language }) => {
  const isAr = language === 'ar';

  const [calcPrice, setCalcPrice] = useState<number>(100);
  const [calcQty, setCalcQty] = useState<number>(1);
  const [calcCost, setCalcCost] = useState<number>(60);
  const [calcFees, setCalcFees] = useState<number>(0);
  const [calcPack, setCalcPack] = useState<number>(0);
  const [calcDelivery, setCalcDelivery] = useState<number>(0);
  const [includeVat, setIncludeVat] = useState<boolean>(false);

  const { rev, prod, fees, pack, delivery, vat, profit, margin } = useMemo(() => {
    const qty = Math.max(1, calcQty);
    const revenue = calcPrice * qty;
    const productCost = calcCost * qty;
    const vatAmount = includeVat ? roundAed(revenue * 0.05) : 0;
    const netProfit = roundAed(revenue - productCost - calcFees - calcPack - calcDelivery - vatAmount);
    const profitMargin = revenue > 0 ? roundAed((netProfit / revenue) * 100) : 0;

    return {
      rev: revenue,
      prod: productCost,
      fees: calcFees,
      pack: calcPack,
      delivery: calcDelivery,
      vat: vatAmount,
      profit: netProfit,
      margin: profitMargin,
    };
  }, [calcPrice, calcQty, calcCost, calcFees, calcPack, calcDelivery, includeVat]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left Panel: Profit Calculator (7/12 cols) */}
      <div
        className="lg:col-span-7 bg-white rounded-[17px] p-5 border shadow-xs"
        style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow)' }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 m-0 tracking-tight">
              {isAr ? 'حاسبة الأرباح' : 'Profit calculator'}
            </h3>
            <p className="text-xs m-0 mt-1" style={{ color: 'var(--muted)' }}>
              {isAr
                ? 'أدخل جميع التكاليف التي تتحملها لإتمام البيع.'
                : 'Include all costs you pay to fulfil a sale.'}
            </p>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
              {isAr ? 'سعر البيع (درهم)' : 'Selling price (AED)'}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={calcPrice}
              onChange={(e) => setCalcPrice(parseFloat(e.target.value) || 0)}
              className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              style={{ borderColor: '#dce3dd' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
              {isAr ? 'الكمية المباعة' : 'Quantity sold'}
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={calcQty}
              onChange={(e) => setCalcQty(parseInt(e.target.value) || 1)}
              className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              style={{ borderColor: '#dce3dd' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
              {isAr ? 'تكلفة المنتج للوحدة (درهم)' : 'Product cost per unit (AED)'}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={calcCost}
              onChange={(e) => setCalcCost(parseFloat(e.target.value) || 0)}
              className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              style={{ borderColor: '#dce3dd' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
              {isAr ? 'إجمالي الرسوم (درهم)' : 'Total fees for this sale (AED)'}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={calcFees}
              onChange={(e) => setCalcFees(parseFloat(e.target.value) || 0)}
              className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              style={{ borderColor: '#dce3dd' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
              {isAr ? 'تكلفة التغليف (درهم)' : 'Packaging total (AED)'}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={calcPack}
              onChange={(e) => setCalcPack(parseFloat(e.target.value) || 0)}
              className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              style={{ borderColor: '#dce3dd' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
              {isAr ? 'التوصيل الذي يدفعه البائع (درهم)' : 'Delivery paid by seller (AED)'}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={calcDelivery}
              onChange={(e) => setCalcDelivery(parseFloat(e.target.value) || 0)}
              className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              style={{ borderColor: '#dce3dd' }}
            />
          </div>
        </div>

        {/* VAT Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-3 text-xs">
          <span className="font-semibold text-slate-700">
            {isAr ? 'حساب ضريبة القيمة المضافة 5% (UAE VAT)' : 'Include 5% UAE VAT'}
          </span>
          <button
            type="button"
            onClick={() => setIncludeVat(!includeVat)}
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
              includeVat ? 'bg-emerald-800' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                includeVat ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Result Card */}
        <div
          className="rounded-[13px] p-4 mt-4 border"
          style={{ backgroundColor: 'var(--soft)', borderColor: '#dce8d3' }}
        >
          <p className="text-xs m-0" style={{ color: '#536458' }}>
            {isAr ? 'صافي الربح التقديري' : 'Estimated net profit'}
          </p>
          <div
            className="text-2xl sm:text-3xl font-extrabold tracking-tight my-1"
            style={{ color: profit < 0 ? 'var(--red)' : 'var(--green)' }}
          >
            {formatAed(profit, language)}
          </div>
          <p className="text-xs m-0 font-semibold" style={{ color: '#536458' }}>
            {isAr ? `هامش الربح: ${margin.toFixed(1)}٪` : `Profit margin: ${margin.toFixed(1)}%`}
          </p>
        </div>

        {/* Table Breakdown */}
        <div className="overflow-x-auto border rounded-xl mt-4" style={{ borderColor: 'var(--line)' }}>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="p-2.5 text-slate-700">{isAr ? 'إيرادات المبيعات' : 'Sales revenue'}</td>
                <td className="p-2.5 text-right rtl:text-left font-bold text-slate-900 font-mono">
                  {formatAed(rev, language)}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="p-2.5 text-slate-700">{isAr ? 'تكلفة المنتجات' : 'Product cost'}</td>
                <td className="p-2.5 text-right rtl:text-left font-bold text-rose-700 font-mono">
                  − {formatAed(prod, language)}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="p-2.5 text-slate-700">{isAr ? 'الرسوم' : 'Fees'}</td>
                <td className="p-2.5 text-right rtl:text-left font-bold text-rose-700 font-mono">
                  − {formatAed(fees, language)}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="p-2.5 text-slate-700">{isAr ? 'التغليف' : 'Packaging'}</td>
                <td className="p-2.5 text-right rtl:text-left font-bold text-rose-700 font-mono">
                  − {formatAed(pack, language)}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="p-2.5 text-slate-700">{isAr ? 'التوصيل على البائع' : 'Seller-paid delivery'}</td>
                <td className="p-2.5 text-right rtl:text-left font-bold text-rose-700 font-mono">
                  − {formatAed(delivery, language)}
                </td>
              </tr>
              {includeVat && (
                <tr className="border-b border-slate-100">
                  <td className="p-2.5 text-slate-700">{isAr ? 'ضريبة القيمة المضافة 5%' : '5% UAE VAT'}</td>
                  <td className="p-2.5 text-right rtl:text-left font-bold text-rose-700 font-mono">
                    − {formatAed(vat, language)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Note */}
        <div
          className="p-3 text-xs rounded-r-[9px] rtl:rounded-r-none rtl:rounded-l-[9px] border-l-3 rtl:border-l-0 rtl:border-r-3 leading-relaxed mt-4"
          style={{
            borderColor: '#8cae83',
            backgroundColor: '#f5f8f3',
            color: '#58645c',
          }}
        >
          {isAr
            ? 'لا يشمل التقدير الإعلانات أو العمالة أو التكاليف الأخرى ما لم تدخلها. إذا دفع العميل رسوم التوصيل بشكل منفصل، فلا تسجلها كمصروف عليك.'
            : 'This estimate excludes VAT, returns, advertising, labour and other costs unless you enter them. If the customer pays delivery separately, do not count it as your expense.'}
        </div>
      </div>

      {/* Right Panel: Example (5/12 cols) */}
      <div
        className="lg:col-span-5 bg-white rounded-[17px] p-5 border shadow-xs flex flex-col justify-between"
        style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow)' }}
      >
        <div>
          <h3 className="text-base font-bold text-slate-900 m-0 tracking-tight">
            {isAr ? 'مثال: إعادة بيع الأحذية والمنتجات' : 'Example: shoe resale'}
          </h3>
          <p className="text-xs m-0 mt-1" style={{ color: 'var(--muted)' }}>
            {isAr ? 'مثال بسيط بالدرهم الإماراتي.' : 'A simple example using AED values.'}
          </p>

          <div
            className="rounded-[13px] p-4 mt-4 border"
            style={{ backgroundColor: 'var(--soft)', borderColor: '#dce8d3' }}
          >
            <p className="text-xs m-0" style={{ color: '#536458' }}>
              {isAr ? 'سعر البيع' : 'Sale price'}
            </p>
            <div className="text-2xl font-extrabold tracking-tight my-1 text-slate-900">
              AED 100
            </div>
            <p className="text-xs m-0 text-slate-700">
              {isAr ? 'تكلفة المنتج: 60 درهماً' : 'Product cost: AED 60'}
            </p>
            <p className="text-xs m-0 text-slate-700 font-semibold mt-1">
              {isAr ? 'الربح قبل التكاليف الأخرى: 40 درهماً' : 'Profit before other costs: AED 40'}
            </p>
          </div>

          <div
            className="p-3 text-xs rounded-r-[9px] rtl:rounded-r-none rtl:rounded-l-[9px] border-l-3 rtl:border-l-0 rtl:border-r-3 leading-relaxed mt-4"
            style={{
              borderColor: '#8cae83',
              backgroundColor: '#f5f8f3',
              color: '#58645c',
            }}
          >
            {isAr
              ? 'إذا دفعت 5 دراهم رسوماً و3 دراهم للتغليف، ينخفض الربح التقديري إلى 32 درهماً. أدخل تكاليفك الفعلية بدلاً من افتراض أنها صفر.'
              : 'If you pay AED 5 in fees and AED 3 in packaging, estimated profit falls to AED 32. Add your actual costs rather than assuming they are zero.'}
          </div>
        </div>

        {/* UAE Delivery Benchmark Tip */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-4 text-xs text-slate-600 leading-relaxed">
          <strong className="block text-slate-900 font-bold mb-1">
            🇦🇪 {isAr ? 'معيار الشحن في الإمارات:' : 'UAE Courier Benchmarks:'}
          </strong>
          {isAr
            ? 'توصيل دبي والشارقة عادة 15-20 درهم، أبوظبي 22-25 درهم، والإمارات الشمالية 25-28 درهم. لطلبات الدفع عند الاستلام (COD)، تضيف الشركات 5-10 دراهم كرسوم تحصيل نقدي.'
            : 'Dubai/Sharjah courier usually costs 15-20 AED, Abu Dhabi 22-25 AED, and Northern Emirates 25-28 AED. For COD, couriers charge 5-10 AED collection fees.'}
        </div>
      </div>
    </div>
  );
};

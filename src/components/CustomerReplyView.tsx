import React, { useState, useEffect } from 'react';
import { translations } from '../utils/translations';
import { Order } from '../types';
import { formatAed } from '../utils/calculations';
import { generateCustomerReply } from '../services/aiService';
import { Sparkles, Copy, Check, Send, ExternalLink } from 'lucide-react';

interface CustomerReplyViewProps {
  orders: Order[];
  selectedOrder?: Order | null;
  language: 'en' | 'ar';
}

export const CustomerReplyView: React.FC<CustomerReplyViewProps> = ({
  orders,
  selectedOrder,
  language,
}) => {
  const isAr = language === 'ar';

  const [replyType, setReplyType] = useState<string>('order');
  const [replyLang, setReplyLang] = useState<'en' | 'ar'>(language);
  const [tone, setTone] = useState<'friendly' | 'formal' | 'khaleeji' | 'concise'>('khaleeji');
  const [customerName, setCustomerName] = useState(selectedOrder?.customer_name || 'Ahmed');
  const [replyProduct, setReplyProduct] = useState(selectedOrder?.product || 'Everyday socks');
  const [replyPrice, setReplyPrice] = useState<number>(selectedOrder?.price || 100);
  const [replyDelivery, setReplyDelivery] = useState<number>(selectedOrder?.fees || 15);
  const [replyExtra, setReplyExtra] = useState(
    selectedOrder ? `${selectedOrder.size || ''}, ${selectedOrder.emirate}` : 'Size 42, Black'
  );
  const [customerPhone, setCustomerPhone] = useState(selectedOrder?.customer_phone || '+971501234567');

  const [replyOutput, setReplyOutput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [aiMode, setAiMode] = useState<string>('Template mode');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync if selectedOrder prop changes
  useEffect(() => {
    if (selectedOrder) {
      setCustomerName(selectedOrder.customer_name);
      setReplyProduct(selectedOrder.product);
      setReplyPrice(selectedOrder.price);
      setReplyDelivery(selectedOrder.fees || 15);
      setReplyExtra(`${selectedOrder.size || ''}, ${selectedOrder.emirate}`);
      setCustomerPhone(selectedOrder.customer_phone);
    }
  }, [selectedOrder]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Local fallback templates (from starter code)
  const generateLocalTemplate = () => {
    const name = customerName.trim();
    const product = replyProduct.trim() || (replyLang === 'ar' ? 'المنتج' : 'the product');
    const price = Number(replyPrice) || 0;
    const delivery = Number(replyDelivery) || 0;
    const extra = replyExtra.trim();
    const total = (price + delivery).toFixed(2);

    if (replyLang === 'ar') {
      const greet = name ? `مرحباً ${name}،` : 'مرحباً،';
      const templates: Record<string, string> = {
        enquiry: `${greet}\nشكراً لاهتمامك بـ ${product}. السعر ${price.toFixed(2)} درهم، ورسوم التوصيل ${delivery.toFixed(2)} درهم. ${extra ? `التفاصيل: ${extra}.` : ''}\nهل ترغب في تأكيد طلبك؟`,
        cod: `${greet}\nنرجو تأكيد طلب الدفع عند الاستلام للمنتج: ${product}.\nالسعر: ${price.toFixed(2)} درهم\nالتوصيل: ${delivery.toFixed(2)} درهم\nالإجمالي: ${total} درهم\n${extra ? `التفاصيل: ${extra}\n` : ''}يرجى تأكيد الطلب إذا كانت التفاصيل صحيحة. شكراً لك.`,
        order: `${greet}\nتم استلام طلبك للمنتج ${product}.\nالإجمالي: ${total} درهم شامل رسوم التوصيل المذكورة.\n${extra ? `التفاصيل: ${extra}\n` : ''}سنوافيك بتحديث عند تجهيز الطلب. شكراً لثقتك بنا.`,
        delivery: `${greet}\nتحديث بخصوص طلبك للمنتج ${product}: ${extra || 'طلبك قيد المتابعة.'}\nإذا احتجت إلى أي مساعدة، يرجى الرد على هذه الرسالة. شكراً لك.`,
        delay: `${greet}\nنعتذر عن التأخير في توصيل طلبك للمنتج ${product}. ${extra || 'نعمل على التحقق من حالة التوصيل.'}\nسنشاركك التحديث المؤكد بمجرد توفره. شكراً لتفهمك.`,
      };
      return templates[replyType] || templates.order;
    } else {
      const greet = name ? `Hi ${name},` : 'Hello,';
      const templates: Record<string, string> = {
        enquiry: `${greet}\nThank you for your interest in ${product}. The price is AED ${price.toFixed(2)}, and delivery is AED ${delivery.toFixed(2)}. ${extra ? `Details: ${extra}.` : ''}\nWould you like to confirm your order?`,
        cod: `${greet}\nPlease confirm your cash-on-delivery order for ${product}.\nItem price: AED ${price.toFixed(2)}\nDelivery: AED ${delivery.toFixed(2)}\nTotal: AED ${total}\n${extra ? `Details: ${extra}\n` : ''}Please confirm that these details are correct. Thank you.`,
        order: `${greet}\nWe have received your order for ${product}.\nTotal: AED ${total}, including the delivery charge shown.\n${extra ? `Details: ${extra}\n` : ''}We will update you when your order is prepared. Thank you for shopping with us.`,
        delivery: `${greet}\nAn update about your ${product} order: ${extra || 'Your order is being checked.'}\nIf you need assistance, please reply to this message. Thank you.`,
        delay: `${greet}\nWe apologise for the delay with your ${product} order. ${extra || 'We are checking the delivery status.'}\nWe will share a confirmed update as soon as it is available. Thank you for your patience.`,
      };
      return templates[replyType] || templates.order;
    }
  };

  // Main generator: calls server AI endpoint with fallback
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const scenarioMap: Record<string, any> = {
        enquiry: 'confirmation',
        cod: 'cod_reminder',
        order: 'confirmation',
        delivery: 'tracking',
        delay: 'delay_apology',
      };

      const result = await generateCustomerReply({
        customerName: customerName.trim(),
        orderNumber: selectedOrder ? selectedOrder.ref : '#SM-Order',
        scenario: scenarioMap[replyType] || 'confirmation',
        tone,
        language: replyLang,
        itemsSummary: `${replyProduct} (${replyExtra || 'Standard'})`,
        emirate: selectedOrder?.emirate || 'Dubai',
        totalAmount: (Number(replyPrice) + Number(replyDelivery)).toFixed(2),
        paymentMethod: selectedOrder?.payment_method || 'COD',
        customInstructions: replyExtra.trim(),
      });

      setReplyOutput(result.reply);
      setAiMode(result.isFallback ? 'Template mode' : 'Gemini 3.8 Flash AI');
      showToast(isAr ? 'تم إنشاء مسودة الرسالة بنجاح.' : 'Message draft generated.');
    } catch {
      // Local fallback
      const text = generateLocalTemplate();
      setReplyOutput(text);
      setAiMode('Template mode');
      showToast(isAr ? 'تم استخدام القالب المحلي.' : 'Generated using local template.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!replyOutput) {
      setReplyOutput(generateLocalTemplate());
    }
  }, []);

  const handleCopy = async () => {
    if (!replyOutput.trim()) {
      showToast(isAr ? 'أنشئ رسالة أولاً.' : 'Generate a message first.');
      return;
    }
    try {
      await navigator.clipboard.writeText(replyOutput);
      setIsCopied(true);
      showToast(isAr ? 'تم نسخ الرسالة.' : 'Message copied.');
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      showToast(isAr ? 'تعذر النسخ تلقائياً. حدد النص وانسخه.' : 'Could not copy automatically. Select and copy.');
    }
  };

  let cleanPhone = customerPhone.replace(/\D/g, '');
  if (cleanPhone.startsWith('05')) {
    cleanPhone = `971${cleanPhone.slice(1)}`;
  } else if (cleanPhone.startsWith('5') && cleanPhone.length === 9) {
    cleanPhone = `971${cleanPhone}`;
  }
  const whatsAppUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(replyOutput)}`;

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between animate-fadeIn z-30"
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Panel: Customer Reply Writer (7/12 cols) */}
        <div
          className="lg:col-span-7 bg-white rounded-[17px] p-5 border shadow-xs"
          style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow)' }}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 m-0 tracking-tight">
                {isAr ? 'كاتب ردود العملاء' : 'Customer reply writer'}
              </h3>
              <p className="text-xs m-0 mt-1" style={{ color: 'var(--muted)' }}>
                {isAr
                  ? 'أنشئ الرسالة وراجعها ثم انسخها إلى المحادثة أو أرسلها بالواتساب.'
                  : 'Create a message, review it, then copy it to your chat.'}
              </p>
            </div>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ backgroundColor: 'var(--lime)', color: 'var(--green)' }}
            >
              EN / AR
            </span>
          </div>

          {/* Quick Select from Orders */}
          {orders.length > 0 && (
            <div className="mb-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center gap-2">
              <span className="font-semibold text-slate-600 shrink-0">
                {isAr ? 'تعبئة من طلب سابق:' : 'Load from order:'}
              </span>
              <select
                aria-label={isAr ? 'اختر طلباً لتعبئة البيانات' : 'Select an order to autofill'}
                onChange={(e) => {
                  const ord = orders.find((o) => o.id === e.target.value);
                  if (ord) {
                    setCustomerName(ord.customer_name);
                    setReplyProduct(ord.product);
                    setReplyPrice(ord.price);
                    setReplyDelivery(ord.fees || 15);
                    setReplyExtra(`${ord.size || ''}, ${ord.emirate}`);
                    setCustomerPhone(ord.customer_phone);
                  }
                }}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800 cursor-pointer"
              >
                <option value="">{isAr ? '-- اختر طلباً مسجلاً --' : '-- Choose a saved order --'}</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.ref || o.order_number}: {o.customer_name} ({o.product} - {formatAed(o.price * o.qty, language)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                {isAr ? 'نوع الرسالة' : 'Message type'}
              </label>
              <select
                value={replyType}
                onChange={(e) => setReplyType(e.target.value)}
                className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-medium focus:outline-none cursor-pointer"
                style={{ borderColor: '#dce3dd' }}
              >
                <option value="enquiry">{isAr ? 'استفسار عن منتج' : 'Product enquiry'}</option>
                <option value="cod">{isAr ? 'تأكيد الدفع عند الاستلام' : 'COD confirmation'}</option>
                <option value="order">{isAr ? 'تأكيد الطلب' : 'Order confirmation'}</option>
                <option value="delivery">{isAr ? 'تحديث التوصيل' : 'Delivery update'}</option>
                <option value="delay">{isAr ? 'تأخير التوصيل' : 'Delivery delay'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                {isAr ? 'اللغة' : 'Language'}
              </label>
              <select
                value={replyLang}
                onChange={(e) => setReplyLang(e.target.value as 'en' | 'ar')}
                className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-medium focus:outline-none cursor-pointer"
                style={{ borderColor: '#dce3dd' }}
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                {isAr ? 'اسم العميل (اختياري)' : 'Customer name (optional)'}
              </label>
              <input
                type="text"
                placeholder="e.g. Ahmed"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white focus:outline-none"
                style={{ borderColor: '#dce3dd' }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                {isAr ? 'اسم المنتج' : 'Product name'}
              </label>
              <input
                type="text"
                placeholder="e.g. Black sneakers"
                value={replyProduct}
                onChange={(e) => setReplyProduct(e.target.value)}
                className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white focus:outline-none"
                style={{ borderColor: '#dce3dd' }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                {isAr ? 'السعر (درهم)' : 'Price (AED)'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={replyPrice}
                onChange={(e) => setReplyPrice(parseFloat(e.target.value) || 0)}
                className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-bold focus:outline-none"
                style={{ borderColor: '#dce3dd' }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                {isAr ? 'رسوم التوصيل (درهم)' : 'Delivery charge (AED)'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={replyDelivery}
                onChange={(e) => setReplyDelivery(parseFloat(e.target.value) || 0)}
                className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white font-bold focus:outline-none"
                style={{ borderColor: '#dce3dd' }}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold mb-1" style={{ color: '#58645c' }}>
                {isAr ? 'تفاصيل إضافية (اختياري)' : 'Extra details (optional)'}
              </label>
              <input
                type="text"
                placeholder="e.g. Size 42, expected delivery tomorrow"
                value={replyExtra}
                onChange={(e) => setReplyExtra(e.target.value)}
                className="w-full border rounded-[10px] p-2.5 text-slate-900 bg-white focus:outline-none"
                style={{ borderColor: '#dce3dd' }}
              />
            </div>
          </div>

          {/* Tone Selector */}
          <div className="pt-3 border-t border-slate-100 mt-3 text-xs">
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
              {isAr ? 'نبرة وأسلوب الرسالة:' : 'Message tone:'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'khaleeji', en: 'Khaleeji Retail (إماراتي)', ar: 'إماراتي خليجي تجاري' },
                { id: 'friendly', en: 'Warm & Friendly', ar: 'لطيف وودود' },
                { id: 'formal', en: 'Professional Business', ar: 'رسمي ومهني' },
                { id: 'concise', en: 'Short & Direct', ar: 'موجز ومباشر' },
              ].map((tItem) => (
                <button
                  key={tItem.id}
                  type="button"
                  onClick={() => setTone(tItem.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    tone === tItem.id
                      ? 'bg-emerald-50 text-emerald-950 font-bold border-emerald-400'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isAr ? tItem.ar : tItem.en}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-2.5 text-white font-bold rounded-[11px] shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-60"
              style={{ backgroundColor: 'var(--green)' }}
            >
              <Sparkles className="w-3.5 h-3.5 text-lime-300" />
              <span>{isGenerating ? (isAr ? 'جاري الإنشاء...' : 'Generating...') : isAr ? 'إنشاء الرد' : 'Generate reply'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-800 font-semibold rounded-[11px] hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-1.5"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? (isAr ? 'تم النسخ' : 'Copied') : isAr ? 'نسخ الرسالة' : 'Copy message'}</span>
            </button>

            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-[11px] transition-colors flex items-center gap-1.5 text-xs shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isAr ? 'إرسال عبر واتساب' : 'Open WhatsApp'}</span>
              <ExternalLink className="w-3 h-3 text-emerald-200" />
            </a>
          </div>

          {/* Preview Box */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 m-0">
                  {isAr ? 'معاينة الرسالة' : 'Message preview'}
                </h4>
                <p className="text-[11px] m-0" style={{ color: 'var(--muted)' }}>
                  {isAr ? 'يمكنك تعديل النص بحرية قبل نسخه.' : 'You can edit the text before copying.'}
                </p>
              </div>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                style={{ backgroundColor: '#f0f3f0', color: '#536158' }}
              >
                {aiMode}
              </span>
            </div>

            <textarea
              rows={7}
              dir={replyLang === 'ar' ? 'rtl' : 'ltr'}
              value={replyOutput}
              onChange={(e) => setReplyOutput(e.target.value)}
              className="w-full p-3.5 rounded-xl border text-xs text-slate-900 bg-slate-50/60 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              style={{ borderColor: 'var(--line)', minHeight: '140px' }}
            />

            <p className="text-[11px] mt-2 text-slate-500 leading-relaxed">
              {isAr
                ? 'تستخدم المنظومة نموذج Gemini 3.8 Flash عبر خادم آمن لحماية المفاتيح. في حال عدم توفر الاتصال أو نفاذ الحصة، يتم استخدام قوالب محلية عالية الجودة تلقائياً (0 درهم).'
                : 'Server-side Gemini 3.8 Flash AI generates tailored drafts. All API keys remain strictly on the backend. When offline or during rate limits, intelligent local templates are used.'}
            </p>
          </div>
        </div>

        {/* Right Panel: Quality Checklist & Privacy Note (5/12 cols) */}
        <div
          className="lg:col-span-5 bg-white rounded-[17px] p-5 border shadow-xs flex flex-col justify-between"
          style={{ borderColor: 'var(--line)', boxShadow: 'var(--shadow)' }}
        >
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0 tracking-tight">
              {isAr ? 'قائمة مراجعة الرسالة' : 'Message quality checklist'}
            </h3>
            <p className="text-xs m-0 mt-1" style={{ color: 'var(--muted)' }}>
              {isAr ? 'تأكد من صحة التفاصيل قبل الإرسال.' : 'Before sending, confirm the details are correct.'}
            </p>

            <ul className="pl-5 rtl:pl-0 rtl:pr-5 mt-4 space-y-2 text-xs leading-relaxed" style={{ color: '#58645c' }}>
              <li>• {isAr ? 'تأكد من المنتج والمقاس والكمية.' : 'Confirm product, size and quantity.'}</li>
              <li>• {isAr ? 'راجع الإجمالي ورسوم التوصيل.' : 'Check the total and delivery charge.'}</li>
              <li>• {isAr ? 'لا تعد بموعد توصيل غير مؤكد.' : 'Never promise an unconfirmed delivery time.'}</li>
              <li>• {isAr ? 'راجع صياغة الرسالة ونبرتها.' : 'Review Arabic wording and tone.'}</li>
              <li>• {isAr ? 'احذف التفاصيل الخاصة غير الضرورية.' : 'Remove private details you do not need.'}</li>
            </ul>
          </div>

          {/* Privacy Note */}
          <div
            className="p-3 text-xs rounded-r-[9px] rtl:rounded-r-none rtl:rounded-l-[9px] border-l-3 rtl:border-l-0 rtl:border-r-3 leading-relaxed mt-4"
            style={{
              borderColor: '#8cae83',
              backgroundColor: '#f5f8f3',
              color: '#58645c',
            }}
          >
            {isAr
              ? 'تنبيه الخصوصية: لا تدخل أرقام الهواتف أو العناوين أو بيانات الدفع إلا عند الضرورة. هذا التطبيق يولد مسودات ولا يرسل الرسائل تلقائياً.'
              : 'Do not paste customer phone numbers, addresses or payment details into the message generator unless necessary. SellMate never sends messages automatically.'}
          </div>
        </div>
      </div>
    </div>
  );
};

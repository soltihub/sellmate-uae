import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

// Initialize Gemini SDK if key is present
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Fallback high-quality template generator (ensures AED 0 offline operation)
function generateFallbackReply(data: {
  customerName: string;
  orderNumber: string;
  scenario: string;
  tone: string;
  language: 'en' | 'ar';
  itemsSummary: string;
  emirate: string;
  totalAmount: number | string;
  paymentMethod: string;
  trackingNumber?: string;
  courierCompany?: string;
}): string {
  const isAr = data.language === 'ar';
  const name = data.customerName || (isAr ? 'عميلنا العزيز' : 'Valued Customer');
  const orderNum = data.orderNumber || '#1001';
  const total = data.totalAmount ? `${data.totalAmount} AED` : '';
  const emirate = data.emirate || (isAr ? 'الإمارات' : 'UAE');
  const tracking = data.trackingNumber || '';
  const courier = data.courierCompany || (isAr ? 'شركة الشحن' : 'Courier');

  if (isAr) {
    if (data.tone === 'khaleeji') {
      switch (data.scenario) {
        case 'confirmation':
          return `هلا والله يا ${name} 👋 حياك الله! استلمنا طلبك رقم (${orderNum}) بنجاح. المنتجات: ${data.itemsSummary}. إجمالي المبلغ: ${total} (${data.paymentMethod}). بنجهز شحنتك ونرسلها لـ ${emirate} قريباً إن شاء الله. شكراً لتسوقك معنا! 🇦🇪✨`;
        case 'tracking':
          return `مرحبا يا ${name}! 📦 طلبك (${orderNum}) تم تسليمه لـ ${courier}${tracking ? `، ورقم التتبع: ${tracking}` : ''}. بيوصلك خلال يومين عمل بإذن الله. تسلم وتعيش!`;
        case 'cod_reminder':
          return `يا هلا ${name}! نذكرك بأن طلبك (${orderNum}) واصلك قريباً مع الدفع عند الاستلام بمبلغ ${total}. نتمنى تجهيز المبلغ كاش أو كارد للمندوب. يومك سعيد! 🙌`;
        case 'delay_apology':
          return `هلا أخوي ${name}، نعتذر منك جداً عن أي تأخير خارج عن إرادتنا بخصوص الطلب (${orderNum}). شحنتك بالأولوية القصوى مع المندوب وبتوصلك بأقرب وقت. نقدر صبرك وطيبك 🙏`;
        case 'out_for_delivery':
          return `صباح الخير يا ${name}! 🚚 شحنتك (${orderNum}) الحين مع مندوب التوصيل في ${emirate}، يرجى التكرم بالرد على اتصال المندوب لاستلام الطلب. شكراً لك!`;
        default:
          return `مرحباً ${name}، شكراً لتواصلك مع متجرنا بخصوص طلبك (${orderNum}). نحن في خدمتك دائماً!`;
      }
    } else {
      // Standard Arabic
      switch (data.scenario) {
        case 'confirmation':
          return `مرحباً ${name} 🌸 يسعدنا تأكيد استلام طلبك رقم (${orderNum}). تفاصيل الطلب: ${data.itemsSummary}. الإجمالي: ${total} (${data.paymentMethod}) للتوصيل إلى ${emirate}. سنقوم بإشعارك فور خروج الشحنة. شكراً لثقتك بنا!`;
        case 'tracking':
          return `مرحباً ${name} 📦 تم شحن طلبك (${orderNum}) عبر ${courier}.${tracking ? ` رقم التتبع: ${tracking}.` : ''} يمكنك متابعة مسار الشحنة حتى وصولها. نتمنى لك يوماً سعيداً!`;
        case 'cod_reminder':
          return `عزيزنا ${name}، نود تذكيرك بأن طلبك رقم (${orderNum}) جاهز للتوصيل بخيار الدفع عند الاستلام (${total}). يرجى التكرم بتجهيز المبلغ للمندوب. شكراً لتعاونكم!`;
        case 'delay_apology':
          return `مرحباً ${name}، نعتذر بصدق عن التأخير الطارئ في توصيل طلبك رقم (${orderNum}). فريقنا يتابع مع شركة الشحن لضمان تسليمه إليكم في أسرع وقت. شكراً لتفهمكم وصبركم.`;
        case 'out_for_delivery':
          return `مرحباً ${name} 🛵 طلبك رقم (${orderNum}) خرج للتوصيل اليوم في ${emirate}. المندوب سيتواصل معك قريباً لتحديد موعد التسليم. شكراً لك!`;
        default:
          return `مرحباً ${name}، بخصوص طلبك رقم (${orderNum})، نحن سعداء بخدمتك وسنوافيك بالتحديثات.`;
      }
    }
  } else {
    // English
    switch (data.scenario) {
      case 'confirmation':
        return `Hello ${name}! ✨ Thank you for your order (${orderNum}). We've received your request for: ${data.itemsSummary}. Total: ${total} (${data.paymentMethod}) to ${emirate}. We're packing it with care and will notify you once dispatched!`;
      case 'tracking':
        return `Hi ${name}! 📦 Good news! Your order (${orderNum}) has been dispatched via ${courier}.${tracking ? ` Tracking #: ${tracking}.` : ''} Expected delivery within 1-2 business days across UAE. Thank you for shopping with us!`;
      case 'cod_reminder':
        return `Hi ${name}, quick reminder that your order (${orderNum}) is scheduled for delivery with Cash on Delivery (${total}). Please have the exact amount or card ready for the courier. Thanks!`;
      case 'delay_apology':
        return `Dear ${name}, we sincerely apologize for the unexpected delay with order (${orderNum}). Our team is expediting it with the courier to reach you as soon as possible. Thank you for your patience and understanding 🙏`;
      case 'out_for_delivery':
        return `Hi ${name}! 🚚 Your order (${orderNum}) is out for delivery today in ${emirate}. The courier driver will call you shortly before arrival. Please keep your phone reachable!`;
      default:
        return `Hello ${name}, regarding your order (${orderNum}), thank you for reaching out to us. We're here to assist you!`;
    }
  }
}

// Phase 3: Server-side AI endpoint for customer message drafts
app.post('/api/generate-reply', async (req, res) => {
  try {
    const {
      customerName,
      orderNumber,
      scenario = 'confirmation',
      tone = 'friendly',
      language = 'en',
      itemsSummary = 'Ordered items',
      emirate = 'Dubai',
      totalAmount = '',
      paymentMethod = 'COD',
      trackingNumber = '',
      courierCompany = '',
      customInstructions = '',
    } = req.body;

    const dataPayload = {
      customerName: customerName ? String(customerName).slice(0, 80) : '',
      orderNumber: orderNumber ? String(orderNumber).slice(0, 50) : '',
      scenario: String(scenario),
      tone: String(tone),
      language: language === 'ar' ? 'ar' : 'en',
      itemsSummary: itemsSummary ? String(itemsSummary).slice(0, 200) : '',
      emirate: emirate ? String(emirate).slice(0, 60) : 'Dubai',
      totalAmount: totalAmount ? String(totalAmount).slice(0, 30) : '',
      paymentMethod: paymentMethod ? String(paymentMethod).slice(0, 40) : 'COD',
      trackingNumber: trackingNumber ? String(trackingNumber).slice(0, 60) : '',
      courierCompany: courierCompany ? String(courierCompany).slice(0, 60) : '',
    };

    // If no API key is available, use template fallback immediately
    if (!aiClient) {
      const fallback = generateFallbackReply(dataPayload as any);
      return res.json({
        reply: fallback,
        isFallback: true,
        notice: 'Generated using local template (Gemini API key not configured in environment).',
      });
    }

    const systemPrompt = `You are SellMate UAE's merchant communication assistant.
Your task is to draft a polite, professional, and ready-to-send customer message for WhatsApp or Instagram Direct Message.
Language: ${dataPayload.language === 'ar' ? 'Arabic' : 'English'}.
Tone: ${dataPayload.tone} (Options: friendly, formal business, khaleeji Emirati style, or concise).
CRITICAL CONSTRAINTS:
1. Never invent or hallucinate exact delivery times or guarantees unless specified (e.g., do not promise "within 1 hour").
2. Mention only the provided non-sensitive details: Customer Name, Order Number, Items summary, Emirate, Total Amount, Payment Method, and Tracking details if available.
3. Keep it formatted nicely with WhatsApp-friendly emojis and line breaks.
4. Output ONLY the draft message ready to be sent to the customer. No conversational prefixes like "Here is your message:".`;

    const userPrompt = `Draft a customer message for the following order:
Scenario: ${dataPayload.scenario}
Customer: ${dataPayload.customerName || 'Customer'}
Order Number: ${dataPayload.orderNumber || '#1001'}
Emirate: ${dataPayload.emirate}
Items: ${dataPayload.itemsSummary}
Total Amount: ${dataPayload.totalAmount ? `${dataPayload.totalAmount} AED` : 'N/A'}
Payment Method: ${dataPayload.paymentMethod}
Tracking Number: ${dataPayload.trackingNumber || 'Not available yet'}
Courier: ${dataPayload.courierCompany || 'Courier Service'}
${customInstructions ? `Additional Merchant Note: ${customInstructions.slice(0, 150)}` : ''}
`;

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });

      const replyText = response.text ? response.text.trim() : '';

      if (!replyText) {
        throw new Error('Empty response from AI model');
      }

      return res.json({
        reply: replyText,
        isFallback: false,
      });
    } catch (aiErr: any) {
      console.warn('Gemini API call failed, falling back to local template:', aiErr?.message);
      const fallback = generateFallbackReply(dataPayload as any);
      return res.json({
        reply: fallback,
        isFallback: true,
        notice: 'Generated using fallback template due to AI service unavailability or rate limit.',
      });
    }
  } catch (err: any) {
    console.error('Server error handling generate-reply:', err);
    return res.status(500).json({
      error: 'Failed to generate customer reply',
      message: err?.message,
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    service: 'SellMate UAE API',
  });
});

// Setup Vite middleware in dev or static server in prod
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`SellMate UAE server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

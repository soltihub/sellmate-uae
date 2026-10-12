export interface GenerateReplyRequest {
  customerName: string;
  orderNumber: string;
  scenario:
    | 'confirmation'
    | 'tracking'
    | 'cod_reminder'
    | 'delay_apology'
    | 'out_for_delivery'
    | 'review_request';
  tone: 'friendly' | 'formal' | 'khaleeji' | 'concise';
  language: 'en' | 'ar';
  itemsSummary: string;
  emirate: string;
  totalAmount: number | string;
  paymentMethod: string;
  trackingNumber?: string;
  courierCompany?: string;
  customInstructions?: string;
}

export interface GenerateReplyResponse {
  reply: string;
  isFallback: boolean;
  notice?: string;
  error?: string;
}

export async function generateCustomerReply(
  payload: GenerateReplyRequest
): Promise<GenerateReplyResponse> {
  try {
    const res = await fetch('/api/generate-reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Server returned status ${res.status}`);
    }

    const data: GenerateReplyResponse = await res.json();
    return data;
  } catch (err: any) {
    console.warn('AI generation network error, utilizing local resilient draft:', err);
    // Client-side fallback if network or server is unreachable
    const isAr = payload.language === 'ar';
    const name = payload.customerName || (isAr ? 'عميلنا العزيز' : 'Valued Customer');
    const orderNum = payload.orderNumber || '#1001';
    
    let fallbackText = '';
    if (isAr) {
      fallbackText = `مرحباً ${name} 🌸 يسعدنا خدمتك بخصوص طلبك رقم (${orderNum}) في متجرنا. سيتم تحديثك فور تحرك الشحنة إلى ${payload.emirate}. شكراً لثقتك بنا!`;
    } else {
      fallbackText = `Hello ${name}! ✨ Thank you for your order (${orderNum}). We are processing your items for delivery to ${payload.emirate}. We will notify you once dispatched!`;
    }

    return {
      reply: fallbackText,
      isFallback: true,
      notice: 'Generated offline fallback (Server unreachable or offline).',
    };
  }
}

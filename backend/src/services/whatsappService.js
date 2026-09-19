// WhatsApp Cloud API service for Skill-Setu
// Uses Meta WhatsApp Business Cloud API (free 1,000 service conversations/month)
//
// Setup in backend/.env:
//   WHATSAPP_TOKEN=EAAG...
//   WHATSAPP_PHONE_NUMBER_ID=1092837465...
//
// If credentials are not set, it logs messages to the console in development.

const isConfigured = Boolean(
  (process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN) &&
  process.env.WHATSAPP_PHONE_NUMBER_ID
);

async function sendWhatsAppMessage({ to, message, link }) {
  const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // Clean phone number: remove non-numeric chars; default to India +91 if 10 digits
  let cleanTo = String(to || '').replace(/\D/g, '');
  if (cleanTo.length === 10) {
    cleanTo = `91${cleanTo}`;
  }

  const fullMessage = link ? `${message}\n\nView details: ${link}` : message;

  if (!isConfigured || !cleanTo) {
    console.log('\n📱 [WHATSAPP DEV / LOG]');
    console.log(`To: ${cleanTo || '(no phone)'}`);
    console.log(`Message: ${fullMessage}`);
    console.log('------------------------------------------------------\n');
    return {
      success: true,
      mode: 'dev_log',
      message: 'WhatsApp Cloud API credentials not configured or in dev mode. Logged to console.'
    };
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanTo,
        type: 'text',
        text: {
          preview_url: Boolean(link),
          body: fullMessage
        }
      }),
      signal: AbortSignal.timeout(8000)
    });

    const data = await response.json();
    if (!response.ok) {
      console.warn('WhatsApp Cloud API error:', data);
      return { success: false, error: data.error?.message || 'Failed to send WhatsApp message' };
    }

    return { success: true, mode: 'live', data };
  } catch (err) {
    console.warn('WhatsApp Cloud API dispatch error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendWhatsAppMessage, isWhatsAppConfigured: isConfigured };

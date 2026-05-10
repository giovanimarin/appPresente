import { env } from '../config/env';

interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSms(phone: string, message: string): Promise<SmsSendResult> {
  // Em desenvolvimento, apenas loga no console (mock)
  if (env.isDev() || !env.ZENVIA_API_KEY) {
    console.log(`[SMS Mock] Para: ${phone} | Mensagem: ${message}`);
    return { success: true, messageId: `mock-${Date.now()}` };
  }

  try {
    const response = await fetch('https://api.zenvia.com/v2/channels/sms/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-TOKEN': env.ZENVIA_API_KEY,
      },
      body: JSON.stringify({
        from: env.ZENVIA_SENDER,
        to: phone,
        contents: [{ type: 'text', text: message }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[SMS] Zenvia error:', error);
      return { success: false, error };
    }

    const data = (await response.json()) as { id: string };
    return { success: true, messageId: data.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('[SMS] Send error:', error);
    return { success: false, error };
  }
}

export function buildOtpMessage(code: string): string {
  return `Seu código Presente: ${code}. Válido por 10 minutos. Não compartilhe com ninguém.`;
}

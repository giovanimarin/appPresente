import * as admin from 'firebase-admin';
import { env } from '../config/env';

function getMessaging(): admin.messaging.Messaging {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.messaging();
}

export async function sendPushToToken(
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<void> {
  try {
    await getMessaging().send({
      token,
      notification: { title, body },
      data,
      android: { priority: 'high', notification: { sound: 'default' } },
    });
  } catch (e) {
    console.error('[push] Falha ao enviar push:', e);
  }
}

export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<void> {
  if (tokens.length === 0) return;
  const results = await Promise.allSettled(tokens.map((t) => sendPushToToken(t, title, body, data)));
  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  console.log(`[push] Sent to ${succeeded}/${tokens.length} devices`);
}

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';

// expo-notifications requer módulo nativo compilado no dev client.
// Se não estiver disponível (dev client antigo), falha silenciosamente.
type NotificationsModule = typeof import('expo-notifications');
let N: NotificationsModule | null = null;

try {
  N = require('expo-notifications') as NotificationsModule;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {
  console.warn('[Push] expo-notifications indisponível — rebuild o dev client para ativar push.');
}

export async function registerPushToken(): Promise<void> {
  if (!N) return;

  try {
    const { status: existing } = await N.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await N.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', {
        name: 'Notificações',
        importance: N.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return;

    const { data: pushToken } = await N.getExpoPushTokenAsync({ projectId });
    await api.put('/guardians/me', { pushToken, deviceType: Platform.OS });
    console.log('[Push] Token registrado:', pushToken);
  } catch (err) {
    console.warn('[Push] Falha ao registrar token:', err);
  }
}

export function addNotificationReceivedListener(
  handler: (n: import('expo-notifications').Notification) => void,
): { remove: () => void } {
  if (!N) return { remove: () => {} };
  return N.addNotificationReceivedListener(handler);
}

export function addNotificationResponseReceivedListener(
  handler: (r: import('expo-notifications').NotificationResponse) => void,
): { remove: () => void } {
  if (!N) return { remove: () => {} };
  return N.addNotificationResponseReceivedListener(handler);
}

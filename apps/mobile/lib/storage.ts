import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthUser {
  id: string;
  schoolId: string;
  role: string;
  name?: string;
  email?: string;
}

const KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  user: 'user',
};

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.accessToken);
}

export async function setTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    AsyncStorage.setItem(KEYS.accessToken, accessToken),
    AsyncStorage.setItem(KEYS.refreshToken, refreshToken),
  ]);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([KEYS.accessToken, KEYS.refreshToken, KEYS.user]);
}

export async function getUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function setUser(user: AuthUser) {
  await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
}

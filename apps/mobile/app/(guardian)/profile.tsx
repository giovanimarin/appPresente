import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Phone } from 'lucide-react-native';
import { getUser, clearTokens, type AuthUser } from '../../lib/storage';

export default function GuardianProfile() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => { getUser().then(setUser); }, []);

  function handleLogout() {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await clearTokens();
          router.replace('/login-selector');
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-xl font-bold text-gray-900">Perfil</Text>
      </View>

      <View className="px-5 gap-4">
        <View className="bg-white rounded-2xl p-5 items-center border border-gray-100">
          <View className="w-16 h-16 bg-indigo-100 rounded-full items-center justify-center mb-3">
            <Text className="text-indigo-700 text-2xl font-bold">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text className="text-lg font-bold text-gray-900">{user?.name ?? '—'}</Text>
          <Text className="text-gray-500 text-sm">Responsável</Text>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-white border border-red-100 rounded-2xl flex-row items-center gap-3 px-4 py-4"
        >
          <LogOut size={18} color="#ef4444" />
          <Text className="text-red-500 font-medium text-sm">Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

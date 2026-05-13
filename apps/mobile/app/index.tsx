import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { getUser } from '../lib/storage';

export default function Index() {
  useEffect(() => {
    getUser().then((user) => {
      if (!user) {
        router.replace('/login-selector');
      } else if (user.role === 'GUARDIAN') {
        router.replace('/(guardian)/home');
      } else {
        router.replace('/(staff)/home');
      }
    });
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}

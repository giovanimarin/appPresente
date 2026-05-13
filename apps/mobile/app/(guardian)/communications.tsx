import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquare, Clock } from 'lucide-react-native';
import { communicationsApi } from '../../lib/api';

type Communication = { id: string; title: string; body?: string; createdAt: string; readAt?: string };

export default function GuardianCommunications() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['guardian-communications'],
    queryFn: () => communicationsApi.list({ limit: 50 }).then((r) => r.data),
  });

  const items: Communication[] = data?.data ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-xl font-bold text-gray-900">Comunicados</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {items.length === 0 ? (
            <View className="items-center py-16">
              <MessageSquare size={40} color="#d1d5db" />
              <Text className="text-gray-400 mt-3">Nenhum comunicado</Text>
            </View>
          ) : (
            <View className="gap-3 pb-6">
              {items.map((item) => (
                <View
                  key={item.id}
                  className={`bg-white rounded-2xl p-4 border ${!item.readAt ? 'border-primary-200' : 'border-gray-100'}`}
                >
                  {!item.readAt && (
                    <View className="w-2 h-2 bg-primary-600 rounded-full mb-2" />
                  )}
                  <Text className="font-semibold text-gray-900 text-sm">{item.title}</Text>
                  {item.body && (
                    <Text className="text-xs text-gray-500 mt-1" numberOfLines={3}>{item.body}</Text>
                  )}
                  <View className="flex-row items-center gap-1 mt-2">
                    <Clock size={11} color="#9ca3af" />
                    <Text className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

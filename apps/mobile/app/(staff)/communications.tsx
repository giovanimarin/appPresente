import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Send, FileText, Clock } from 'lucide-react-native';
import { communicationsApi } from '../../lib/api';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Rascunho', color: '#6b7280', bg: '#f3f4f6' },
  scheduled: { label: 'Agendado', color: '#d97706', bg: '#fef3c7' },
  sent:      { label: 'Enviado',  color: '#059669', bg: '#d1fae5' },
};

type Communication = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  targetType?: string;
};

export default function CommunicationsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['communications'],
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
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <Text className="text-xl font-bold text-gray-900">Comunicados</Text>
        <TouchableOpacity
          onPress={() => router.push('/(staff)/communications-new')}
          className="w-9 h-9 bg-primary-600 rounded-full items-center justify-center"
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
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
              <FileText size={40} color="#d1d5db" />
              <Text className="text-gray-400 mt-3">Nenhum comunicado</Text>
            </View>
          ) : (
            <View className="gap-3 pb-6">
              {items.map((item) => {
                const s = STATUS_LABELS[item.status] ?? STATUS_LABELS.draft;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => router.push(`/(staff)/communications/${item.id}`)}
                    className="bg-white rounded-2xl p-4 border border-gray-100"
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <Text className="flex-1 font-semibold text-gray-900 text-sm" numberOfLines={2}>
                        {item.title}
                      </Text>
                      <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: s.bg }}>
                        <Text className="text-xs font-medium" style={{ color: s.color }}>{s.label}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-1 mt-2">
                      <Clock size={11} color="#9ca3af" />
                      <Text className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

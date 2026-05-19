import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquare, Clock, CheckCircle, ChevronRight } from 'lucide-react-native';
import { communicationsApi } from '../../lib/api';

type FeedItem = {
  id: string;
  title: string;
  schoolType: string;
  sentAt: string;
  isViewed: boolean;
  isRead: boolean;
  requiresConfirmation: boolean;
  school: { name: string };
};

const TYPE_LABELS: Record<string, string> = {
  NOTICE: 'Aviso', URGENT: 'URGENTE', INFORMATIVE: 'Informativo',
  DOCUMENT: 'Documento', PHOTO: 'Foto', EXAM: 'Prova', MEETING: 'Reunião',
};

export default function GuardianCommunications() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['guardian-communications'],
    queryFn: () => communicationsApi.guardianFeed().then((r) => r.data),
  });

  const items: FeedItem[] = data ?? [];

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
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/(guardian)/communications/${item.id}` as never)}
                  activeOpacity={0.85}
                  className={`bg-white rounded-2xl p-4 border ${!item.isViewed ? 'border-primary-200' : 'border-gray-100'}`}
                >
                  <View className="flex-row items-start justify-between gap-2 mb-1.5">
                    <View className="flex-row items-center gap-1.5 flex-1 flex-wrap">
                      {!item.isViewed && (
                        <View className="w-2 h-2 bg-primary-600 rounded-full" />
                      )}
                      <Text className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[item.schoolType] ?? item.schoolType}
                      </Text>
                      <Text className="text-xs text-gray-400">{item.school?.name}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      {item.isRead && <CheckCircle size={14} color="#10b981" />}
                      <ChevronRight size={14} color="#9ca3af" />
                    </View>
                  </View>
                  <Text className="font-semibold text-gray-900 text-sm">{item.title}</Text>
                  <View className="flex-row items-center gap-1 mt-2">
                    <Clock size={11} color="#9ca3af" />
                    <Text className="text-xs text-gray-400">
                      {new Date(item.sentAt).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

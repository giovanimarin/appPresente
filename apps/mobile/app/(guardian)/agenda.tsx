import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock } from 'lucide-react-native';
import { agendaApi } from '../../lib/api';

type AgendaEvent = { id: string; title: string; date: string; description?: string };

export default function GuardianAgenda() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['guardian-agenda'],
    queryFn: () => agendaApi.list({ limit: 50 }).then((r) => r.data),
  });

  const events: AgendaEvent[] = data?.data ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-xl font-bold text-gray-900">Agenda</Text>
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
          {events.length === 0 ? (
            <View className="items-center py-16">
              <Calendar size={40} color="#d1d5db" />
              <Text className="text-gray-400 mt-3">Nenhum evento</Text>
            </View>
          ) : (
            <View className="gap-3 pb-6">
              {events.map((event) => (
                <View key={event.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <Text className="font-semibold text-gray-900 text-sm">{event.title}</Text>
                  {event.description ? (
                    <Text className="text-xs text-gray-500 mt-1" numberOfLines={2}>{event.description}</Text>
                  ) : null}
                  <View className="flex-row items-center gap-1 mt-2">
                    <Clock size={11} color="#9ca3af" />
                    <Text className="text-xs text-gray-400">
                      {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
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

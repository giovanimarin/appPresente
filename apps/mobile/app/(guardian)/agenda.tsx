import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, Users } from 'lucide-react-native';
import { agendaApi } from '../../lib/api';

type AgendaEvent = {
  id: string;
  title: string;
  eventType: string;
  startsAt: string;
  description?: string;
  cancelledAt?: string;
  eventClasses: { class: { name: string } }[];
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  EXAM: 'Prova', PARENT_MEETING: 'Reunião', FIELD_TRIP: 'Passeio',
  HOLIDAY: 'Feriado', CULTURAL: 'Evento Cultural', OTHER: 'Comunicado',
};

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  EXAM:           { bg: '#ffedd5', text: '#c2410c' },
  PARENT_MEETING: { bg: '#dbeafe', text: '#1d4ed8' },
  FIELD_TRIP:     { bg: '#dcfce7', text: '#15803d' },
  HOLIDAY:        { bg: '#f3f4f6', text: '#374151' },
  CULTURAL:       { bg: '#f3e8ff', text: '#7e22ce' },
  OTHER:          { bg: '#e0e7ff', text: '#3730a3' },
};

export default function GuardianAgenda() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['guardian-agenda'],
    queryFn: () => agendaApi.guardianFeed({ days: 90 }).then((r) => r.data),
  });

  const events: AgendaEvent[] = data ?? [];

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
              <Text className="text-gray-400 mt-3">Nenhum evento nos próximos dias</Text>
            </View>
          ) : (
            <View className="gap-3 pb-6">
              {events.map((event) => {
                const colors = EVENT_TYPE_COLORS[event.eventType] ?? EVENT_TYPE_COLORS.OTHER;
                const date = new Date(event.startsAt);
                return (
                  <View
                    key={event.id}
                    className={`bg-white rounded-2xl p-4 border border-gray-100 ${event.cancelledAt ? 'opacity-50' : ''}`}
                  >
                    <View className="flex-row items-center gap-2 mb-2">
                      <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.bg }}>
                        <Text className="text-lg font-bold" style={{ color: colors.text }}>
                          {date.getUTCDate()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-gray-900 text-sm">{event.title}</Text>
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Text className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: colors.bg, color: colors.text }}>
                            {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                          </Text>
                          {event.cancelledAt && (
                            <Text className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
                              Cancelado
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                    {event.description ? (
                      <Text className="text-xs text-gray-500" numberOfLines={2}>{event.description}</Text>
                    ) : null}
                    <View className="flex-row items-center justify-between mt-2">
                      <View className="flex-row items-center gap-1">
                        <Clock size={11} color="#9ca3af" />
                        <Text className="text-xs text-gray-400">
                          {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                        </Text>
                      </View>
                      {event.eventClasses?.length > 0 && (
                        <View className="flex-row items-center gap-1">
                          <Users size={11} color="#9ca3af" />
                          <Text className="text-xs text-gray-400" numberOfLines={1}>
                            {event.eventClasses.map((ec) => ec.class.name).join(', ')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

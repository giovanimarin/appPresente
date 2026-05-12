import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, Users } from 'lucide-react-native';
import { appointmentsApi } from '../../lib/api';

type Slot = {
  id: string; date: string; startTime: string; endTime: string;
  duration: number; scope: string; status: string;
  _count?: { bookings: number }; maxBookings?: number;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  available: { bg: '#d1fae5', text: '#065f46', label: 'Disponível' },
  full:      { bg: '#fee2e2', text: '#991b1b', label: 'Lotado' },
  cancelled: { bg: '#f3f4f6', text: '#6b7280', label: 'Cancelado' },
};

export default function AppointmentsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['appointment-slots'],
    queryFn: () => appointmentsApi.listSlots({ limit: 50 }).then((r) => r.data),
  });

  const slots: Slot[] = data?.data ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-xl font-bold text-gray-900">Agendamentos</Text>
        <Text className="text-sm text-gray-500">Horários disponíveis para responsáveis</Text>
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
          {slots.length === 0 ? (
            <View className="items-center py-16">
              <Calendar size={40} color="#d1d5db" />
              <Text className="text-gray-400 mt-3">Nenhum horário cadastrado</Text>
            </View>
          ) : (
            <View className="gap-3 pb-6">
              {slots.map((slot) => {
                const s = STATUS_COLORS[slot.status] ?? STATUS_COLORS.available;
                return (
                  <View key={slot.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2 mb-2">
                          <Calendar size={14} color="#6b7280" />
                          <Text className="text-sm font-semibold text-gray-900">
                            {new Date(slot.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <Clock size={13} color="#9ca3af" />
                          <Text className="text-xs text-gray-500">
                            {slot.startTime} – {slot.endTime} ({slot.duration} min)
                          </Text>
                        </View>
                      </View>
                      <View className="px-2 py-1 rounded-full" style={{ backgroundColor: s.bg }}>
                        <Text className="text-xs font-medium" style={{ color: s.text }}>{s.label}</Text>
                      </View>
                    </View>
                    {slot._count !== undefined && (
                      <View className="flex-row items-center gap-1 mt-3 pt-3 border-t border-gray-50">
                        <Users size={12} color="#9ca3af" />
                        <Text className="text-xs text-gray-400">
                          {slot._count.bookings}{slot.maxBookings ? `/${slot.maxBookings}` : ''} agendamento{slot._count.bookings !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
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

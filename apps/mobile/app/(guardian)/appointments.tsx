import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, Check } from 'lucide-react-native';
import { api } from '../../lib/api';

type Slot = {
  id: string; date: string; startTime: string; endTime: string;
  duration: number; status: string; staffName?: string;
  myBooking?: { id: string };
};

export default function GuardianAppointments() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['guardian-slots'],
    queryFn: () => api.get('/appointments/slots', { params: { limit: 50 } }).then((r) => r.data),
  });

  const slots: Slot[] = data?.data ?? [];

  const bookMut = useMutation({
    mutationFn: (slotId: string) => api.post(`/appointments/slots/${slotId}/book`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guardian-slots'] }),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      Alert.alert('Erro', e.response?.data?.error ?? 'Não foi possível agendar.');
    },
  });

  const cancelMut = useMutation({
    mutationFn: (bookingId: string) => api.post(`/appointments/bookings/${bookingId}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guardian-slots'] }),
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function handleBook(slot: Slot) {
    Alert.alert(
      'Confirmar agendamento',
      `${new Date(slot.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} às ${slot.startTime}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Agendar', onPress: () => bookMut.mutate(slot.id) },
      ],
    );
  }

  function handleCancel(slot: Slot) {
    if (!slot.myBooking) return;
    Alert.alert('Cancelar agendamento', 'Deseja cancelar este horário?', [
      { text: 'Não', style: 'cancel' },
      { text: 'Cancelar', style: 'destructive', onPress: () => cancelMut.mutate(slot.myBooking!.id) },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-xl font-bold text-gray-900">Agendamentos</Text>
        <Text className="text-sm text-gray-500">Reserve um horário com a escola</Text>
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
              <Text className="text-gray-400 mt-3">Nenhum horário disponível</Text>
            </View>
          ) : (
            <View className="gap-3 pb-6">
              {slots.map((slot) => {
                const booked = !!slot.myBooking;
                return (
                  <View key={slot.id} className={`bg-white rounded-2xl p-4 border ${booked ? 'border-primary-200' : 'border-gray-100'}`}>
                    {booked && (
                      <View className="flex-row items-center gap-1.5 mb-2">
                        <Check size={13} color="#059669" />
                        <Text className="text-xs text-green-700 font-medium">Agendado</Text>
                      </View>
                    )}
                    <View className="flex-row items-center gap-2 mb-1">
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
                    {slot.staffName && (
                      <Text className="text-xs text-gray-400 mt-1">Com {slot.staffName}</Text>
                    )}

                    <TouchableOpacity
                      onPress={() => booked ? handleCancel(slot) : handleBook(slot)}
                      disabled={slot.status === 'full' && !booked}
                      className={`mt-3 py-2.5 rounded-xl items-center ${booked ? 'bg-red-50 border border-red-100' : slot.status === 'full' ? 'bg-gray-100' : 'bg-primary-600'}`}
                    >
                      <Text className={`text-sm font-medium ${booked ? 'text-red-500' : slot.status === 'full' ? 'text-gray-400' : 'text-white'}`}>
                        {booked ? 'Cancelar agendamento' : slot.status === 'full' ? 'Lotado' : 'Agendar'}
                      </Text>
                    </TouchableOpacity>
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

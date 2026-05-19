import { useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, CheckCircle } from 'lucide-react-native';
import { communicationsApi } from '../../../lib/api';

const TYPE_LABELS: Record<string, string> = {
  NOTICE: 'Aviso', URGENT: 'URGENTE', INFORMATIVE: 'Informativo',
  DOCUMENT: 'Documento', PHOTO: 'Foto', EXAM: 'Prova', MEETING: 'Reunião',
};

type FeedItem = {
  id: string; title: string; body: string; schoolType: string;
  sentAt: string; isViewed: boolean; isRead: boolean;
  requiresConfirmation: boolean; school: { name: string };
  studentId?: string | null;
};

export default function GuardianCommunicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const viewedCalled = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ['guardian-communication', id],
    queryFn: () =>
      communicationsApi.guardianFeed().then((r) => {
        const list = r.data as FeedItem[];
        return list.find((c) => c.id === id) ?? null;
      }),
    enabled: !!id,
  });

  const viewedMut = useMutation({
    mutationFn: () => communicationsApi.trackViewed(id, { deviceType: Platform.OS }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guardian-communications'] }),
  });

  const readMut = useMutation({
    mutationFn: () => communicationsApi.confirmRead(id, { deviceType: Platform.OS }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guardian-communications'] });
      qc.invalidateQueries({ queryKey: ['guardian-communication', id] });
    },
  });

  useEffect(() => {
    if (data && !viewedCalled.current) {
      viewedCalled.current = true;
      if (!data.isViewed) viewedMut.mutate();
    }
  }, [data]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-5 pt-4 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 items-center justify-center">
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 flex-1" numberOfLines={1}>Comunicado</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : !data ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Comunicado não encontrado.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="flex-row items-center gap-2 mt-1 mb-3">
            <Text className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
              {TYPE_LABELS[data.schoolType] ?? data.schoolType}
            </Text>
            <Text className="text-xs text-gray-400">{data.school?.name}</Text>
          </View>

          <Text className="text-xl font-bold text-gray-900 mb-3">{data.title}</Text>

          <View className="flex-row items-center gap-1 mb-5">
            <Clock size={13} color="#9ca3af" />
            <Text className="text-xs text-gray-400">
              {new Date(data.sentAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          </View>

          {data.body ? (
            <View className="bg-white rounded-2xl p-4 border border-gray-100 mb-5">
              <Text className="text-sm text-gray-700 leading-6">{data.body}</Text>
            </View>
          ) : null}

          {data.requiresConfirmation && (
            data.isRead ? (
              <View className="flex-row items-center justify-center gap-2 py-3 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle size={16} color="#059669" />
                <Text className="text-sm font-medium text-green-700">Leitura confirmada</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => readMut.mutate()}
                disabled={readMut.isPending}
                className="w-full py-3.5 bg-primary-600 rounded-xl items-center"
              >
                <Text className="text-white font-semibold text-sm">
                  {readMut.isPending ? 'Confirmando...' : 'Confirmar leitura'}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

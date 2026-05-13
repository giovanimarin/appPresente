import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, Users } from 'lucide-react-native';
import { communicationsApi } from '../../../lib/api';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Rascunho', color: '#6b7280', bg: '#f3f4f6' },
  scheduled: { label: 'Agendado', color: '#d97706', bg: '#fef3c7' },
  sent:      { label: 'Enviado',  color: '#059669', bg: '#d1fae5' },
};

export default function CommunicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['communication', id],
    queryFn: () => communicationsApi.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const comm = data?.data ?? data;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-5 pt-4 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 items-center justify-center">
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 flex-1" numberOfLines={1}>
          Comunicado
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : !comm ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Comunicado não encontrado.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5" contentContainerClassName="pb-10">
          {/* Status badge */}
          {comm.status && (() => {
            const s = STATUS_LABELS[comm.status] ?? STATUS_LABELS.draft;
            return (
              <View className="self-start px-3 py-1 rounded-full mt-1 mb-4" style={{ backgroundColor: s.bg }}>
                <Text className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</Text>
              </View>
            );
          })()}

          {/* Title */}
          <Text className="text-xl font-bold text-gray-900 mb-2">{comm.title}</Text>

          {/* Meta */}
          <View className="flex-row flex-wrap gap-4 mb-5">
            {comm.createdAt && (
              <View className="flex-row items-center gap-1">
                <Clock size={13} color="#9ca3af" />
                <Text className="text-xs text-gray-400">
                  {new Date(comm.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </Text>
              </View>
            )}
            {comm.targetType && (
              <View className="flex-row items-center gap-1">
                <Users size={13} color="#9ca3af" />
                <Text className="text-xs text-gray-400">
                  {comm.targetType === 'all' ? 'Todos' : comm.targetType === 'class' ? 'Turma' : comm.targetType}
                </Text>
              </View>
            )}
          </View>

          {/* Body */}
          {comm.content ? (
            <View className="bg-white rounded-2xl p-4 border border-gray-100">
              <Text className="text-sm text-gray-700 leading-6">{comm.content}</Text>
            </View>
          ) : null}

          {/* Attachments placeholder */}
          {comm.attachments?.length > 0 && (
            <View className="mt-4 gap-2">
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Anexos</Text>
              {comm.attachments.map((att: { name: string; url: string }, i: number) => (
                <View key={i} className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                  <Text className="text-sm text-primary-600">{att.name}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

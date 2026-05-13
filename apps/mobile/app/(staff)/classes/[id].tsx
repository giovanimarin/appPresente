import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, GraduationCap } from 'lucide-react-native';
import { classesApi } from '../../../lib/api';

type Student = { id: string; name: string; enrollmentCode?: string };
type ClassDetail = { id: string; name: string; grade?: string; shift?: string; year?: number; students: Student[] };

const SHIFT_LABELS: Record<string, string> = {
  manha: 'Manhã', tarde: 'Tarde', integral: 'Integral', noturno: 'Noturno',
};

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['class', id],
    queryFn: () => classesApi.get(id).then((r) => r.data),
  });

  const cls: ClassDetail | undefined = data?.data;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-5 pt-4 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 items-center justify-center">
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 flex-1" numberOfLines={1}>
          {cls?.name ?? '...'}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : !cls ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Turma não encontrada</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5">
          <View className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
            <View className="flex-row flex-wrap gap-3">
              {cls.grade && (
                <View className="bg-primary-50 px-3 py-1.5 rounded-full">
                  <Text className="text-primary-700 text-xs font-medium">{cls.grade}</Text>
                </View>
              )}
              {cls.shift && (
                <View className="bg-gray-100 px-3 py-1.5 rounded-full">
                  <Text className="text-gray-600 text-xs font-medium">{SHIFT_LABELS[cls.shift] ?? cls.shift}</Text>
                </View>
              )}
              {cls.year && (
                <View className="bg-gray-100 px-3 py-1.5 rounded-full">
                  <Text className="text-gray-600 text-xs font-medium">{cls.year}</Text>
                </View>
              )}
            </View>
          </View>

          <View className="flex-row items-center gap-2 mb-3">
            <GraduationCap size={16} color="#6b7280" />
            <Text className="text-sm font-semibold text-gray-700">
              {cls.students?.length ?? 0} aluno{(cls.students?.length ?? 0) !== 1 ? 's' : ''}
            </Text>
          </View>

          <View className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 mb-6">
            {(cls.students ?? []).length === 0 ? (
              <View className="py-8 items-center">
                <Text className="text-gray-400 text-sm">Nenhum aluno nesta turma</Text>
              </View>
            ) : (cls.students ?? []).map((student) => (
              <View key={student.id} className="flex-row items-center gap-3 px-4 py-3.5">
                <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center">
                  <Text className="text-blue-700 text-sm font-semibold">{student.name[0].toUpperCase()}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900">{student.name}</Text>
                  {student.enrollmentCode && (
                    <Text className="text-xs text-gray-400">Mat: {student.enrollmentCode}</Text>
                  )}
                </View>
                <User size={14} color="#d1d5db" />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

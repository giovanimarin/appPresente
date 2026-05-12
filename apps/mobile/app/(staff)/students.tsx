import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, UserCheck, UserX } from 'lucide-react-native';
import { studentsApi } from '../../lib/api';

type Student = {
  id: string; name: string; enrollmentCode?: string;
  class?: { name: string; grade?: string };
  _count?: { studentGuardians: number };
};

export default function StudentsScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsApi.list({ limit: 500 }).then((r) => r.data),
  });

  const all: Student[] = data?.data ?? [];
  const filtered = search
    ? all.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.enrollmentCode?.includes(search))
    : all;

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-xl font-bold text-gray-900">Alunos</Text>
        <Text className="text-sm text-gray-500">{filtered.length} aluno{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      <View className="px-5 mb-3">
        <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 gap-2">
          <Search size={15} color="#9ca3af" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nome ou matrícula..."
            className="flex-1 py-2.5 text-sm text-gray-900"
          />
        </View>
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
          <View className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 mb-6">
            {filtered.length === 0 ? (
              <View className="py-12 items-center">
                <Text className="text-gray-400 text-sm">Nenhum aluno encontrado</Text>
              </View>
            ) : filtered.map((student) => (
              <View key={student.id} className="flex-row items-center gap-3 px-4 py-3.5">
                <View className="w-9 h-9 bg-blue-100 rounded-full items-center justify-center flex-shrink-0">
                  <Text className="text-blue-700 font-semibold text-sm">{student.name[0].toUpperCase()}</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>{student.name}</Text>
                  <Text className="text-xs text-gray-500" numberOfLines={1}>
                    {[student.class?.name, student.class?.grade, student.enrollmentCode ? `Mat: ${student.enrollmentCode}` : null].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {(student._count?.studentGuardians ?? 0) > 0 ? (
                  <UserCheck size={14} color="#059669" />
                ) : (
                  <UserX size={14} color="#f87171" />
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

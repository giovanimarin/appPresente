import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, Users } from 'lucide-react-native';
import { classesApi } from '../../lib/api';

const SHIFT_LABELS: Record<string, string> = {
  manha: 'Manhã', tarde: 'Tarde', integral: 'Integral', noturno: 'Noturno',
};

type Class = { id: string; name: string; grade?: string; shift?: string; year?: number; _count?: { students: number } };

export default function ClassesScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.list({ limit: 100 }).then((r) => r.data),
  });

  const classes: Class[] = data?.data ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-xl font-bold text-gray-900">Minhas turmas</Text>
        <Text className="text-sm text-gray-500">{classes.length} turma{classes.length !== 1 ? 's' : ''}</Text>
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
          {classes.length === 0 ? (
            <View className="items-center py-16">
              <BookOpen size={40} color="#d1d5db" />
              <Text className="text-gray-400 mt-3">Nenhuma turma vinculada</Text>
            </View>
          ) : (
            <View className="gap-3 pb-6">
              {classes.map((cls) => (
                <TouchableOpacity
                  key={cls.id}
                  onPress={() => router.push(`/(staff)/classes/${cls.id}`)}
                  className="bg-white rounded-2xl p-4 border border-gray-100 flex-row items-center gap-4"
                >
                  <View className="w-10 h-10 bg-primary-50 rounded-xl items-center justify-center">
                    <BookOpen size={18} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 text-sm">{cls.name}</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {[cls.grade, cls.shift ? SHIFT_LABELS[cls.shift] : null, cls.year].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {cls._count !== undefined && (
                    <View className="flex-row items-center gap-1">
                      <Users size={13} color="#9ca3af" />
                      <Text className="text-xs text-gray-400">{cls._count.students}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

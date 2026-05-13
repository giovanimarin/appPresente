import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Phone } from 'lucide-react-native';
import { api } from '../../lib/api';

type Guardian = {
  id: string; name: string; phone: string; email?: string; active: boolean; activatedAt?: string;
  studentGuardians: { student: { name: string } }[];
};

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return phone;
}

export default function GuardiansScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['guardians-staff'],
    queryFn: () => api.get('/guardians', { params: { limit: 500 } }).then((r) => r.data),
  });

  const all: Guardian[] = data?.data ?? [];
  const filtered = search
    ? all.filter((g) => g.name?.toLowerCase().includes(search.toLowerCase()) || g.phone?.includes(search))
    : all;

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-xl font-bold text-gray-900">Responsáveis</Text>
        <Text className="text-sm text-gray-500">{filtered.length} responsável{filtered.length !== 1 ? 'is' : ''}</Text>
      </View>

      <View className="px-5 mb-3">
        <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 gap-2">
          <Search size={15} color="#9ca3af" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nome ou telefone..."
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
                <Text className="text-gray-400 text-sm">Nenhum responsável encontrado</Text>
              </View>
            ) : filtered.map((g) => (
              <View key={g.id} className="flex-row items-center gap-3 px-4 py-3.5">
                <View className="w-9 h-9 bg-indigo-100 rounded-full items-center justify-center flex-shrink-0">
                  <Text className="text-indigo-700 font-semibold text-sm">{(g.name || '?')[0].toUpperCase()}</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-medium text-gray-900 flex-shrink" numberOfLines={1}>{g.name}</Text>
                    {!g.activatedAt && (
                      <View className="bg-yellow-100 px-1.5 py-0.5 rounded-full">
                        <Text className="text-yellow-700 text-xs">Pendente</Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Phone size={10} color="#9ca3af" />
                    <Text className="text-xs text-gray-500">{formatPhone(g.phone)}</Text>
                  </View>
                  {g.studentGuardians?.length > 0 && (
                    <Text className="text-xs text-gray-400" numberOfLines={1}>
                      {g.studentGuardians.map((sg) => sg.student.name).join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

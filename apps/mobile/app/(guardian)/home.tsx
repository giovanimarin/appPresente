import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquare, Calendar, GraduationCap } from 'lucide-react-native';
import { getUser, type AuthUser } from '../../lib/storage';
import { guardianApi } from '../../lib/api';

type Child = { id: string; name: string; class?: { name: string; grade?: string } };

export default function GuardianHome() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => { getUser().then(setUser); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['guardian-me'],
    queryFn: () => guardianApi.me().then((r) => r.data),
  });

  const children: Child[] = data?.studentGuardians?.map((sg: { student: Child }) => sg.student) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerClassName="p-5 gap-5">
        <View>
          <Text className="text-gray-500 text-sm">Olá,</Text>
          <Text className="text-2xl font-bold text-gray-900">{user?.name ?? '...'}</Text>
        </View>

        {/* Filhos */}
        <View>
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Meu(s) filho(s)</Text>
          {isLoading ? (
            <ActivityIndicator color="#2563eb" />
          ) : children.length === 0 ? (
            <Text className="text-gray-400 text-sm">Nenhum aluno vinculado.</Text>
          ) : (
            <View className="gap-3">
              {children.map((child) => (
                <View key={child.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                    <Text className="text-blue-700 font-bold">{child.name[0].toUpperCase()}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 text-sm">{child.name}</Text>
                    {child.class && (
                      <Text className="text-xs text-gray-500">{child.class.name}{child.class.grade ? ` · ${child.class.grade}` : ''}</Text>
                    )}
                  </View>
                  <GraduationCap size={16} color="#9ca3af" />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Ações rápidas */}
        <View>
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Acesso rápido</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push('/(guardian)/communications')}
              className="flex-1 bg-primary-600 rounded-2xl p-4 items-center gap-2"
            >
              <MessageSquare size={22} color="#fff" />
              <Text className="text-white text-xs font-medium text-center">Comunicados</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(guardian)/agenda')}
              className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 items-center gap-2"
            >
              <Calendar size={22} color="#2563eb" />
              <Text className="text-gray-700 text-xs font-medium text-center">Agenda</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquare, Calendar, BookOpen, Plus } from 'lucide-react-native';
import { getUser, type AuthUser } from '../../lib/storage';

const ROLE_LABELS: Record<string, string> = {
  TEACHER: 'Professor(a)',
  COORDINATOR: 'Coordenador(a)',
  SECRETARY: 'Secretaria',
  ADMIN: 'Administrador',
};

export default function StaffHome() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const isTeacher = user?.role === 'TEACHER';

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerClassName="p-5 gap-5">
        {/* Header */}
        <View>
          <Text className="text-gray-500 text-sm">Olá,</Text>
          <Text className="text-2xl font-bold text-gray-900">{user?.name ?? '...'}</Text>
          <Text className="text-primary-600 text-sm">{ROLE_LABELS[user?.role ?? ''] ?? ''}</Text>
        </View>

        {/* Ações rápidas */}
        <View>
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ações rápidas</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push('/(staff)/communications')}
              className="flex-1 bg-primary-600 rounded-2xl p-4 items-center gap-2"
            >
              <MessageSquare size={24} color="#fff" />
              <Text className="text-white text-xs font-medium text-center">Novo comunicado</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(staff)/agenda')}
              className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 items-center gap-2"
            >
              <Calendar size={24} color="#2563eb" />
              <Text className="text-gray-700 text-xs font-medium text-center">Agenda</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(staff)/classes')}
              className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 items-center gap-2"
            >
              <BookOpen size={24} color="#2563eb" />
              <Text className="text-gray-700 text-xs font-medium text-center">Minhas turmas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Banner para professor */}
        {isTeacher && (
          <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <Text className="text-blue-800 font-semibold text-sm mb-1">Suas turmas</Text>
            <Text className="text-blue-600 text-xs">Você visualiza apenas as turmas às quais está vinculado.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

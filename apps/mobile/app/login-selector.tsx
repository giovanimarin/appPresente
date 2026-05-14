import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function LoginSelector() {
  return (
    <View className="flex-1 bg-white items-center justify-center px-8">
      <View className="w-16 h-16 bg-primary-600 rounded-2xl items-center justify-center mb-6">
        <Text className="text-white text-3xl font-bold">P</Text>
      </View>
      <Text className="text-2xl font-bold text-gray-900 mb-1">Presente</Text>
      <Text className="text-gray-500 text-sm mb-12">Conectando escola e família</Text>

      <View className="w-full gap-3">
        <TouchableOpacity
          onPress={() => router.push('/login-staff')}
          className="w-full py-4 bg-primary-600 rounded-2xl items-center"
        >
          <Text className="text-white font-semibold text-base">Sou da equipe escolar</Text>
          <Text className="text-primary-200 text-xs mt-0.5">Professor, coordenador, secretaria</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/login-guardian')}
          className="w-full py-4 bg-white border border-gray-200 rounded-2xl items-center"
        >
          <Text className="text-gray-900 font-semibold text-base">Sou responsável</Text>
          <Text className="text-gray-400 text-xs mt-0.5">Acompanhe seu filho(a)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

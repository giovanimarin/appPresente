import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { authApi } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!email.trim()) { setError('Informe seu e-mail.'); return; }
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch {
      setError('Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerClassName="flex-grow justify-center px-8 py-12">
        <TouchableOpacity onPress={() => router.back()} className="mb-8">
          <Text className="text-primary-600 text-sm">← Voltar</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-gray-900 mb-1">Recuperar senha</Text>
        <Text className="text-gray-500 text-sm mb-8">Informe seu e-mail para receber o link</Text>

        {!sent ? (
          <View className="gap-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">E-mail</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com.br"
                keyboardType="email-address"
                autoCapitalize="none"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900"
              />
            </View>
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3">
                <Text className="text-red-700 text-sm">{error}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className="w-full py-4 bg-primary-600 rounded-2xl items-center mt-2"
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-white font-semibold text-base">Enviar link</Text>
              }
            </TouchableOpacity>
          </View>
        ) : (
          <View className="items-center gap-4">
            <Text className="text-4xl">✉️</Text>
            <Text className="text-gray-700 text-sm text-center">
              Se o e-mail estiver cadastrado, você receberá um link em instantes. Verifique também o spam.
            </Text>
            <TouchableOpacity onPress={() => router.replace('/login-staff')} className="mt-4">
              <Text className="text-primary-600 text-sm font-medium">Voltar ao login</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

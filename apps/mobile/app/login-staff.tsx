import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { authApi } from '../lib/api';
import { setTokens, setUser } from '../lib/storage';

export default function LoginStaff() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email.trim().toLowerCase(), password);
      const { accessToken, refreshToken, user } = res.data;
      await setTokens(accessToken, refreshToken);
      await setUser(user);
      router.replace('/(staff)/home');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerClassName="flex-grow justify-center px-8 py-12">
        <TouchableOpacity onPress={() => router.back()} className="mb-8">
          <Text className="text-primary-600 text-sm">← Voltar</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-gray-900 mb-1">Entrar</Text>
        <Text className="text-gray-500 text-sm mb-8">Acesso da equipe escolar</Text>

        <View className="gap-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1.5">E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com.br"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Senha</Text>
            <View className="relative">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 pr-12"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                className="absolute right-4 top-3.5"
              >
                <Text className="text-gray-400 text-sm">{showPassword ? 'Ocultar' : 'Ver'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3">
              <Text className="text-red-700 text-sm">{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="w-full py-4 bg-primary-600 rounded-2xl items-center mt-2"
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white font-semibold text-base">Entrar</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/forgot-password')}
            className="items-center mt-2"
          >
            <Text className="text-primary-600 text-sm">Esqueci minha senha</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

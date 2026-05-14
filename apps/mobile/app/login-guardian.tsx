'use client';
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { authApi } from '../lib/api';
import { setTokens, setUser } from '../lib/storage';

type Tab = 'password' | 'otp';
type OtpStep = 'email' | 'code';

export default function LoginGuardian() {
  const [tab, setTab] = useState<Tab>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpStep, setOtpStep] = useState<OtpStep>('email');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function switchTab(t: Tab) {
    setTab(t);
    setError('');
    setOtpStep('email');
    setOtpCode('');
  }

  async function handlePasswordLogin() {
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      const res = await authApi.guardianLogin(email.trim().toLowerCase(), password);
      const { accessToken, refreshToken, guardian } = res.data;
      await setTokens(accessToken, refreshToken);
      await setUser({ id: guardian.id, schoolId: guardian.schoolId, role: 'GUARDIAN', name: guardian.name });
      router.replace('/(guardian)/home');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; code?: string } } };
      const code = e.response?.data?.code;
      if (code === 'NO_PASSWORD') {
        setError('Você ainda não definiu uma senha. Use "Código por e-mail" para entrar.');
      } else {
        setError(e.response?.data?.error ?? 'E-mail ou senha inválidos.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestOtp() {
    if (!email) return;
    setError('');
    setLoading(true);
    try {
      await authApi.requestOtp(email.trim().toLowerCase());
      setOtpStep('code');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erro ao enviar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(email.trim().toLowerCase(), otpCode);
      const { accessToken, refreshToken, guardian } = res.data;
      await setTokens(accessToken, refreshToken);
      await setUser({ id: guardian.id, schoolId: guardian.schoolId, role: 'GUARDIAN', name: guardian.name });
      router.replace('/(guardian)/home');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Código inválido ou expirado.');
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
        <TouchableOpacity
          onPress={() => (tab === 'otp' && otpStep === 'code' ? setOtpStep('email') : router.back())}
          className="mb-8"
        >
          <Text className="text-emerald-600 text-sm">← Voltar</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-gray-900 mb-1">Entrar como responsável</Text>
        <Text className="text-gray-500 text-sm mb-6">Acesso ao Presente</Text>

        {/* Tabs */}
        <View className="flex-row gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          <TouchableOpacity
            onPress={() => switchTab('password')}
            className={`flex-1 py-2 rounded-lg items-center ${tab === 'password' ? 'bg-white shadow' : ''}`}
          >
            <Text className={`text-sm font-medium ${tab === 'password' ? 'text-gray-900' : 'text-gray-500'}`}>
              E-mail e senha
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => switchTab('otp')}
            className={`flex-1 py-2 rounded-lg items-center ${tab === 'otp' ? 'bg-white shadow' : ''}`}
          >
            <Text className={`text-sm font-medium ${tab === 'otp' ? 'text-gray-900' : 'text-gray-500'}`}>
              Código por e-mail
            </Text>
          </TouchableOpacity>
        </View>

        <View className="gap-4">
          {/* ── Tab: email + senha ── */}
          {tab === 'password' && (
            <>
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1.5">E-mail</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="seu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900"
                />
              </View>
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1.5">Senha</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Sua senha"
                  secureTextEntry
                  autoComplete="current-password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900"
                />
              </View>

              {error ? (
                <View className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <Text className="text-red-700 text-sm">{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handlePasswordLogin}
                disabled={loading || !email || !password}
                className="w-full py-4 bg-emerald-600 rounded-2xl items-center mt-2 disabled:opacity-60"
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text className="text-white font-semibold text-base">Entrar</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => switchTab('otp')}>
                <Text className="text-xs text-center text-gray-400">
                  Ainda não tem senha?{' '}
                  <Text className="text-emerald-600">Entre com código por e-mail</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Tab: OTP — passo 1: e-mail ── */}
          {tab === 'otp' && otpStep === 'email' && (
            <>
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1.5">E-mail cadastrado</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="seu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900"
                />
              </View>

              {error ? (
                <View className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <Text className="text-red-700 text-sm">{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleRequestOtp}
                disabled={loading || !email}
                className="w-full py-4 bg-emerald-600 rounded-2xl items-center mt-2 disabled:opacity-60"
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text className="text-white font-semibold text-base">Receber código por e-mail</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* ── Tab: OTP — passo 2: código ── */}
          {tab === 'otp' && otpStep === 'code' && (
            <>
              <View className="items-center mb-2">
                <Text className="text-sm text-gray-600 text-center">
                  Código enviado para <Text className="font-medium">{email}</Text>
                </Text>
                <Text className="text-xs text-gray-400 mt-1">Verifique também a caixa de spam</Text>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1.5">Código de verificação</Text>
                <TextInput
                  value={otpCode}
                  onChangeText={(v) => setOtpCode(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 tracking-widest text-center text-lg"
                />
              </View>

              {error ? (
                <View className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <Text className="text-red-700 text-sm">{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleVerifyOtp}
                disabled={loading || otpCode.length !== 6}
                className="w-full py-4 bg-emerald-600 rounded-2xl items-center mt-2 disabled:opacity-60"
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text className="text-white font-semibold text-base">Entrar</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setOtpStep('email'); setError(''); setOtpCode(''); }}>
                <Text className="text-sm text-center text-gray-500">Usar outro e-mail</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

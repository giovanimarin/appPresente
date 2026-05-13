import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { authApi } from '../lib/api';
import { setTokens, setUser } from '../lib/storage';

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function LoginGuardian() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequestOtp() {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { setError('Telefone inválido.'); return; }
    setError('');
    setLoading(true);
    try {
      await authApi.requestOtp(digits);
      setStep('otp');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erro ao enviar código.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.length < 4) { setError('Digite o código recebido.'); return; }
    setError('');
    setLoading(true);
    try {
      const digits = phone.replace(/\D/g, '');
      const res = await authApi.guardianLogin(digits, otp);
      const { accessToken, refreshToken, user } = res.data;
      await setTokens(accessToken, refreshToken);
      await setUser({ ...user, role: 'GUARDIAN' });
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
        <TouchableOpacity onPress={() => step === 'otp' ? setStep('phone') : router.back()} className="mb-8">
          <Text className="text-primary-600 text-sm">← Voltar</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-gray-900 mb-1">
          {step === 'phone' ? 'Entrar como responsável' : 'Confirmar código'}
        </Text>
        <Text className="text-gray-500 text-sm mb-8">
          {step === 'phone'
            ? 'Informe o telefone cadastrado na escola'
            : `Enviamos um código para ${phone}`}
        </Text>

        <View className="gap-4">
          {step === 'phone' ? (
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Telefone</Text>
              <TextInput
                value={phone}
                onChangeText={(v) => setPhone(maskPhone(v))}
                placeholder="(11) 99999-9999"
                keyboardType="phone-pad"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900"
              />
            </View>
          ) : (
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Código de verificação</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 tracking-widest text-center text-lg"
              />
            </View>
          )}

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3">
              <Text className="text-red-700 text-sm">{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={step === 'phone' ? handleRequestOtp : handleVerifyOtp}
            disabled={loading}
            className="w-full py-4 bg-primary-600 rounded-2xl items-center mt-2"
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white font-semibold text-base">
                  {step === 'phone' ? 'Receber código' : 'Entrar'}
                </Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

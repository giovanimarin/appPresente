import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { communicationsApi } from '../../lib/api';

const TARGET_OPTIONS = [
  { value: 'ALL',   label: 'Todos os responsáveis' },
  { value: 'CLASS', label: 'Uma turma específica' },
];

export default function NewCommunicationScreen() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('ALL');
  const [saving, setSaving] = useState(false);

  async function handleSave(sendNow: boolean) {
    if (!title.trim()) { Alert.alert('Atenção', 'O título é obrigatório.'); return; }
    if (!body.trim()) { Alert.alert('Atenção', 'O conteúdo é obrigatório.'); return; }

    setSaving(true);
    try {
      const res = await communicationsApi.create({ title: title.trim(), body: body.trim(), targetType });
      if (sendNow) {
        await communicationsApi.send(res.data.data.id);
      }
      await qc.invalidateQueries({ queryKey: ['communications'] });
      router.back();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      Alert.alert('Erro', e.response?.data?.error ?? 'Não foi possível salvar o comunicado.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="flex-row items-center gap-3 px-5 pt-4 pb-3">
          <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 items-center justify-center">
            <ArrowLeft size={22} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 flex-1">Novo comunicado</Text>
        </View>

        <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
          <View className="bg-white rounded-2xl border border-gray-100 p-4 gap-4 mb-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Título *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Reunião de pais"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Conteúdo *</Text>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Digite o conteúdo do comunicado..."
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 min-h-[120px]"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Destinatários</Text>
              <View className="gap-2">
                {TARGET_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setTargetType(opt.value)}
                    className={`flex-row items-center gap-3 p-3 rounded-xl border ${targetType === opt.value ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white'}`}
                  >
                    <View className={`w-4 h-4 rounded-full border-2 items-center justify-center ${targetType === opt.value ? 'border-primary-600' : 'border-gray-300'}`}>
                      {targetType === opt.value && <View className="w-2 h-2 rounded-full bg-primary-600" />}
                    </View>
                    <Text className={`text-sm ${targetType === opt.value ? 'text-primary-700 font-medium' : 'text-gray-700'}`}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View className="gap-3 pb-8">
            <TouchableOpacity
              onPress={() => handleSave(true)}
              disabled={saving}
              className="w-full py-4 bg-primary-600 rounded-2xl flex-row items-center justify-center gap-2"
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Send size={16} color="#fff" />}
              <Text className="text-white font-semibold text-base">Enviar agora</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSave(false)}
              disabled={saving}
              className="w-full py-4 bg-white border border-gray-200 rounded-2xl items-center"
            >
              <Text className="text-gray-700 font-medium text-base">Salvar rascunho</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

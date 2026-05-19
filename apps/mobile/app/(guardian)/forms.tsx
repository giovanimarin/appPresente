import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, ChevronDown, ChevronUp, Send } from 'lucide-react-native';
import { formsApi } from '../../lib/api';

type Form = { id: string; title: string; description?: string; fields: FormField[] };
type FormField = { id: string; label: string; type: string; required: boolean; options?: string[] };
type Submission = { id: string; formId: string; status: string; createdAt: string };

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  sent:          { label: 'Enviado',    color: '#d97706', bg: '#fef3c7' },
  received:      { label: 'Recebido',   color: '#2563eb', bg: '#dbeafe' },
  under_review:  { label: 'Em análise', color: '#7c3aed', bg: '#ede9fe' },
  resolved:      { label: 'Resolvido',  color: '#059669', bg: '#d1fae5' },
};

export default function GuardianForms() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedForm, setExpandedForm] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const { data: formsData, isLoading: formsLoading, refetch } = useQuery({
    queryKey: ['guardian-forms'],
    queryFn: () => formsApi.guardianForms().then((r) => r.data),
  });

  const { data: subsData } = useQuery({
    queryKey: ['guardian-submissions'],
    queryFn: () => formsApi.mySubmissions().then((r) => r.data),
  });

  const forms: Form[] = formsData ?? [];
  const submissions: Submission[] = subsData ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleSubmit(form: Form) {
    const missing = form.fields.filter((f) => f.required && !answers[f.id]?.trim());
    if (missing.length > 0) {
      Alert.alert('Campos obrigatórios', `Preencha: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setSubmitting(true);
    try {
      await formsApi.submit(form.id, {
        answers: form.fields.map((f) => ({ fieldId: f.id, value: answers[f.id] ?? '' })),
      });
      await qc.invalidateQueries({ queryKey: ['guardian-submissions'] });
      setExpandedForm(null);
      setAnswers({});
      Alert.alert('Sucesso', 'Formulário enviado com sucesso!');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      Alert.alert('Erro', e.response?.data?.error ?? 'Não foi possível enviar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-xl font-bold text-gray-900">Formulários</Text>
      </View>

      {formsLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Formulários disponíveis */}
          {forms.length > 0 && (
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Disponíveis</Text>
              <View className="gap-3">
                {forms.map((form) => {
                  const open = expandedForm === form.id;
                  return (
                    <View key={form.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <TouchableOpacity
                        onPress={() => setExpandedForm(open ? null : form.id)}
                        className="flex-row items-center justify-between p-4"
                      >
                        <View className="flex-1 pr-3">
                          <Text className="font-semibold text-gray-900 text-sm">{form.title}</Text>
                          {form.description && (
                            <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{form.description}</Text>
                          )}
                        </View>
                        {open ? <ChevronUp size={18} color="#9ca3af" /> : <ChevronDown size={18} color="#9ca3af" />}
                      </TouchableOpacity>

                      {open && (
                        <View className="border-t border-gray-50 p-4 gap-4">
                          {form.fields.map((field) => (
                            <View key={field.id}>
                              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                                {field.label}{field.required && <Text className="text-red-500"> *</Text>}
                              </Text>
                              {field.type === 'textarea' ? (
                                <TextInput
                                  value={answers[field.id] ?? ''}
                                  onChangeText={(v) => setAnswers((prev) => ({ ...prev, [field.id]: v }))}
                                  multiline
                                  numberOfLines={4}
                                  textAlignVertical="top"
                                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 min-h-[80px]"
                                />
                              ) : (
                                <TextInput
                                  value={answers[field.id] ?? ''}
                                  onChangeText={(v) => setAnswers((prev) => ({ ...prev, [field.id]: v }))}
                                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900"
                                />
                              )}
                            </View>
                          ))}

                          <TouchableOpacity
                            onPress={() => handleSubmit(form)}
                            disabled={submitting}
                            className="w-full py-3 bg-primary-600 rounded-xl flex-row items-center justify-center gap-2"
                          >
                            <Send size={15} color="#fff" />
                            <Text className="text-white font-semibold text-sm">
                              {submitting ? 'Enviando...' : 'Enviar formulário'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Histórico de envios */}
          {submissions.length > 0 && (
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Meus envios</Text>
              <View className="gap-2">
                {submissions.map((sub) => {
                  const form = forms.find((f) => f.id === sub.formId);
                  const s = STATUS_LABELS[sub.status] ?? STATUS_LABELS.sent;
                  return (
                    <View key={sub.id} className="bg-white rounded-xl p-3.5 border border-gray-100 flex-row items-center justify-between">
                      <View>
                        <Text className="text-sm font-medium text-gray-900">{form?.title ?? 'Formulário'}</Text>
                        <Text className="text-xs text-gray-400">
                          {new Date(sub.createdAt).toLocaleDateString('pt-BR')}
                        </Text>
                      </View>
                      <View className="px-2 py-1 rounded-full" style={{ backgroundColor: s.bg }}>
                        <Text className="text-xs font-medium" style={{ color: s.color }}>{s.label}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {forms.length === 0 && submissions.length === 0 && (
            <View className="items-center py-16">
              <FileText size={40} color="#d1d5db" />
              <Text className="text-gray-400 mt-3">Nenhum formulário disponível</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

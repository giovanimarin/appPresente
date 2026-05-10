'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PhoneInput from '@/components/PhoneInput';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { schoolsApi } from '@/lib/platform-api';
import { ArrowLeft, Copy, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
  // Escola
  name: z.string().min(2, 'Nome obrigatorio'),
  email: z.string().email('E-mail invalido'),
  cnpj: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  state: z.string().length(2, 'UF deve ter 2 letras').optional().or(z.literal('')),
  address: z.string().max(300).optional(),
  plan: z.enum(['STARTER', 'SCHOOL', 'NETWORK', 'ENTERPRISE']),
  trialDays: z.coerce.number().int().min(0).max(365),
  // Admin
  adminName: z.string().min(2, 'Nome obrigatorio'),
  adminEmail: z.string().email('E-mail invalido'),
});

type FormData = z.infer<typeof schema>;

const ROLES_LABEL: Record<string, string> = {
  ADMIN: 'Diretor(a)',
  COORDINATOR: 'Coordenador(a)',
  SECRETARY: 'Secretaria',
  TEACHER: 'Professor(a)',
};

export default function NewSchoolPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{
    schoolId: string; schoolName: string;
    adminEmail: string; tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { plan: 'STARTER', trialDays: 30 },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError('');
    try {
      const res = await schoolsApi.create({
        ...data,
        state: data.state || undefined,
        cnpj: data.cnpj || undefined,
        phone: data.phone || undefined,
        city: data.city || undefined,
        address: data.address || undefined,
      });
      const { school, admin, tempPassword } = res.data;
      setCreated({
        schoolId: school.id,
        schoolName: school.name,
        adminEmail: admin.email,
        tempPassword,
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erro ao criar escola.');
    } finally {
      setLoading(false);
    }
  }

  function copyPassword() {
    if (!created) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(created.tempPassword);
    } else {
      // Fallback para HTTP (sem HTTPS)
      const el = document.createElement('textarea');
      el.value = created.tempPassword;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Tela de sucesso
  if (created) {
    return (
      <div className="max-w-xl space-y-6">
        <div className="bg-green-950/30 border border-green-800/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="text-green-400" />
            <h2 className="text-white font-semibold text-lg">Escola criada com sucesso!</h2>
          </div>

          <p className="text-gray-300 text-sm">
            <span className="font-medium text-white">{created.schoolName}</span> foi cadastrada.
            Compartilhe as credenciais abaixo com o(a) administrador(a) da escola.
          </p>

          <div className="bg-gray-900 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-gray-500 text-xs mb-0.5">URL de acesso</p>
              <p className="text-white text-sm font-mono">http://localhost:3000/login</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-0.5">E-mail</p>
              <p className="text-white text-sm font-mono">{created.adminEmail}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Senha temporaria</p>
              <div className="flex items-center gap-2">
                <p className="text-yellow-300 text-sm font-mono font-bold">{created.tempPassword}</p>
                <button
                  onClick={copyPassword}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Copiar senha"
                >
                  {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          <p className="text-yellow-400/80 text-xs">
            Esta senha nao sera exibida novamente. Guarde-a antes de continuar.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => router.push(`/platform/schools/${created.schoolId}`)}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Ver detalhes da escola
            </button>
            <button
              onClick={() => router.push('/platform/schools')}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Ver todas as escolas
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-3">Proximos passos (pela escola)</h3>
          <ol className="space-y-2 text-sm text-gray-400 list-decimal list-inside">
            <li>Admin faz login e troca a senha</li>
            <li>Cadastra turmas em <span className="text-gray-300">Turmas</span></li>
            <li>Adiciona alunos em cada turma</li>
            <li>Cadastra os demais funcionarios em <span className="text-gray-300">Equipe</span> com seus papeis:
              {Object.entries(ROLES_LABEL).map(([role, label]) => (
                <span key={role} className="ml-2 text-xs px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">
                  {label}
                </span>
              ))}
            </li>
            <li>Cadastra responsaveis vinculados aos alunos</li>
          </ol>
        </div>
      </div>
    );
  }

  // Formulario
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Nova Escola</h1>
          <p className="text-gray-400 text-sm mt-0.5">Cadastro de escola e administrador inicial</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Dados da escola */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Dados da escola</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-gray-400 text-xs mb-1">Nome da escola *</label>
              <input
                {...register('name')}
                placeholder="Escola Municipal Girassol"
                className={cn('w-full px-3 py-2 bg-gray-800 border rounded-lg text-white text-sm',
                  errors.name ? 'border-red-500' : 'border-gray-700',
                  'focus:ring-2 focus:ring-indigo-500 focus:outline-none')}
              />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">E-mail da escola *</label>
              <input
                {...register('email')}
                type="email"
                placeholder="contato@escola.com.br"
                className={cn('w-full px-3 py-2 bg-gray-800 border rounded-lg text-white text-sm',
                  errors.email ? 'border-red-500' : 'border-gray-700',
                  'focus:ring-2 focus:ring-indigo-500 focus:outline-none')}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">CNPJ</label>
              <input
                {...register('cnpj')}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">Telefone</label>
              <PhoneInput
                {...register('phone')}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">Cidade</label>
              <input
                {...register('city')}
                placeholder="Sao Paulo"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">UF</label>
              <input
                {...register('state')}
                placeholder="SP"
                maxLength={2}
                className={cn('w-full px-3 py-2 bg-gray-800 border rounded-lg text-white text-sm uppercase',
                  errors.state ? 'border-red-500' : 'border-gray-700',
                  'focus:ring-2 focus:ring-indigo-500 focus:outline-none')}
              />
              {errors.state && <p className="mt-1 text-xs text-red-400">{errors.state.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-400 text-xs mb-1">Endereco</label>
              <input
                {...register('address')}
                placeholder="Rua das Flores, 123"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Plano */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Plano e trial</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Plano</label>
              <select
                {...register('plan')}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="STARTER">STARTER (ate 100 alunos)</option>
                <option value="SCHOOL">SCHOOL (ate 400 alunos)</option>
                <option value="NETWORK">NETWORK (ate 1.000 alunos)</option>
                <option value="ENTERPRISE">ENTERPRISE (ilimitado)</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Dias de trial</label>
              <input
                {...register('trialDays')}
                type="number"
                min={0}
                max={365}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">0 = sem trial</p>
            </div>
          </div>
        </div>

        {/* Admin inicial */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-white font-semibold text-sm">Administrador(a) inicial</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Sera criado com perfil de Diretor(a) (acesso total). Uma senha temporaria sera gerada.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Nome completo *</label>
              <input
                {...register('adminName')}
                placeholder="Maria Silva"
                className={cn('w-full px-3 py-2 bg-gray-800 border rounded-lg text-white text-sm',
                  errors.adminName ? 'border-red-500' : 'border-gray-700',
                  'focus:ring-2 focus:ring-indigo-500 focus:outline-none')}
              />
              {errors.adminName && <p className="mt-1 text-xs text-red-400">{errors.adminName.message}</p>}
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">E-mail *</label>
              <input
                {...register('adminEmail')}
                type="email"
                placeholder="diretora@escola.com.br"
                className={cn('w-full px-3 py-2 bg-gray-800 border rounded-lg text-white text-sm',
                  errors.adminEmail ? 'border-red-500' : 'border-gray-700',
                  'focus:ring-2 focus:ring-indigo-500 focus:outline-none')}
              />
              {errors.adminEmail && <p className="mt-1 text-xs text-red-400">{errors.adminEmail.message}</p>}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-70"
          >
            {loading ? 'Criando escola...' : 'Criar escola'}
          </button>
        </div>
      </form>
    </div>
  );
}

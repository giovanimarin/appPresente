'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PhoneInput from '@/components/PhoneInput';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { schoolsApi } from '@/lib/platform-api';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatorio'),
  email: z.string().email('E-mail invalido'),
  cnpj: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  zipCode: z.string().optional(),
  street: z.string().max(300).optional(),
  number: z.string().max(20).optional(),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().length(2, 'UF deve ter 2 letras').optional().or(z.literal('')),
  plan: z.enum(['STARTER', 'SCHOOL', 'NETWORK', 'ENTERPRISE']),
  trialDays: z.coerce.number().int().min(0).max(365),
  adminName: z.string().min(2, 'Nome obrigatorio'),
  adminEmail: z.string().email('E-mail invalido'),
});

type FormData = z.infer<typeof schema>;

const ROLES_LABEL: Record<string, string> = {
  ADMIN: 'Diretor(a)', COORDINATOR: 'Coordenador(a)', SECRETARY: 'Secretaria', TEACHER: 'Professor(a)',
};

export default function NewSchoolPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [created, setCreated] = useState<{ schoolId: string; schoolName: string; adminEmail: string } | null>(null);
  const cepRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { plan: 'STARTER', trialDays: 30 },
  });

  async function lookupCep(raw: string) {
    const cep = raw.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setValue('street', data.logradouro ?? '');
        setValue('neighborhood', data.bairro ?? '');
        setValue('city', data.localidade ?? '');
        setValue('state', data.uf ?? '');
      }
    } catch {
      // silently ignore CEP lookup errors
    } finally {
      setCepLoading(false);
    }
  }

  function onCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // format as 00000-000
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setValue('zipCode', formatted);
    if (cepRef.current) clearTimeout(cepRef.current);
    cepRef.current = setTimeout(() => lookupCep(digits), 600);
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError('');
    const addressParts = [data.street, data.number, data.complement, data.neighborhood].filter(Boolean).join(', ');
    try {
      const res = await schoolsApi.create({
        name: data.name,
        email: data.email,
        cnpj: data.cnpj || undefined,
        phone: data.phone || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        address: addressParts || undefined,
        plan: data.plan,
        trialDays: data.trialDays,
        adminName: data.adminName,
        adminEmail: data.adminEmail,
      });
      const { school, admin } = res.data;
      setCreated({ schoolId: school.id, schoolName: school.name, adminEmail: admin.email });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erro ao criar escola.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = (err?: boolean) => cn(
    'w-full px-3 py-2 bg-gray-800 border rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none',
    err ? 'border-red-500' : 'border-gray-700',
  );

  if (created) {
    return (
      <div className="max-w-xl space-y-6">
        <div className="bg-green-950/30 border border-green-800/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="text-green-400" />
            <h2 className="text-white font-semibold text-lg">Escola criada com sucesso!</h2>
          </div>
          <p className="text-gray-300 text-sm"><span className="font-medium text-white">{created.schoolName}</span> foi cadastrada.</p>
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-500 text-xs mb-0.5">E-mail do administrador</p>
            <p className="text-white text-sm font-mono">{created.adminEmail}</p>
          </div>
          <p className="text-green-400/80 text-xs">E-mail com link de primeiro acesso enviado. Expira em 72h.</p>
          <div className="flex gap-3 pt-2">
            <button onClick={() => router.push(`/platform/schools/${created.schoolId}`)}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Ver escola</button>
            <button onClick={() => router.push('/platform/schools')}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium">Ver todas</button>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-3">Proximos passos (pela escola)</h3>
          <ol className="space-y-2 text-sm text-gray-400 list-decimal list-inside">
            <li>Admin faz login e troca a senha</li>
            <li>Cadastra turmas em <span className="text-gray-300">Turmas</span></li>
            <li>Adiciona alunos em cada turma</li>
            <li>Cadastra os demais funcionarios em <span className="text-gray-300">Equipe</span>:
              {Object.entries(ROLES_LABEL).map(([role, label]) => (
                <span key={role} className="ml-2 text-xs px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">{label}</span>
              ))}
            </li>
            <li>Cadastra responsaveis vinculados aos alunos</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800">
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
              <input {...register('name')} placeholder="Escola Municipal Girassol" className={inputCls(!!errors.name)} />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">E-mail da escola *</label>
              <input {...register('email')} type="email" placeholder="contato@escola.com.br" className={inputCls(!!errors.email)} />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">CNPJ</label>
              <input {...register('cnpj')} placeholder="00.000.000/0001-00" className={inputCls()} />
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">Telefone</label>
              <PhoneInput {...register('phone')} className={inputCls()} />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Endereço</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1">CEP</label>
              <div className="relative">
                <input
                  {...register('zipCode')}
                  placeholder="00000-000"
                  maxLength={9}
                  onChange={onCepChange}
                  className={inputCls()}
                />
                {cepLoading && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-400" />
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-400 text-xs mb-1">Rua / Logradouro</label>
              <input {...register('street')} placeholder="Rua das Flores" className={inputCls()} />
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">Número</label>
              <input {...register('number')} placeholder="123" className={inputCls()} />
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">Complemento</label>
              <input {...register('complement')} placeholder="Bloco A, Sala 2..." className={inputCls()} />
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">Bairro</label>
              <input {...register('neighborhood')} placeholder="Centro" className={inputCls()} />
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">Cidade</label>
              <input {...register('city')} placeholder="São Paulo" className={inputCls()} />
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">UF</label>
              <input {...register('state')} placeholder="SP" maxLength={2}
                className={cn(inputCls(!!errors.state), 'uppercase')} />
              {errors.state && <p className="mt-1 text-xs text-red-400">{errors.state.message}</p>}
            </div>
          </div>
        </div>

        {/* Plano */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Plano e trial</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Plano</label>
              <select {...register('plan')} className={inputCls()}>
                <option value="STARTER">STARTER (até 100 alunos)</option>
                <option value="SCHOOL">SCHOOL (até 400 alunos)</option>
                <option value="NETWORK">NETWORK (até 1.000 alunos)</option>
                <option value="ENTERPRISE">ENTERPRISE (ilimitado)</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Dias de trial</label>
              <input {...register('trialDays')} type="number" min={0} max={365} className={inputCls()} />
              <p className="mt-1 text-xs text-gray-500">0 = sem trial</p>
            </div>
          </div>
        </div>

        {/* Admin inicial */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-white font-semibold text-sm">Administrador(a) inicial</h2>
            <p className="text-gray-500 text-xs mt-0.5">Perfil de Diretor(a). Link de primeiro acesso enviado por e-mail.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Nome completo *</label>
              <input {...register('adminName')} placeholder="Maria Silva" className={inputCls(!!errors.adminName)} />
              {errors.adminName && <p className="mt-1 text-xs text-red-400">{errors.adminName.message}</p>}
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">E-mail *</label>
              <input {...register('adminEmail')} type="email" placeholder="diretora@escola.com.br" className={inputCls(!!errors.adminEmail)} />
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
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium">Cancelar</button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-70">
            {loading ? 'Criando escola...' : 'Criar escola'}
          </button>
        </div>
      </form>
    </div>
  );
}

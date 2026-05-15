'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';

function PrimeiroAcessoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [guardianName, setGuardianName] = useState('');
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    authApi.validateGuardianFirstAccess(token)
      .then((res) => { setTokenValid(true); setGuardianName(res.data.guardian?.name ?? ''); })
      .catch(() => setTokenValid(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    setError('');
    setLoading(true);
    try {
      await authApi.completeGuardianFirstAccess(token, password);
      setDone(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erro ao definir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (tokenValid === null) {
    return <p className="text-center text-gray-500 mt-8">Verificando link...</p>;
  }

  if (tokenValid === false) {
    return (
      <div className="text-center mt-8">
        <p className="text-red-600 font-medium">Link inválido ou expirado.</p>
        <p className="text-gray-500 text-sm mt-2">Solicite um novo convite à escola.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center mt-8 space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full">
          <span className="text-emerald-600 text-3xl">✓</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Senha definida!</h2>
        <p className="text-gray-500 text-sm">Agora você já pode fazer login no Presente.</p>
        <button
          onClick={() => router.push('/guardian')}
          className="mt-4 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          Ir para o login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {guardianName && (
        <p className="text-gray-600 text-sm">
          Olá, <strong>{guardianName}</strong>! Defina sua senha para acessar o Presente.
        </p>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          required
          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repita a senha"
          required
          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !password || !confirm}
        className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? 'Salvando...' : 'Definir senha e acessar'}
      </button>
    </form>
  );
}

export default function GuardianPrimeiroAcessoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">P</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Primeiro acesso</h1>
          <p className="text-gray-500 text-sm mt-1">Crie sua senha para o Presente</p>
        </div>
        <Suspense fallback={<p className="text-center text-gray-500">Carregando...</p>}>
          <PrimeiroAcessoForm />
        </Suspense>
      </div>
    </div>
  );
}

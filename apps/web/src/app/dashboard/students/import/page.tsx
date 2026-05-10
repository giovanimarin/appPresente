'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsApi } from '@/lib/api';
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, FileSpreadsheet, Download, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ImportRow = {
  studentName: string;
  className: string;
  grade?: string;
  enrollmentCode?: string;
  guardianName?: string;
  guardianEmail?: string;
  guardianPhone?: string;
  guardianCpf?: string;
  relationship?: string;
};

type RowError = { field: string; message: string };

type ParsedRow = ImportRow & { _line: number; _raw: string; _errors: RowError[] };

type ImportResult = {
  created: { students: number; classes: number; guardians: number };
  skipped: number;
  errors: string[];
};

const EXPECTED_COLS = 9;
const CSV_HEADER_LABELS = ['Nome do Aluno*', 'Turma*', 'Série', 'Matrícula', 'Nome Responsável', 'E-mail Responsável', 'Telefone Responsável', 'CPF Responsável', 'Parentesco'];
const VALID_RELATIONSHIPS = ['mae', 'mãe', 'pai', 'avo', 'avó', 'avo', 'avô', 'tio', 'tia', 'responsavel', 'responsável', 'outro'];
const EXAMPLE_ROWS = [
  ['Ana Lima', '1º Ano A', '1º Ano', '2026001', 'Sandra Lima', 'sandra@email.com', '+5511900000001', '12345678901', 'mae'],
  ['Bruno Costa', '1º Ano A', '1º Ano', '2026002', 'Carlos Costa', 'carlos@email.com', '+5511900000002', '98765432100', 'pai'],
  ['Carla Souza', '3º Ano B', '3º Ano', '2026003', 'Maria Souza', 'maria@email.com', '', '', 'mae'],
];

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidPhone(v: string) {
  return /^\+?\d[\d\s\-().]{6,19}$/.test(v);
}

function parseAndValidate(text: string): { rows: ParsedRow[]; globalErrors: string[] } {
  const globalErrors: string[] = [];
  const lines = text.trim().split(/\r?\n/);

  // Detect and skip header
  const firstLine = lines[0]?.toLowerCase() ?? '';
  const hasHeader = firstLine.includes('nome') || firstLine.includes('aluno') || firstLine.includes('turma');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  if (dataLines.length === 0) {
    globalErrors.push('Arquivo sem dados.');
    return { rows: [], globalErrors };
  }

  const rows: ParsedRow[] = dataLines
    .map((rawLine, idx) => {
      const lineNum = idx + 1;
      if (!rawLine.trim()) return null;

      const cols = rawLine.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      const errors: RowError[] = [];

      // Column count
      if (cols.length !== EXPECTED_COLS) {
        errors.push({
          field: 'formato',
          message: `${cols.length} coluna(s) encontrada(s), esperado ${EXPECTED_COLS}. Verifique vírgulas.`,
        });
      }

      const studentName = cols[0] ?? '';
      const className = cols[1] ?? '';
      const grade = cols[2] || undefined;
      const enrollmentCode = cols[3] || undefined;
      const guardianName = cols[4] || undefined;
      const guardianEmail = cols[5] || undefined;
      const guardianPhone = cols[6] || undefined;
      const guardianCpf = cols[7] || undefined;
      const relationship = cols[8] || undefined;

      // Required fields
      if (!studentName) errors.push({ field: 'Nome do Aluno', message: 'Campo obrigatório.' });
      if (!className) errors.push({ field: 'Turma', message: 'Campo obrigatório.' });

      // Email
      if (guardianEmail && !isValidEmail(guardianEmail))
        errors.push({ field: 'E-mail', message: `"${guardianEmail}" não é um e-mail válido.` });

      // Phone
      if (guardianPhone && !isValidPhone(guardianPhone))
        errors.push({ field: 'Telefone', message: `"${guardianPhone}" não é um telefone válido.` });

      // Relationship
      if (relationship && !VALID_RELATIONSHIPS.includes(relationship.toLowerCase()))
        errors.push({ field: 'Parentesco', message: `"${relationship}" não reconhecido. Use: mae, pai, avo, tio, responsavel, outro.` });

      return { studentName, className, grade, enrollmentCode, guardianName, guardianEmail, guardianPhone, guardianCpf, relationship, _line: lineNum, _raw: rawLine, _errors: errors } as ParsedRow;
    })
    .filter(Boolean) as ParsedRow[];

  return { rows, globalErrors };
}

function downloadExample() {
  const header = CSV_HEADER_LABELS.join(',');
  const csvRows = EXAMPLE_ROWS.map((r) => r.join(','));
  const csv = [header, ...csvRows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo_importacao.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportStudentsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseAndValidate(text);
      setRows(parsed.rows);
      setGlobalErrors(parsed.globalErrors);
    };
    reader.readAsText(file, 'UTF-8');
  }

  const errorRows = rows.filter((r) => r._errors.length > 0);
  const validRows = rows.filter((r) => r._errors.length === 0);
  const hasErrors = globalErrors.length > 0 || errorRows.length > 0;

  const importMutation = useMutation({
    mutationFn: () => studentsApi.import(validRows),
    onSuccess: (res) => {
      setResult(res.data);
      setRows([]);
      setFileName('');
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Importar alunos</h1>
          <p className="text-sm text-gray-500">Cadastre alunos e responsáveis em massa via CSV</p>
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-blue-800">Como usar</p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>Baixe o modelo CSV e preencha os dados</li>
          <li>Colunas obrigatórias: <strong>Nome do Aluno</strong> e <strong>Turma</strong></li>
          <li>Cada linha deve ter exatamente <strong>9 colunas</strong> separadas por vírgula</li>
          <li>Turmas novas são criadas automaticamente</li>
          <li>Parentesco aceito: mae, pai, avo, tio, responsavel, outro</li>
        </ul>
        <button onClick={downloadExample} className="flex items-center gap-2 mt-2 text-xs font-medium text-blue-700 underline">
          <Download size={12} /> Baixar modelo CSV
        </button>
      </div>

      {/* Upload */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          fileName && !hasErrors ? 'border-green-300 bg-green-50' :
          fileName && hasErrors ? 'border-red-300 bg-red-50' :
          'border-gray-200 hover:border-primary-300 hover:bg-gray-50',
        )}
      >
        <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        {fileName ? (
          <>
            <FileSpreadsheet size={32} className={cn('mx-auto mb-2', hasErrors ? 'text-red-400' : 'text-green-500')} />
            <p className={cn('text-sm font-semibold', hasErrors ? 'text-red-700' : 'text-green-700')}>{fileName}</p>
            <p className={cn('text-xs mt-1', hasErrors ? 'text-red-500' : 'text-green-600')}>
              {rows.length} linha(s) detectada(s){hasErrors ? ` · ${errorRows.length} com erro` : ''}
            </p>
          </>
        ) : (
          <>
            <Upload size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">Clique ou arraste o arquivo CSV</p>
            <p className="text-xs text-gray-400 mt-1">Apenas arquivos .csv</p>
          </>
        )}
      </div>

      {/* Erros globais */}
      {globalErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
          {globalErrors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-red-700">
              <XCircle size={14} className="flex-shrink-0" /> {e}
            </div>
          ))}
        </div>
      )}

      {/* Prévia com validação */}
      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Prévia ({rows.length} linhas)</p>
            <div className="flex items-center gap-3 text-xs">
              {errorRows.length > 0 && <span className="text-red-600 font-medium">{errorRows.length} com erro</span>}
              {validRows.length > 0 && <span className="text-green-600 font-medium">{validRows.length} válida(s)</span>}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-2 py-2 text-left text-gray-400 font-medium w-8">#</th>
                  {['Aluno', 'Turma', 'Série', 'Matrícula', 'Responsável', 'E-mail', 'Telefone', 'CPF', 'Parentesco'].map((h) => (
                    <th key={h} className="px-2 py-2 text-left text-gray-500 font-medium">{h}</th>
                  ))}
                  <th className="px-2 py-2 w-6"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const hasErr = r._errors.length > 0;
                  return (
                    <>
                      <tr key={r._line} className={cn('border-b border-gray-50', hasErr ? 'bg-red-50' : 'hover:bg-gray-50')}>
                        <td className="px-2 py-2 text-gray-400">{r._line}</td>
                        <td className={cn('px-2 py-2 font-medium', !r.studentName && 'text-red-500 italic')}>{r.studentName || 'vazio'}</td>
                        <td className={cn('px-2 py-2', !r.className && 'text-red-500 italic')}>{r.className || 'vazio'}</td>
                        <td className="px-2 py-2 text-gray-500">{r.grade ?? '—'}</td>
                        <td className="px-2 py-2 text-gray-500">{r.enrollmentCode ?? '—'}</td>
                        <td className="px-2 py-2 text-gray-600">{r.guardianName ?? '—'}</td>
                        <td className={cn('px-2 py-2', r.guardianEmail && !isValidEmail(r.guardianEmail) && 'text-red-500')}>{r.guardianEmail ?? '—'}</td>
                        <td className={cn('px-2 py-2', r.guardianPhone && !isValidPhone(r.guardianPhone) && 'text-red-500')}>{r.guardianPhone ?? '—'}</td>
                        <td className="px-2 py-2 text-gray-500 font-mono">{r.guardianCpf ?? '—'}</td>
                        <td className={cn('px-2 py-2', r.relationship && !VALID_RELATIONSHIPS.includes(r.relationship.toLowerCase()) && 'text-red-500')}>{r.relationship ?? '—'}</td>
                        <td className="px-2 py-2">
                          {hasErr ? <XCircle size={13} className="text-red-400" /> : <CheckCircle2 size={13} className="text-green-400" />}
                        </td>
                      </tr>
                      {hasErr && (
                        <tr key={`${r._line}-err`} className="bg-red-50 border-b border-red-100">
                          <td></td>
                          <td colSpan={10} className="px-2 pb-2">
                            {r._errors.map((e, i) => (
                              <span key={i} className="inline-block mr-3 text-red-600">
                                <strong>{e.field}:</strong> {e.message}
                              </span>
                            ))}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aviso de linhas inválidas */}
      {errorRows.length > 0 && validRows.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            {errorRows.length} linha(s) com erro serão <strong>ignoradas</strong>. Apenas as {validRows.length} linhas válidas serão importadas.
          </p>
        </div>
      )}
      {errorRows.length > 0 && validRows.length === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">Todas as linhas têm erro. Corrija o arquivo antes de importar.</p>
        </div>
      )}

      {/* Ação */}
      {validRows.length > 0 && (
        <button
          onClick={() => importMutation.mutate()}
          disabled={importMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-70"
        >
          <Upload size={16} />
          {importMutation.isPending ? 'Importando...' : `Importar ${validRows.length} aluno(s) válido(s)`}
        </button>
      )}

      {/* Resultado */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-green-500" />
            <p className="font-semibold text-gray-900">Importação concluída</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Alunos criados', value: result.created.students },
              { label: 'Turmas criadas', value: result.created.classes },
              { label: 'Responsáveis', value: result.created.guardians },
            ].map((stat) => (
              <div key={stat.label} className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{stat.value}</p>
                <p className="text-xs text-green-600">{stat.label}</p>
              </div>
            ))}
          </div>
          {result.skipped > 0 && <p className="text-sm text-amber-600">⚠ {result.skipped} linha(s) ignorada(s)</p>}
          {result.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs font-semibold text-red-700">Erros ({result.errors.length})</p>
              </div>
              {result.errors.slice(0, 5).map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
              {result.errors.length > 5 && <p className="text-xs text-red-500">...e mais {result.errors.length - 5} erros</p>}
            </div>
          )}
          <button onClick={() => router.push('/dashboard/classes')} className="text-sm text-primary-600 font-medium">
            Ver turmas e alunos →
          </button>
        </div>
      )}
    </div>
  );
}

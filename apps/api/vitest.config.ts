import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],

    // Separa unitários de integração por padrão de nome
    include: ['src/**/*.{unit,int}.test.ts'],

    // Integração roda sequencialmente (compartilham banco de teste)
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/app.ts',
        'src/test/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@presente/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});

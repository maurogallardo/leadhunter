import { defineConfig } from 'vitest/config';

// Solo funciones puras (sin navegador ni base).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});

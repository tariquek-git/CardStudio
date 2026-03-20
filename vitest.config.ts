import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      include: ['src/compliance/**', 'src/context.tsx', 'src/canvas/utils.ts', 'src/sectionUtils.ts'],
    },
  },
});

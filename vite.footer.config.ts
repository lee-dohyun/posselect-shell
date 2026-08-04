import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// v1/footer.js — <posselect-footer> 정의 + 자동 마운트. header 빌드 뒤에 실행되므로
// emptyOutDir: false로 header.js를 지우지 않는다.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/v1',
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: 'src/footer.tsx',
      formats: ['iife'],
      name: 'PosselectFooterBundle',
      fileName: () => 'footer.js',
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// v1/header.js — 커스텀 엘리먼트 <posselect-header>를 정의하고 자동 마운트하는 단일 IIFE.
// React/ReactDOM을 내부에 번들링(호스트와 공유하지 않음)해서 스크립트 태그 하나로 완결된다.
export default defineConfig({
  plugins: [react()],
  // 브라우저 IIFE엔 Node의 process 전역이 없다 — React/ReactDOM 내부가 참조하는
  // process.env.NODE_ENV를 빌드 타임에 문자열로 치환해줘야 런타임에 안 터진다.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist/v1',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/header.tsx',
      formats: ['iife'],
      name: 'PosselectHeaderBundle',
      fileName: () => 'header.js',
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});

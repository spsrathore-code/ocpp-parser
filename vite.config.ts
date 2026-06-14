import { defineConfig } from 'vitest/config';

// Single config for Vite (dev/build) and Vitest (test). Root = repo root;
// the entry is the repo-root index.html, which loads src/app/main.ts.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});

import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Plain Vite + React setup. No styling tooling on purpose: this is the
// logic-only phase.
export default defineConfig({
  plugins: [react()],
});

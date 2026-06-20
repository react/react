import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Vite + React + Tailwind. Tailwind drives the design phase (industrial theme);
// the app logic and the data seam are unchanged.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});

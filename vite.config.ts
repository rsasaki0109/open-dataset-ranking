import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages (project site) serves under /<repo>/.
// Override with BASE_PATH env for custom domains, e.g. BASE_PATH=/ npm run build.
const base = process.env.BASE_PATH ?? '/open-dataset-ranking/';

export default defineConfig({
  plugins: [react()],
  base,
});

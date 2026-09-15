import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || `http://localhost:${env.PORT || 3000}`;

  return {
    plugins: [react()],
    server: {
      port: Number(env.FRONTEND_PORT || 5173),
      proxy: { '/api': apiUrl }
    }
  };
});

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Solo validar VITE_PORT en modo desarrollo
  if (mode === 'development' && !env.VITE_PORT) {
    console.error('ERROR: VITE_PORT no está definido en las variables de entorno')
    process.exit(1)
  }

  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT),
      host: true
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    define: {
      // Suprimir warnings específicos de React en desarrollo
      __DEV__: JSON.stringify(false)
    },
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // Suprimir warnings específicos de defaultProps
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
            return
          }
          warn(warning)
        }
      }
    }
  }
})

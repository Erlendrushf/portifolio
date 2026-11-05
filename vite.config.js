import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base = process.env.PORTFOLIO_BASE_PATH || '/'
const segments = base.split('/')

if (
  !base.startsWith('/') ||
  !base.endsWith('/') ||
  base.includes('//') ||
  /[?#\\]/.test(base) ||
  segments.some((segment) => segment === '.' || segment === '..')
) {
  throw new Error('PORTFOLIO_BASE_PATH must be an absolute path ending in /, such as /portfolio/.')
}

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.{js,jsx}'],
  },
})

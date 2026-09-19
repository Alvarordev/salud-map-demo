import react from '@vitejs/plugin-react'
import { defineConfig, type ProxyOptions } from 'vite'

function stripFrameHeaders(headers: Record<string, unknown>) {
  delete headers['content-security-policy']
  delete headers['content-security-policy-report-only']
  delete headers['x-frame-options']
}

const renipressProxy: ProxyOptions = {
  target: 'https://app20.susalud.gob.pe:8086',
  changeOrigin: true,
  secure: false,
  configure(proxy) {
    proxy.on('proxyRes', (proxyRes) => {
      stripFrameHeaders(proxyRes.headers as Record<string, unknown>)
      const location = proxyRes.headers.location
      if (typeof location === 'string') {
        try {
          const url = new URL(location, 'https://app20.susalud.gob.pe:8086')
          if (url.hostname.includes('susalud.gob.pe')) {
            proxyRes.headers.location = `${url.pathname}${url.search}`
          }
        } catch {
          /* keep original location */
        }
      }
    })
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/registro-renipress-webapp': renipressProxy },
  },
  preview: {
    proxy: { '/registro-renipress-webapp': renipressProxy },
  },
})

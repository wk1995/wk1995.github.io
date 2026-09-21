import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:4173/study/', timezoneId: 'Asia/Shanghai', locale: 'zh-CN' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: { command: 'VITE_STUDY_BFF_URL=/api/study npm run dev -- --port 4173', url: 'http://127.0.0.1:4173/study/', reuseExistingServer: false },
})

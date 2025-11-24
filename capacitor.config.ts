import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lojaexpress.app',
  appName: 'Loja Express',
  webDir: 'dist',
  server: {
    // Para desenvolvimento - habilita hot-reload do sandbox
    url: 'https://d20c4f6b-951e-4c41-a56e-ef7ef21e7c50.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;

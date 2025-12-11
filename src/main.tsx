import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

const APP_VERSION = '2.0.1';

// Verificar se precisa limpar cache (só na primeira visita ou nova versão)
const shouldClearCache = () => {
  try {
    const lastVersion = localStorage.getItem('app_version');
    if (lastVersion !== APP_VERSION) {
      localStorage.setItem('app_version', APP_VERSION);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// Limpar caches antigos em background (não bloqueia renderização)
const clearOldCaches = async () => {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
  }
};

// Renderizar imediatamente (não bloquear)
createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </HelmetProvider>
);

// Limpar cache em background apenas se necessário
if (shouldClearCache()) {
  clearOldCaches();
}

import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

// Limpar caches antigos para garantir landing page atualizada
const clearOldCaches = async () => {
  try {
    // Limpar Cache Storage (usado pelo Service Worker)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('Limpando cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }

    // Desregistrar Service Workers antigos
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('Service Worker desregistrado');
      }
    }
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
  }
};

// Executar limpeza e depois renderizar
clearOldCaches().then(() => {
  createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  );
});

import { useEffect, useRef } from 'react';
import { useWhatsAppStatus } from './useWhatsAppStatus';
import { useToast } from './use-toast';

interface UseWhatsAppDisconnectNotificationOptions {
  /**
   * Se deve mostrar notificações do navegador (padrão: true)
   */
  enableBrowserNotification?: boolean;
  
  /**
   * Se deve mostrar toast (padrão: true)
   */
  enableToast?: boolean;
  
  /**
   * Se deve pedir permissão automaticamente (padrão: true)
   */
  autoRequestPermission?: boolean;
}

/**
 * Hook para notificar quando o WhatsApp desconectar
 * Envia notificações push do navegador e toast
 */
export const useWhatsAppDisconnectNotification = (
  storeId: string | undefined,
  options: UseWhatsAppDisconnectNotificationOptions = {}
) => {
  const {
    enableBrowserNotification = true,
    enableToast = true,
    autoRequestPermission = true,
  } = options;

  const { status, hasPermission } = useWhatsAppStatus(storeId, {
    checkInterval: 120000, // 2 minutos
  });
  
  const { toast } = useToast();
  const previousStatusRef = useRef(status);
  const notificationPermissionRef = useRef<NotificationPermission>('default');

  // Solicitar permissão para notificações
  useEffect(() => {
    if (!enableBrowserNotification || !autoRequestPermission) return;
    
    const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission();
          notificationPermissionRef.current = permission;
          
          if (permission === 'granted') {
            console.log('[WhatsApp Notification] Permissão concedida para notificações');
          } else {
            console.log('[WhatsApp Notification] Permissão negada para notificações');
          }
        } catch (error) {
          console.error('[WhatsApp Notification] Erro ao solicitar permissão:', error);
        }
      } else if ('Notification' in window) {
        notificationPermissionRef.current = Notification.permission;
      }
    };

    // Solicitar permissão após um delay (para não ser intrusivo)
    const timeout = setTimeout(requestNotificationPermission, 3000);
    
    return () => clearTimeout(timeout);
  }, [enableBrowserNotification, autoRequestPermission]);

  // Monitorar mudanças de status
  useEffect(() => {
    if (!hasPermission || !storeId) return;

    const previousStatus = previousStatusRef.current;
    
    // Detectar desconexão
    if (previousStatus === 'connected' && status === 'disconnected') {
      console.log('[WhatsApp Notification] WhatsApp desconectou! Enviando notificações...');
      
      // Enviar notificação do navegador
      if (enableBrowserNotification && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const notification = new Notification('⚠️ WhatsApp Desconectado', {
            body: 'Seu WhatsApp foi desconectado. Reconecte para continuar recebendo pedidos.',
            icon: '/favicon-96x96.png',
            badge: '/favicon-96x96.png',
            tag: 'whatsapp-disconnect',
            requireInteraction: true, // Notificação permanece até o usuário interagir
          });

          // Focar na aba quando clicar na notificação
          notification.onclick = () => {
            window.focus();
            notification.close();
            
            // Navegar para a aba WhatsApp se possível
            const url = new URL(window.location.href);
            url.searchParams.set('tab', 'whatsapp');
            window.history.pushState({}, '', url);
            window.location.reload();
          };

          // Auto-fechar após 30 segundos se não interagir
          setTimeout(() => {
            notification.close();
          }, 30000);
          
          console.log('[WhatsApp Notification] Notificação do navegador enviada');
        } catch (error) {
          console.error('[WhatsApp Notification] Erro ao enviar notificação do navegador:', error);
        }
      }
      
      // Enviar toast
      if (enableToast) {
        toast({
          title: "⚠️ WhatsApp Desconectado",
          description: "Seu WhatsApp foi desconectado. Acesse a aba WhatsApp para reconectar.",
          variant: "destructive",
          duration: 10000, // 10 segundos
        });
      }
    }
    
    // Detectar reconexão
    if (previousStatus === 'disconnected' && status === 'connected') {
      console.log('[WhatsApp Notification] WhatsApp reconectou!');
      
      if (enableToast) {
        toast({
          title: "✅ WhatsApp Reconectado",
          description: "Sua conexão com o WhatsApp foi restaurada com sucesso.",
          duration: 5000,
        });
      }
    }

    previousStatusRef.current = status;
  }, [status, hasPermission, storeId, enableBrowserNotification, enableToast, toast]);

  return {
    status,
    hasPermission,
    notificationPermission: notificationPermissionRef.current,
  };
};

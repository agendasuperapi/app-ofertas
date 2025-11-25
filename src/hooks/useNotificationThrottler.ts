import { useRef, useCallback } from 'react';

/**
 * Hook para throttling de funções - previne chamadas excessivas
 * @param callback Função a ser throttled
 * @param delay Delay em milissegundos (padrão: 5000ms)
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 5000
): T => {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        return callback(...args);
      }
    }) as T,
    [callback, delay]
  );
};

/**
 * Hook para debouncing de funções - aguarda um período sem chamadas antes de executar
 * @param callback Função a ser debounced
 * @param delay Delay em milissegundos (padrão: 2000ms)
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 2000
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
};

/**
 * Hook para verificar se um valor mudou antes de atualizar estado
 */
export const useStateChangeDetector = () => {
  const prevValueRef = useRef<any>();

  const hasChanged = useCallback((newValue: any): boolean => {
    const changed = prevValueRef.current !== newValue;
    prevValueRef.current = newValue;
    return changed;
  }, []);

  return hasChanged;
};

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

const getDisplayValue = (value: string): string => {
  // Remove o código do país para exibição
  const numbers = value.replace(/\D/g, '');
  const withoutCountryCode = numbers.startsWith('55') ? numbers.slice(2) : numbers;
  
  if (withoutCountryCode.length === 0) return '';
  if (withoutCountryCode.length <= 2) return `(${withoutCountryCode}`;
  if (withoutCountryCode.length <= 6) {
    return `(${withoutCountryCode.slice(0, 2)}) ${withoutCountryCode.slice(2)}`;
  }
  if (withoutCountryCode.length <= 10) {
    return `(${withoutCountryCode.slice(0, 2)}) ${withoutCountryCode.slice(2, 6)}-${withoutCountryCode.slice(6)}`;
  }
  return `(${withoutCountryCode.slice(0, 2)}) ${withoutCountryCode.slice(2, 7)}-${withoutCountryCode.slice(7)}`;
};

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [isValid, setIsValid] = React.useState(true);

    const formatPhoneNumber = (input: string): string => {
      // Remove tudo que não é número
      const numbers = input.replace(/\D/g, '');
      
      // Limita a 11 dígitos (DDD + número)
      const limited = numbers.slice(0, 11);
      
      // Sem dígitos
      if (limited.length === 0) {
        return '';
      }
      
      // Apenas DDD parcial
      if (limited.length <= 2) {
        return `(${limited}`;
      }
      
      // DDD completo + início do número
      if (limited.length <= 6) {
        return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
      }
      
      // Telefone fixo (10 dígitos) ou celular (11 dígitos)
      if (limited.length <= 10) {
        // Formato: (DD) DDDD-DDDD
        return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
      }
      
      // Celular com 11 dígitos: (DD) 9DDDD-DDDD
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneNumber(e.target.value);
      // Adiciona o código do país internamente
      const numbers = formatted.replace(/\D/g, '');
      const withCountryCode = numbers ? `+55${numbers}` : '';
      onChange(withCountryCode);
      
      // Validação: aceita 10 dígitos (fixo) ou 11 dígitos (celular)
      setIsValid(numbers.length === 0 || numbers.length === 10 || numbers.length === 11);
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    return (
      <div className="relative">
        <motion.div
          initial={false}
          animate={{
            scale: isFocused ? 1.01 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg z-10 pointer-events-none">
              🇧🇷
            </span>
            <Input
              ref={ref}
              type="tel"
              value={getDisplayValue(value)}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="(00) 00000-0000"
              className={cn(
                "pl-12 transition-all duration-300",
                isFocused && "ring-2 ring-primary/20 border-primary",
                !isValid && value && "border-red-500 ring-2 ring-red-500/20",
                className
              )}
              {...props}
            />
          </div>
        </motion.div>
        
        {/* Indicador visual de formatação */}
        {isFocused && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -bottom-6 left-0 text-xs text-muted-foreground"
          >
            {value.replace(/\D/g, '').replace(/^55/, '').length} dígitos (10-11)
          </motion.div>
        )}
        
        {/* Indicador de validação */}
        {value && !isValid && !isFocused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </motion.div>
        )}
        
        {value && isValid && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </motion.div>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };

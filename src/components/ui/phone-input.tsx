import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [isValid, setIsValid] = React.useState(true);

    const formatPhoneNumber = (input: string): string => {
      // Remove tudo que não é número
      const numbers = input.replace(/\D/g, '');
      
      // Limita a 13 dígitos (55 + 11 dígitos)
      const limited = numbers.slice(0, 13);
      
      // Sem dígitos
      if (limited.length === 0) {
        return '';
      }
      
      // Adiciona +55 se não começar com 55
      let withCountryCode = limited;
      if (!limited.startsWith('55') && limited.length > 0) {
        withCountryCode = '55' + limited;
      }
      
      // Apenas código do país
      if (withCountryCode.length <= 2) {
        return `+${withCountryCode}`;
      }
      
      // Código do país + DDD parcial
      if (withCountryCode.length <= 4) {
        return `+${withCountryCode.slice(0, 2)} (${withCountryCode.slice(2)}`;
      }
      
      // Código do país + DDD completo + início do número
      if (withCountryCode.length <= 8) {
        return `+${withCountryCode.slice(0, 2)} (${withCountryCode.slice(2, 4)}) ${withCountryCode.slice(4)}`;
      }
      
      // Telefone fixo (12 dígitos) ou celular (13 dígitos)
      if (withCountryCode.length <= 12) {
        // Formato: +55 (DD) DDDD-DDDD
        return `+${withCountryCode.slice(0, 2)} (${withCountryCode.slice(2, 4)}) ${withCountryCode.slice(4, 8)}-${withCountryCode.slice(8)}`;
      }
      
      // Celular com 13 dígitos: +55 (DD) 9DDDD-DDDD
      return `+${withCountryCode.slice(0, 2)} (${withCountryCode.slice(2, 4)}) ${withCountryCode.slice(4, 9)}-${withCountryCode.slice(9)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneNumber(e.target.value);
      onChange(formatted);
      
      // Validação: aceita 12 dígitos (fixo) ou 13 dígitos (celular) com código do país
      const numbers = formatted.replace(/\D/g, '');
      setIsValid(numbers.length === 0 || numbers.length === 12 || numbers.length === 13);
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
          <Input
            ref={ref}
            type="tel"
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="+55 (00) 00000-0000"
            className={cn(
              "transition-all duration-300",
              isFocused && "ring-2 ring-primary/20 border-primary",
              !isValid && value && "border-red-500 ring-2 ring-red-500/20",
              className
            )}
            {...props}
          />
        </motion.div>
        
        {/* Indicador visual de formatação */}
        {isFocused && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -bottom-6 left-0 text-xs text-muted-foreground"
          >
            {value.replace(/\D/g, '').length} dígitos (12-13)
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

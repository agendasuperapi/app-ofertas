import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface CPFInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | undefined | null;
  onChange: (value: string) => void;
}

// CPF validation with digit verification
const isValidCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/[^\d]/g, '');
  if (cleaned.length !== 11) return false;
  
  // Check for known invalid CPFs (all same digits)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  // Validate first verification digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;
  
  // Validate second verification digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
};

const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  
  if (numbers.length === 0) return '';
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
};

const CPFInput = React.forwardRef<HTMLInputElement, CPFInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    
    const numbers = (value || '').replace(/\D/g, '');
    const isComplete = numbers.length === 11;
    const isValid = isComplete && isValidCPF(numbers);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCPF(e.target.value);
      const cleanNumbers = formatted.replace(/\D/g, '');
      onChange(cleanNumbers);
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
            <Input
              ref={ref}
              type="text"
              inputMode="numeric"
              value={formatCPF(value || '')}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="000.000.000-00"
              className={cn(
                "transition-all duration-300",
                isFocused && "ring-2 ring-primary/20 border-primary",
                isComplete && !isValid && "border-destructive ring-2 ring-destructive/20",
                className
              )}
              {...props}
            />
          </div>
        </motion.div>
        
        {/* Digit counter during focus */}
        {isFocused && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -bottom-6 left-0 text-xs text-muted-foreground"
          >
            {numbers.length}/11 dígitos
          </motion.div>
        )}
        
        {/* Validation indicator */}
        {numbers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            {isComplete ? (
              <div className={cn(
                "w-2 h-2 rounded-full",
                isValid ? "bg-green-500" : "bg-destructive animate-pulse"
              )} />
            ) : (
              <div className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </motion.div>
        )}
      </div>
    );
  }
);

CPFInput.displayName = "CPFInput";

export { CPFInput, isValidCPF };

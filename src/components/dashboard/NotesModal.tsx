import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

interface NotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onSave: (value: string) => void;
  title: string;
  placeholder: string;
}

export const NotesModal = ({ 
  open, 
  onOpenChange, 
  value, 
  onSave, 
  title, 
  placeholder 
}: NotesModalProps) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(localValue);
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[90vh]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        
        <div className="py-4 px-4">
          <Textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={placeholder}
            className="min-h-[200px]"
            autoFocus
          />
        </div>

        <ResponsiveDialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            className="flex-1"
          >
            Salvar
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
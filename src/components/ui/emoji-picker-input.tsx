import { useState } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface EmojiPickerInputProps {
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
}

// Quick suggestions for food/commerce stores
const QUICK_SUGGESTIONS = [
  // Comida
  '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥗', '🥘', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🍤', '🍙', '🍚', '🍥',
  // Bebidas
  '🥤', '🧃', '🧋', '☕', '🍵', '🫖', '🍺', '🍻', '🍷', '🍸', '🍹', '🧉', '🥛', '🍶',
  // Sobremesas
  '🍰', '🎂', '🧁', '🍮', '🍫', '🍬', '🍭', '🍩', '🍪', '🍨', '🍧', '🍦',
  // Frutas/Saúde
  '🍎', '🍊', '🍋', '🍇', '🍓', '🥝', '🥥', '🥑', '🥦', '🥕', '🌽', '🥬',
  // Carnes/Proteínas
  '🥩', '🍖', '🍗', '🥓', '🍳', '🥚', '🧀', '🌶️',
  // Outros
  '🛒', '📦', '🎁', '⭐', '✨', '💰', '🔥', '❤️', '👍', '🏷️', '📢', '🎉', '📁', '🛍️', '💎', '🎯'
];

export const EmojiPickerInput = ({ value, onChange, label }: EmojiPickerInputProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onChange(emojiData.emoji);
    setIsOpen(false);
  };

  const handleQuickSelect = (emoji: string) => {
    onChange(emoji);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full h-14 text-3xl hover:bg-accent flex items-center justify-center"
            type="button"
          >
            {value || '📁'}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[350px] p-0" 
          align="start"
          side="bottom"
          sideOffset={8}
        >
          <div className="p-3 border-b">
            <Label className="text-xs text-muted-foreground mb-2 block">Sugestões Rápidas</Label>
            <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
              {QUICK_SUGGESTIONS.map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-8 h-8 flex items-center justify-center text-xl hover:bg-accent rounded transition-colors"
                  onClick={() => handleQuickSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.AUTO}
            width="100%"
            height={300}
            searchPlaceHolder="Pesquisar emoji..."
            previewConfig={{ showPreview: false }}
            lazyLoadEmojis={true}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

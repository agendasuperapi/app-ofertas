import { useState, useEffect } from 'react';
import EmojiPicker, { EmojiClickData, Theme, Categories } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface EmojiPickerInputProps {
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
}

// Categorias em português
const CATEGORIES_PT: { category: Categories; name: string }[] = [
  { category: Categories.SUGGESTED, name: 'Usados Recentemente' },
  { category: Categories.SMILEYS_PEOPLE, name: 'Rostos e Pessoas' },
  { category: Categories.ANIMALS_NATURE, name: 'Animais e Natureza' },
  { category: Categories.FOOD_DRINK, name: 'Comida e Bebida' },
  { category: Categories.TRAVEL_PLACES, name: 'Viagens e Lugares' },
  { category: Categories.ACTIVITIES, name: 'Atividades' },
  { category: Categories.OBJECTS, name: 'Objetos' },
  { category: Categories.SYMBOLS, name: 'Símbolos' },
  { category: Categories.FLAGS, name: 'Bandeiras' },
];

// Mapa de busca em português com 100+ termos
const EMOJI_SEARCH_MAP: { [key: string]: string[] } = {
  // Comida - Lanches
  'hamburguer': ['🍔'],
  'hamburger': ['🍔'],
  'lanche': ['🍔', '🥪', '🌭'],
  'batata': ['🍟', '🥔'],
  'batata frita': ['🍟'],
  'fritas': ['🍟'],
  'pizza': ['🍕'],
  'cachorro quente': ['🌭'],
  'hot dog': ['🌭'],
  'sanduiche': ['🥪'],
  'sanduba': ['🥪'],
  'taco': ['🌮'],
  'burrito': ['🌯'],
  'falafel': ['🧆'],
  'wrap': ['🌯'],
  'pao': ['🍞', '🥖', '🥯'],
  'baguete': ['🥖'],
  'croissant': ['🥐'],
  'pretzel': ['🥨'],
  'bagel': ['🥯'],
  
  // Comida - Refeições
  'salada': ['🥗'],
  'arroz': ['🍚', '🍙'],
  'macarrao': ['🍝'],
  'massa': ['🍝'],
  'espaguete': ['🍝'],
  'sopa': ['🍲'],
  'caldo': ['🍲'],
  'ramen': ['🍜'],
  'lamen': ['🍜'],
  'sushi': ['🍣'],
  'peixe': ['🐟', '🍣', '🐠'],
  'camarao': ['🍤', '🦐'],
  'lagosta': ['🦞'],
  'caranguejo': ['🦀'],
  'lula': ['🦑'],
  'polvo': ['🐙'],
  'ostra': ['🦪'],
  'curry': ['🍛'],
  'paella': ['🥘'],
  'fondue': ['🫕'],
  'empanada': ['🥟'],
  'gyoza': ['🥟'],
  'dumpling': ['🥟'],
  
  // Carnes
  'carne': ['🥩', '🍖'],
  'churrasco': ['🥩', '🍖'],
  'costela': ['🍖'],
  'frango': ['🍗', '🐔'],
  'bacon': ['🥓'],
  'linguica': ['🌭'],
  'salsicha': ['🌭'],
  'presunto': ['🥓'],
  'peru': ['🦃'],
  
  // Ovos e laticínios
  'ovo': ['🥚', '🍳'],
  'omelete': ['🍳'],
  'queijo': ['🧀'],
  'manteiga': ['🧈'],
  
  // Bebidas
  'refrigerante': ['🥤'],
  'suco': ['🧃', '🥤'],
  'cafe': ['☕'],
  'cappuccino': ['☕'],
  'expresso': ['☕'],
  'cha': ['🍵', '🫖'],
  'mate': ['🧉'],
  'chimarrao': ['🧉'],
  'cerveja': ['🍺', '🍻'],
  'chopp': ['🍺'],
  'vinho': ['🍷'],
  'champagne': ['🍾'],
  'espumante': ['🍾'],
  'drink': ['🍸', '🍹'],
  'coquetel': ['🍹'],
  'caipirinha': ['🍹'],
  'margarita': ['🍹'],
  'whisky': ['🥃'],
  'sake': ['🍶'],
  'agua': ['💧', '🚰', '🧊'],
  'leite': ['🥛'],
  'milkshake': ['🥤'],
  'smoothie': ['🧋'],
  'bubble tea': ['🧋'],
  'garrafinha': ['🍼'],
  
  // Sobremesas
  'bolo': ['🎂', '🍰'],
  'torta': ['🥧', '🍰'],
  'cupcake': ['🧁'],
  'pudim': ['🍮'],
  'flan': ['🍮'],
  'chocolate': ['🍫'],
  'doce': ['🍬', '🍭', '🍫'],
  'bala': ['🍬'],
  'pirulito': ['🍭'],
  'rosquinha': ['🍩'],
  'donut': ['🍩'],
  'biscoito': ['🍪'],
  'cookie': ['🍪'],
  'sorvete': ['🍦', '🍨', '🍧'],
  'picole': ['🍦'],
  'sundae': ['🍨'],
  'raspadinha': ['🍧'],
  'acai': ['🍇'],
  'mel': ['🍯'],
  'panqueca': ['🥞'],
  'waffle': ['🧇'],
  
  // Frutas
  'fruta': ['🍎', '🍊', '🍇', '🍓'],
  'maca': ['🍎', '🍏'],
  'laranja': ['🍊'],
  'tangerina': ['🍊'],
  'limao': ['🍋'],
  'uva': ['🍇'],
  'morango': ['🍓'],
  'banana': ['🍌'],
  'melancia': ['🍉'],
  'melao': ['🍈'],
  'abacaxi': ['🍍'],
  'manga': ['🥭'],
  'coco': ['🥥'],
  'abacate': ['🥑'],
  'kiwi': ['🥝'],
  'pera': ['🍐'],
  'pessego': ['🍑'],
  'cereja': ['🍒'],
  'amora': ['🫐'],
  'mirtilo': ['🫐'],
  'framboesa': ['🍇'],
  'azeitona': ['🫒'],
  
  // Vegetais
  'vegetal': ['🥦', '🥕', '🌽'],
  'verdura': ['🥬', '🥦'],
  'legume': ['🥕', '🥔'],
  'brocolis': ['🥦'],
  'cenoura': ['🥕'],
  'milho': ['🌽'],
  'alface': ['🥬'],
  'couve': ['🥬'],
  'tomate': ['🍅'],
  'pimenta': ['🌶️', '🫑'],
  'pimentao': ['🫑'],
  'pepino': ['🥒'],
  'berinjela': ['🍆'],
  'batata doce': ['🍠'],
  'inhame': ['🍠'],
  'alho': ['🧄'],
  'cebola': ['🧅'],
  'cogumelo': ['🍄'],
  'amendoim': ['🥜'],
  'castanha': ['🌰'],
  'feijao': ['🫘'],
  
  // Categorias/E-commerce
  'categoria': ['📁', '📂'],
  'pasta': ['📁', '📂'],
  'arquivo': ['📁'],
  'carrinho': ['🛒'],
  'compras': ['🛒', '🛍️'],
  'sacola': ['🛍️'],
  'pacote': ['📦'],
  'caixa': ['📦'],
  'entrega': ['📦', '🚚'],
  'delivery': ['🚚', '📦'],
  'presente': ['🎁'],
  'promocao': ['🏷️', '📢', '🔥'],
  'oferta': ['🏷️', '💰'],
  'desconto': ['💰', '💸'],
  'etiqueta': ['🏷️'],
  'estrela': ['⭐', '✨', '🌟'],
  'favorito': ['❤️', '⭐'],
  'coracao': ['❤️', '💕', '💖'],
  'fogo': ['🔥'],
  'quente': ['🔥'],
  'novo': ['✨', '🆕'],
  'festa': ['🎉', '🎊'],
  'comemorar': ['🎉'],
  'diamante': ['💎'],
  'joia': ['💎'],
  'alvo': ['🎯'],
  'meta': ['🎯'],
  
  // Negócios/Comércio
  'telefone': ['📱', '☎️'],
  'celular': ['📱'],
  'mensagem': ['💬', '📩'],
  'whatsapp': ['💬'],
  'chat': ['💬'],
  'pix': ['💰', '💳'],
  'dinheiro': ['💵', '💰', '💸'],
  'cartao': ['💳'],
  'pagamento': ['💳', '💰'],
  'banco': ['🏦'],
  'relogio': ['⏰', '🕐'],
  'tempo': ['⏰', '⏱️'],
  'horario': ['🕐'],
  'casa': ['🏠', '🏡'],
  'loja': ['🏪', '🛍️'],
  'mercado': ['🏪'],
  'restaurante': ['🍽️', '🍴'],
  'garfo': ['🍴'],
  'faca': ['🔪'],
  'prato': ['🍽️'],
  'talher': ['🍴'],
  'cozinha': ['👨‍🍳', '🍳'],
  'chef': ['👨‍🍳', '👩‍🍳'],
  
  // Outros
  'caminhao': ['🚚'],
  'carro': ['🚗'],
  'moto': ['🏍️'],
  'bicicleta': ['🚲'],
  'aviao': ['✈️'],
  'foguete': ['🚀'],
  'musica': ['🎵', '🎶'],
  'som': ['🔊'],
  'livro': ['📚', '📖'],
  'estudo': ['📚'],
  'escola': ['🏫'],
  'computador': ['💻'],
  'notebook': ['💻'],
  'impressora': ['🖨️'],
  'camera': ['📷'],
  'foto': ['📷'],
  'video': ['📹'],
  'tv': ['📺'],
  'radio': ['📻'],
  'lampada': ['💡'],
  'ideia': ['💡'],
  'chave': ['🔑'],
  'cadeado': ['🔒'],
  'ferramenta': ['🔧', '🛠️'],
  'martelo': ['🔨'],
  'email': ['📧'],
  'carta': ['✉️'],
  'calendario': ['📅'],
  'grafico': ['📊', '📈'],
  'check': ['✅'],
  'certo': ['✅'],
  'errado': ['❌'],
  'atencao': ['⚠️'],
  'aviso': ['⚠️'],
  'proibido': ['🚫'],
  'pergunta': ['❓'],
  'informacao': ['ℹ️'],
  'seta': ['➡️', '⬅️', '⬆️', '⬇️'],
  'mais': ['➕'],
  'menos': ['➖'],
  'numero': ['🔢'],
  'letra': ['🔤'],
  'ok': ['👍', '👌'],
  'legal': ['👍'],
  'palmas': ['👏'],
  'maos': ['🙌'],
  'rosto': ['😀', '😊'],
  'feliz': ['😀', '😊', '😄'],
  'triste': ['😢', '😭'],
  'bravo': ['😠', '😡'],
  'surpreso': ['😮', '😲'],
  'pensando': ['🤔'],
  'sol': ['☀️', '🌞'],
  'lua': ['🌙'],
  'nuvem': ['☁️'],
  'chuva': ['🌧️'],
  'raio': ['⚡'],
  'neve': ['❄️'],
  'flor': ['🌸', '🌺', '🌻'],
  'arvore': ['🌳', '🌲'],
  'planta': ['🌱'],
  'cachorro': ['🐕', '🐶'],
  'gato': ['🐈', '🐱'],
  'passaro': ['🐦'],
  'borboleta': ['🦋'],
};

// Quick suggestions for food/commerce stores
const QUICK_SUGGESTIONS = [
  '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥗', '🥘', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🍤', '🍙', '🍚', '🍥',
  '🥤', '🧃', '🧋', '☕', '🍵', '🫖', '🍺', '🍻', '🍷', '🍸', '🍹', '🧉', '🥛', '🍶',
  '🍰', '🎂', '🧁', '🍮', '🍫', '🍬', '🍭', '🍩', '🍪', '🍨', '🍧', '🍦',
  '🍎', '🍊', '🍋', '🍇', '🍓', '🥝', '🥥', '🥑', '🥦', '🥕', '🌽', '🥬',
  '🥩', '🍖', '🍗', '🥓', '🍳', '🥚', '🧀', '🌶️',
  '🛒', '📦', '🎁', '⭐', '✨', '💰', '🔥', '❤️', '👍', '🏷️', '📢', '🎉', '📁', '🛍️', '💎', '🎯'
];

// Normalize text for search (remove accents)
const normalizeText = (text: string) => {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export const EmojiPickerInput = ({ value, onChange, label }: EmojiPickerInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);

  // Search emojis by Portuguese terms
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    const term = normalizeText(searchTerm);
    const results: string[] = [];
    
    Object.entries(EMOJI_SEARCH_MAP).forEach(([key, emojis]) => {
      if (normalizeText(key).includes(term)) {
        emojis.forEach(e => {
          if (!results.includes(e)) results.push(e);
        });
      }
    });
    
    setSearchResults(results);
  }, [searchTerm]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onChange(emojiData.emoji);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleQuickSelect = (emoji: string) => {
    onChange(emoji);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setSearchTerm('');
      }}>
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
          {/* Search in Portuguese */}
          <div className="p-3 border-b">
            <Input
              placeholder="Pesquisar emoji em português..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2"
              autoFocus
            />
            
            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
                {searchResults.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    className="w-9 h-9 flex items-center justify-center text-xl hover:bg-accent rounded-md transition-colors"
                    onClick={() => handleQuickSelect(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            
            {/* No results message */}
            {searchTerm && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">
                Nenhum resultado. Tente o picker abaixo (inglês).
              </p>
            )}
          </div>

          {/* Quick suggestions (when not searching) */}
          {!searchTerm && (
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
          )}

          {/* EmojiPicker with Portuguese categories */}
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.AUTO}
            width="100%"
            height={300}
            categories={CATEGORIES_PT}
            searchPlaceHolder="Pesquisar (inglês)..."
            previewConfig={{ showPreview: false }}
            lazyLoadEmojis={true}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

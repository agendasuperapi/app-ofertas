import { useState, useEffect } from 'react';
import EmojiPicker, { EmojiClickData, Theme, Categories } from 'emoji-picker-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  ResponsiveDialog, 
  ResponsiveDialogContent, 
  ResponsiveDialogHeader, 
  ResponsiveDialogTitle,
  ResponsiveDialogDescription 
} from '@/components/ui/responsive-dialog';

interface EmojiPickerInputProps {
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
  categoryName?: string;
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

// Mapa de busca em português E inglês (chaves únicas)
const EMOJI_SEARCH_MAP: { [key: string]: string[] } = {
  // Categorias (PT + EN)
  'rostos': ['😀', '😊', '😄', '😁', '🥰', '😎', '🤔', '😢', '😡', '🤗'],
  'pessoas': ['👨', '👩', '👶', '👴', '👵', '👨‍👩‍👧', '🧑‍💼', '👨‍🍳', '👩‍🎤', '🧑‍🔧'],
  'faces': ['😀', '😊', '😄', '😁', '🥰', '😎', '🤔', '😢', '😡', '🤗'],
  'smileys': ['😀', '😊', '😄', '😁', '🥰', '😎', '🤔', '😢', '😡', '🤗'],
  'people': ['👨', '👩', '👶', '👴', '👵', '👨‍👩‍👧', '🧑‍💼', '👨‍🍳', '👩‍🎤', '🧑‍🔧'],
  'animais': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵'],
  'animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵'],
  'natureza': ['🌸', '🌺', '🌻', '🌹', '🌷', '🌳', '🌲', '🌴', '🌵', '🍀', '🍁', '🍂', '☀️', '🌙', '⭐'],
  'nature': ['🌸', '🌺', '🌻', '🌹', '🌷', '🌳', '🌲', '🌴', '🌵', '🍀', '🍁', '🍂', '☀️', '🌙', '⭐'],
  'comida': ['🍔', '🍕', '🍟', '🌭', '🥪', '🍣', '🍜', '🍝', '🥗', '🍖', '🍗', '🥩', '🍳', '🥚', '🧀'],
  'food': ['🍔', '🍕', '🍟', '🌭', '🥪', '🍣', '🍜', '🍝', '🥗', '🍖', '🍗', '🥩', '🍳', '🥚', '🧀'],
  'bebida': ['☕', '🍵', '🥤', '🧃', '🍺', '🍻', '🍷', '🍸', '🍹', '🥛', '🧉', '🍾'],
  'bebidas': ['☕', '🍵', '🥤', '🧃', '🍺', '🍻', '🍷', '🍸', '🍹', '🥛', '🧉', '🍾'],
  'drinks': ['☕', '🍵', '🥤', '🧃', '🍺', '🍻', '🍷', '🍸', '🍹', '🥛', '🧉', '🍾'],
  'viagens': ['✈️', '🚗', '🚕', '🚌', '🚂', '🛳️', '🏖️', '🏝️', '🗼', '🗽', '🏰', '⛩️'],
  'lugares': ['🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '🏪', '🏫', '⛪', '🕌', '🏰', '🗼'],
  'travel': ['✈️', '🚗', '🚕', '🚌', '🚂', '🛳️', '🏖️', '🏝️', '🗼', '🗽', '🏰', '⛩️'],
  'places': ['🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '🏪', '🏫', '⛪', '🕌', '🏰', '🗼'],
  'atividades': ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎮', '🎯', '🎲', '🎨', '🎭', '🎬'],
  'activities': ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎮', '🎯', '🎲', '🎨', '🎭', '🎬'],
  'esportes': ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏊', '🚴', '🏃', '⛷️', '🏂', '🏌️'],
  'sports': ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏊', '🚴', '🏃', '⛷️', '🏂', '🏌️'],
  'objetos': ['📱', '💻', '⌚', '📷', '🔦', '💡', '🔧', '🔨', '⚙️', '🔑', '📦', '✉️'],
  'objects': ['📱', '💻', '⌚', '📷', '🔦', '💡', '🔧', '🔨', '⚙️', '🔑', '📦', '✉️'],
  'simbolos': ['❤️', '💛', '💚', '💙', '💜', '✅', '❌', '⚠️', '🚫', '♻️', '✨', '💯'],
  'symbols': ['❤️', '💛', '💚', '💙', '💜', '✅', '❌', '⚠️', '🚫', '♻️', '✨', '💯'],
  'bandeiras': ['🇧🇷', '🇺🇸', '🇦🇷', '🇵🇹', '🇪🇸', '🇫🇷', '🇮🇹', '🇩🇪', '🇬🇧', '🇯🇵', '🇨🇳', '🏳️'],
  'flags': ['🇧🇷', '🇺🇸', '🇦🇷', '🇵🇹', '🇪🇸', '🇫🇷', '🇮🇹', '🇩🇪', '🇬🇧', '🇯🇵', '🇨🇳', '🏳️'],
  
  // Comida - Lanches (PT + EN)
  'hamburguer': ['🍔'], 'hamburger': ['🍔'], 'burger': ['🍔'],
  'lanche': ['🍔', '🥪', '🌭'], 'snack': ['🍔', '🥪', '🌭'],
  'batata': ['🍟', '🥔'], 'potato': ['🍟', '🥔'], 'fries': ['🍟'], 'batata frita': ['🍟'], 'french fries': ['🍟'],
  'pizza': ['🍕'],
  'cachorro quente': ['🌭'], 'hot dog': ['🌭'], 'hotdog': ['🌭'],
  'sanduiche': ['🥪'], 'sandwich': ['🥪'], 'sanduba': ['🥪'],
  'taco': ['🌮'], 'burrito': ['🌯'], 'wrap': ['🌯'],
  'falafel': ['🧆'],
  'pao': ['🍞', '🥖', '🥯'], 'bread': ['🍞', '🥖', '🥯'],
  'baguete': ['🥖'], 'baguette': ['🥖'],
  'croissant': ['🥐'], 'pretzel': ['🥨'], 'bagel': ['🥯'],
  
  // Comida - Refeições (PT + EN)
  'salada': ['🥗'], 'salad': ['🥗'],
  'arroz': ['🍚', '🍙'], 'rice': ['🍚', '🍙'],
  'macarrao': ['🍝'], 'massa': ['🍝'], 'espaguete': ['🍝'], 'spaghetti': ['🍝'], 'noodles': ['🍝', '🍜'],
  'sopa': ['🍲'], 'soup': ['🍲'], 'caldo': ['🍲'], 'stew': ['🍲'],
  'ramen': ['🍜'], 'lamen': ['🍜'],
  'sushi': ['🍣'], 'peixe': ['🐟', '🍣', '🐠'], 'fish': ['🐟', '🍣', '🐠'],
  'camarao': ['🍤', '🦐'], 'shrimp': ['🍤', '🦐'], 'prawn': ['🍤', '🦐'],
  'lagosta': ['🦞'], 'lobster': ['🦞'],
  'caranguejo': ['🦀'], 'crab': ['🦀'],
  'lula': ['🦑'], 'squid': ['🦑'], 'polvo': ['🐙'], 'octopus': ['🐙'],
  'ostra': ['🦪'], 'oyster': ['🦪'],
  'curry': ['🍛'], 'paella': ['🥘'], 'fondue': ['🫕'],
  'empanada': ['🥟'], 'gyoza': ['🥟'], 'dumpling': ['🥟'],
  
  // Carnes (PT + EN)
  'carne': ['🥩', '🍖'], 'meat': ['🥩', '🍖'], 'steak': ['🥩'],
  'churrasco': ['🥩', '🍖'], 'bbq': ['🥩', '🍖'], 'barbecue': ['🥩', '🍖'],
  'costela': ['🍖'], 'ribs': ['🍖'],
  'frango': ['🍗', '🐔'], 'chicken': ['🍗', '🐔'],
  'bacon': ['🥓'], 'linguica': ['🌭'], 'sausage': ['🌭'], 'salsicha': ['🌭'],
  'presunto': ['🥓'], 'ham': ['🥓'],
  'peru': ['🦃'], 'turkey': ['🦃'],
  
  // Ovos e laticínios (PT + EN)
  'ovo': ['🥚', '🍳'], 'egg': ['🥚', '🍳'], 'eggs': ['🥚', '🍳'],
  'omelete': ['🍳'], 'omelette': ['🍳'],
  'queijo': ['🧀'], 'cheese': ['🧀'],
  'manteiga': ['🧈'], 'butter': ['🧈'],
  
  // Bebidas (PT + EN)
  'refrigerante': ['🥤'], 'soda': ['🥤'], 'soft drink': ['🥤'],
  'suco': ['🧃', '🥤'], 'juice': ['🧃', '🥤'],
  'cafe': ['☕'], 'coffee': ['☕'], 'cappuccino': ['☕'], 'espresso': ['☕'],
  'cha': ['🍵', '🫖'], 'tea': ['🍵', '🫖'],
  'mate': ['🧉'], 'chimarrao': ['🧉'],
  'cerveja': ['🍺', '🍻'], 'beer': ['🍺', '🍻'], 'chopp': ['🍺'],
  'vinho': ['🍷'], 'wine': ['🍷'],
  'champagne': ['🍾'], 'espumante': ['🍾'],
  'drink': ['🍸', '🍹'], 'cocktail': ['🍹'], 'coquetel': ['🍹'], 'caipirinha': ['🍹'], 'margarita': ['🍹'],
  'whisky': ['🥃'], 'whiskey': ['🥃'], 'sake': ['🍶'],
  'agua': ['💧', '🚰', '🧊'], 'water': ['💧', '🚰', '🧊'],
  'leite': ['🥛'], 'milk': ['🥛'],
  'milkshake': ['🥤'], 'smoothie': ['🧋'], 'bubble tea': ['🧋'],
  
  // Sobremesas (PT + EN)
  'bolo': ['🎂', '🍰'], 'cake': ['🎂', '🍰'],
  'torta': ['🥧', '🍰'], 'pie': ['🥧'],
  'cupcake': ['🧁'], 'pudim': ['🍮'], 'pudding': ['🍮'], 'flan': ['🍮'],
  'chocolate': ['🍫'],
  'doce': ['🍬', '🍭', '🍫'], 'candy': ['🍬', '🍭'], 'sweet': ['🍬', '🍭', '🍫'],
  'bala': ['🍬'], 'pirulito': ['🍭'], 'lollipop': ['🍭'],
  'rosquinha': ['🍩'], 'donut': ['🍩'], 'doughnut': ['🍩'],
  'biscoito': ['🍪'], 'cookie': ['🍪'], 'cookies': ['🍪'],
  'sorvete': ['🍦', '🍨', '🍧'], 'ice cream': ['🍦', '🍨', '🍧'], 'icecream': ['🍦', '🍨'],
  'picole': ['🍦'], 'popsicle': ['🍦'], 'sundae': ['🍨'], 'raspadinha': ['🍧'],
  'acai': ['🍇'], 'mel': ['🍯'], 'honey': ['🍯'],
  'panqueca': ['🥞'], 'pancake': ['🥞'], 'pancakes': ['🥞'],
  'waffle': ['🧇'], 'waffles': ['🧇'],
  
  // Frutas (PT + EN)
  'fruta': ['🍎', '🍊', '🍇', '🍓'], 'fruit': ['🍎', '🍊', '🍇', '🍓'], 'fruits': ['🍎', '🍊', '🍇', '🍓'],
  'maca': ['🍎', '🍏'], 'apple': ['🍎', '🍏'],
  'laranja': ['🍊'], 'orange': ['🍊'], 'tangerina': ['🍊'],
  'limao': ['🍋'], 'lemon': ['🍋'],
  'uva': ['🍇'], 'grape': ['🍇'], 'grapes': ['🍇'],
  'morango': ['🍓'], 'strawberry': ['🍓'],
  'banana': ['🍌'],
  'melancia': ['🍉'], 'watermelon': ['🍉'],
  'melao': ['🍈'], 'melon': ['🍈'],
  'abacaxi': ['🍍'], 'pineapple': ['🍍'],
  'manga': ['🥭'], 'mango': ['🥭'],
  'coco': ['🥥'], 'coconut': ['🥥'],
  'abacate': ['🥑'], 'avocado': ['🥑'],
  'kiwi': ['🥝'], 'pera': ['🍐'], 'pear': ['🍐'],
  'pessego': ['🍑'], 'peach': ['🍑'],
  'cereja': ['🍒'], 'cherry': ['🍒'],
  'amora': ['🫐'], 'mirtilo': ['🫐'], 'blueberry': ['🫐'],
  'azeitona': ['🫒'], 'olive': ['🫒'],
  
  // Vegetais (PT + EN)
  'vegetal': ['🥦', '🥕', '🌽'], 'vegetable': ['🥦', '🥕', '🌽'], 'vegetables': ['🥦', '🥕', '🌽'],
  'verdura': ['🥬', '🥦'], 'greens': ['🥬', '🥦'],
  'legume': ['🥕', '🥔'],
  'brocolis': ['🥦'], 'broccoli': ['🥦'],
  'cenoura': ['🥕'], 'carrot': ['🥕'],
  'milho': ['🌽'], 'corn': ['🌽'],
  'alface': ['🥬'], 'lettuce': ['🥬'], 'couve': ['🥬'],
  'tomate': ['🍅'], 'tomato': ['🍅'],
  'pimenta': ['🌶️', '🫑'], 'pepper': ['🌶️', '🫑'], 'pimentao': ['🫑'],
  'pepino': ['🥒'], 'cucumber': ['🥒'],
  'berinjela': ['🍆'], 'eggplant': ['🍆'],
  'batata doce': ['🍠'], 'sweet potato': ['🍠'],
  'alho': ['🧄'], 'garlic': ['🧄'],
  'cebola': ['🧅'], 'onion': ['🧅'],
  'cogumelo': ['🍄'], 'mushroom': ['🍄'],
  'amendoim': ['🥜'], 'peanut': ['🥜'],
  'castanha': ['🌰'], 'chestnut': ['🌰'], 'nut': ['🌰', '🥜'],
  'feijao': ['🫘'], 'beans': ['🫘'],
  
  // Categorias/E-commerce (PT + EN)
  'categoria': ['📁', '📂'], 'category': ['📁', '📂'],
  'pasta': ['📁', '📂'], 'folder': ['📁', '📂'],
  'arquivo': ['📁'], 'file': ['📁'],
  'carrinho': ['🛒'], 'cart': ['🛒'], 'shopping cart': ['🛒'],
  'compras': ['🛒', '🛍️'], 'shopping': ['🛒', '🛍️'],
  'sacola': ['🛍️'], 'bag': ['🛍️'],
  'pacote': ['📦'], 'package': ['📦'], 'caixa': ['📦'], 'box': ['📦'],
  'entrega': ['📦', '🚚'], 'delivery': ['🚚', '📦'],
  'presente': ['🎁'], 'gift': ['🎁'],
  'promocao': ['🏷️', '📢', '🔥'], 'sale': ['🏷️', '💰'], 'promo': ['🏷️', '📢'],
  'oferta': ['🏷️', '💰'], 'offer': ['🏷️', '💰'],
  'desconto': ['💰', '💸'], 'discount': ['💰', '💸'],
  'etiqueta': ['🏷️'], 'tag': ['🏷️'], 'label': ['🏷️'],
  'estrela': ['⭐', '✨', '🌟'], 'star': ['⭐', '✨', '🌟'],
  'favorito': ['❤️', '⭐'], 'favorite': ['❤️', '⭐'],
  'coracao': ['❤️', '💕', '💖'], 'heart': ['❤️', '💕', '💖'],
  'fogo': ['🔥'], 'fire': ['🔥'], 'hot': ['🔥'], 'quente': ['🔥'],
  'novo': ['✨', '🆕'], 'new': ['✨', '🆕'],
  'festa': ['🎉', '🎊'], 'party': ['🎉', '🎊'], 'comemorar': ['🎉'], 'celebrate': ['🎉'],
  'diamante': ['💎'], 'diamond': ['💎'], 'joia': ['💎'], 'gem': ['💎'],
  'alvo': ['🎯'], 'target': ['🎯'], 'meta': ['🎯'], 'goal': ['🎯'],
  
  // Negócios/Comércio (PT + EN)
  'telefone': ['📱', '☎️'], 'phone': ['📱', '☎️'], 'celular': ['📱'], 'mobile': ['📱'],
  'mensagem': ['💬', '📩'], 'message': ['💬', '📩'],
  'whatsapp': ['💬'], 'chat': ['💬'],
  'pix': ['💰', '💳'], 'dinheiro': ['💵', '💰', '💸'], 'money': ['💵', '💰', '💸'], 'cash': ['💵'],
  'cartao': ['💳'], 'card': ['💳'], 'credit card': ['💳'],
  'pagamento': ['💳', '💰'], 'payment': ['💳', '💰'],
  'banco': ['🏦'], 'bank': ['🏦'],
  'relogio': ['⏰', '🕐'], 'clock': ['⏰', '🕐'], 'watch': ['⌚'],
  'tempo': ['⏰', '⏱️'], 'time': ['⏰', '⏱️'], 'horario': ['🕐'],
  'casa': ['🏠', '🏡'], 'home': ['🏠', '🏡'], 'house': ['🏠', '🏡'],
  'loja': ['🏪', '🛍️'], 'store': ['🏪', '🛍️'], 'shop': ['🏪', '🛍️'],
  'mercado': ['🏪'], 'market': ['🏪'],
  'restaurante': ['🍽️', '🍴'], 'restaurant': ['🍽️', '🍴'],
  'garfo': ['🍴'], 'fork': ['🍴'], 'faca': ['🔪'], 'knife': ['🔪'],
  'prato': ['🍽️'], 'plate': ['🍽️'], 'dish': ['🍽️'],
  'talher': ['🍴'], 'cutlery': ['🍴'],
  'cozinha': ['👨‍🍳', '🍳'], 'kitchen': ['👨‍🍳', '🍳'],
  'chef': ['👨‍🍳', '👩‍🍳'], 'cook': ['👨‍🍳', '👩‍🍳'],
  
  // Transportes e outros (PT + EN)
  'caminhao': ['🚚'], 'truck': ['🚚'],
  'carro': ['🚗'], 'car': ['🚗'],
  'moto': ['🏍️'], 'motorcycle': ['🏍️'],
  'bicicleta': ['🚲'], 'bike': ['🚲'], 'bicycle': ['🚲'],
  'aviao': ['✈️'], 'airplane': ['✈️'], 'plane': ['✈️'],
  'foguete': ['🚀'], 'rocket': ['🚀'],
  'musica': ['🎵', '🎶'], 'music': ['🎵', '🎶'],
  'som': ['🔊'], 'sound': ['🔊'],
  'livro': ['📚', '📖'], 'book': ['📚', '📖'],
  'estudo': ['📚'], 'study': ['📚'],
  'escola': ['🏫'], 'school': ['🏫'],
  'computador': ['💻'], 'computer': ['💻'], 'notebook': ['💻'], 'laptop': ['💻'],
  'impressora': ['🖨️'], 'printer': ['🖨️'],
  'camera': ['📷'], 'foto': ['📷'], 'photo': ['📷'],
  'video': ['📹'], 'tv': ['📺'], 'television': ['📺'],
  'radio': ['📻'],
  'lampada': ['💡'], 'lamp': ['💡'], 'light': ['💡'], 'bulb': ['💡'],
  'ideia': ['💡'], 'idea': ['💡'],
  'chave': ['🔑'], 'key': ['🔑'],
  'cadeado': ['🔒'], 'lock': ['🔒'],
  'ferramenta': ['🔧', '🛠️'], 'tool': ['🔧', '🛠️'], 'tools': ['🔧', '🛠️'],
  'martelo': ['🔨'], 'hammer': ['🔨'],
  'email': ['📧'], 'carta': ['✉️'], 'letter': ['✉️'], 'mail': ['📧', '✉️'],
  'calendario': ['📅'], 'calendar': ['📅'],
  'grafico': ['📊', '📈'], 'chart': ['📊', '📈'], 'graph': ['📊', '📈'],
  'check': ['✅'], 'certo': ['✅'], 'correct': ['✅'], 'yes': ['✅'],
  'errado': ['❌'], 'wrong': ['❌'], 'no': ['❌'],
  'atencao': ['⚠️'], 'warning': ['⚠️'], 'aviso': ['⚠️'],
  'proibido': ['🚫'], 'forbidden': ['🚫'], 'prohibited': ['🚫'],
  'pergunta': ['❓'], 'question': ['❓'],
  'informacao': ['ℹ️'], 'info': ['ℹ️'], 'information': ['ℹ️'],
  'seta': ['➡️', '⬅️', '⬆️', '⬇️'], 'arrow': ['➡️', '⬅️', '⬆️', '⬇️'],
  'mais': ['➕'], 'plus': ['➕'], 'add': ['➕'],
  'menos': ['➖'], 'minus': ['➖'],
  'numero': ['🔢'], 'number': ['🔢'],
  'letra': ['🔤'], 'letters': ['🔤'],
  'ok': ['👍', '👌'], 'legal': ['👍'], 'good': ['👍'], 'like': ['👍'],
  'palmas': ['👏'], 'clap': ['👏'], 'applause': ['👏'],
  'maos': ['🙌'], 'hands': ['🙌'],
  'rosto': ['😀', '😊'], 'face': ['😀', '😊'],
  'feliz': ['😀', '😊', '😄'], 'happy': ['😀', '😊', '😄'], 'smile': ['😀', '😊'],
  'triste': ['😢', '😭'], 'sad': ['😢', '😭'], 'cry': ['😢', '😭'],
  'bravo': ['😠', '😡'], 'angry': ['😠', '😡'],
  'surpreso': ['😮', '😲'], 'surprised': ['😮', '😲'],
  'pensando': ['🤔'], 'thinking': ['🤔'],
  'sol': ['☀️', '🌞'], 'sun': ['☀️', '🌞'],
  'lua': ['🌙'], 'moon': ['🌙'],
  'nuvem': ['☁️'], 'cloud': ['☁️'],
  'chuva': ['🌧️'], 'rain': ['🌧️'],
  'raio': ['⚡'], 'lightning': ['⚡'], 'thunder': ['⚡'],
  'neve': ['❄️'], 'snow': ['❄️'],
  'flor': ['🌸', '🌺', '🌻'], 'flower': ['🌸', '🌺', '🌻'],
  'arvore': ['🌳', '🌲'], 'tree': ['🌳', '🌲'],
  'planta': ['🌱'], 'plant': ['🌱'],
  'cachorro': ['🐕', '🐶'], 'dog': ['🐕', '🐶'],
  'gato': ['🐈', '🐱'], 'cat': ['🐈', '🐱'],
  'passaro': ['🐦'], 'bird': ['🐦'],
  'borboleta': ['🦋'], 'butterfly': ['🦋'],
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

export const EmojiPickerInput = ({ value, onChange, label, categoryName }: EmojiPickerInputProps) => {
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
      <Button 
        variant="outline" 
        className="w-full h-14 text-3xl hover:bg-accent flex items-center justify-center"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        {value || '📁'}
      </Button>
      
      <ResponsiveDialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setSearchTerm('');
        }}
      >
        <ResponsiveDialogContent className="max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Escolher Emoji{categoryName ? ` - ${categoryName}` : ''}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Selecione um emoji para a categoria
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="flex flex-col gap-3 mt-4">
            {/* Unified search input - Portuguese and English */}
            <Input
              placeholder="Pesquisar emoji..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />

            {/* Search results */}
            {searchTerm && searchResults.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Resultados ({searchResults.length})
                </Label>
                <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto p-2 bg-accent/30 rounded-lg">
                  {searchResults.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-accent rounded-md transition-colors"
                      onClick={() => handleQuickSelect(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No results message */}
            {searchTerm && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-1">
                Nenhum emoji encontrado para "{searchTerm}"
              </p>
            )}

            {/* Quick suggestions (only when not searching) */}
            {!searchTerm && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Sugestões Rápidas</Label>
                <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto">
                  {QUICK_SUGGESTIONS.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-9 h-9 flex items-center justify-center text-xl hover:bg-accent rounded transition-colors"
                      onClick={() => handleQuickSelect(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* EmojiPicker - native search disabled, only for browsing */}
            <div className="border rounded-lg overflow-hidden">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={Theme.AUTO}
                width="100%"
                height={280}
                categories={CATEGORIES_PT}
                searchDisabled={true}
                previewConfig={{ showPreview: false }}
                lazyLoadEmojis={true}
              />
            </div>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
};

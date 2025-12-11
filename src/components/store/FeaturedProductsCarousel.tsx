import { motion } from "framer-motion";
import { Star, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  promotional_price?: number;
  image_url?: string;
  resolved_image_url?: string;
  category: string;
}

interface FeaturedProductsCarouselProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Helper function to get emoji by category
const getCategoryEmoji = (category: string): string => {
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('hamburguer') || categoryLower.includes('burger') || categoryLower.includes('lanche')) return '🍔';
  if (categoryLower.includes('pizza')) return '🍕';
  if (categoryLower.includes('porção') || categoryLower.includes('porcao') || categoryLower.includes('batata') || categoryLower.includes('frita')) return '🍟';
  if (categoryLower.includes('bebida') || categoryLower.includes('drink') || categoryLower.includes('refrigerante')) return '🥤';
  if (categoryLower.includes('sobremesa') || categoryLower.includes('doce')) return '🍰';
  if (categoryLower.includes('churrasco') || categoryLower.includes('carne')) return '🥩';
  if (categoryLower.includes('salada') || categoryLower.includes('veggie') || categoryLower.includes('vegetariano')) return '🥗';
  if (categoryLower.includes('sushi') || categoryLower.includes('japonês') || categoryLower.includes('japones')) return '🍣';
  return '🍽️';
};

export const FeaturedProductsCarousel = ({
  products,
  onAddToCart,
  onProductClick,
}: FeaturedProductsCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Handler for image load errors
  const handleImageError = (productId: string) => {
    setFailedImages(prev => new Set(prev).add(productId));
  };

  // Auto-play functionality
  useEffect(() => {
    if (!api) return;

    const autoPlayInterval = setInterval(() => {
      api.scrollNext();
    }, 4000); // Rotaciona a cada 4 segundos

    return () => clearInterval(autoPlayInterval);
  }, [api]);

  if (!products || products.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full mb-8"
    >
      {/* Header do Carrossel */}
      <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
        <div className="flex items-center gap-1.5 md:gap-2">
          <Star className="h-4 w-4 md:h-6 md:w-6 fill-yellow-500 text-yellow-500" />
          <h2 className="text-2xl md:text-3xl font-bold gradient-text">
            Destaques
          </h2>
        </div>
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-xs md:text-sm">
          {products.length} {products.length === 1 ? 'produto' : 'produtos'}
        </Badge>
      </div>

      {/* Carrossel */}
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {products.map((product) => {
            const finalPrice = product.promotional_price || product.price;
            const hasPromotion = product.promotional_price && product.promotional_price < product.price;

            return (
              <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/4 xl:basis-1/4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <div
                    className="group relative flex flex-col h-full bg-card rounded-xl border-2 border-yellow-500/30 hover:border-yellow-500 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                    onClick={() => onProductClick(product)}
                  >
                    {/* Badges Container */}
                    <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 z-10 flex flex-row gap-1">
                      <Badge className="bg-yellow-500 text-white border-none shadow-lg w-fit p-1 md:p-1.5">
                        <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-white" />
                      </Badge>
                      {hasPromotion && (
                        <Badge variant="destructive" className="shadow-lg w-fit text-[10px] md:text-xs px-1.5 md:px-2.5 py-0.5">
                          Promoção
                        </Badge>
                      )}
                    </div>

                    {/* Imagem do Produto */}
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-muted/30">
                      {!failedImages.has(product.id) && (product.resolved_image_url || product.image_url) ? (
                        <img
                          src={product.resolved_image_url || product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={() => handleImageError(product.id)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <span className="text-4xl">{getCategoryEmoji(product.category)}</span>
                        </div>
                      )}
                      
                      {/* Gradiente suave */}
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/5 via-transparent to-transparent pointer-events-none" />
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="p-1.5 md:p-3 pb-1 md:pb-1.5 flex flex-col flex-1">
                      {/* Nome do Produto */}
                      <h3 className="font-semibold text-sm md:text-base line-clamp-2 group-hover:text-yellow-600 transition-colors mb-0.5">
                        {product.name}
                      </h3>

                      {/* Descrição - sempre ocupa espaço mesmo quando vazia */}
                      <div className="min-h-[1.75rem] md:min-h-[2.25rem] mb-0.5">
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-1 md:line-clamp-2">
                          {product.description || '\u00A0'}
                        </p>
                      </div>

                      {/* Preço e Botão - colados na descrição, sem rodapé sobrando */}
                      <div className="mt-auto flex items-center justify-between gap-1">
                        <div className="flex flex-col justify-center min-w-0 flex-1">
                          {hasPromotion && (
                            <p className="text-[9px] md:text-xs text-muted-foreground line-through leading-tight">
                              {formatCurrency(product.price)}
                            </p>
                          )}
                          <p
                            className={cn(
                              "font-bold text-sm md:text-lg leading-tight truncate",
                              hasPromotion ? "text-red-500" : "text-primary"
                            )}
                          >
                            {formatCurrency(finalPrice)}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg transition-all duration-200 h-6 md:h-8 px-1.5 md:px-3 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product);
                          }}
                        >
                          <ShoppingCart className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        
        {/* Controles de Navegação */}
        <CarouselPrevious className="left-0 -translate-x-1/2 bg-background shadow-xl border-2 border-yellow-500/30 hover:border-yellow-500" />
        <CarouselNext className="right-0 translate-x-1/2 bg-background shadow-xl border-2 border-yellow-500/30 hover:border-yellow-500" />
      </Carousel>
    </motion.div>
  );
};

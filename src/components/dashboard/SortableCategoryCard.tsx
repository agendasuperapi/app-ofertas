import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FolderTree, GripVertical, Edit, Trash2 } from "lucide-react";

interface SortableCategoryCardProps {
  category: any;
  index: number;
  isReorderMode: boolean;
  hasPermission: (module: string, action: string) => boolean;
  products?: any[];
  onEdit: (category: any) => void;
  onDelete: (categoryId: string) => void;
  onToggleStatus: (categoryId: string, isActive: boolean) => void;
}

export const SortableCategoryCard = ({
  category,
  index,
  isReorderMode,
  hasPermission,
  products = [],
  onEdit,
  onDelete,
  onToggleStatus,
}: SortableCategoryCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const categoryProducts = products.filter(p => p.category === category.name);

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`hover:shadow-lg transition-shadow h-full ${isReorderMode ? 'cursor-move' : ''}`}>
        <CardHeader className="pb-2 sm:pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {isReorderMode && (
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded flex-shrink-0"
                >
                  <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                </div>
              )}
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                <FolderTree className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm sm:text-base lg:text-lg truncate">{category.name}</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {categoryProducts.length} produtos
                </p>
              </div>
            </div>
            <Badge variant={category.is_active ? "default" : "secondary"} className="text-xs flex-shrink-0">
              {category.is_active ? "Ativa" : "Inativa"}
            </Badge>
          </div>
        </CardHeader>
        
        {!isReorderMode && (
          <CardContent className="space-y-2 sm:space-y-3 pt-2 sm:pt-3">
            {hasPermission('categories', 'update') && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => onEdit(category)}
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Editar</span>
                  <span className="sm:hidden">Editar</span>
                </Button>
                {hasPermission('categories', 'delete') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(category.id)}
                    className="hover:border-destructive hover:text-destructive h-8 sm:h-9 px-2 sm:px-3"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                )}
              </div>
            )}
            
            {hasPermission('categories', 'update') && (
              <div className="flex items-center justify-between pt-2 border-t">
                <Label htmlFor={`category-status-${category.id}`} className="text-xs sm:text-sm cursor-pointer">
                  {category.is_active ? "Categoria ativa" : "Categoria inativa"}
                </Label>
                <Switch
                  id={`category-status-${category.id}`}
                  checked={category.is_active}
                  onCheckedChange={(checked) => onToggleStatus(category.id, checked)}
                />
              </div>
            )}
            
            {categoryProducts.length > 0 && (
              <div className="pt-2 sm:pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Produtos nesta categoria:</p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {categoryProducts
                    .slice(0, 3)
                    .map(product => (
                      <Badge key={product.id} variant="outline" className="text-xs truncate max-w-[120px] sm:max-w-none">
                        {product.name}
                      </Badge>
                    ))}
                  {categoryProducts.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{categoryProducts.length - 3} mais
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

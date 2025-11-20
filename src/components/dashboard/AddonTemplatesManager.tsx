import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { addonTemplates, BusinessTemplate } from "@/lib/addonTemplates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Package } from "lucide-react";

interface AddonTemplatesManagerProps {
  storeId: string;
}

export const AddonTemplatesManager = ({ storeId }: AddonTemplatesManagerProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<BusinessTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const handlePreviewTemplate = (template: BusinessTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    setIsApplying(true);
    try {
      // Criar as categorias e adicionais do template
      for (const category of selectedTemplate.categories) {
        // Criar categoria
        const { data: categoryData, error: categoryError } = await supabase
          .from('addon_categories')
          .insert({
            store_id: storeId,
            name: category.name,
            is_active: true,
          })
          .select()
          .single();

        if (categoryError) {
          console.error('Erro ao criar categoria:', categoryError);
          continue;
        }

        // Aqui você pode adicionar lógica para criar adicionais globais se necessário
        // Por enquanto, as categorias são criadas e os adicionais podem ser adicionados manualmente
      }

      toast.success(`Template "${selectedTemplate.name}" aplicado com sucesso!`);
      setPreviewOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Erro ao aplicar template:', error);
      toast.error('Erro ao aplicar template');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Templates de Adicionais</h2>
        <p className="text-muted-foreground">
          Aplique templates pré-configurados de categorias e adicionais para seu tipo de negócio
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {addonTemplates.map((template) => (
          <Card key={template.id} className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="text-4xl">{template.icon}</div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {template.businessType}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{template.description}</p>
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Categorias incluídas:</p>
                <div className="flex flex-wrap gap-1">
                  {template.categories.map((cat, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => handlePreviewTemplate(template)}
                className="w-full"
                variant="outline"
              >
                Ver detalhes
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Preview do Template */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-3xl">{selectedTemplate?.icon}</span>
              <div>
                <div>{selectedTemplate?.name}</div>
                <div className="text-sm font-normal text-muted-foreground">
                  {selectedTemplate?.description}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-6 pr-4">
              {selectedTemplate?.categories.map((category, catIdx) => (
                <div key={catIdx} className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    {category.name}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {category.addons.map((addon, addonIdx) => (
                      <div
                        key={addonIdx}
                        className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border border-border"
                      >
                        <span className="text-sm">{addon.name}</span>
                        <span className="text-sm font-medium text-primary">
                          {addon.price === 0 ? 'Grátis' : `R$ ${addon.price.toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApplyTemplate}
              disabled={isApplying}
              className="w-full sm:w-auto"
            >
              {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aplicar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, FolderTree, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAddonCategories } from "@/hooks/useAddonCategories";
import { Badge } from "@/components/ui/badge";
import { useEmployeeAccess } from "@/hooks/useEmployeeAccess";

interface AddonCategoriesManagerProps {
  storeId: string;
}

export const AddonCategoriesManager = ({ storeId }: AddonCategoriesManagerProps) => {
  const { categories, loading, addCategory, updateCategory, toggleCategoryStatus, deleteCategory } = useAddonCategories(storeId);
  const employeeAccess = useEmployeeAccess();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
  });

  const hasPermission = (action: 'create' | 'update' | 'delete') => {
    if (!employeeAccess.isEmployee) return true;
    const perms = employeeAccess.permissions?.products;
    if (!perms) return false;
    return (perms as any)[action] === true;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    try {
      if (editingId) {
        await updateCategory(editingId, { name: formData.name });
        setEditingId(null);
      } else {
        await addCategory(formData.name);
      }
      
      setFormData({ name: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleEdit = (category: any) => {
    if (!hasPermission('update')) return;
    
    setEditingId(category.id);
    setFormData({
      name: category.name,
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '' });
  };

  const handleDelete = async (categoryId: string) => {
    if (!hasPermission('delete')) return;
    
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      await deleteCategory(categoryId);
    }
  };

  const handleToggleStatus = async (categoryId: string, currentStatus: boolean) => {
    if (!hasPermission('update')) return;
    await toggleCategoryStatus(categoryId, !currentStatus);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Categorias de Adicionais</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="w-5 h-5" />
              Categorias de Adicionais
            </CardTitle>
            <CardDescription>Organize os adicionais em categorias para melhor gestão</CardDescription>
          </div>
          {!isAdding && hasPermission('create') && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label>Nome da Categoria</Label>
              <Input
                placeholder="Ex: Carnes, Queijos, Molhos..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="flex-1">
                {editingId ? 'Atualizar' : 'Adicionar'}
              </Button>
              <Button onClick={handleCancel} variant="outline">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma categoria cadastrada</p>
            <p className="text-sm">Crie categorias para organizar seus adicionais</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FolderTree className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{category.name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={category.is_active ? "default" : "secondary"}>
                    {category.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                  
                  {hasPermission('update') && (
                    <Switch
                      checked={category.is_active}
                      onCheckedChange={() => handleToggleStatus(category.id, category.is_active)}
                    />
                  )}
                  
                  {hasPermission('update') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {hasPermission('delete') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

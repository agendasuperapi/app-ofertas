import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Clock, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AffiliateMaturitySettingsProps {
  storeId: string;
}

export function AffiliateMaturitySettings({ storeId }: AffiliateMaturitySettingsProps) {
  const [maturityDays, setMaturityDays] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('affiliate_commission_maturity_days')
          .eq('id', storeId)
          .single();

        if (data && !error) {
          setMaturityDays(data.affiliate_commission_maturity_days ?? 7);
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        setLoading(false);
      }
    };

    if (storeId) {
      fetchSettings();
    }
  }, [storeId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ affiliate_commission_maturity_days: maturityDays })
        .eq('id', storeId);

      if (error) throw error;

      toast({
        title: 'Configuração salva!',
        description: `Comissões serão liberadas ${maturityDays} dias após a entrega.`,
      });
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a configuração.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Carência para Liberação de Saque
        </CardTitle>
        <CardDescription className="text-xs">
          Defina quantos dias após a entrega do pedido a comissão ficará disponível para saque pelo afiliado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="maturity-days">Dias de carência</Label>
            <Input
              id="maturity-days"
              type="number"
              min={0}
              max={90}
              value={maturityDays}
              onChange={(e) => setMaturityDays(Math.max(0, Math.min(90, parseInt(e.target.value) || 0)))}
              className="w-full"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="shrink-0">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {maturityDays === 0 
            ? 'A comissão será liberada imediatamente após a entrega.'
            : `A comissão será liberada ${maturityDays} dia${maturityDays !== 1 ? 's' : ''} após a entrega do pedido.`}
        </p>
      </CardContent>
    </Card>
  );
}

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CupomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCupomAplicado: (cupom: any) => void;
}

export function CupomModal({ open, onOpenChange, onCupomAplicado }: CupomModalProps) {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConfirmar = async () => {
    if (!codigo.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, informe um código',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('codigos_promocionais')
        .select('*')
        .eq('codigo', codigo.toUpperCase())
        .eq('ativo', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: 'Código inválido',
          description: 'O código informado não existe ou está inativo',
          variant: 'destructive',
        });
        return;
      }

      onCupomAplicado(data);
      toast({
        title: 'Cupom aplicado!',
        description: 'Os descontos foram aplicados à simulação',
      });
      onOpenChange(false);
      setCodigo('');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aplicar Cupom de Desconto</DialogTitle>
          <DialogDescription>
            Informe o código do cupom para aplicar descontos especiais
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codigo-cupom">Código do Cupom</Label>
            <Input
              id="codigo-cupom"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ex: PROMO2024"
              className="uppercase"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmar} disabled={loading}>
              {loading ? 'Verificando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

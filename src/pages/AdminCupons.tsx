import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface CodigoPromocional {
  id: string;
  codigo: string;
  descricao: string;
  ativo: boolean;
  desconto_treinamento_tipo: 'percentual' | 'valor' | 'nenhum';
  desconto_treinamento_valor: number;
  desconto_mensalidade_tipo: 'percentual' | 'valor' | 'nenhum';
  desconto_mensalidade_valor: number;
  desconto_mensalidade_meses: number | null;
}

export default function AdminCupons() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCodigo, setEditingCodigo] = useState<CodigoPromocional | null>(null);
  
  const [formData, setFormData] = useState<{
    codigo: string;
    descricao: string;
    ativo: boolean;
    desconto_treinamento_tipo: 'percentual' | 'valor' | 'nenhum';
    desconto_treinamento_valor: number;
    desconto_mensalidade_tipo: 'percentual' | 'valor' | 'nenhum';
    desconto_mensalidade_valor: number;
    desconto_mensalidade_meses: number | null;
  }>({
    codigo: '',
    descricao: '',
    ativo: true,
    desconto_treinamento_tipo: 'nenhum',
    desconto_treinamento_valor: 0,
    desconto_mensalidade_tipo: 'nenhum',
    desconto_mensalidade_valor: 0,
    desconto_mensalidade_meses: null,
  });

  const { data: codigos = [] } = useQuery({
    queryKey: ['codigos-promocionais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('codigos_promocionais')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CodigoPromocional[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingCodigo) {
        const { error } = await supabase
          .from('codigos_promocionais')
          .update(data)
          .eq('id', editingCodigo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('codigos_promocionais')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codigos-promocionais'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: 'Sucesso',
        description: editingCodigo ? 'Código atualizado' : 'Código criado',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('codigos_promocionais')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codigos-promocionais'] });
      toast({ title: 'Código removido' });
    },
  });

  const resetForm = () => {
    setFormData({
      codigo: '',
      descricao: '',
      ativo: true,
      desconto_treinamento_tipo: 'nenhum',
      desconto_treinamento_valor: 0,
      desconto_mensalidade_tipo: 'nenhum',
      desconto_mensalidade_valor: 0,
      desconto_mensalidade_meses: null,
    });
    setEditingCodigo(null);
  };

  const handleEdit = (codigo: CodigoPromocional) => {
    setEditingCodigo(codigo);
    setFormData({
      codigo: codigo.codigo,
      descricao: codigo.descricao || '',
      ativo: codigo.ativo,
      desconto_treinamento_tipo: codigo.desconto_treinamento_tipo,
      desconto_treinamento_valor: codigo.desconto_treinamento_valor,
      desconto_mensalidade_tipo: codigo.desconto_mensalidade_tipo,
      desconto_mensalidade_valor: codigo.desconto_mensalidade_valor,
      desconto_mensalidade_meses: codigo.desconto_mensalidade_meses,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Cupons</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cupom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCodigo ? 'Editar' : 'Criar'} Cupom</DialogTitle>
              <DialogDescription>
                Configure os descontos e condições do cupom
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código do Cupom</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  placeholder="EX: PROMO2024"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição interna do cupom"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
                <Label htmlFor="ativo">Cupom ativo</Label>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Desconto no Treinamento</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Desconto</Label>
                    <Select
                      value={formData.desconto_treinamento_tipo}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, desconto_treinamento_tipo: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhum">Nenhum</SelectItem>
                        <SelectItem value="percentual">Percentual (%)</SelectItem>
                        <SelectItem value="valor">Valor (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.desconto_treinamento_tipo !== 'nenhum' && (
                    <div className="space-y-2">
                      <Label>Valor</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.desconto_treinamento_valor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            desconto_treinamento_valor: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Desconto na Mensalidade</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Desconto</Label>
                    <Select
                      value={formData.desconto_mensalidade_tipo}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, desconto_mensalidade_tipo: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhum">Nenhum</SelectItem>
                        <SelectItem value="percentual">Percentual (%)</SelectItem>
                        <SelectItem value="valor">Valor (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.desconto_mensalidade_tipo !== 'nenhum' && (
                    <div className="space-y-2">
                      <Label>Valor</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.desconto_mensalidade_valor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            desconto_mensalidade_valor: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
                {formData.desconto_mensalidade_tipo !== 'nenhum' && (
                  <div className="space-y-2 mt-4">
                    <Label>Duração do Desconto (meses)</Label>
                    <Input
                      type="number"
                      placeholder="Deixe vazio para desconto permanente"
                      value={formData.desconto_mensalidade_meses || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          desconto_mensalidade_meses: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Desconto Treinamento</TableHead>
            <TableHead>Desconto Mensalidade</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {codigos.map((codigo) => (
            <TableRow key={codigo.id}>
              <TableCell className="font-mono font-bold">{codigo.codigo}</TableCell>
              <TableCell>{codigo.descricao}</TableCell>
              <TableCell>
                <span className={codigo.ativo ? 'text-green-600' : 'text-gray-400'}>
                  {codigo.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </TableCell>
              <TableCell>
                {codigo.desconto_treinamento_tipo === 'nenhum'
                  ? '-'
                  : `${codigo.desconto_treinamento_valor}${
                      codigo.desconto_treinamento_tipo === 'percentual' ? '%' : ' R$'
                    }`}
              </TableCell>
              <TableCell>
                {codigo.desconto_mensalidade_tipo === 'nenhum'
                  ? '-'
                  : `${codigo.desconto_mensalidade_valor}${
                      codigo.desconto_mensalidade_tipo === 'percentual' ? '%' : ' R$'
                    }${
                      codigo.desconto_mensalidade_meses
                        ? ` (${codigo.desconto_mensalidade_meses} meses)`
                        : ''
                    }`}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(codigo)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(codigo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

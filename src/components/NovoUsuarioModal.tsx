import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';

type NovoUsuarioModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function NovoUsuarioModal({ open, onOpenChange, onSuccess }: NovoUsuarioModalProps) {
  const { toast } = useToast();
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novoPapel, setNovoPapel] = useState<'admin' | 'usuario'>('usuario');
  const [novaEquipe, setNovaEquipe] = useState('');
  const [teams, setTeams] = useState<any[]>([]);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTeams();
    }
  }, [open]);

  const fetchTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .order('nome');
    
    if (data) setTeams(data);
  };

  const criarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setCriando(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: novoEmail,
        password: novaSenha,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Atualizar profile com team_id
        if (novaEquipe) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ team_id: novaEquipe })
            .eq('id', data.user.id);

          if (profileError) {
            console.error('Erro ao atualizar profile:', profileError);
          }
        }

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: data.user.id, role: novoPapel });

        if (roleError) throw roleError;

        toast({
          title: 'Usuário criado!',
          description: `${novoEmail} foi criado como ${novoPapel}.`,
        });

        setNovoEmail('');
        setNovaSenha('');
        setNovoPapel('usuario');
        setNovaEquipe('');
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCriando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={criarUsuario}>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo usuário e defina seu perfil de acesso
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="modal-email">Email</Label>
              <Input
                id="modal-email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-senha">Senha</Label>
              <Input
                id="modal-senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-papel">Perfil de Acesso</Label>
              <Select value={novoPapel} onValueChange={(v) => setNovoPapel(v as 'admin' | 'usuario')}>
                <SelectTrigger id="modal-papel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usuario">Usuário Padrão</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-equipe">Equipe</Label>
              <Select value={novaEquipe} onValueChange={setNovaEquipe}>
                <SelectTrigger id="modal-equipe">
                  <SelectValue placeholder="Selecione uma equipe (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criando}>
              <Plus className="h-4 w-4 mr-2" />
              {criando ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

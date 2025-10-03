import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type UserWithRole = {
  id: string;
  email: string;
  role: 'admin' | 'usuario' | null;
  created_at: string;
};

export default function AdminUsuarios() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novoPapel, setNovoPapel] = useState<'admin' | 'usuario'>('usuario');
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (!loading && role !== 'admin') {
      navigate('/simulador');
    }
  }, [role, loading, navigate]);

  useEffect(() => {
    if (role === 'admin') {
      carregarUsuarios();
    }
  }, [role]);

  const carregarUsuarios = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          role: userRole?.role || null,
          created_at: profile.created_at,
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const criarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setCriando(true);

    try {
      // Criar usuário via função administrativa (simulado com signup)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: novoEmail,
        password: novaSenha,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Atribuir papel
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
        carregarUsuarios();
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

  const deletarUsuario = async (userId: string) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      // Deletar papel primeiro
      await supabase.from('user_roles').delete().eq('user_id', userId);

      // Deletar perfil (cascade deleta o usuário auth)
      const { error } = await supabase.from('profiles').delete().eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Usuário deletado',
        description: 'O usuário foi removido com sucesso.',
      });

      carregarUsuarios();
    } catch (error: any) {
      toast({
        title: 'Erro ao deletar usuário',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading || loadingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <Button variant="outline" onClick={() => navigate('/simulador')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Simulador
        </Button>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Formulário de Criação */}
          <Card>
            <CardHeader>
              <CardTitle>Criar Novo Usuário</CardTitle>
              <CardDescription>Adicione um novo usuário ao sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={criarUsuario} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="papel">Papel</Label>
                  <Select value={novoPapel} onValueChange={(v) => setNovoPapel(v as 'admin' | 'usuario')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usuario">Usuário Padrão</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={criando}>
                  <Plus className="h-4 w-4 mr-2" />
                  {criando ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Usuários */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Usuários do Sistema</CardTitle>
              <CardDescription>Gerenciar todos os usuários cadastrados</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <Badge variant="default">Admin</Badge>
                        ) : user.role === 'usuario' ? (
                          <Badge variant="secondary">Usuário</Badge>
                        ) : (
                          <Badge variant="outline">Sem papel</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletarUsuario(user.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
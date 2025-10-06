import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type UserWithRole = {
  id: string;
  email: string;
  role: 'admin' | 'usuario' | null;
  team_id: string | null;
  team_nome: string | null;
  created_at: string;
};

export default function AdminUsuarios() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novoPapel, setNovoPapel] = useState<'admin' | 'usuario'>('usuario');
  const [criando, setCriando] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string>('');

  useEffect(() => {
    if (!loading && role !== 'admin') {
      navigate('/simulador');
    }
  }, [role, loading, navigate]);

  useEffect(() => {
    if (role === 'admin') {
      carregarUsuarios();
      carregarEquipes();
    }
  }, [role]);

  const carregarEquipes = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .order('nome');
    
    if (data) setTeams(data);
  };

  const carregarUsuarios = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*, teams(nome)')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles.map((profile: any) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          role: userRole?.role || null,
          team_id: profile.team_id,
          team_nome: profile.teams?.nome || null,
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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: novoEmail,
          password: novaSenha,
          role: novoPapel,
          teamId: null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      toast({
        title: 'Usuário criado!',
        description: `${novoEmail} foi criado como ${novoPapel}.`,
      });

      setNovoEmail('');
      setNovaSenha('');
      setNovoPapel('usuario');
      carregarUsuarios();
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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao deletar usuário');
      }

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

  const atualizarEquipe = async (userId: string, teamId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: teamId || null })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Equipe atualizada',
        description: 'A equipe do usuário foi atualizada com sucesso.',
      });

      setEditingUserId(null);
      setEditingTeamId('');
      carregarUsuarios();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar equipe',
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
                  <select
                    id="papel"
                    value={novoPapel}
                    onChange={(e) => setNovoPapel(e.target.value as 'admin' | 'usuario')}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="usuario">Usuário Padrão</option>
                    <option value="admin">Administrador</option>
                  </select>
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
                    <TableHead>Equipe</TableHead>
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
                        {editingUserId === user.id ? (
                          <div className="flex gap-2 items-center">
                            <select
                              value={editingTeamId}
                              onChange={(e) => setEditingTeamId(e.target.value)}
                              className="flex h-9 w-[180px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                              <option value="">Sem equipe</option>
                              {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                  {team.nome}
                                </option>
                              ))}
                            </select>
                            <Button size="sm" onClick={() => atualizarEquipe(user.id, editingTeamId)}>
                              Salvar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => {
                                setEditingUserId(null);
                                setEditingTeamId('');
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{user.team_nome || 'Sem equipe'}</span>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                setEditingUserId(user.id);
                                setEditingTeamId(user.team_id || '');
                              }}
                            >
                              Editar
                            </Button>
                          </div>
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
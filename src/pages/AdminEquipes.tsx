import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AdminEquipes() {
  const [teams, setTeams] = useState<any[]>([]);
  const [teamButtons, setTeamButtons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [buttonDialogOpen, setButtonDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [editingButton, setEditingButton] = useState<any>(null);
  const [teamName, setTeamName] = useState('');
  const [buttonTeamId, setButtonTeamId] = useState('');
  const [buttonTitle, setButtonTitle] = useState('');
  const [buttonLink, setButtonLink] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .order('nome');
    
    const { data: buttonsData } = await supabase
      .from('team_buttons')
      .select('*, teams(nome)')
      .order('created_at');
    
    if (teamsData) setTeams(teamsData);
    if (buttonsData) setTeamButtons(buttonsData);
    
    setLoading(false);
  };

  const handleSaveTeam = async () => {
    if (!teamName.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome da equipe é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    if (editingTeam) {
      const { error } = await supabase
        .from('teams')
        .update({ nome: teamName })
        .eq('id', editingTeam.id);

      if (error) {
        toast({
          title: 'Erro',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Equipe atualizada com sucesso!' });
    } else {
      const { error } = await supabase
        .from('teams')
        .insert({ nome: teamName });

      if (error) {
        toast({
          title: 'Erro',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Equipe criada com sucesso!' });
    }

    setTeamName('');
    setEditingTeam(null);
    setDialogOpen(false);
    fetchData();
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta equipe?')) return;

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Equipe deletada com sucesso!' });
    fetchData();
  };

  const handleSaveButton = async () => {
    if (!buttonTeamId || !buttonTitle.trim() || !buttonLink.trim()) {
      toast({
        title: 'Erro',
        description: 'Todos os campos são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    if (editingButton) {
      const { error } = await supabase
        .from('team_buttons')
        .update({
          titulo: buttonTitle,
          link: buttonLink,
        })
        .eq('id', editingButton.id);

      if (error) {
        toast({
          title: 'Erro',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Botão atualizado com sucesso!' });
    } else {
      const { error } = await supabase
        .from('team_buttons')
        .insert({
          team_id: buttonTeamId,
          titulo: buttonTitle,
          link: buttonLink,
        });

      if (error) {
        toast({
          title: 'Erro',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Botão criado com sucesso!' });
    }

    setButtonTeamId('');
    setButtonTitle('');
    setButtonLink('');
    setEditingButton(null);
    setButtonDialogOpen(false);
    fetchData();
  };

  const handleDeleteButton = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este botão?')) return;

    const { error } = await supabase
      .from('team_buttons')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Botão deletado com sucesso!' });
    fetchData();
  };

  const openEditTeam = (team: any) => {
    setEditingTeam(team);
    setTeamName(team.nome);
    setDialogOpen(true);
  };

  const openEditButton = (button: any) => {
    setEditingButton(button);
    setButtonTeamId(button.team_id);
    setButtonTitle(button.titulo);
    setButtonLink(button.link);
    setButtonDialogOpen(true);
  };

  const openNewTeam = () => {
    setEditingTeam(null);
    setTeamName('');
    setDialogOpen(true);
  };

  const openNewButton = () => {
    setEditingButton(null);
    setButtonTeamId('');
    setButtonTitle('');
    setButtonLink('');
    setButtonDialogOpen(true);
  };

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gerenciar Equipes e Botões</h1>
        <p className="text-muted-foreground">Configure as equipes e seus botões personalizados</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Equipes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Equipes</CardTitle>
                <CardDescription>Gerencie as equipes do sistema</CardDescription>
              </div>
              <Button onClick={openNewTeam}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Equipe
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{team.nome}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditTeam(team)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteTeam(team.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {teams.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma equipe cadastrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Botões por Equipe */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Botões por Equipe</CardTitle>
                <CardDescription>Configure os botões de ação personalizados</CardDescription>
              </div>
              <Button onClick={openNewButton}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Botão
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teamButtons.map((button) => (
                <div key={button.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{button.titulo}</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditButton(button)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteButton(button.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>Equipe: {button.teams?.nome}</div>
                    <div className="truncate">Link: {button.link}</div>
                  </div>
                </div>
              ))}
              {teamButtons.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum botão cadastrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog para Equipe */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Editar Equipe' : 'Nova Equipe'}</DialogTitle>
            <DialogDescription>
              {editingTeam ? 'Atualize os dados da equipe' : 'Cadastre uma nova equipe'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Nome da Equipe</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Ex: Vendas SP"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTeam}>
              {editingTeam ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Botão */}
      <Dialog open={buttonDialogOpen} onOpenChange={setButtonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingButton ? 'Editar Botão' : 'Novo Botão'}</DialogTitle>
            <DialogDescription>
              {editingButton ? 'Atualize os dados do botão' : 'Configure um novo botão personalizado'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="buttonTeam">Equipe</Label>
              <select
                id="buttonTeam"
                value={buttonTeamId}
                onChange={(e) => setButtonTeamId(e.target.value)}
                className="w-full p-2 border rounded-md"
                disabled={!!editingButton}
              >
                <option value="">Selecione uma equipe</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buttonTitle">Título do Botão</Label>
              <Input
                id="buttonTitle"
                value={buttonTitle}
                onChange={(e) => setButtonTitle(e.target.value)}
                placeholder="Ex: Realizar venda"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buttonLink">Link</Label>
              <Input
                id="buttonLink"
                value={buttonLink}
                onChange={(e) => setButtonLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setButtonDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveButton}>
              {editingButton ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  AlertCircle, 
  Link as LinkIcon, 
  FileText, 
  Video,
  Trash2,
  ExternalLink,
  Filter,
  Eye
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

type Aviso = {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: 'novidade' | 'urgente' | 'importante';
  created_at: string;
  visualizado?: boolean;
};

type LinkUtil = {
  id: string;
  titulo: string;
  url: string;
  categoria: string;
  ordem: number;
};

type Material = {
  id: string;
  titulo: string;
  tipo: 'apresentacao' | 'pdf' | 'playbook' | 'outro';
  url: string;
  cliente_alvo: string | null;
};

type Treinamento = {
  id: string;
  titulo: string;
  tipo: 'video' | 'tutorial' | 'manual';
  url: string;
  trilha: 'basico' | 'intermediario' | 'avancado';
  ordem: number;
};

export default function EspacoVendedor() {
  const { role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

  // Estados
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [links, setLinks] = useState<LinkUtil[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [filtroAviso, setFiltroAviso] = useState<string>('todos');
  const [filtroMaterial, setFiltroMaterial] = useState<string>('todos');
  const [filtroTrilha, setFiltroTrilha] = useState<string>('todos');
  const [loading, setLoading] = useState(true);

  // Modais
  const [modalAviso, setModalAviso] = useState(false);
  const [modalLink, setModalLink] = useState(false);
  const [modalMaterial, setModalMaterial] = useState(false);
  const [modalTreinamento, setModalTreinamento] = useState(false);

  // Forms
  const [novoAviso, setNovoAviso] = useState({ titulo: '', conteudo: '', tipo: 'novidade' as const });
  const [novoLink, setNovoLink] = useState({ titulo: '', url: '', categoria: '' });
  const [novoMaterial, setNovoMaterial] = useState({ titulo: '', tipo: 'pdf' as const, url: '', cliente_alvo: '' });
  const [novoTreinamento, setNovoTreinamento] = useState({ titulo: '', tipo: 'video' as const, url: '', trilha: 'basico' as const });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [avisosRes, linksRes, materiaisRes, treinamentosRes] = await Promise.all([
        supabase.from('avisos').select('*').order('created_at', { ascending: false }),
        supabase.from('links_uteis').select('*').order('ordem', { ascending: true }),
        supabase.from('materiais_apoio').select('*').order('created_at', { ascending: false }),
        supabase.from('treinamentos').select('*').order('trilha', { ascending: true }).order('ordem', { ascending: true }),
      ]);

      if (avisosRes.data) {
        const { data: visualizacoes } = await supabase
          .from('avisos_visualizacoes')
          .select('aviso_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        const avisosComVisualizacao = avisosRes.data.map(aviso => ({
          ...aviso,
          tipo: aviso.tipo as 'novidade' | 'urgente' | 'importante',
          visualizado: visualizacoes?.some(v => v.aviso_id === aviso.id) || false
        }));
        setAvisos(avisosComVisualizacao);
      }
      if (linksRes.data) setLinks(linksRes.data);
      if (materiaisRes.data) {
        setMateriais(materiaisRes.data.map(m => ({
          ...m,
          tipo: m.tipo as 'apresentacao' | 'pdf' | 'playbook' | 'outro'
        })));
      }
      if (treinamentosRes.data) {
        setTreinamentos(treinamentosRes.data.map(t => ({
          ...t,
          tipo: t.tipo as 'video' | 'tutorial' | 'manual',
          trilha: t.trilha as 'basico' | 'intermediario' | 'avancado'
        })));
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const marcarComoVisualizado = async (avisoId: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    try {
      await supabase.from('avisos_visualizacoes').insert({
        aviso_id: avisoId,
        user_id: user.id
      });
      setAvisos(prev => prev.map(a => a.id === avisoId ? { ...a, visualizado: true } : a));
    } catch (error) {
      // Já visualizado
    }
  };

  const criarAviso = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    try {
      const { error } = await supabase.from('avisos').insert({
        ...novoAviso,
        created_by: user.id
      });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Aviso criado com sucesso' });
      setModalAviso(false);
      setNovoAviso({ titulo: '', conteudo: '', tipo: 'novidade' });
      carregarDados();
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao criar aviso', variant: 'destructive' });
    }
  };

  const criarLink = async () => {
    try {
      const { error } = await supabase.from('links_uteis').insert(novoLink);
      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Link criado com sucesso' });
      setModalLink(false);
      setNovoLink({ titulo: '', url: '', categoria: '' });
      carregarDados();
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao criar link', variant: 'destructive' });
    }
  };

  const criarMaterial = async () => {
    try {
      const { error } = await supabase.from('materiais_apoio').insert(novoMaterial);
      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Material criado com sucesso' });
      setModalMaterial(false);
      setNovoMaterial({ titulo: '', tipo: 'pdf', url: '', cliente_alvo: '' });
      carregarDados();
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao criar material', variant: 'destructive' });
    }
  };

  const criarTreinamento = async () => {
    try {
      const { error } = await supabase.from('treinamentos').insert(novoTreinamento);
      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Treinamento criado com sucesso' });
      setModalTreinamento(false);
      setNovoTreinamento({ titulo: '', tipo: 'video', url: '', trilha: 'basico' });
      carregarDados();
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao criar treinamento', variant: 'destructive' });
    }
  };

  const deletarItem = async (tabela: string, id: string) => {
    try {
      const { error } = await (supabase as any).from(tabela).delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Item deletado com sucesso' });
      carregarDados();
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao deletar item', variant: 'destructive' });
    }
  };

  const avisosFiltrados = avisos.filter(a => {
    if (filtroAviso === 'todos') return true;
    return a.tipo === filtroAviso;
  });

  const materiaisFiltrados = materiais.filter(m => {
    if (filtroMaterial === 'todos') return true;
    return m.tipo === filtroMaterial;
  });

  const treinamentosFiltrados = treinamentos.filter(t => {
    if (filtroTrilha === 'todos') return true;
    return t.trilha === filtroTrilha;
  });

  const getTipoBadgeVariant = (tipo: 'novidade' | 'urgente' | 'importante') => {
    switch (tipo) {
      case 'urgente': return 'destructive' as const;
      case 'importante': return 'default' as const;
      default: return 'secondary' as const;
    }
  };

  const categorias = [...new Set(links.map(l => l.categoria))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avisos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Avisos
              </CardTitle>
              <CardDescription>Comunicados importantes da equipe</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filtroAviso} onValueChange={setFiltroAviso}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="novidade">Novidades</SelectItem>
                  <SelectItem value="urgente">Urgentes</SelectItem>
                  <SelectItem value="importante">Importantes</SelectItem>
                </SelectContent>
              </Select>
              {isAdmin && (
                <Dialog open={modalAviso} onOpenChange={setModalAviso}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Aviso
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Novo Aviso</DialogTitle>
                      <DialogDescription>Adicione um novo comunicado para a equipe</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input
                          value={novoAviso.titulo}
                          onChange={(e) => setNovoAviso({ ...novoAviso, titulo: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Conteúdo</Label>
                        <Textarea
                          value={novoAviso.conteudo}
                          onChange={(e) => setNovoAviso({ ...novoAviso, conteudo: e.target.value })}
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={novoAviso.tipo}
                          onValueChange={(v: any) => setNovoAviso({ ...novoAviso, tipo: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="novidade">Novidade</SelectItem>
                            <SelectItem value="urgente">Urgente</SelectItem>
                            <SelectItem value="importante">Importante</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={criarAviso} className="w-full">Criar Aviso</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {avisosFiltrados.map(aviso => (
              <Card key={aviso.id} className={!aviso.visualizado ? 'border-primary' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{aviso.titulo}</h3>
                        <Badge variant={getTipoBadgeVariant(aviso.tipo)}>
                          {aviso.tipo}
                        </Badge>
                        {!aviso.visualizado && <Badge variant="outline">Novo</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{aviso.conteudo}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(aviso.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!aviso.visualizado && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => marcarComoVisualizado(aviso.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deletarItem('avisos', aviso.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {avisosFiltrados.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum aviso encontrado</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Links Úteis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Links Úteis
              </CardTitle>
              <CardDescription>Acesso rápido às ferramentas essenciais</CardDescription>
            </div>
            {isAdmin && (
              <Dialog open={modalLink} onOpenChange={setModalLink}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Link
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Link</DialogTitle>
                    <DialogDescription>Adicione um novo link útil</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={novoLink.titulo}
                        onChange={(e) => setNovoLink({ ...novoLink, titulo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL</Label>
                      <Input
                        type="url"
                        value={novoLink.url}
                        onChange={(e) => setNovoLink({ ...novoLink, url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Input
                        value={novoLink.categoria}
                        onChange={(e) => setNovoLink({ ...novoLink, categoria: e.target.value })}
                        placeholder="Ex: Ferramentas, Materiais"
                      />
                    </div>
                    <Button onClick={criarLink} className="w-full">Adicionar Link</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {categorias.map(categoria => (
            <div key={categoria} className="mb-6">
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">{categoria}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {links.filter(l => l.categoria === categoria).map(link => (
                  <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 flex-1"
                    >
                      <ExternalLink className="h-4 w-4 text-primary" />
                      <span className="text-sm">{link.titulo}</span>
                    </a>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deletarItem('links_uteis', link.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Separator className="mt-4" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Materiais de Apoio */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Materiais de Apoio
              </CardTitle>
              <CardDescription>Biblioteca de recursos para vendas</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filtroMaterial} onValueChange={setFiltroMaterial}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="apresentacao">Apresentações</SelectItem>
                  <SelectItem value="pdf">PDFs</SelectItem>
                  <SelectItem value="playbook">Playbooks</SelectItem>
                  <SelectItem value="outro">Outros</SelectItem>
                </SelectContent>
              </Select>
              {isAdmin && (
                <Dialog open={modalMaterial} onOpenChange={setModalMaterial}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Material
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Material</DialogTitle>
                      <DialogDescription>Adicione um novo material de apoio</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input
                          value={novoMaterial.titulo}
                          onChange={(e) => setNovoMaterial({ ...novoMaterial, titulo: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={novoMaterial.tipo}
                          onValueChange={(v: any) => setNovoMaterial({ ...novoMaterial, tipo: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apresentacao">Apresentação</SelectItem>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="playbook">Playbook</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>URL</Label>
                        <Input
                          type="url"
                          value={novoMaterial.url}
                          onChange={(e) => setNovoMaterial({ ...novoMaterial, url: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cliente Alvo (opcional)</Label>
                        <Input
                          value={novoMaterial.cliente_alvo}
                          onChange={(e) => setNovoMaterial({ ...novoMaterial, cliente_alvo: e.target.value })}
                        />
                      </div>
                      <Button onClick={criarMaterial} className="w-full">Adicionar Material</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materiaisFiltrados.map(material => (
              <Card key={material.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">{material.titulo}</h3>
                      <Badge variant="outline" className="text-xs mb-2">
                        {material.tipo}
                      </Badge>
                      {material.cliente_alvo && (
                        <p className="text-xs text-muted-foreground">Cliente: {material.cliente_alvo}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deletarItem('materiais_apoio', material.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    asChild
                  >
                    <a href={material.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Abrir
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
            {materiaisFiltrados.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">Nenhum material encontrado</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Treinamentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Espaço de Treinamento
              </CardTitle>
              <CardDescription>Recursos de capacitação e desenvolvimento</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filtroTrilha} onValueChange={setFiltroTrilha}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="basico">Básico</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                </SelectContent>
              </Select>
              {isAdmin && (
                <Dialog open={modalTreinamento} onOpenChange={setModalTreinamento}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Treinamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Treinamento</DialogTitle>
                      <DialogDescription>Adicione um novo recurso de treinamento</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input
                          value={novoTreinamento.titulo}
                          onChange={(e) => setNovoTreinamento({ ...novoTreinamento, titulo: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={novoTreinamento.tipo}
                          onValueChange={(v: any) => setNovoTreinamento({ ...novoTreinamento, tipo: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="video">Vídeo</SelectItem>
                            <SelectItem value="tutorial">Tutorial</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Trilha</Label>
                        <Select
                          value={novoTreinamento.trilha}
                          onValueChange={(v: any) => setNovoTreinamento({ ...novoTreinamento, trilha: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basico">Básico</SelectItem>
                            <SelectItem value="intermediario">Intermediário</SelectItem>
                            <SelectItem value="avancado">Avançado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>URL</Label>
                        <Input
                          type="url"
                          value={novoTreinamento.url}
                          onChange={(e) => setNovoTreinamento({ ...novoTreinamento, url: e.target.value })}
                        />
                      </div>
                      <Button onClick={criarTreinamento} className="w-full">Adicionar Treinamento</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basico" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="intermediario">Intermediário</TabsTrigger>
              <TabsTrigger value="avancado">Avançado</TabsTrigger>
            </TabsList>
            {['basico', 'intermediario', 'avancado'].map(trilha => (
              <TabsContent key={trilha} value={trilha} className="space-y-4 mt-4">
                {treinamentos.filter(t => t.trilha === trilha).map(treinamento => (
                  <Card key={treinamento.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{treinamento.titulo}</h3>
                            <Badge variant="outline">{treinamento.tipo}</Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <a href={treinamento.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Acessar
                            </a>
                          </Button>
                        </div>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deletarItem('treinamentos', treinamento.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {treinamentos.filter(t => t.trilha === trilha).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Nenhum treinamento nesta trilha</p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

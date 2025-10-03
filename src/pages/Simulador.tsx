import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Users, Calculator, UserPlus, Settings, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NovoUsuarioModal } from '@/components/NovoUsuarioModal';
import EspacoVendedor from './EspacoVendedor';
import logoPontua from '@/assets/logo-pontua.svg';
import {
  PlanType,
  TreinamentoType,
  TREINAMENTOS,
  getAvailableTiers,
  calcularSimulacao,
} from '@/lib/pricing';

export default function Simulador() {
  const { signOut, user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estados do simulador
  const [plano, setPlano] = useState<PlanType>('Plano profissional');
  const [colaboradoresTipo, setColaboradoresTipo] = useState<'fixo' | 'personalizado'>('fixo');
  const [colaboradoresFixo, setColaboradoresFixo] = useState<number>(50);
  const [colaboradoresPersonalizado, setColaboradoresPersonalizado] = useState<number>(50);
  const [empresasAdicionaisPacotes, setEmpresasAdicionaisPacotes] = useState<number>(0);
  const [apiAberta, setApiAberta] = useState<boolean>(false);
  const [reconhecimentoFacialQtd, setReconhecimentoFacialQtd] = useState<number>(0);
  const [treinamento, setTreinamento] = useState<TreinamentoType | null>(null);
  const [modalNovoUsuario, setModalNovoUsuario] = useState(false);
  const [teamButton, setTeamButton] = useState<{ titulo: string; link: string } | null>(null);

  useEffect(() => {
    fetchTeamButton();
  }, [user]);

  const fetchTeamButton = async () => {
    if (!user) return;

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Erro ao buscar profile:', profileError);
        return;
      }

      if (profile?.team_id) {
        const { data: button, error: buttonError } = await supabase
          .from('team_buttons')
          .select('titulo, link')
          .eq('team_id', profile.team_id)
          .maybeSingle();

        if (buttonError) {
          console.error('Erro ao buscar botão:', buttonError);
          return;
        }

        if (button) {
          setTeamButton(button);
        } else {
          setTeamButton(null);
        }
      } else {
        setTeamButton(null);
      }
    } catch (error) {
      console.error('Erro ao buscar botão da equipe:', error);
    }
  };

  const colaboradores = colaboradoresTipo === 'fixo' ? colaboradoresFixo : colaboradoresPersonalizado;
  const tiers = getAvailableTiers(plano);

  // Validação de personalizado
  const validarPersonalizado = (valor: number): string | null => {
    if (plano === 'Plano Empreendedor' && valor > 12) {
      return 'Empreendedor permite no máximo 12 colaboradores';
    }
    
    if (plano !== 'Plano Empreendedor') {
      const menorFaixa = tiers[0];
      if (valor < menorFaixa) {
        return `Mínimo ${menorFaixa} colaboradores`;
      }
      
      const faixaInferior = tiers.filter((t) => t <= valor).pop() || menorFaixa;
      const diff = valor - faixaInferior;
      
      if (diff % 5 !== 0) {
        return 'Adições permitidas apenas de 5 em 5 colaboradores';
      }
    }
    
    return null;
  };

  const erroPersonalizado = colaboradoresTipo === 'personalizado' 
    ? validarPersonalizado(colaboradoresPersonalizado) 
    : null;

  // Calcular simulação
  let resultado = null;
  try {
    resultado = calcularSimulacao({
      plano,
      colaboradores,
      empresasAdicionaisPacotes,
      apiAberta,
      reconhecimentoFacialQtd,
      treinamento,
    });
  } catch (error) {
    // Erro de validação
  }

  const formatMoney = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const copiarResumo = () => {
    if (!resultado) return;

    let texto = `SIMULAÇÃO PONTUA\n\n`;
    texto += `Plano: ${plano}\n`;
    texto += `Colaboradores: ${colaboradores}\n\n`;
    texto += `--- DETALHAMENTO ---\n`;
    texto += `Base do plano: ${formatMoney(resultado.precoBase)}\n`;
    if (resultado.empresasAdicionais > 0)
      texto += `Empresas adicionais: ${formatMoney(resultado.empresasAdicionais)}\n`;
    if (resultado.apiAberta > 0) texto += `API aberta: ${formatMoney(resultado.apiAberta)}\n`;
    if (resultado.reconhecimentoFacial > 0)
      texto += `Reconhecimento facial: ${formatMoney(resultado.reconhecimentoFacial)}\n`;
    texto += `\nTOTAL MENSAL: ${formatMoney(resultado.totalMensal)}\n`;

    if (resultado.treinamento) {
      texto += `\n--- TREINAMENTO ---\n`;
      texto += `Tipo: ${TREINAMENTOS[resultado.treinamento.tipo!].nome}\n`;
      if (resultado.treinamento.desconto > 0)
        texto += `Desconto: ${resultado.treinamento.desconto}%\n`;
      texto += `Valor: ${formatMoney(resultado.treinamento.precoFinal)}\n`;
    }

    navigator.clipboard.writeText(texto);
    toast({ title: 'Resumo copiado!', description: 'O resumo foi copiado para a área de transferência.' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoPontua} alt="Pontua" className="h-8" />
          </div>
          <div className="flex items-center gap-4">
            {role === 'admin' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Administração</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setModalNovoUsuario(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Novo Usuário
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/usuarios')}>
                    <Users className="h-4 w-4 mr-2" />
                    Gerenciar Usuários
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin/equipes')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Gerenciar Equipes
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="text-sm text-muted-foreground">{user?.email}</div>
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="simulador" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="simulador">Simulador</TabsTrigger>
            <TabsTrigger value="espaco-vendedor">Espaço do Vendedor</TabsTrigger>
          </TabsList>

          <TabsContent value="simulador" className="space-y-8">
            {teamButton && (
              <div className="flex justify-end">
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                  onClick={() => window.open(teamButton.link, '_blank')}
                >
                  {teamButton.titulo}
                  <ExternalLink className="h-5 w-5 ml-2" />
                </Button>
              </div>
            )}

            <div className="max-w-5xl mx-auto">
              {/* Título e Descrição */}
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-primary mb-4">Planos Pontua</h1>
                <p className="text-lg text-muted-foreground">Configure seu plano ideal e veja o resumo detalhado</p>
              </div>

              {/* Configuração do Plano */}
              <Card className="mb-8 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
                  <CardTitle className="text-2xl">Configuração do Plano</CardTitle>
                  <CardDescription>Personalize seu plano de acordo com suas necessidades</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Grid de 2 colunas */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Plano */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Plano</Label>
                      <Select value={plano} onValueChange={(v) => setPlano(v as PlanType)}>
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Plano Empreendedor">Empreendedor</SelectItem>
                          <SelectItem value="Plano profissional">Profissional</SelectItem>
                          <SelectItem value="Plano corporativo">Corporativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Colaboradores */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Colaboradores</Label>
                      <Select
                        value={colaboradoresTipo === 'fixo' ? String(colaboradoresFixo) : 'personalizado'}
                        onValueChange={(v) => {
                          if (v === 'personalizado') {
                            setColaboradoresTipo('personalizado');
                          } else {
                            setColaboradoresTipo('fixo');
                            setColaboradoresFixo(Number(v));
                          }
                        }}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tiers.map((tier) => (
                            <SelectItem key={tier} value={String(tier)}>
                              {tier} colaboradores
                            </SelectItem>
                          ))}
                          <SelectItem value="personalizado">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Quantidade Personalizada */}
                  {colaboradoresTipo === 'personalizado' && (
                    <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
                      <Label className="text-base font-semibold">Quantidade personalizada</Label>
                      <Input
                        type="number"
                        min={tiers[0]}
                        max={plano === 'Plano Empreendedor' ? 12 : undefined}
                        value={colaboradoresPersonalizado}
                        onChange={(e) => setColaboradoresPersonalizado(Number(e.target.value))}
                        className="h-12"
                      />
                      {erroPersonalizado && (
                        <p className="text-sm text-destructive font-medium">{erroPersonalizado}</p>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Adicionais */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Recursos Adicionais</h3>
                    
                    {plano !== 'Plano Empreendedor' && (
                      <div className="space-y-4 p-4 bg-muted/50 rounded-xl">
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Pacotes de 3 empresas adicionais</Label>
                          <div className="flex items-center gap-4">
                            <Input
                              type="number"
                              min={0}
                              value={empresasAdicionaisPacotes}
                              onChange={(e) => setEmpresasAdicionaisPacotes(Number(e.target.value))}
                              className="h-12"
                            />
                            <Badge variant="secondary" className="whitespace-nowrap">R$ 15,00/pacote</Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
                          <div>
                            <Label className="text-base font-semibold">API Aberta</Label>
                            <p className="text-sm text-muted-foreground">R$ 99,00</p>
                          </div>
                          <Switch checked={apiAberta} onCheckedChange={setApiAberta} />
                        </div>
                      </div>
                    )}

                    {plano === 'Plano profissional' && (
                      <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
                        <Label className="text-base font-semibold">Reconhecimento Facial</Label>
                        <div className="flex items-center gap-4">
                          <Input
                            type="number"
                            min={0}
                            max={colaboradores}
                            value={reconhecimentoFacialQtd}
                            onChange={(e) => setReconhecimentoFacialQtd(Number(e.target.value))}
                            className="h-12"
                          />
                          <Badge variant="secondary" className="whitespace-nowrap">R$ 3,50/colaborador</Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Treinamento */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">Treinamento</h3>
                      {plano === 'Plano corporativo' && (
                        <Badge className="bg-green-600">30% OFF</Badge>
                      )}
                    </div>
                    <Select value={treinamento || 'none'} onValueChange={(v) => setTreinamento(v === 'none' ? null : v as TreinamentoType)}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Sem treinamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem treinamento</SelectItem>
                        {Object.entries(TREINAMENTOS).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value.nome} - {formatMoney(value.preco)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Resumo da Simulação */}
              {resultado && (
                <Card className="shadow-2xl border-2 border-primary/20">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl mb-2">Resumo da Simulação</CardTitle>
                        <CardDescription className="text-base">Confira o detalhamento do seu plano personalizado</CardDescription>
                      </div>
                      <Button variant="outline" onClick={copiarResumo} className="gap-2">
                        <Calculator className="h-4 w-4" />
                        Copiar Resumo
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-8 space-y-8">
                    {/* Detalhamento em Tabela */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Detalhamento de Custos
                      </h3>
                      <div className="overflow-hidden border rounded-xl">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-4 font-semibold">Item</th>
                              <th className="text-left p-4 font-semibold">Detalhes</th>
                              <th className="text-right p-4 font-semibold">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            <tr className="hover:bg-muted/30 transition-colors">
                              <td className="p-4 font-medium">Base do plano</td>
                              <td className="p-4 text-muted-foreground">{colaboradores} colaboradores</td>
                              <td className="p-4 text-right font-semibold">{formatMoney(resultado.precoBase)}</td>
                            </tr>
                            {resultado.empresasAdicionais > 0 && (
                              <tr className="hover:bg-muted/30 transition-colors">
                                <td className="p-4 font-medium">Empresas adicionais</td>
                                <td className="p-4 text-muted-foreground">{empresasAdicionaisPacotes} pacotes</td>
                                <td className="p-4 text-right font-semibold">{formatMoney(resultado.empresasAdicionais)}</td>
                              </tr>
                            )}
                            {resultado.apiAberta > 0 && (
                              <tr className="hover:bg-muted/30 transition-colors">
                                <td className="p-4 font-medium">API Aberta</td>
                                <td className="p-4 text-muted-foreground">Acesso completo</td>
                                <td className="p-4 text-right font-semibold">{formatMoney(resultado.apiAberta)}</td>
                              </tr>
                            )}
                            {resultado.reconhecimentoFacial > 0 && (
                              <tr className="hover:bg-muted/30 transition-colors">
                                <td className="p-4 font-medium">Reconhecimento Facial</td>
                                <td className="p-4 text-muted-foreground">{reconhecimentoFacialQtd} colaboradores</td>
                                <td className="p-4 text-right font-semibold">{formatMoney(resultado.reconhecimentoFacial)}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <Separator />

                    {/* Total Mensal Destacado */}
                    <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-8 rounded-2xl border-2 border-primary/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Valor Total</p>
                          <p className="text-4xl font-bold text-primary">Mensal</p>
                        </div>
                        <div className="text-right">
                          <p className="text-5xl font-bold text-primary">{formatMoney(resultado.totalMensal)}</p>
                          <p className="text-sm text-muted-foreground mt-2">por mês</p>
                        </div>
                      </div>
                    </div>

                    {/* Treinamento */}
                    {resultado.treinamento && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold">Treinamento</h3>
                            {resultado.treinamento.desconto > 0 && (
                              <Badge className="bg-green-600 text-lg px-3 py-1">{resultado.treinamento.desconto}% OFF</Badge>
                            )}
                          </div>
                          
                          <div className="p-6 bg-muted/50 rounded-xl space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-base text-muted-foreground">Tipo de treinamento</span>
                              <span className="font-semibold text-lg">{TREINAMENTOS[resultado.treinamento.tipo!].nome}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-base text-muted-foreground">Valor do investimento</span>
                              <span className="font-bold text-2xl text-primary">{formatMoney(resultado.treinamento.precoFinal)}</span>
                            </div>
                          </div>

                          {/* Condições de Pagamento */}
                          <div className="mt-6">
                            <h4 className="font-semibold text-lg mb-4">Condições de Pagamento</h4>
                            <div className="grid gap-3">
                              {resultado.treinamento.parcelamento.map((p) => (
                                <div key={p.parcelas} className="flex justify-between items-center p-4 bg-background rounded-lg border hover:border-primary/50 transition-colors">
                                  <span className="font-medium">
                                    {p.parcelas}x {p.parcelas === 3 ? 'sem juros' : 'com juros (1,99% a.m.)'}
                                  </span>
                                  <div className="text-right">
                                    <span className="text-lg font-bold text-primary">{formatMoney(p.valorParcela)}</span>
                                    <span className="text-sm text-muted-foreground ml-1">/mês</span>
                                    <p className="text-xs text-muted-foreground">Total: {formatMoney(p.total)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="espaco-vendedor">
            <EspacoVendedor />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal de Novo Usuário */}
      <NovoUsuarioModal 
        open={modalNovoUsuario} 
        onOpenChange={setModalNovoUsuario}
        onSuccess={() => {
          toast({
            title: 'Sucesso!',
            description: 'Usuário criado com sucesso.',
          });
        }}
      />
    </div>
  );
}
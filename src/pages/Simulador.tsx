import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Users, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
            <Calculator className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-primary">Pontua Simulador</h1>
          </div>
          <div className="flex items-center gap-4">
            {role === 'admin' && (
              <Button variant="outline" onClick={() => navigate('/admin/usuarios')}>
                <Users className="h-4 w-4 mr-2" />
                Gerenciar Usuários
              </Button>
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
        <div className="grid md:grid-cols-3 gap-6">
          {/* Seleção Principal */}
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Plano</CardTitle>
              <CardDescription>Selecione o plano e quantidade de colaboradores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={plano} onValueChange={(v) => setPlano(v as PlanType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Plano Empreendedor">Empreendedor</SelectItem>
                    <SelectItem value="Plano profissional">Profissional</SelectItem>
                    <SelectItem value="Plano corporativo">Corporativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Colaboradores</Label>
                <Select
                  value={colaboradoresTipo}
                  onValueChange={(v) => setColaboradoresTipo(v as 'fixo' | 'personalizado')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiers.map((tier) => (
                      <SelectItem key={tier} value="fixo" onClick={() => setColaboradoresFixo(tier)}>
                        {tier} colaboradores
                      </SelectItem>
                    ))}
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {colaboradoresTipo === 'personalizado' && (
                <div className="space-y-2">
                  <Label>Quantidade personalizada</Label>
                  <Input
                    type="number"
                    min={tiers[0]}
                    max={plano === 'Plano Empreendedor' ? 12 : undefined}
                    value={colaboradoresPersonalizado}
                    onChange={(e) => setColaboradoresPersonalizado(Number(e.target.value))}
                  />
                  {erroPersonalizado && (
                    <p className="text-sm text-destructive">{erroPersonalizado}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Adicionais */}
          <Card>
            <CardHeader>
              <CardTitle>Adicionais</CardTitle>
              <CardDescription>Recursos extras para o seu plano</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {plano !== 'Plano Empreendedor' && (
                <>
                  <div className="space-y-2">
                    <Label>Pacotes de 3 empresas adicionais (R$ 15,00/pacote)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={empresasAdicionaisPacotes}
                      onChange={(e) => setEmpresasAdicionaisPacotes(Number(e.target.value))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>API aberta (R$ 99,00)</Label>
                    <Switch checked={apiAberta} onCheckedChange={setApiAberta} />
                  </div>
                </>
              )}

              {plano === 'Plano profissional' && (
                <div className="space-y-2">
                  <Label>Reconhecimento facial (R$ 3,50/colaborador)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={colaboradores}
                    value={reconhecimentoFacialQtd}
                    onChange={(e) => setReconhecimentoFacialQtd(Number(e.target.value))}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Treinamento */}
          <Card>
            <CardHeader>
              <CardTitle>Treinamento</CardTitle>
              <CardDescription>
                Adicione um pacote de treinamento
                {plano === 'Plano corporativo' && (
                  <Badge className="ml-2" variant="secondary">30% OFF</Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pacote</Label>
                <Select value={treinamento || 'none'} onValueChange={(v) => setTreinamento(v === 'none' ? null : v as TreinamentoType)}>
                  <SelectTrigger>
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
        </div>

        {/* Resumo */}
        {resultado && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Resumo da Simulação</CardTitle>
                <Button variant="outline" onClick={copiarResumo}>
                  Copiar Resumo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Detalhamento */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Detalhamento</h3>
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base do plano ({colaboradores} colaboradores)</span>
                    <span className="font-medium">{formatMoney(resultado.precoBase)}</span>
                  </div>
                  {resultado.empresasAdicionais > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Empresas adicionais ({empresasAdicionaisPacotes} pacotes)</span>
                      <span className="font-medium">{formatMoney(resultado.empresasAdicionais)}</span>
                    </div>
                  )}
                  {resultado.apiAberta > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">API aberta</span>
                      <span className="font-medium">{formatMoney(resultado.apiAberta)}</span>
                    </div>
                  )}
                  {resultado.reconhecimentoFacial > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reconhecimento facial ({reconhecimentoFacialQtd} colaboradores)</span>
                      <span className="font-medium">{formatMoney(resultado.reconhecimentoFacial)}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="text-xl font-bold">Total Mensal</span>
                <span className="text-3xl font-bold text-primary">{formatMoney(resultado.totalMensal)}</span>
              </div>

              {resultado.treinamento && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">Treinamento</h3>
                      {resultado.treinamento.desconto > 0 && (
                        <Badge variant="secondary">{resultado.treinamento.desconto}% OFF</Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo</span>
                        <span className="font-medium">{TREINAMENTOS[resultado.treinamento.tipo!].nome}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor</span>
                        <span className="font-medium">{formatMoney(resultado.treinamento.precoFinal)}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Condições de Pagamento</h4>
                      <div className="grid gap-2">
                        {resultado.treinamento.parcelamento.map((p) => (
                          <div key={p.parcelas} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {p.parcelas}x {p.parcelas === 3 ? 'sem juros' : 'com juros (1,99% a.m.)'}
                            </span>
                            <span>
                              {formatMoney(p.valorParcela)}/mês (total: {formatMoney(p.total)})
                            </span>
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
      </main>
    </div>
  );
}
// Tabela de preços da Pontua (dados da planilha)
export const PRICING_TABLE = {
  "Plano Empreendedor": {
    12: 79.9,
  },
  "Plano profissional": {
    12: 109.0,
    20: 149.9,
    35: 239.35,
    50: 319.42,
    75: 421.75,
    100: 509.0,
    150: 691.5,
    200: 779.0,
    250: 935.0,
    300: 1079.18,
    500: 1694.0,
    750: 2409.0,
    1000: 2890.0,
    1500: 3719.0,
    more_than_2500_per_unit: 2.36,
  },
  "Plano corporativo": {
    12: 144.0,
    20: 229.0,
    35: 377.0,
    50: 509.0,
    75: 709.85,
    100: 894.9,
    150: 1251.48,
    200: 1417.39,
    250: 1669.9,
    300: 1899.9,
    500: 2829.9,
    750: 3769.97,
    1000: 4509.9,
    1500: 6499.9,
    more_than_2500_per_unit: 3.7,
  },
} as const;

export type PlanType = keyof typeof PRICING_TABLE;

export const TREINAMENTOS = {
  PP: { nome: "PP (2h)", preco: 500 },
  P: { nome: "P (4h)", preco: 900 },
  M: { nome: "M (6h)", preco: 1500 },
  G: { nome: "G (8h)", preco: 2000 },
} as const;

export type TreinamentoType = keyof typeof TREINAMENTOS;

// Obter faixas disponíveis para um plano
export function getAvailableTiers(plan: PlanType): number[] {
  const planData = PRICING_TABLE[plan];
  return Object.keys(planData)
    .filter((k) => k !== "more_than_2500_per_unit")
    .map(Number)
    .sort((a, b) => a - b);
}

// Calcular preço base do plano
export function calcularPrecoBase(plan: PlanType, colaboradores: number): number {
  const planData = PRICING_TABLE[plan];
  const tiers = getAvailableTiers(plan);

  // Empreendedor: máximo 12
  if (plan === "Plano Empreendedor") {
    return planData[12];
  }

  // Mais de 2500: usar unitário
  if (colaboradores > 2500) {
    return colaboradores * (planData as any).more_than_2500_per_unit;
  }

  // Faixa exata
  if ((planData as any)[colaboradores]) {
    return (planData as any)[colaboradores];
  }

  // Personalizado: encontrar faixa inferior e calcular pacotes de +5
  const lowerTier = tiers.filter((t) => t <= colaboradores).pop() || tiers[0];
  const diff = colaboradores - lowerTier;

  // Validar que é múltiplo de 5
  if (diff % 5 !== 0) {
    throw new Error("Adições permitidas apenas de 5 em 5 colaboradores");
  }

  const precoFaixa = (planData as any)[lowerTier];
  const unidade = Math.round((precoFaixa / lowerTier) * 100) / 100; // arredondar 2 casas
  const pacotesDe5 = diff / 5;
  const valorExtra = pacotesDe5 * (unidade * 5);

  return precoFaixa + valorExtra;
}

// Calcular parcelas com juros (PMT)
export function calcularParcelas(valor: number, parcelas: number, taxaMensal: number = 0): number {
  if (taxaMensal === 0) {
    return valor / parcelas;
  }
  
  const i = taxaMensal;
  const n = parcelas;
  const parcela = valor * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  
  return Math.round(parcela * 100) / 100;
}

export interface SimulacaoInput {
  plano: PlanType;
  colaboradores: number;
  empresasAdicionaisPacotes: number;
  apiAberta: boolean;
  reconhecimentoFacialQtd: number;
  treinamento: TreinamentoType | null;
}

export interface SimulacaoResult {
  precoBase: number;
  empresasAdicionais: number;
  apiAberta: number;
  reconhecimentoFacial: number;
  totalMensal: number;
  treinamento: {
    tipo: TreinamentoType | null;
    precoOriginal: number;
    desconto: number;
    precoFinal: number;
    parcelamento: Array<{
      parcelas: number;
      valorParcela: number;
      total: number;
    }>;
  } | null;
}

export function calcularSimulacao(input: SimulacaoInput): SimulacaoResult {
  // Preço base
  const precoBase = calcularPrecoBase(input.plano, input.colaboradores);

  // Adicionais mensais
  const empresasAdicionais = input.empresasAdicionaisPacotes * 15.0;
  const apiAberta = input.apiAberta ? 99.0 : 0;
  const reconhecimentoFacial =
    input.plano === "Plano profissional" ? input.reconhecimentoFacialQtd * 3.5 : 0;

  const totalMensal = precoBase + empresasAdicionais + apiAberta + reconhecimentoFacial;

  // Treinamento
  let treinamento: SimulacaoResult["treinamento"] = null;

  if (input.treinamento) {
    const precoOriginal = TREINAMENTOS[input.treinamento].preco;
    const desconto = input.plano === "Plano corporativo" ? 0.3 : 0;
    const precoFinal = precoOriginal * (1 - desconto);

    const parcelamento = [
      {
        parcelas: 3,
        valorParcela: Math.round((precoFinal / 3) * 100) / 100,
        total: precoFinal,
      },
    ];

    // 4x até 12x com juros de 1,99% a.m.
    for (let n = 4; n <= 12; n++) {
      const valorParcela = calcularParcelas(precoFinal, n, 0.0199);
      parcelamento.push({
        parcelas: n,
        valorParcela,
        total: Math.round(valorParcela * n * 100) / 100,
      });
    }

    treinamento = {
      tipo: input.treinamento,
      precoOriginal,
      desconto: desconto * 100,
      precoFinal,
      parcelamento,
    };
  }

  return {
    precoBase,
    empresasAdicionais,
    apiAberta,
    reconhecimentoFacial,
    totalMensal,
    treinamento,
  };
}
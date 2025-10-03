-- Criar tabela de códigos promocionais
CREATE TABLE IF NOT EXISTS public.codigos_promocionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  
  -- Desconto no treinamento
  desconto_treinamento_tipo TEXT CHECK (desconto_treinamento_tipo IN ('percentual', 'valor', 'nenhum')) DEFAULT 'nenhum',
  desconto_treinamento_valor DECIMAL(10,2) DEFAULT 0,
  
  -- Desconto na mensalidade
  desconto_mensalidade_tipo TEXT CHECK (desconto_mensalidade_tipo IN ('percentual', 'valor', 'nenhum')) DEFAULT 'nenhum',
  desconto_mensalidade_valor DECIMAL(10,2) DEFAULT 0,
  desconto_mensalidade_meses INTEGER DEFAULT NULL, -- NULL = permanente
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.codigos_promocionais ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins podem gerenciar códigos"
  ON public.codigos_promocionais
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuários autenticados podem visualizar códigos ativos"
  ON public.codigos_promocionais
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND ativo = true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_codigos_promocionais_updated_at
  BEFORE UPDATE ON public.codigos_promocionais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
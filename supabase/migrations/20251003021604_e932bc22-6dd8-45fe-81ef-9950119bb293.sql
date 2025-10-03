-- Criar tabelas para o Espaço do Vendedor

-- Tabela de avisos/comunicados
CREATE TABLE public.avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('novidade', 'urgente', 'importante')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de visualizações de avisos
CREATE TABLE public.avisos_visualizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aviso_id UUID NOT NULL REFERENCES public.avisos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visualizado_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(aviso_id, user_id)
);

-- Tabela de links úteis
CREATE TABLE public.links_uteis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  url TEXT NOT NULL,
  categoria TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de materiais de apoio
CREATE TABLE public.materiais_apoio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('apresentacao', 'pdf', 'playbook', 'outro')),
  url TEXT NOT NULL,
  cliente_alvo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de treinamentos
CREATE TABLE public.treinamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('video', 'tutorial', 'manual')),
  url TEXT NOT NULL,
  trilha TEXT NOT NULL CHECK (trilha IN ('basico', 'intermediario', 'avancado')),
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_visualizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links_uteis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais_apoio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;

-- Políticas para avisos
CREATE POLICY "Todos podem ver avisos"
  ON public.avisos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem criar avisos"
  ON public.avisos FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar avisos"
  ON public.avisos FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem deletar avisos"
  ON public.avisos FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Políticas para visualizações
CREATE POLICY "Usuários podem ver suas visualizações"
  ON public.avisos_visualizacoes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem registrar visualização"
  ON public.avisos_visualizacoes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Políticas para links úteis
CREATE POLICY "Todos podem ver links"
  ON public.links_uteis FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem gerenciar links"
  ON public.links_uteis FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Políticas para materiais
CREATE POLICY "Todos podem ver materiais"
  ON public.materiais_apoio FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem gerenciar materiais"
  ON public.materiais_apoio FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Políticas para treinamentos
CREATE POLICY "Todos podem ver treinamentos"
  ON public.treinamentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem gerenciar treinamentos"
  ON public.treinamentos FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para updated_at
CREATE TRIGGER update_avisos_updated_at
  BEFORE UPDATE ON public.avisos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_links_uteis_updated_at
  BEFORE UPDATE ON public.links_uteis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_materiais_apoio_updated_at
  BEFORE UPDATE ON public.materiais_apoio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treinamentos_updated_at
  BEFORE UPDATE ON public.treinamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
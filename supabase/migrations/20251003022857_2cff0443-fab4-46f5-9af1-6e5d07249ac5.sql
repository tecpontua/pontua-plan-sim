-- Criar tabela de equipes
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Adicionar coluna team_id na tabela profiles
ALTER TABLE public.profiles ADD COLUMN team_id uuid REFERENCES public.teams(id);

-- Criar tabela de configuração de botões por equipe
CREATE TABLE public.team_buttons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  titulo text NOT NULL,
  link text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(team_id)
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_buttons ENABLE ROW LEVEL SECURITY;

-- Policies para teams
CREATE POLICY "Todos podem ver equipes" ON public.teams
  FOR SELECT USING (true);

CREATE POLICY "Admins podem gerenciar equipes" ON public.teams
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies para team_buttons
CREATE POLICY "Usuários podem ver botões da sua equipe" ON public.team_buttons
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins podem gerenciar botões" ON public.team_buttons
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at em teams
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em team_buttons
CREATE TRIGGER update_team_buttons_updated_at
  BEFORE UPDATE ON public.team_buttons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
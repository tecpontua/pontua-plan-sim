-- Add UPDATE policy to allow admins to update profiles
CREATE POLICY "Admins podem atualizar perfis"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
-- Master Admin: nível acima do SUPER_ADMIN, exclusivo da equipe Sentinel.
-- É um SUPER_ADMIN com is_master = true. Só o master vê o Painel Sentinel (cards).
-- Clientes não conseguem alterar a coluna: authenticated não tem UPDATE nela
-- (os privilégios de coluna de users liberam só name e consentimento LGPD), e o
-- trigger abaixo barra qualquer mudança que não venha do service role.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_master boolean NOT NULL DEFAULT false;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_master_is_super_admin;
ALTER TABLE public.users
  ADD CONSTRAINT users_master_is_super_admin
  CHECK (NOT is_master OR role = 'SUPER_ADMIN');

CREATE OR REPLACE FUNCTION public.users_protect_is_master()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.is_master)
     OR (TG_OP = 'UPDATE' AND NEW.is_master IS DISTINCT FROM OLD.is_master) THEN
    IF coalesce(auth.role(), '') <> 'service_role'
       AND current_user NOT IN ('postgres', 'supabase_admin') THEN
      RAISE EXCEPTION 'Somente o servidor pode alterar o acesso master.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.users_protect_is_master() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS users_protect_is_master ON public.users;
CREATE TRIGGER users_protect_is_master
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.users_protect_is_master();

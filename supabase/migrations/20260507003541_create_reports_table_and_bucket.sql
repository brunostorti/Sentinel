-- [Reconstruída em 2026-10-08]
-- Versão no banco (supabase_migrations.schema_migrations): 20260507003541
-- Nome no banco: create_reports_table_and_bucket
-- O SQL abaixo é a cópia EXATA do que foi aplicado via MCP em 07/05/2026,
-- recuperado de schema_migrations.statements (o arquivo nunca tinha sido versionado).
-- Mudanças posteriores nestas policies: 20260521192914_security_hardening (INSERT)
-- e 20260603180914_restrict_reports_select (remove o SELECT público da tabela).
-- ===== SQL original (não editar) =====
-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    protocol TEXT UNIQUE NOT NULL,
    occurrence_type TEXT NOT NULL,
    description TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    is_anonymous BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy: Public can insert (for employees)
CREATE POLICY "Public can insert reports" ON public.reports
    FOR INSERT WITH CHECK (true);

-- Policy: Public can select their own report by protocol
CREATE POLICY "Public can view own report by protocol" ON public.reports
    FOR SELECT USING (true); 
-- Note: In the application we will filter by protocol manually if needed, 
-- but since protocol is a secret key for the employee, this is acceptable if we don't expose protocol in other ways.

-- Policy: Authenticated users can view reports for their company
CREATE POLICY "Authenticated users can view company reports" ON public.reports
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.auth_id = auth.uid()
            AND users.company_id = reports.company_id
        )
    );

-- Policy: Authenticated users can update reports for their company
CREATE POLICY "Authenticated users can update company reports" ON public.reports
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.auth_id = auth.uid()
            AND users.company_id = reports.company_id
        )
    );

-- Storage bucket for reports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for reports bucket
CREATE POLICY "Public can upload to reports bucket"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'reports');

CREATE POLICY "Public can view reports bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'reports');

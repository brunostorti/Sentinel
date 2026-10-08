-- Migration 021: Bucket de anexos de denúncias privado (diagnóstico de 08/10/2026)
--
-- Antes: bucket `reports` público, com policies que deixavam QUALQUER pessoa (até sem
-- login) enviar arquivos e listar/baixar os anexos dos denunciantes, sem limite de
-- tamanho ou tipo.
-- Agora: bucket privado, sem acesso direto. O upload é feito pela rota
-- /api/reports/submit (service role) e o RH/Admin vê os anexos por links assinados
-- de 1 hora gerados no servidor (src/app/(dashboard)/denuncias/page.tsx).
-- Em 08/10/2026 o bucket tinha 0 arquivos e nenhuma denúncia com anexo.

BEGIN;

DROP POLICY IF EXISTS "Public can upload to reports bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can view reports bucket" ON storage.objects;

UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']
WHERE id = 'reports';

COMMIT;

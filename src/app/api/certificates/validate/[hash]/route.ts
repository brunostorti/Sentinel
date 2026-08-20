import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Validação pública de certificado, por hash.
 *
 * Usa o client admin de propósito: a policy de RLS de `certificates` só
 * libera SELECT para membros autenticados da própria empresa (ver migration
 * 017), e quem valida um certificado pelo QR code não está logado. O hash é
 * um UUID v4 aleatório — a segurança está em não ser adivinhável, não em
 * esconder a existência da rota. Devolve só os campos que a página pública
 * precisa, nunca a listagem da tabela inteira.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;
  if (!hash) {
    return NextResponse.json({ error: "Hash é obrigatório." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("certificates")
    .select(
      "issued_at, unique_hash, tier, companies(name, cnpj), survey_cycles(title)"
    )
    .eq("unique_hash", hash)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Certificado não encontrado." }, { status: 404 });
  }

  const company = Array.isArray(data.companies) ? data.companies[0] : data.companies;
  const cycle = Array.isArray(data.survey_cycles) ? data.survey_cycles[0] : data.survey_cycles;

  return NextResponse.json({
    issuedAt: data.issued_at,
    uniqueHash: data.unique_hash,
    tier: data.tier,
    companyName: company?.name ?? null,
    companyCnpj: company?.cnpj ?? null,
    cycleTitle: cycle?.title ?? null,
  });
}

import { redirect } from "next/navigation";

/**
 * /configuracoes redireciona para /configuracoes/perfil — a página unificada
 * que contém todas as configurações da empresa (incluindo dados básicos como
 * nome, CNPJ, setor, porte e regime de trabalho na aba "Empresa").
 */
export default function ConfiguracoesPage() {
  redirect("/configuracoes/perfil");
}

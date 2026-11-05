import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { matchesAnyRoute, matchesRoute } from "@/lib/auth/routes";
import { safeNext } from "@/lib/auth/email-link";
import { homeForRole } from "@/lib/auth/home";
import {
  isExemptDemoAccount,
  SECOND_FACTOR_COOKIE,
  secondFactorSecret,
  sessionIdFromAccessToken,
  verifySecondFactor,
} from "@/lib/auth/second-factor";

const PUBLIC_ROUTES = ["/entrar", "/confirmar-acesso", "/obrigado", "/validacao", "/verificar-acesso"];
/** Área do colaborador: exige login, mas não um registro em users. */
const EMPLOYEE_ROUTES = ["/pesquisas", "/responder", "/denuncia", "/feedback", "/afastamento"];
const SUPER_ADMIN_ROUTES = ["/usuarios", "/seguranca"];
/** Telas de acesso administrativo que ainda não exigem o segundo fator (o link do convite já prova o e-mail). */
const SECOND_FACTOR_EXEMPT_ROUTES = ["/definir-senha"];
/**
 * APIs usadas só pelo painel administrativo: também exigem o segundo fator do login.
 * As APIs do colaborador (denúncia, feedback, afastamento, conta) ficam de fora.
 */
const ADMIN_API_PREFIXES = [
  "/api/action-plans",
  "/api/chat",
  "/api/company",
  "/api/knowledge",
  "/api/kanban",
  "/api/nr1",
  "/api/outcomes",
  "/api/profile",
  "/api/relatorios",
  "/api/certificates/generate",
];

async function passedSecondFactor(
  request: NextRequest,
  supabase: Awaited<ReturnType<typeof updateSession>>["supabase"],
  user: { id: string; email?: string | null }
): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const ok = await verifySecondFactor(request.cookies.get(SECOND_FACTOR_COOKIE)?.value, {
    userId: user.id,
    sessionId: sessionIdFromAccessToken(session?.access_token) ?? "",
    secret: secondFactorSecret(),
  });
  // Contas de teste das empresas de demonstração entram sem segundo fator.
  return ok || isExemptDemoAccount(supabase, user.id, user.email);
}
/** Painel Sentinel: só o Master Admin (SUPER_ADMIN com is_master). */
const MASTER_ROUTES = ["/empresas", "/atividade", "/relatorio-piloto"];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Propaga a pathname atual nos headers da response para que server components
  // (em particular o layout do dashboard) possam ativar modos especiais como
  // "fullscreen" em rotas dedicadas (ex: /planos-acao/[id]).
  supabaseResponse.headers.set("x-pathname", path);

  // Public routes — allow unauthenticated
  if (matchesAnyRoute(path, PUBLIC_ROUTES)) {
    // If authenticated on /entrar, redirect to appropriate area
    if (path === "/entrar" && user) {
      const url = request.nextUrl.clone();
      url.search = "";
      const next = request.nextUrl.searchParams.get("next");

      if (next) {
        // Veio de um link interno (ex.: canal de denúncia): volta para lá.
        const target = new URL(safeNext(next, "/pesquisas"), request.url);
        url.pathname = target.pathname;
        url.search = target.search;
        return NextResponse.redirect(url);
      }

      const { data: userData } = await supabase
        .from("users")
        .select("role, is_master")
        .eq("auth_id", user.id)
        .single();

      if (userData) {
        url.pathname = homeForRole(userData.role, userData.is_master === true);
      } else {
        // Survey participant — redirect to the employee area
        url.pathname = "/pesquisas";
      }
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // API routes — handle auth internally; admin-panel ones also require the second factor
  if (path.startsWith("/api")) {
    if (user && ADMIN_API_PREFIXES.some((prefix) => matchesRoute(path, prefix))) {
      const { data: platformUser } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (platformUser && !(await passedSecondFactor(request, supabase, user))) {
        return NextResponse.json({ error: "Verificação em duas etapas pendente." }, { status: 403 });
      }
    }
    return supabaseResponse;
  }

  // No user → redirect to login (a área do colaborador volta ao destino depois do link)
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    if (matchesAnyRoute(path, EMPLOYEE_ROUTES)) {
      url.searchParams.set("next", path + request.nextUrl.search);
    }
    return NextResponse.redirect(url);
  }

  // Employee area — require auth but NOT a users record
  if (matchesAnyRoute(path, EMPLOYEE_ROUTES)) {
    return supabaseResponse;
  }

  // Platform user routes — require a users record
  const { data: userData } = await supabase
    .from("users")
    .select("role, is_master")
    .eq("auth_id", user.id)
    .single();

  if (!userData) {
    // Auth user with no platform record → redirect to the employee area
    const url = request.nextUrl.clone();
    url.pathname = "/pesquisas";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Todo acesso administrativo (RH, Admin, Gestor, Super Admin e Master) precisa do segundo
  // fator neste login: código por e-mail ou app autenticador.
  if (
    !matchesAnyRoute(path, SECOND_FACTOR_EXEMPT_ROUTES) &&
    !(await passedSecondFactor(request, supabase, user))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/verificar-acesso";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Painel Sentinel — only Master Admin
  if (matchesAnyRoute(path, MASTER_ROUTES)) {
    if (userData.role !== "SUPER_ADMIN" || userData.is_master !== true) {
      const url = request.nextUrl.clone();
      url.pathname = homeForRole(userData.role, false);
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Super admin routes — only SUPER_ADMIN
  if (matchesAnyRoute(path, SUPER_ADMIN_ROUTES)) {
    if (userData.role !== "SUPER_ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/inicio";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

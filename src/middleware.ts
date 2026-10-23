import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { matchesAnyRoute } from "@/lib/auth/routes";
import { safeNext } from "@/lib/auth/email-link";

const PUBLIC_ROUTES = ["/entrar", "/confirmar-acesso", "/obrigado", "/validacao"];
/** Área do colaborador: exige login, mas não um registro em users. */
const EMPLOYEE_ROUTES = ["/pesquisas", "/responder", "/denuncia"];
const SUPER_ADMIN_ROUTES = ["/empresas", "/usuarios"];

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
        .select("role")
        .eq("auth_id", user.id)
        .single();

      if (userData?.role === "SUPER_ADMIN") {
        url.pathname = "/empresas";
      } else if (userData) {
        url.pathname = "/inicio";
      } else {
        // Survey participant — redirect to the employee area
        url.pathname = "/pesquisas";
      }
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // API routes — handle auth internally
  if (path.startsWith("/api")) {
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
    .select("role")
    .eq("auth_id", user.id)
    .single();

  if (!userData) {
    // Auth user with no platform record → redirect to the employee area
    const url = request.nextUrl.clone();
    url.pathname = "/pesquisas";
    url.search = "";
    return NextResponse.redirect(url);
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

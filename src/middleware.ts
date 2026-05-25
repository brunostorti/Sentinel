import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/entrar", "/consentimento", "/obrigado", "/validacao", "/denuncia"];
const SURVEY_ROUTES = ["/pesquisas", "/responder"];
const SUPER_ADMIN_ROUTES = ["/empresas", "/usuarios"];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Propaga a pathname atual nos headers da response para que server components
  // (em particular o layout do dashboard) possam ativar modos especiais como
  // "fullscreen" em rotas dedicadas (ex: /planos-acao/[id]).
  supabaseResponse.headers.set("x-pathname", path);

  // Public routes — allow unauthenticated
  if (PUBLIC_ROUTES.some((route) => path.startsWith(route))) {
    // If authenticated on /entrar, redirect to appropriate area
    if (path.startsWith("/entrar") && user) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", user.id)
        .single();

      const url = request.nextUrl.clone();
      if (userData?.role === "SUPER_ADMIN") {
        url.pathname = "/empresas";
      } else if (userData) {
        url.pathname = "/painel";
      } else {
        // Survey participant — redirect to survey list
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

  // No user → redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    return NextResponse.redirect(url);
  }

  // Survey participant routes — require auth but NOT a users record
  if (SURVEY_ROUTES.some((route) => path.startsWith(route))) {
    return supabaseResponse;
  }

  // Platform user routes — require a users record
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  if (!userData) {
    // Auth user with no platform record → redirect to survey list
    const url = request.nextUrl.clone();
    url.pathname = "/pesquisas";
    return NextResponse.redirect(url);
  }

  // Super admin routes — only SUPER_ADMIN
  if (SUPER_ADMIN_ROUTES.some((route) => path.startsWith(route))) {
    if (userData.role !== "SUPER_ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/painel";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

/**
 * Compara a rota por segmento: "/denuncia" casa com "/denuncia" e "/denuncia/nova",
 * mas não com "/denuncias" (a tela do RH).
 */
export function matchesRoute(path: string, route: string): boolean {
  return path === route || path.startsWith(`${route}/`);
}

export function matchesAnyRoute(path: string, routes: readonly string[]): boolean {
  return routes.some((route) => matchesRoute(path, route));
}

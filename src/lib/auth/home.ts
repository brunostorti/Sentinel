/** Página inicial por papel. Master (SUPER_ADMIN + is_master) abre o Painel Sentinel. */
export function homeForRole(role: string | null | undefined, isMaster = false): string {
  if (role === "SUPER_ADMIN") return isMaster ? "/empresas" : "/usuarios";
  return "/inicio";
}

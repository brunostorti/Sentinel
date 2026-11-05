/** Rótulos das ações da equipe Sentinel registradas em admin_audit_log. */
export const ADMIN_ACTION_LABELS: Record<string, string> = {
  "company.create": "Criou a empresa",
  "company.update_commercial": "Alterou plano ou e-mails",
  "company.test_ai_key": "Testou a chave de IA",
  "company.note_add": "Adicionou uma nota",
  "company.note_delete": "Apagou uma nota",
  "company.report_view": "Abriu o relatório do piloto",
  "master.authenticator_enrolled": "Configurou o app autenticador",
};

export function adminActionLabel(action: string): string {
  return ADMIN_ACTION_LABELS[action] ?? action;
}

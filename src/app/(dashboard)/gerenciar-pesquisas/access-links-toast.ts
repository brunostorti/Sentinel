import { toast } from "sonner";
import type { AccessLinksResult } from "./actions";

/** Resultado do envio dos links de acesso (ativação e lembrete). */
export function showAccessLinksResult(result: AccessLinksResult, successTitle: string) {
  const description = `${result.sentCount} de ${result.totalPending} colaborador(es) receberam o link de acesso por e-mail.`;
  if (!result.notSent) {
    toast.success(successTitle, { description });
    return;
  }
  toast.warning("Parte dos e-mails não foi enviada", {
    description: `${description} ${
      result.rateLimited
        ? "O limite de envio de e-mails foi atingido; use \"Enviar lembrete\" mais tarde para os demais."
        : `${result.notSent} envio(s) falharam; tente "Enviar lembrete" mais tarde.`
    }`,
    duration: 12000,
  });
}

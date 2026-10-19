import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/icon";
import { parseEmailLinkType } from "@/lib/auth/email-link";
import { requestOrigin } from "@/lib/request-origin";
import { confirmAccess } from "./actions";
import { ConfirmButton } from "./confirm-button";

export default async function ConfirmAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash: tokenHash, type: rawType, next } = await searchParams;
  const type = parseEmailLinkType(rawType);
  if (!tokenHash || !type) redirect("/entrar?error=auth");

  const isInvite = type === "invite";

  // QR do próprio link, para quem abriu o e-mail no computador e prefere responder no
  // celular. Gerado aqui, nunca num serviço externo: o link é a chave de acesso da pessoa.
  let qrCode: string | null = null;
  if (!isInvite) {
    const link = new URL("/confirmar-acesso", await requestOrigin());
    link.searchParams.set("token_hash", tokenHash);
    link.searchParams.set("type", type);
    if (next) link.searchParams.set("next", next);
    qrCode = await QRCode.toDataURL(link.toString(), { margin: 1, width: 176 });
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-5 py-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Icon name={isInvite ? "how_to_reg" : "verified_user"} size={32} className="text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">
            {isInvite ? "Aceite seu convite" : "Confirme seu acesso"}
          </h1>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {isInvite
              ? "Clique no botão para aceitar o convite. Em seguida, você vai criar sua senha."
              : "Por segurança, o acesso só é liberado depois que você clica no botão abaixo."}
          </p>
        </div>
        <form action={confirmAccess} className="mx-auto max-w-xs">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={next ?? ""} />
          <ConfirmButton label={isInvite ? "Aceitar convite" : "Entrar no Sentinel"} />
        </form>
        {qrCode && (
          <div className="mx-auto hidden max-w-xs flex-col items-center gap-2 rounded-xl border border-border bg-muted/40 p-4 md:flex">
            <p className="text-sm font-semibold">Prefere responder no celular?</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem gerada no servidor (data URL) */}
            <img src={qrCode} alt="QR Code do link de acesso" width={176} height={176} className="rounded-lg bg-white" />
            <p className="text-xs text-muted-foreground">
              Aponte a câmera do celular para o código e toque em &quot;Entrar no Sentinel&quot; por lá.
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {isInvite
            ? "O link vale uma única vez. Se ele expirar, peça um novo convite ao administrador."
            : "O link vale uma única vez. Se ele expirar, peça um novo na tela de entrada."}
        </p>
      </CardContent>
    </Card>
  );
}

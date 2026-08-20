"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@/components/icon";

interface CertData {
  issuedAt: string;
  uniqueHash: string;
  tier: 1 | 2 | 3;
  companyName: string | null;
  companyCnpj: string | null;
  cycleTitle: string | null;
}

const TIER_LABEL: Record<1 | 2 | 3, string> = {
  1: "Nível 1 — Avaliação Realizada",
  2: "Nível 2 — Plano de Ação Implementado",
  3: "Nível 3 — Ciclo de Melhoria Comprovado",
};

export default function ValidacaoPage() {
  const params = useParams();
  const hash = params.hash as string;
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<CertData | null>(null);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (!hash) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/certificates/validate/${hash}`);
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as CertData;
          setCert(data);
          const expiry = new Date(data.issuedAt);
          expiry.setFullYear(expiry.getFullYear() + 1);
          setIsValid(expiry.getTime() > Date.now());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hash]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Icon name="refresh" className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6">
        <Icon name="gpp_bad" size={80} className="text-destructive mb-6" />
        <h1 className="text-3xl font-bold mb-2">Certificado Inválido</h1>
        <p className="text-zinc-400 text-center max-w-md">
          O código de autenticação não foi encontrado em nossos registros ou o documento foi forjado.
        </p>
      </div>
    );
  }

  const issuedDate = new Date(cert.issuedAt);
  const validUntil = new Date(issuedDate);
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 relative overflow-hidden">
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none ${isValid ? "bg-emerald-500/20" : "bg-red-500/20"}`}
      />

      <div className="relative z-10 max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-4">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center ${isValid ? "bg-emerald-500/10" : "bg-red-500/10"}`}
          >
            <Icon
              name={isValid ? "verified" : "warning"}
              size={48}
              className={isValid ? "text-emerald-500" : "text-red-500"}
            />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              {isValid ? "Certificado Autêntico e Válido" : "Certificado Expirado"}
            </h1>
            <p className="text-zinc-400 text-sm mt-2">
              Declaração emitida via Sentinel com base em evidências registradas na
              plataforma, referente à NR-1 e à Lei 14.831/2024.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="bg-zinc-950 rounded-xl p-5 border border-zinc-800 flex flex-col gap-1 text-left col-span-1 md:col-span-2">
            <span className="text-zinc-500 text-sm font-medium uppercase tracking-wider">
              Empresa Verificada
            </span>
            <span className="text-white text-xl font-bold">{cert.companyName}</span>
            {cert.companyCnpj && (
              <span className="text-zinc-400 font-mono text-sm mt-1">CNPJ: {cert.companyCnpj}</span>
            )}
          </div>

          <div className="bg-zinc-950 rounded-xl p-5 border border-zinc-800 flex flex-col gap-1 text-left">
            <span className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Ciclo</span>
            <span className="text-white font-medium">{cert.cycleTitle}</span>
          </div>

          <div className="bg-zinc-950 rounded-xl p-5 border border-zinc-800 flex flex-col gap-1 text-left">
            <span className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Nível</span>
            <span className="text-white font-medium">{TIER_LABEL[cert.tier]}</span>
          </div>

          <div className="bg-zinc-950 rounded-xl p-5 border border-zinc-800 flex justify-between items-center text-left col-span-1 md:col-span-2">
            <div>
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider block mb-1">
                Validade do Documento
              </span>
              <span className={`font-bold ${isValid ? "text-emerald-400" : "text-red-400"}`}>
                Expira em {validUntil.toLocaleDateString("pt-BR")}
              </span>
            </div>
            <div className="text-right">
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider block mb-1">
                Emitido em
              </span>
              <span className="text-zinc-300">{issuedDate.toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-800/50 text-center flex flex-col items-center gap-2">
          <span className="text-zinc-500 text-xs uppercase font-bold tracking-widest">
            Hash de Autenticidade Global
          </span>
          <p className="text-xs text-zinc-600 font-mono tracking-wider break-all bg-zinc-950 py-2 px-4 rounded-lg select-all border border-zinc-800">
            {cert.uniqueHash}
          </p>
        </div>
      </div>
    </div>
  );
}

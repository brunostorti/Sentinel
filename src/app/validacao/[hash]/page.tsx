"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
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
  2: "Nível 2 — Plano de Ação Aprovado",
  3: "Nível 3 — Ciclo de Reavaliação Concluído",
};

export default function ValidacaoPage() {
  const params = useParams();
  const hash = params.hash as string;
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<CertData | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

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

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificado Sentinel - ${cert?.companyName || "Empresa"}`,
          text: `Confira a validação do certificado de conformidade NR-1 emitido pelo Sentinel.`,
          url,
        });
        return;
      } catch {
        // usuário cancelou ou fallback
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  const handleSaveToMobile = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Icon name="refresh" className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-6">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
          <Icon name="gpp_bad" size={40} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Certificado Inválido</h1>
        <p className="text-slate-500 text-center max-w-sm text-sm">
          O código de autenticação não foi encontrado em nossos registros ou o documento foi forjado.
        </p>
      </div>
    );
  }

  const issuedDate = new Date(cert.issuedAt);
  const validUntil = new Date(issuedDate);
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    typeof window !== "undefined" ? window.location.href : `https://sentinel.app/validacao/${hash}`
  )}`;

  return (
    <main className="min-h-screen bg-[#edf3f8] flex flex-col items-center justify-center p-3 sm:p-6 print:bg-white print:p-0">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-sm border border-slate-200/80 p-6 sm:p-7 flex flex-col items-center print:shadow-none print:border-none">
        
        {/* Header / Brand */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
            <span className="text-xs font-bold text-blue-700">S</span>
          </div>
          <span className="font-semibold text-slate-800 text-sm tracking-tight">Sentinel</span>
        </div>

        {/* Badge Check */}
        <div className="w-16 h-16 rounded-full bg-[#1b7340] flex items-center justify-center mb-4 shadow-sm text-white">
          <Icon name="verified" size={34} className="text-white" />
        </div>

        {/* Título */}
        <h1 className="text-[1.35rem] font-bold text-slate-900 text-center leading-snug tracking-tight">
          {isValid ? "Certificado\nAutêntico e Válido" : "Certificado Expirado"}
        </h1>

        {/* Descrição legal */}
        <p className="text-[0.78rem] text-slate-600 text-center mt-3 mb-6 leading-relaxed">
          Declaração emitida pelo Sentinel com base em evidências registradas na plataforma sobre a
          gestão de riscos psicossociais (NR-1). Não substitui o Certificado Empresa Promotora da Saúde
          Mental (Lei 14.831/2024), concedido pelo governo federal.
        </p>

        {/* Cards Informativos */}
        <div className="w-full space-y-3">
          
          {/* Empresa Verificada */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-4 flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <span className="text-[0.65rem] font-bold text-blue-700 uppercase tracking-wider block">
                Empresa Verificada
              </span>
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {cert.companyName || "Empresa Avaliada"}
              </h2>
              {cert.companyCnpj && (
                <p className="text-xs text-slate-500 font-medium">
                  CNPJ: {cert.companyCnpj}
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-white rounded-lg p-1 border border-slate-200 shrink-0 flex items-center justify-center">
              <Image
                src={qrCodeUrl}
                alt="QR Code"
                width={40}
                height={40}
                className="w-full h-full object-contain"
                unoptimized
              />
            </div>
          </div>

          {/* Ciclo */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4">
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Ciclo
            </span>
            <p className="text-sm font-semibold text-slate-800">
              {cert.cycleTitle || "Ciclo Padrão"}
            </p>
          </div>

          {/* Nível */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4">
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Nível
            </span>
            <span className="inline-block bg-blue-100 text-blue-900 text-xs font-semibold px-3 py-1 rounded-full">
              {TIER_LABEL[cert.tier]}
            </span>
          </div>

          {/* Validade e Emissão */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 grid grid-cols-2 gap-2 divide-x divide-slate-100">
            <div>
              <span className="text-[0.62rem] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Validade do Documento
              </span>
              <span className={`text-xs font-bold ${isValid ? "text-[#1b7340]" : "text-red-600"} block`}>
                Expira em
              </span>
              <span className={`text-xs font-bold ${isValid ? "text-[#1b7340]" : "text-red-600"}`}>
                {validUntil.toLocaleDateString("pt-BR")}
              </span>
            </div>
            <div className="pl-4">
              <span className="text-[0.62rem] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Emitido em
              </span>
              <span className="text-xs font-medium text-slate-800 block mt-1">
                {issuedDate.toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>

        </div>

        {/* Hash Global */}
        <div className="w-full mt-4 text-center">
          <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Hash de Autenticidade Global
          </span>
          <div className="w-full bg-slate-100/90 border border-slate-200/80 rounded-xl px-3 py-2">
            <p className="text-[0.72rem] font-mono text-slate-700 tracking-tight break-all select-all">
              {cert.uniqueHash}
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="w-full grid grid-cols-2 gap-3 mt-5 print:hidden">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 bg-[#1968e6] hover:bg-[#1557c0] text-white text-xs font-medium py-3 px-4 rounded-xl shadow-sm transition active:scale-95"
          >
            <Icon name="share" size={16} />
            <span>{copySuccess ? "Link Copiado!" : "Compartilhar"}</span>
          </button>
          <button
            type="button"
            onClick={handleSaveToMobile}
            className="flex items-center justify-center gap-1.5 bg-[#1968e6] hover:bg-[#1557c0] text-white text-xs font-medium py-3 px-4 rounded-xl shadow-sm transition active:scale-95"
          >
            <Icon name="download" size={16} />
            <span>Salvar no Celular</span>
          </button>
        </div>

      </div>
    </main>
  );
}

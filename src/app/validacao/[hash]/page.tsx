"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";

export default function ValidacaoPage() {
  const params = useParams();
  const hash = params.hash as string;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (hash) {
      validateHash(hash);
    }
  }, [hash]);

  async function validateHash(hash: string) {
    const supabase = createClient();
    const { data: cert, error } = await supabase
      .from("certificates")
      .select("*, companies(name, cnpj), surveys(title, closed_at)")
      .eq("unique_hash", hash)
      .single();
    
    if (!error && cert) {
      setData(cert);
    }
    setLoading(false);
  }

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center bg-zinc-950"><Icon name="refresh" className="animate-spin text-primary" size={48} /></div>;
  }

  if (!data) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6">
         <Icon name="gpp_bad" size={80} className="text-destructive mb-6" />
         <h1 className="text-3xl font-bold mb-2">Certificado Inválido</h1>
         <p className="text-zinc-400 text-center max-w-md">O código de autenticação não foi encontrado em nossos registros ou o documento foi forjado.</p>
       </div>
     );
  }

  const issuedDate = new Date(data.issued_at);
  const validUntil = new Date(issuedDate);
  validUntil.setFullYear(validUntil.getFullYear() + 1);
  const isValid = validUntil.getTime() > Date.now();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none ${isValid ? 'bg-emerald-500/20' : 'bg-red-500/20'}`} />
      
      <div className="relative z-10 max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isValid ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            <Icon name={isValid ? "verified" : "warning"} size={48} className={isValid ? "text-emerald-500" : "text-red-500"} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              {isValid ? "Certificado Autêntico e Válido" : "Certificado Expirado"}
            </h1>
            <p className="text-zinc-400 text-sm mt-2">
              Este documento foi emitido legalmente via Sentinel, aferindo a conformidade da empresa com a NR1.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="bg-zinc-950 rounded-xl p-5 border border-zinc-800 flex flex-col gap-1 text-left col-span-1 md:col-span-2">
            <span className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Empresa Verificada</span>
            <span className="text-white text-xl font-bold">{Array.isArray(data.companies) ? data.companies[0]?.name : data.companies?.name}</span>
            <span className="text-zinc-400 font-mono text-sm mt-1">CNPJ: {Array.isArray(data.companies) ? data.companies[0]?.cnpj : data.companies?.cnpj}</span>
          </div>

          <div className="bg-zinc-950 rounded-xl p-5 border border-zinc-800 flex flex-col gap-1 text-left">
            <span className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Ciclo (Origem)</span>
            <span className="text-white font-medium">{Array.isArray(data.surveys) ? data.surveys[0]?.title : data.surveys?.title}</span>
          </div>

          <div className="bg-zinc-950 rounded-xl p-5 border border-zinc-800 flex flex-col gap-1 text-left">
            <span className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Métricas Analisadas</span>
            <span className="text-white font-medium">COPSOQ II (Completo)</span>
          </div>

          <div className="bg-zinc-950 rounded-xl p-5 border border-zinc-800 flex justify-between items-center text-left col-span-1 md:col-span-2">
            <div>
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider block mb-1">Validade do Documento</span>
              <span className={`font-bold ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
                Expira em {validUntil.toLocaleDateString("pt-BR")}
              </span>
            </div>
            <div className="text-right">
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider block mb-1">Emitido em</span>
              <span className="text-zinc-300">
                 {issuedDate.toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-800/50 text-center flex flex-col items-center gap-2">
           <span className="text-zinc-500 text-xs uppercase font-bold tracking-widest">Hash de Autenticidade Global</span>
           <p className="text-xs text-zinc-600 font-mono tracking-wider break-all bg-zinc-950 py-2 px-4 rounded-lg select-all border border-zinc-800">
             {data.unique_hash}
           </p>
        </div>
      </div>
    </div>
  );
}

"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-[#1968e6] px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90"
    >
      Salvar em PDF / Imprimir
    </button>
  );
}

/**
 * PDF do Dossiê NR-1 (jsPDF, no servidor). Estrutura:
 *  1. Identificação e participação      4. Riscos evidentes
 *  2. Documento de critérios            5. Plano de ação
 *  3. Inventário de riscos              6. Complementação e assinaturas
 *  Anexo A — resultados do questionário
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toFavorability } from "@/lib/copsoq/scoring";
import { LEVEL_INFO, LEVEL_ORDER, PROBABILITY_LABELS, PSYCHOSOCIAL_SEVERITY, SEVERITY_LABELS } from "./criteria";
import type { Dossier } from "./dossier";

const PRIMARY: [number, number, number] = [25, 104, 230];
const LEVEL_COLORS: Record<string, [number, number, number]> = {
  MUITO_ALTO: [231, 76, 60],
  ALTO: [243, 156, 18],
  MEDIO: [241, 196, 15],
  BAIXO: [46, 204, 113],
};
const LIGHT_PT: Record<string, string> = { GREEN: "Favorável", YELLOW: "Intermédio", RED: "Risco" };

/** As fontes padrão do PDF usam WinAnsi: troca o que ficaria ilegível. */
function t(text: string | null | undefined): string {
  return (text ?? "")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/→/g, "->")
    .replace(/Δ/g, "delta ")
    .replace(/[^\x00-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g, "");
}

const dateBR = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");

export function renderDossierPdf(d: Dossier): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  let y = M;

  const ensure = (needed: number) => {
    if (y + needed > H - 16) {
      doc.addPage();
      y = M;
    }
  };
  const heading = (text: string) => {
    ensure(14);
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...PRIMARY);
    doc.text(t(text), M, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  };
  const paragraph = (text: string, size = 9.5, style: "normal" | "bold" | "italic" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(t(text), W - 2 * M) as string[];
    for (const line of lines) {
      ensure(5);
      doc.text(line, M, y);
      y += size * 0.45;
    }
    y += 1.5;
  };
  const table = (head: string[], body: (string | number)[][], opts: Parameters<typeof autoTable>[1] = {}) => {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, bottom: 16 },
      head: [head.map(t)],
      body: body.map((row) => row.map((c) => t(String(c)))),
      styles: { fontSize: 8, cellPadding: 1.8, valign: "top" },
      headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: "bold" },
      theme: "grid",
      ...opts,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  };

  /* ── Capa ── */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(t("Dossiê NR-1 — Riscos psicossociais relacionados ao trabalho"), M, y + 4);
  y += 11;
  doc.setFontSize(12);
  doc.text(t(d.company.name), M, y);
  y += 6;
  paragraph(
    `Levantamento: "${d.survey.title}" (${d.survey.instrument}${d.survey.version ? `, versão ${d.survey.version}` : ""}), de ${dateBR(d.survey.startedAt)} a ${dateBR(d.survey.closedAt)}. Documento gerado em ${dateBR(d.generatedAt)}.`
  );
  paragraph(
    "Documento de apoio ao Programa de Gerenciamento de Riscos (PGR), organizado conforme o capítulo 1.5 da NR-1 e o Manual GRO/PGR (MTE, 2026). Gerado pelo Sentinel a partir de dados agregados e anônimos; a organização deve revisá-lo, completá-lo, datá-lo e assiná-lo (NR-1, 1.5.7.2) e integrá-lo ao seu PGR.",
    9,
    "italic"
  );

  /* ── 1. Identificação ── */
  heading("1. Identificação da organização e do levantamento");
  const c = d.company;
  table(
    ["Campo", "Informação"],
    [
      ["Razão social", c.name],
      ["CNPJ", c.cnpj ?? "a preencher"],
      ["Atividade (caracterização dos processos e ambientes — 1.5.7.3.2 a)", c.industry ?? "a preencher"],
      ["Trabalhadores", c.employeeCount ?? "a preencher"],
      [
        "Organização do trabalho (caracterização das atividades — 1.5.7.3.2 b)",
        [
          c.workRegime ? `regime ${c.workRegime}` : null,
          c.hasRemote ? "com trabalho remoto" : null,
          c.hasShiftWorkers ? "com trabalho em turnos" : null,
          c.predominantRole ? `perfil de cargos: ${c.predominantRole}` : null,
        ]
          .filter(Boolean)
          .join("; ") || "a preencher pela organização",
      ],
      [
        "Participação",
        `${d.survey.responses} respostas de ${d.survey.invited} convidados (${d.survey.invited ? Math.round((d.survey.responses / d.survey.invited) * 100) : 0}% de adesão). Respostas anônimas: nenhum dado identifica quem respondeu.`,
      ],
    ],
    { columnStyles: { 0: { cellWidth: 95, fontStyle: "bold" } } }
  );
  table(
    ["Setor (grupo de trabalhadores)", "Convidados", "Respostas", "Resultados"],
    d.groups.map((g) => [g.name, g.invited, g.responses, g.visible ? "Analisados" : "Ocultos (menos de 5 respostas ou proteção do anonimato)"])
  );

  /* ── 2. Critérios ── */
  heading("2. Documento de critérios (NR-1, 1.5.4.4.2.2)");
  paragraph(
    "Critério proposto pelo Sentinel com base no Manual GRO/PGR (MTE, 2026, seções 11.3 a 11.6), que usa como exemplo a matriz da ISO 45002:2023. A organização deve revisá-lo e adotá-lo formalmente; o Manual orienta que cada organização desenvolva seus próprios critérios."
  );
  paragraph(
    `Severidade (1.5.4.4.4): para cada perigo vale a consequência de maior magnitude. Para os fatores psicossociais, a consequência listada no Guia do MTE (2025) é o transtorno mental, cujo pior cenário (incapacitante, com afastamento) é classificado como ${SEVERITY_LABELS[PSYCHOSOCIAL_SEVERITY]} (${PSYCHOSOCIAL_SEVERITY}).`
  );
  paragraph(
    "Probabilidade (1.5.4.4.5.3): considera as exigências da atividade (intensidade e duração) e a eficácia das medidas implementadas. A intensidade vem da favorabilidade da dimensão do questionário (0 a 100; quanto menor, pior); as perguntas medem frequência nas últimas 4 semanas, o que cobre a duração. Faixas: favorabilidade de 66,7 ou mais = sem exposição relevante; 50 a 66,6 = pouco provável (2); 33,3 a 49,9 = possível (3); 16,7 a 33,2 = provável (4); abaixo de 16,7 = muito provável (5). Ajustes: +1 quando o mesmo grupo já apresenta agravos à saúde em nível de risco (burnout, stress, sintomas depressivos, sono); -1 quando há medida concluída para o perigo e a reavaliação mostrou melhora. Resultado entre 1 e 5."
  );
  table(
    ["Severidade \\ Probabilidade", "Muito improvável (1)", "Pouco provável (2)", "Possível (3)", "Provável (4)", "Muito provável (5)"],
    [5, 4, 3, 2, 1].map((s) => [`${SEVERITY_LABELS[s]} (${s})`, ...[1, 2, 3, 4, 5].map((p) => s * p)]),
    {
      didParseCell: (data) => {
        if (data.section !== "body" || data.column.index === 0) return;
        const v = Number(data.cell.raw);
        const level = v >= 20 ? "MUITO_ALTO" : v >= 10 ? "ALTO" : v >= 5 ? "MEDIO" : "BAIXO";
        data.cell.styles.fillColor = LEVEL_COLORS[level];
        data.cell.styles.halign = "center";
      },
    }
  );
  table(
    ["Nível (S x P)", "Prioridade", "Ações", "Prazo"],
    LEVEL_ORDER.map((l) => [`${LEVEL_INFO[l].label} (${LEVEL_INFO[l].range})`, LEVEL_INFO[l].priority, LEVEL_INFO[l].action, LEVEL_INFO[l].deadline]),
    { columnStyles: { 2: { cellWidth: 140 } } }
  );
  paragraph(
    "Priorização (1.5.5.2.1.1): dentro do mesmo nível, o perigo que atinge mais trabalhadores vem primeiro. Revisão (1.5.4.4.6): a avaliação é revista a cada 2 anos ou antes, após medidas de prevenção, mudanças no trabalho, inadequação das medidas, acidentes ou doenças relacionadas ao trabalho, mudança legal ou pedido justificado da CIPA. Grupos com menos de 5 respostas não têm resultados exibidos; devem ser avaliados por observação e diálogo (MTE, Perguntas e Respostas, item 11)."
  );

  /* ── 3. Inventário ── */
  heading("3. Inventário de riscos psicossociais (NR-1, 1.5.7.3.2)");
  paragraph(
    "Perigos (c), possíveis agravos (d), grupos expostos (e), medidas implementadas (f), caracterização da exposição (g) e avaliação com classificação (i). Os resultados do questionário são subsídio da avaliação (h) e estão no Anexo A. Linhas de setor aparecem quando o risco no setor é maior que na empresa toda."
  );
  if (d.inventory.length === 0) {
    paragraph("Nenhum perigo com exposição relevante foi identificado pelo questionário nos grupos analisados.", 9.5, "italic");
  } else {
    table(
      ["#", "Perigo (fator de risco)", "Grupo exposto", "Possíveis agravos", "Exposição (escore 0-100)", "Medidas existentes", "S", "P", "Nível", "Prazo"],
      d.inventory.map((r, i) => [
        i + 1,
        `${r.hazard.label}${r.hazard.inGuide ? "" : " *"}`,
        `${r.group.name} (${r.group.headcount} trab.; ${r.group.responses} resp.)`,
        r.hazard.consequences.join("; ") + (r.healthEvidence.length ? `. Agravos já relatados: ${r.healthEvidence.map((h) => `${h.name} ${h.score}`).join(", ")}` : ""),
        r.dimensions.map((x) => `${x.name}: ${x.score} (${x.highIsRisk ? "maior = pior" : "maior = melhor"})`).join("\n"),
        r.measures.length ? r.measures.map((m) => `${m.title}${m.status === "COMPLETED" ? " (concluída)" : ""}`).join("\n") : "Nenhuma registrada",
        r.severity,
        `${r.probability}${r.probability !== r.baseProbability ? ` (base ${r.baseProbability})` : ""}`,
        LEVEL_INFO[r.level].label,
        LEVEL_INFO[r.level].deadline,
      ]),
      {
        columnStyles: { 0: { cellWidth: 7 }, 1: { cellWidth: 42 }, 2: { cellWidth: 30 }, 3: { cellWidth: 34 }, 4: { cellWidth: 48 }, 5: { cellWidth: 40 }, 6: { cellWidth: 7 }, 7: { cellWidth: 13 }, 8: { cellWidth: 16 } },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 8) {
            const row = d.inventory[data.row.index];
            data.cell.styles.fillColor = LEVEL_COLORS[row.level];
            data.cell.styles.fontStyle = "bold";
          }
        },
      }
    );
    paragraph(`* Perigo medido pelo questionário que não consta da listagem exemplificativa do Guia do MTE (2025). Probabilidades: ${[1, 2, 3, 4, 5].map((p) => `${p} = ${PROBABILITY_LABELS[p].toLowerCase()}`).join("; ")}.`, 8, "italic");
  }

  /* ── 4. Riscos evidentes ── */
  heading("4. Riscos evidentes e sinais que pedem ação imediata");
  if (d.evidentRisks.length === 0) {
    paragraph("Nenhuma denúncia nos últimos 12 meses e nenhum relato de assédio ou violência no questionário.");
  } else {
    paragraph(
      "Risco ocupacional evidente é a situação de risco óbvio e não controlado, que pode ser reduzido com medidas imediatas (NR-1, Anexo I). Os itens abaixo independem da matriz:"
    );
    table(["Origem", "Situação e encaminhamento"], d.evidentRisks.map((e) => [e.source, e.description]), { columnStyles: { 0: { cellWidth: 60 } } });
  }

  /* ── 5. Plano de ação ── */
  heading("5. Plano de ação (NR-1, 1.5.5.2)");
  paragraph(
    "Medidas de prevenção aprovadas pela organização, com cronograma, responsáveis e formas de acompanhamento e aferição de resultados (1.5.5.2.2). A aferição de resultados é feita pela reaplicação do questionário e pelos indicadores de cada medida."
  );
  if (d.plan.length === 0) {
    paragraph("Nenhuma medida aprovada até o momento.", 9.5, "italic");
  } else {
    table(
      ["Medida de prevenção", "Dimensão", "Responsável", "Prazo", "Situação", "Acompanhamento e aferição"],
      d.plan.map((p) => [
        p.title,
        p.dimension ?? "—",
        p.responsible ?? "A DEFINIR",
        p.dueDate ? dateBR(`${p.dueDate}T12:00:00Z`) : "A DEFINIR",
        p.status,
        [p.monitoring ? `Cadência: ${p.monitoring}` : null, ...p.indicators].filter(Boolean).join("\n") || "—",
      ]),
      {
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 32 }, 2: { cellWidth: 28 }, 3: { cellWidth: 20 }, 4: { cellWidth: 22 } },
        didParseCell: (data) => {
          if (data.section === "body" && (data.column.index === 2 || data.column.index === 3) && data.cell.raw === "A DEFINIR") {
            data.cell.styles.textColor = [231, 76, 60];
            data.cell.styles.fontStyle = "bold";
          }
        },
      }
    );
  }

  /* ── 6. Avisos e complementação ── */
  heading("6. Pontos de atenção e complementação pela organização");
  for (const w of d.warnings) paragraph(`• ${w}`);
  paragraph("Para completar o processo (marque e registre as evidências no PGR):", 9.5, "bold");
  for (const item of [
    "Os trabalhadores foram informados antes da pesquisa sobre objetivos e anonimato (Guia MTE, passo 4).",
    "A CIPA e os representantes dos trabalhadores foram consultados sobre os resultados (NR-1, 1.5.3.3).",
    "Os perigos foram confirmados com observação do trabalho e escuta das equipes, inclusive nos grupos ocultos.",
    "O inventário e o plano foram integrados à Avaliação Ergonômica Preliminar (NR-17) e ao PGR.",
    "Os trabalhadores receberam a comunicação dos riscos consolidados e das medidas previstas (NR-1, 1.5.3.3 c).",
  ]) {
    paragraph(`[  ]  ${item}`);
  }
  y += 6;
  ensure(24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.line(M, y + 10, M + 110, y + 10);
  doc.line(M + 140, y + 10, M + 220, y + 10);
  doc.text(t("Responsável pela organização (nome, cargo e assinatura)"), M, y + 15);
  doc.text(t("Data"), M + 140, y + 15);
  y += 22;

  /* ── Anexo A ── */
  doc.addPage();
  y = M;
  heading("Anexo A — Resultados do questionário (dados agregados)");
  paragraph(
    `${d.survey.instrument}. Escala de 0 a 100; semáforo pelos terços da escala, conforme o manual do COPSOQ II. Grupos com menos de 5 respostas não aparecem.`
  );
  if (d.companyScores.length) {
    table(
      ["Dimensão", "Escore", "Direção", "Favorabilidade", "Semáforo"],
      d.companyScores.map((s) => [
        s.name,
        s.displayScore,
        s.scoringDirection === "HIGH_IS_RISK" ? "maior = pior" : "maior = melhor",
        Math.round(toFavorability(s.meanScore, s.scoringDirection)),
        LIGHT_PT[s.trafficLight],
      ]),
      { columnStyles: { 0: { cellWidth: 90 } } }
    );
  }
  if (d.departmentScores.length) {
    table(
      ["Setor", "Respostas", "Dimensões em Risco", "Dimensões em nível Intermédio"],
      d.departmentScores.map((g) => [
        g.name,
        g.responses,
        g.scores.filter((s) => s.trafficLight === "RED").map((s) => `${s.name} (${s.displayScore})`).join(", ") || "—",
        g.scores.filter((s) => s.trafficLight === "YELLOW").map((s) => `${s.name} (${s.displayScore})`).join(", ") || "—",
      ]),
      { columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 20 } } }
    );
  }

  /* ── Rodapé ── */
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(t(`Sentinel — Dossiê NR-1 · ${d.company.name} · gerado em ${dateBR(d.generatedAt)}`), M, H - 8);
    doc.text(`${i} / ${pages}`, W - M, H - 8, { align: "right" });
    doc.setTextColor(0);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

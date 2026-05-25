"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import type { DimensionScore } from "@/lib/copsoq/types";

interface SurveyReport {
  surveyId: string;
  surveyTitle: string;
  version: string;
  status: string;
  closedAt: string | null;
  scores: DimensionScore[];
  isAnonymized: boolean;
  departmentStats: Array<{
    departmentName: string;
    invited: number;
    responded: number;
  }>;
}

interface ReportExporterProps {
  companyName: string;
  surveyReports: SurveyReport[];
}

const TRAFFIC_LIGHT_PT: Record<string, string> = {
  GREEN: "Favorável",
  YELLOW: "Intermédio",
  RED: "Risco",
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(report: SurveyReport, companyName: string) {
  const lines: string[] = [];

  // Header
  lines.push("Relatório COPSOQ II - " + companyName);
  lines.push("Pesquisa: " + report.surveyTitle);
  lines.push("Versão: " + report.version);
  lines.push(
    "Status: " + (report.status === "CLOSED" ? "Encerrada" : "Ativa")
  );
  lines.push("");

  if (report.isAnonymized) {
    lines.push(
      "Dados insuficientes para preservar o anonimato (menos de 5 respostas)."
    );
  } else if (report.scores.length > 0) {
    // Dimension scores
    lines.push("Dimensão,Categoria,Score (0-100),Nível");
    for (const s of report.scores) {
      lines.push(
        `"${s.name}","${s.category}",${s.displayScore.toFixed(1)},${TRAFFIC_LIGHT_PT[s.trafficLight] ?? s.trafficLight}`
      );
    }
    lines.push("");
  }

  // Department stats
  if (report.departmentStats.length > 0) {
    lines.push("Departamento,Convidados,Respondidos");
    for (const d of report.departmentStats) {
      lines.push(`"${d.departmentName}",${d.invited},${d.responded}`);
    }
  }

  const csv = lines.join("\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const filename = `relatorio-${report.surveyTitle.replace(/\s+/g, "-").toLowerCase()}.csv`;
  downloadBlob(blob, filename);
}

async function exportPDF(report: SurveyReport, companyName: string) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório COPSOQ II", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(companyName, pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.text(`Pesquisa: ${report.surveyTitle}`, 14, y);
  y += 6;
  doc.text(`Versão: ${report.version}`, 14, y);
  y += 6;
  doc.text(
    `Status: ${report.status === "CLOSED" ? "Encerrada" : "Ativa"}`,
    14,
    y
  );
  y += 6;
  if (report.closedAt) {
    doc.text(
      `Encerrada em: ${new Date(report.closedAt).toLocaleDateString("pt-BR")}`,
      14,
      y
    );
    y += 6;
  }
  y += 4;

  if (report.isAnonymized) {
    doc.setTextColor(200, 0, 0);
    doc.text(
      "Dados insuficientes para preservar o anonimato (menos de 5 respostas).",
      14,
      y
    );
    doc.setTextColor(0, 0, 0);
    y += 10;
  } else if (report.scores.length > 0) {
    // Dimension scores table
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Resultados por Dimensão", 14, y);
    y += 4;

    const tableData = report.scores.map((s) => [
      s.name,
      s.category,
      s.displayScore.toFixed(1),
      TRAFFIC_LIGHT_PT[s.trafficLight] ?? s.trafficLight,
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Dimensão", "Categoria", "Score (0-100)", "Nível"]],
      body: tableData,
      headStyles: { fillColor: [25, 104, 230] },
      styles: { fontSize: 9 },
      didParseCell(data) {
        // Color the risk level cell
        if (data.section === "body" && data.column.index === 3) {
          const val = data.cell.raw as string;
          if (val === "Risco") {
            data.cell.styles.textColor = [231, 76, 60];
            data.cell.styles.fontStyle = "bold";
          } else if (val === "Intermédio") {
            data.cell.styles.textColor = [241, 196, 15];
            data.cell.styles.fontStyle = "bold";
          } else if (val === "Favorável") {
            data.cell.styles.textColor = [46, 204, 113];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 10;
  }

  // Department stats
  if (report.departmentStats.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Participação por Departamento", 14, y);
    y += 4;

    const deptData = report.departmentStats.map((d) => [
      d.departmentName,
      String(d.invited),
      String(d.responded),
      d.invited > 0
        ? `${Math.round((d.responded / d.invited) * 100)}%`
        : "0%",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Departamento", "Convidados", "Respondidos", "Taxa"]],
      body: deptData,
      headStyles: { fillColor: [25, 104, 230] },
      styles: { fontSize: 9 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Sentinel - Relatório gerado em ${new Date().toLocaleDateString("pt-BR")}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: "right" }
    );
  }

  const filename = `relatorio-${report.surveyTitle.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  doc.save(filename);
}

export function ReportExporter({
  companyName,
  surveyReports,
}: ReportExporterProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  async function handleExport(
    report: SurveyReport,
    format: "pdf" | "csv"
  ) {
    setExporting(`${report.surveyId}-${format}`);
    try {
      if (format === "pdf") {
        await exportPDF(report, companyName);
      } else {
        exportCSV(report, companyName);
      }
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {surveyReports.map((report) => {
        const totalInvited = report.departmentStats.reduce(
          (a, d) => a + d.invited,
          0
        );
        const totalResponded = report.departmentStats.reduce(
          (a, d) => a + d.responded,
          0
        );
        const redCount = report.scores.filter(
          (s) => s.trafficLight === "RED"
        ).length;
        const yellowCount = report.scores.filter(
          (s) => s.trafficLight === "YELLOW"
        ).length;

        return (
          <Card key={report.surveyId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">
                {report.surveyTitle}
              </CardTitle>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {report.version}
                </span>
                <span
                  className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                    report.status === "CLOSED"
                      ? "bg-muted text-muted-foreground"
                      : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  }`}
                >
                  {report.status === "CLOSED" ? "Encerrada" : "Ativa"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">
                    {totalResponded}
                  </span>{" "}
                  / {totalInvited} respostas
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    {report.scores.length}
                  </span>{" "}
                  dimensões
                </div>
                {redCount > 0 && (
                  <div className="text-red-500">
                    {redCount} em risco
                  </div>
                )}
                {yellowCount > 0 && (
                  <div className="text-yellow-600">
                    {yellowCount} intermédio
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1 text-xs"
                  disabled={exporting === `${report.surveyId}-csv`}
                  onClick={() => handleExport(report, "csv")}
                >
                  <Icon name="download" size={14} />
                  CSV
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1 text-xs"
                  disabled={exporting === `${report.surveyId}-pdf`}
                  onClick={() => handleExport(report, "pdf")}
                >
                  <Icon name="picture_as_pdf" size={14} />
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

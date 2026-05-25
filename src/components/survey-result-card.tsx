"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Icon } from "@/components/icon"
import { Button } from "@/components/ui/button"

interface DimensionScore {
  name: string
  score: number
  riskLevel: "favorável" | "intermédio" | "risco"
}

interface SurveyResultCardProps {
  results: DimensionScore[]
  onFinish: () => void
}

export function SurveyResultCard({ results, onFinish }: SurveyResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="border-primary/20 bg-primary/5 text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="check_circle" size={40} />
          </div>
          <CardTitle className="text-2xl font-bold">Pesquisa Concluída!</CardTitle>
          <p className="text-muted-foreground">
            Obrigado por participar. Abaixo está uma visão geral anônima do seu perfil de bem-estar baseado nas suas respostas.
          </p>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {results.map((res, idx) => (
          <motion.div
            key={res.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="h-full border-l-4 overflow-hidden" style={{ borderLeftColor: getRiskColor(res.riskLevel) }}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {res.name}
                  </p>
                  <p className="text-sm font-medium">{res.riskLevel.toUpperCase()}</p>
                </div>
                <div 
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ backgroundColor: getRiskColor(res.riskLevel) }}
                >
                  <Icon name={getRiskIcon(res.riskLevel)} size={20} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
        <p className="text-xs text-muted-foreground italic">
          Nota: Estes resultados são apenas para sua reflexão pessoal e não são compartilhados individualmente com a empresa. O anonimato é garantido.
        </p>
      </div>

      <Button className="w-full py-6 text-lg font-bold" onClick={onFinish}>
        Finalizar e Sair
      </Button>
    </motion.div>
  )
}

function getRiskColor(level: string) {
  switch (level) {
    case "favorável": return "#2ecc71"
    case "intermédio": return "#f1c40f"
    case "risco": return "#e74c3c"
    default: return "#94a3b8"
  }
}

function getRiskIcon(level: string) {
  switch (level) {
    case "favorável": return "sentiment_very_satisfied"
    case "intermédio": return "sentiment_neutral"
    case "risco": return "sentiment_very_dissatisfied"
    default: return "help_outline"
  }
}

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { SurveyResultCard } from "@/components/survey-result-card";
import { invertScore, toTrafficLight } from "@/lib/copsoq/scoring";
import type { ScoringDirection, TrafficLight } from "@/lib/constants";
import { submitSurveyResponse } from "./actions";

interface ResponseOption {
  label: string;
  value: number;
}

interface Question {
  id: string;
  text: string;
  dimensionName: string;
  category: string;
  scoringDirection: ScoringDirection;
  isInverted: boolean;
  orderIndex: number;
  responseOptions: ResponseOption[] | null;
}

interface SurveyFormProps {
  surveyId: string;
  surveyTitle: string;
  participantId: string;
  departmentId: string;
  questions: Question[];
}

/** Fallback response options when no response format is defined */
const DEFAULT_LIKERT: ResponseOption[] = [
  { value: 0, label: "Nunca / Nada" },
  { value: 25, label: "Raramente / Pouco" },
  { value: 50, label: "Às vezes / Moderado" },
  { value: 75, label: "Frequentemente / Muito" },
  { value: 100, label: "Sempre / Extremamente" },
];

interface DimensionScore {
  name: string;
  score: number;
  riskLevel: "favorável" | "intermédio" | "risco";
}

/** Map the canonical traffic light to the PT-BR label shown to the employee */
const LIGHT_TO_LABEL: Record<TrafficLight, DimensionScore["riskLevel"]> = {
  GREEN: "favorável",
  YELLOW: "intermédio",
  RED: "risco",
};

export default function SurveyForm({
  surveyId,
  surveyTitle,
  participantId,
  departmentId,
  questions,
}: SurveyFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<DimensionScore[] | null>(null);

  // Group questions by category
  const sections = useMemo(() => {
    const map = new Map<string, Question[]>();
    for (const q of questions) {
      const existing = map.get(q.category) || [];
      existing.push(q);
      map.set(q.category, existing);
    }
    return Array.from(map.entries()).map(([category, qs]) => ({
      category,
      questions: qs,
    }));
  }, [questions]);

  const section = sections[currentSection];
  const totalSections = sections.length;
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  const sectionAnswered = section.questions.every((q) => answers[q.id] != null);
  const allAnswered = answeredCount === totalQuestions;
  const isLastSection = currentSection === totalSections - 1;

  function handleAnswer(questionId: string, score: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: score }));
  }

  function handleNext() {
    if (!sectionAnswered) return;
    setCurrentSection((prev) => Math.min(prev + 1, totalSections - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePrevious() {
    setCurrentSection((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (!allAnswered) return;
    setError("");
    setSubmitting(true);

    const result = await submitSurveyResponse({
      surveyId,
      participantId,
      departmentId,
      answers: Object.entries(answers).map(([questionId, score]) => ({
        questionId,
        score,
      })),
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    // Calculate individual feedback results using the canonical scoring engine,
    // so the risk colors match the HR dashboard (applies inversion + per-dimension
    // scoring direction from the DB, instead of hardcoded thresholds).
    const dimensionMap = new Map<string, number[]>();
    const directionMap = new Map<string, ScoringDirection>();
    for (const q of questions) {
      const raw = answers[q.id];
      const adjusted = q.isInverted ? invertScore(raw) : raw;
      const scores = dimensionMap.get(q.dimensionName) || [];
      scores.push(adjusted);
      dimensionMap.set(q.dimensionName, scores);
      directionMap.set(q.dimensionName, q.scoringDirection);
    }

    const calculatedResults: DimensionScore[] = Array.from(
      dimensionMap.entries()
    ).map(([name, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const direction = directionMap.get(name) ?? "HIGH_IS_RISK";
      return {
        name,
        score: avg,
        riskLevel: LIGHT_TO_LABEL[toTrafficLight(avg, direction)],
      };
    });

    setResults(calculatedResults);
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (results) {
    return (
      <SurveyResultCard 
        results={results} 
        onFinish={() => router.push("/obrigado")} 
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{surveyTitle}</span>
          <span>
            {answeredCount}/{totalQuestions}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Seção {currentSection + 1} de {totalSections} —{" "}
          <span className="font-medium">{section.category}</span>
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {section.questions.map((q, idx) => (
          <Card key={q.id} className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium leading-snug">
                {idx + 1}. {q.text}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {q.dimensionName}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-1.5">
                {(q.responseOptions ?? DEFAULT_LIKERT).map((opt) => {
                  const selected = answers[q.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleAnswer(q.id, opt.value)}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-card hover:bg-muted/50"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {selected && opt.value}
                      </span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {currentSection > 0 && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={handlePrevious}
          >
            <Icon name="arrow_back" size={18} />
            Anterior
          </Button>
        )}

        {isLastSection ? (
          <Button
            className="flex-1"
            disabled={!allAnswered || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Enviando..." : "Enviar respostas"}
          </Button>
        ) : (
          <Button
            className="flex-1"
            disabled={!sectionAnswered}
            onClick={handleNext}
          >
            Próximo
            <Icon name="arrow_forward" size={18} />
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {/* Anonymity reminder */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
        <Icon name="lock" size={16} className="text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          Suas respostas são completamente anônimas e não podem ser rastreadas.
        </p>
      </div>
    </div>
  );
}

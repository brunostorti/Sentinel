"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Icon } from "@/components/icon"
import { Button } from "@/components/ui/button"

export function AccessibilityWidget() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [fontScale, setFontScale] = React.useState(1)
  const [highContrast, setHighContrast] = React.useState(false)
  const [colorBlind, setColorBlind] = React.useState<string>("none")
  const [ttsEnabled, setTtsEnabled] = React.useState(false)

  // Initialize and persist settings
  React.useEffect(() => {
    const saved = localStorage.getItem("accessibility-settings")
    if (saved) {
      const settings = JSON.parse(saved)
      setFontScale(settings.fontScale || 1)
      setHighContrast(settings.highContrast || false)
      setColorBlind(settings.colorBlind || "none")
      setTtsEnabled(settings.ttsEnabled || false)
    }
  }, [])

  // Apply settings
  React.useEffect(() => {
    const html = document.documentElement
    html.style.setProperty("--font-scale", fontScale.toString())
    
    if (highContrast) html.classList.add("high-contrast")
    else html.classList.remove("high-contrast")

    const cbClasses = ["protanopia", "deuteranopia", "tritanopia", "achromatopsia"]
    cbClasses.forEach(c => html.classList.remove(c))
    if (colorBlind !== "none") html.classList.add(colorBlind)

    localStorage.setItem("accessibility-settings", JSON.stringify({
      fontScale, highContrast, colorBlind, ttsEnabled
    }))
  }, [fontScale, highContrast, colorBlind, ttsEnabled])

  // TTS logic
  React.useEffect(() => {
    if (!ttsEnabled) return

    const handleMouseUp = () => {
      const selection = window.getSelection()?.toString()
      if (selection && selection.length > 0) {
        const utterance = new SpeechSynthesisUtterance(selection)
        utterance.lang = "pt-BR"
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utterance)
      }
    }

    document.addEventListener("mouseup", handleMouseUp)
    return () => document.removeEventListener("mouseup", handleMouseUp)
  }, [ttsEnabled])

  const reset = () => {
    setFontScale(1)
    setHighContrast(false)
    setColorBlind("none")
    setTtsEnabled(false)
    window.speechSynthesis.cancel()
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
        title="Acessibilidade"
      >
        <Icon name="accessibility_new" size={28} />
      </button>

      {/* Sidebar/Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed bottom-24 right-6 z-50 w-72 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Acessibilidade</h3>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Font Size */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Tamanho da Fonte</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setFontScale(Math.max(0.8, fontScale - 0.1))}
                  >
                    A-
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setFontScale(Math.min(1.5, fontScale + 0.1))}
                  >
                    A+
                  </Button>
                </div>
              </div>

              {/* Contrast */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Contraste</p>
                <Button
                  variant={highContrast ? "default" : "outline"}
                  className="w-full justify-start gap-2"
                  onClick={() => setHighContrast(!highContrast)}
                >
                  <Icon name="contrast" size={18} />
                  {highContrast ? "Desativar Alto Contraste" : "Ativar Alto Contraste"}
                </Button>
              </div>

              {/* Color Blindness */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Filtros de Daltonismo</p>
                <select
                  value={colorBlind}
                  onChange={(e) => setColorBlind(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                >
                  <option value="none">Nenhum</option>
                  <option value="protanopia">Protanopia (Vermelho)</option>
                  <option value="deuteranopia">Deuteranopia (Verde)</option>
                  <option value="tritanopia">Tritanopia (Azul)</option>
                  <option value="achromatopsia">Acromatopsia (Cinza)</option>
                </select>
              </div>

              {/* TTS */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Ler em Voz Alta</p>
                <Button
                  variant={ttsEnabled ? "default" : "outline"}
                  className="w-full justify-start gap-2"
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                >
                  <Icon name={ttsEnabled ? "volume_up" : "volume_off"} size={18} />
                  {ttsEnabled ? "TTS Ativado (Selecione texto)" : "Ativar TTS"}
                </Button>
              </div>

              <div className="my-2 h-px bg-border" />

              <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={reset}>
                Resetar Configurações
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

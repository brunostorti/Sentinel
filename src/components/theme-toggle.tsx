"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Icon } from "@/components/icon"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-xl border border-border/50 bg-muted/20" />
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95"
      title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      <div className="relative h-5 w-5 transition-transform duration-500 [transform-style:preserve-3d] group-hover:rotate-12">
        {theme === "dark" ? (
          <Icon name="light_mode" size={20} className="text-yellow-400 animate-in zoom-in-50 duration-300" />
        ) : (
          <Icon name="dark_mode" size={20} className="text-primary animate-in zoom-in-50 duration-300" />
        )}
      </div>
    </button>
  )
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface TutorialSlide {
  title: string;
  description: string;
  icon: string;
  image?: string;
}

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  slides: TutorialSlide[];
}

export function TutorialModal({ isOpen, onClose, slides }: TutorialModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg p-4"
      >
        <Card className="overflow-hidden border-border/50 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 bg-muted/30 pb-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
              <Icon name="help" size={14} />
              <span>Tutorial • Passo {currentSlide + 1} de {slides.length}</span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Icon name="close" size={20} />
            </button>
          </CardHeader>

          <CardContent className="pt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 text-center"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
                  <Icon name={slide.icon} size={40} filled className="text-primary" />
                </div>
                
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-black tracking-tight">
                    {slide.title}
                  </CardTitle>
                  <p className="text-muted-foreground leading-relaxed">
                    {slide.description}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-border/40 bg-muted/30 pt-6 pb-6">
            <Button
              variant="ghost"
              onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
              disabled={currentSlide === 0}
              className="gap-2"
            >
              <Icon name="chevron_left" size={18} />
              Anterior
            </Button>

            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-all ${
                    i === currentSlide ? "bg-primary w-4" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={() => {
                if (currentSlide === slides.length - 1) {
                  onClose();
                } else {
                  setCurrentSlide((prev) => prev + 1);
                }
              }}
              className="gap-2"
            >
              {currentSlide === slides.length - 1 ? "Concluir" : "Próximo"}
              <Icon name={currentSlide === slides.length - 1 ? "check" : "chevron_right"} size={18} />
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const pathname = usePathname();

  // Remounting on pathname change replays the CSS enter animation — no effect/state
  // needed (avoids cascading renders from setState-in-effect).
  return (
    <div key={pathname} className={`animate-fade-in-up ${className}`}>
      {children}
    </div>
  );
}

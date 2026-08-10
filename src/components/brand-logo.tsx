import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoSize = "sm" | "md" | "lg" | "xl";
type BrandWordmarkSize = "sm" | "md" | "lg";

interface BrandLogoProps {
  size?: BrandLogoSize;
  className?: string;
  priority?: boolean;
}

interface BrandWordmarkProps {
  size?: BrandWordmarkSize;
  className?: string;
  priority?: boolean;
}

const sizeClasses: Record<BrandLogoSize, string> = {
  sm: "h-7 w-7 rounded-lg",
  md: "h-9 w-9 rounded-xl",
  lg: "h-12 w-12 rounded-2xl",
  xl: "h-16 w-16 rounded-2xl",
};

const wordmarkSizeClasses: Record<BrandWordmarkSize, string> = {
  sm: "h-10 w-28",
  md: "h-14 w-40",
  lg: "h-20 w-56",
};

export function BrandLogo({
  size = "md",
  className,
  priority = false,
}: BrandLogoProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden border border-border/60 bg-card shadow-sm",
        sizeClasses[size],
        className
      )}
    >
      <Image
        src="/logo-sentinel-light.png"
        alt="Logo Sentinel"
        width={128}
        height={128}
        priority={priority}
        className="h-full w-full object-cover dark:hidden"
      />
      <Image
        src="/logo-sentinel-dark.png"
        alt="Logo Sentinel"
        width={128}
        height={128}
        priority={priority}
        className="hidden h-full w-full object-cover dark:block"
      />
    </span>
  );
}

export function BrandWordmark({
  size = "md",
  className,
  priority = false,
}: BrandWordmarkProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden bg-transparent",
        wordmarkSizeClasses[size],
        className
      )}
    >
      <Image
        src="/logo-sentinel-wordmark-light.png"
        alt="Sentinel - Gestão de riscos psicossociais"
        width={448}
        height={256}
        priority={priority}
        className="h-full w-full object-contain dark:hidden"
      />
      <Image
        src="/logo-sentinel-wordmark-dark.png"
        alt="Sentinel - Gestão de riscos psicossociais"
        width={448}
        height={256}
        priority={priority}
        className="hidden h-full w-full object-contain dark:block"
      />
    </span>
  );
}

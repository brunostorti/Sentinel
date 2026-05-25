import { cn } from "@/lib/utils";

interface IconProps {
  name: string;
  className?: string;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, className, size = 24, filled = false }: IconProps) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      }}
    >
      {name}
    </span>
  );
}

"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full" disabled={pending}>
      {pending ? "Entrando..." : label}
    </Button>
  );
}

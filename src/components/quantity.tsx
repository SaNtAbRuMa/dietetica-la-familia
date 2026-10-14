"use client";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
export function Quantity({
  value,
  max,
  onChange,
  label = "Cantidad",
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
}) {
  return (
    <div className="quantity" role="group" aria-label={label}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Disminuir ${label.toLowerCase()}`}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus />
      </Button>
      <output aria-live="polite">{value}</output>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Aumentar ${label.toLowerCase()}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus />
      </Button>
    </div>
  );
}

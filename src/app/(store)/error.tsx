"use client";
import { Button } from "@/components/ui/button";
export default function StoreError({ reset }: { reset: () => void }) {
  return (
    <div className="container empty-state">
      <p className="eyebrow">Algo no salió bien</p>
      <h1>No pudimos cargar esta página.</h1>
      <p>
        Probá de nuevo en un momento. Tu carrito se conserva en este navegador.
      </p>
      <Button onClick={reset}>Volver a intentar</Button>
    </div>
  );
}

"use client";
import { useEffect } from "react";
import { useCart } from "@/features/cart/provider";

export function ClearCartOnMount() {
  const clear = useCart((s) => s.clear);

  useEffect(() => {
    clear();
  }, [clear]);

  return null;
}

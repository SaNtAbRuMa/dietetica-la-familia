"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";

type Props = {
  isDefaultPassword: boolean;
};

export function AdminLoginForm({ isDefaultPassword }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          password,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Clave incorrecta.");
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="editorial-page"
      style={{ maxWidth: "460px", margin: "2.5rem auto" }}
    >
      <p className="eyebrow">Acceso restringido</p>
      <h1>Administración de Dietética La Familia</h1>
      <p className="muted">
        Ingresá tu clave de administrador para gestionar productos, precios,
        stock, categorías, pedidos y la sincronización con Google Sheets.
      </p>

      <form
        onSubmit={handleSubmit}
        className="checkout-form"
        style={{ marginTop: "1.5rem" }}
      >
        <Field>
          <FieldLabel htmlFor="admin-password">
            Clave de administrador
          </FieldLabel>
          <Input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresá la clave…"
          />
        </Field>

        {isDefaultPassword ? (
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            <Lock
              size={14}
              style={{ display: "inline", verticalAlign: "middle" }}
            />{" "}
            Clave local por defecto: <code>lafamilia2026</code> (configurá{" "}
            <code>ADMIN_PASSWORD</code> en <code>.env.local</code> para
            producción).
          </p>
        ) : null}

        <Button type="submit" disabled={loading}>
          {loading ? "Verificando…" : "Ingresar al panel"}
          <ArrowRight size={16} />
        </Button>

        {error ? (
          <p className="review-result error" role="alert">
            <AlertCircle size={18} /> {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}

import crypto from "node:crypto";

/**
 * Verifies the X-Signature header sent by Mercado Pago webhooks using HMAC-SHA256.
 * Format: x-signature: "ts=...,v1=..."
 * Manifest: "id:[data.id];request-id:[x-request-id];ts:[ts];"
 */
export function verifyMercadoPagoWebhookSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
  secret?: string;
}): boolean {
  const webhookSecret =
    params.secret ?? process.env.MP_WEBHOOK_SECRET?.trim() ?? "";
  if (!webhookSecret) {
    // If no webhook secret is configured, rely on server-to-server GET /v1/payments/{id} verification
    return true;
  }
  if (!params.xSignature) return false;

  const parts = params.xSignature.split(",");
  let ts = "";
  let v1 = "";
  for (const part of parts) {
    const [key, val] = part.split("=", 2);
    if (key?.trim() === "ts" && val) ts = val.trim();
    if (key?.trim() === "v1" && val) v1 = val.trim();
  }
  if (!ts || !v1) return false;

  const manifestParts: string[] = [];
  if (params.dataId) {
    manifestParts.push(`id:${params.dataId.toLowerCase()};`);
  }
  if (params.xRequestId) {
    manifestParts.push(`request-id:${params.xRequestId};`);
  }
  manifestParts.push(`ts:${ts};`);
  const manifest = manifestParts.join("");

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(manifest)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(v1, "hex"),
    );
  } catch {
    return false;
  }
}

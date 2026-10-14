import { NextResponse } from "next/server";
import { catalogToCsv } from "@/features/catalog/sheets-parser";
import { getSheetsCatalogSnapshot } from "@/server/sheets";

export async function GET() {
  const { products, categories } = await getSheetsCatalogSnapshot();
  const csv = "\uFEFF" + catalogToCsv(products, categories);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="plantilla-catalogo-raiz-natural.csv"',
      "Cache-Control": "no-store",
    },
  });
}

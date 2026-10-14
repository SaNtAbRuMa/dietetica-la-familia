import type { MetadataRoute } from "next";
import { catalog } from "@/server/catalog";
import { siteConfig } from "@/config/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (
    siteConfig.url || "https://raiznatural.com.ar"
  ).replace(/\/+$/, "");

  const products = await catalog.listProducts();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/productos`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/nosotros`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/informacion`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const productRoutes: MetadataRoute.Sitemap = products
    .slice(0, 1000)
    .map((p) => ({
      url: `${baseUrl}/productos/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: p.featured ? 0.8 : 0.7,
    }));

  return [...staticRoutes, ...productRoutes];
}

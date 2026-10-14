"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import type { Product, Category, CatalogQuery } from "@/types/catalog";
import { filterProducts, normalizeSearch } from "./logic";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
const PAGE_SIZE = 24;

export function CatalogView({
  products,
  categories,
  initial,
}: {
  products: Product[];
  categories: Category[];
  initial: CatalogQuery;
}) {
  const [filters, setFilters] = useState(false);
  const [query, setQuery] = useState<CatalogQuery>(initial);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const queryRef = useRef<CatalogQuery>(initial);
  const pathname = usePathname();
  useEffect(() => {
    function syncFromHistory() {
      const params = new URLSearchParams(window.location.search);
      const next: CatalogQuery = {
        search: params.get("q") ?? "",
        category: params.get("categoria") ?? "",
        inStock: params.get("disponibles") === "1",
        noAddedSugar: params.get("sin-azucar") === "1",
        sort: params.get("orden") ?? "destacados",
      };
      queryRef.current = next;
      setQuery(next);
      setVisibleCount(PAGE_SIZE);
    }
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);
  const results = filterProducts(products, query);
  const visibleResults = results.slice(0, visibleCount);
  function update(patch: CatalogQuery, reset = false) {
    const next = reset ? {} : { ...queryRef.current, ...patch };
    queryRef.current = next;
    setQuery(next);
    setVisibleCount(PAGE_SIZE);
    const params = new URLSearchParams();
    if (next.search) params.set("q", next.search);
    if (next.category) params.set("categoria", next.category);
    if (next.inStock) params.set("disponibles", "1");
    if (next.noAddedSugar) params.set("sin-azucar", "1");
    if (next.sort) params.set("orden", next.sort);
    window.history.replaceState(
      null,
      "",
      `${pathname}${params.size ? "?" + params.toString() : ""}`,
    );
  }

  const [categorySearch, setCategorySearch] = useState("");
  const activeCategory = categories.find((c) => c.id === query.category);

  const filteredCategoriesList = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const term = normalizeSearch(categorySearch);
    return categories.filter((c) => normalizeSearch(c.name).includes(term));
  }, [categories, categorySearch]);

  const hasActiveFilters = Boolean(
    query.category ||
      query.search ||
      query.inStock ||
      query.noAddedSugar,
  );

  function handleCategoryClick(categoryId: string) {
    update({ category: categoryId });
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setFilters(false);
    }
  }

  return (
    <div className="catalog-layout">
      <Button
        variant="outline"
        className="filter-toggle"
        aria-expanded={filters}
        aria-controls="catalog-filters"
        onClick={() => setFilters(!filters)}
      >
        <SlidersHorizontal /> {filters ? "Ocultar filtros" : `Categorías y filtros${hasActiveFilters ? " (activos)" : ""}`}
      </Button>
      <aside
        className={`catalog-sidebar ${filters ? "is-open" : ""}`}
        id="catalog-filters"
      >
        <div className="sidebar-header-row">
          <h2>Categorías ({categories.length})</h2>
          {filters && (
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={() => setFilters(false)}
              aria-label="Cerrar filtros"
            >
              ✕
            </button>
          )}
        </div>
        <div className="sidebar-cat-search">
          <Input
            placeholder="Buscar categoría…"
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            className="sidebar-cat-input"
            maxLength={40}
          />
        </div>
        <div className="category-filters max-h-[380px] overflow-y-auto pr-1">
          <button
            className={!query.category ? "selected" : ""}
            aria-pressed={!query.category}
            onClick={() => handleCategoryClick("")}
          >
            Todos los productos ({products.length})
          </button>
          {filteredCategoriesList.map((c) => (
            <button
              key={c.id}
              className={query.category === c.id ? "selected" : ""}
              aria-pressed={query.category === c.id}
              onClick={() => handleCategoryClick(c.id)}
            >
              {c.name}
            </button>
          ))}
          {filteredCategoriesList.length === 0 && (
            <p className="no-cat-results">No hay categorías con ese nombre.</p>
          )}
        </div>
        <h2>Tu selección</h2>
        <label className="check-label">
          <input
            type="checkbox"
            checked={query.inStock ?? false}
            onChange={(e) => update({ inStock: e.target.checked })}
          />{" "}
          Solo con stock
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={query.noAddedSugar ?? false}
            onChange={(e) => update({ noAddedSugar: e.target.checked })}
          />{" "}
          Sin azúcar agregada
        </label>
        {hasActiveFilters && (
          <Button
            variant="link"
            className="clear-all-link"
            onClick={() => update({}, true)}
          >
            Limpiar todos los filtros
          </Button>
        )}
        {filters && (
          <Button
            className="mobile-apply-btn"
            onClick={() => setFilters(false)}
          >
            Ver {results.length} {results.length === 1 ? "producto" : "productos"}
          </Button>
        )}
      </aside>
      <div>
        <div className="catalog-toolbar">
          <div className="catalog-search">
            <Search size={18} aria-hidden="true" />
            <label htmlFor="catalog-search" className="sr-only">
              Buscar en el catálogo
            </label>
            <Input
              id="catalog-search"
              placeholder="¿Qué estás buscando? (ej. almendras, aceite de coco, sin TACC…)"
              value={query.search ?? ""}
              maxLength={100}
              onChange={(e) => update({ search: e.target.value })}
            />
            {query.search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => update({ search: "" })}
                aria-label="Borrar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
          <div className="sort-control">
            <label htmlFor="sort">Ordenar por</label>
            <NativeSelect
              id="sort"
              value={query.sort ?? "destacados"}
              onChange={(e) => update({ sort: e.target.value })}
            >
              <NativeSelectOption value="destacados">
                Destacados
              </NativeSelectOption>
              <NativeSelectOption value="precio-asc">
                Menor precio
              </NativeSelectOption>
              <NativeSelectOption value="precio-desc">
                Mayor precio
              </NativeSelectOption>
              <NativeSelectOption value="nombre">Nombre A–Z</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="active-filters-bar" role="region" aria-label="Filtros aplicados">
            <span className="active-filters-label">Filtros activos:</span>
            {activeCategory && (
              <button
                type="button"
                className="active-filter-chip"
                onClick={() => update({ category: "" })}
                title="Quitar filtro de categoría"
              >
                {activeCategory.name} ✕
              </button>
            )}
            {query.search && (
              <button
                type="button"
                className="active-filter-chip"
                onClick={() => update({ search: "" })}
                title="Quitar búsqueda"
              >
                &ldquo;{query.search}&rdquo; ✕
              </button>
            )}
            {query.inStock && (
              <button
                type="button"
                className="active-filter-chip"
                onClick={() => update({ inStock: false })}
                title="Quitar filtro de stock"
              >
                Con stock ✕
              </button>
            )}
            {query.noAddedSugar && (
              <button
                type="button"
                className="active-filter-chip"
                onClick={() => update({ noAddedSugar: false })}
                title="Quitar filtro sin azúcar"
              >
                Sin azúcar agregada ✕
              </button>
            )}
            <button
              type="button"
              className="clear-filters-chip"
              onClick={() => update({}, true)}
            >
              Borrar todo
            </button>
          </div>
        )}

        <p className="results-count" role="status">
          Mostrando {visibleResults.length} de {results.length}{" "}
          {results.length === 1 ? "producto" : "productos"}
        </p>
        {results.length ? (
          <>
            <div className="product-grid catalog-grid">
              {visibleResults.map((p, index) => (
                <ProductCard key={p.id} product={p} priority={index < 3} />
              ))}
            </div>
            {visibleCount < results.length && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                >
                  Mostrar más productos ({results.length - visibleCount}{" "}
                  restantes)
                  <ArrowRight />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <Search size={32} />
            <h2>No encontramos esa combinación.</h2>
            <p>Probá otra palabra o quitá algún filtro.</p>
            <Button variant="outline" onClick={() => update({}, true)}>
              Ver todos los productos <ArrowRight />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

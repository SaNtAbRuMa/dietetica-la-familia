"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useCart } from "@/features/cart/provider";
import { CartContent } from "@/features/cart/cart-content";
import { siteConfig } from "@/config/site";

export function StoreHeader() {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const cart = useCart((s) => s);
  const count = cart.lines.reduce((n, l) => n + l.quantity, 0);

  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMenu(false);
    setSearch(false);
  }

  // Ensure cart drawer closes on navigation
  const setCartOpen = cart.setOpen;
  useEffect(() => {
    setCartOpen(false);
  }, [pathname, setCartOpen]);

  return (
    <header className="store-header">
      <div className="container header-inner">
        {/* Fila 1: Marca principal + Nav en escritorio + Acciones */}
        <div className="header-brand-row">
          <Link
            href="/"
            className="brand brand-la-familia"
            aria-label={`${siteConfig.name}, inicio`}
          >
            <Image
              src="/images/logo-la-familia-real.png"
              alt={siteConfig.name}
              width={48}
              height={48}
              priority
              className="brand-logo-img"
            />
            <div className="brand-text-block">
              <span className="brand-title">{siteConfig.name}</span>
              <span className="brand-subtitle">{siteConfig.subbrand}</span>
            </div>
          </Link>

          <nav className="desktop-nav" aria-label="Navegación principal">
            <Link href="/productos">Productos</Link>
            <Link href="/#categorias">Categorías</Link>
            <Link href="/#sucursales">
              <MapPin size={14} style={{ color: "var(--store-lime)" }} className="inline mr-1" />
              Sucursales
            </Link>
            <Link href="/nosotros">Nosotros</Link>
          </nav>

          <div className="header-actions">
            {/* Buscador para escritorio */}
            <Sheet open={search} onOpenChange={setSearch}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="desktop-search-trigger"
                    aria-label="Buscar productos"
                  />
                }
              >
                <Search />
              </SheetTrigger>
              <SheetContent className="store-sheet">
                <SheetHeader>
                  <SheetTitle>¿Qué estás buscando?</SheetTitle>
                  <SheetDescription>
                    Buscá frutos secos, harinas, repostería, opciones sin TACC…
                  </SheetDescription>
                </SheetHeader>
                <form
                  action="/productos"
                  className="search-form"
                  onSubmit={() => setSearch(false)}
                >
                  <label htmlFor="header-search" className="sr-only">
                    Buscar productos
                  </label>
                  <Input
                    id="header-search"
                    name="q"
                    placeholder="Almendras, chocolate, granola, stevia…"
                    maxLength={100}
                    autoFocus
                  />
                  <Button type="submit" aria-label="Buscar">
                    <ArrowRight />
                  </Button>
                </form>
                <div className="search-suggestions">
                  <p>Categorías populares en Olavarría</p>
                  <div>
                    {[
                      ["Sin TACC", "/productos?categoria=galletitas-cereales-y-pan-sin-tacc"],
                      ["Frutos secos", "/productos?categoria=frutos-secos"],
                      ["Cereales y granolas", "/productos?categoria=cereales-y-granolas"],
                      ["Repostería y Cotillón", "/productos?categoria=cotillon"],
                      ["Endulzantes", "/productos?categoria=endulzantes"],
                    ].map(([label, href]) => (
                      <Link
                        key={href}
                        href={href!}
                        onClick={() => setSearch(false)}
                      >
                        {label}
                        <ArrowRight aria-hidden="true" size={15} />
                      </Link>
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Canasto / Carrito de compras */}
            <Sheet open={cart.open} onOpenChange={cart.setOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cart-trigger"
                    aria-label={`Carrito, ${count} productos`}
                  />
                }
              >
                <ShoppingBag />
                {count > 0 && <span className="cart-count">{count}</span>}
              </SheetTrigger>
              <SheetContent className="store-sheet cart-sheet">
                <SheetHeader>
                  <SheetTitle>Tu canasto de compras</SheetTitle>
                  <SheetDescription>
                    Revisá tus productos antes de confirmar el pedido.
                  </SheetDescription>
                </SheetHeader>
                <CartContent drawer />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Fila 2: Barra Móvil (Menú desplegable + Buscador amplio para celulares) */}
        <div className="header-mobile-bar">
          <Sheet open={menu} onOpenChange={setMenu}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  className="mobile-bar-menu-btn"
                  aria-label="Abrir menú y categorías"
                />
              }
            >
              <Menu size={18} />
              <span>Menú</span>
            </SheetTrigger>
            <SheetContent side="left" className="store-sheet">
              <SheetHeader>
                <div className="mobile-sheet-brand">
                  <Image
                    src="/images/logo-la-familia-real.png"
                    alt={siteConfig.name}
                    width={48}
                    height={48}
                    className="brand-logo-img"
                  />
                  <div>
                    <SheetTitle>{siteConfig.name}</SheetTitle>
                    <SheetDescription>{siteConfig.subbrand}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <nav className="mobile-links" aria-label="Navegación móvil">
                {[
                  ["/productos", "Todos los productos"],
                  ["/#categorias", "Categorías"],
                  ["/#sucursales", "Nuestras 2 Sucursales"],
                  ["/nosotros", "Nosotros"],
                  ["/carrito", "Tu carrito"],
                ].map(([href, label]) => (
                  <Link key={href} href={href!} onClick={() => setMenu(false)}>
                    {label}
                    <ArrowRight size={18} />
                  </Link>
                ))}
              </nav>

              <div className="mobile-sheet-branches">
                <p className="mobile-branches-title">
                  <MapPin size={13} className="inline mr-1" style={{ color: "var(--store-lime)" }} />
                  Sucursales en Olavarría:
                </p>
                <div className="mobile-branch-item">
                  <strong>Centro:</strong> Rivadavia 2581 (esq. Cnel. Suárez)
                </div>
                <div className="mobile-branch-item">
                  <strong>Urquiza:</strong> Av. Urquiza 1315 (esq. Rendón)
                </div>
                <div className="mobile-branch-actions">
                  <a
                    href={siteConfig.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-wa-sheet"
                  >
                    <Image
                      src="/images/whatsapp-official.svg"
                      alt=""
                      width={18}
                      height={18}
                    />
                    WhatsApp {siteConfig.whatsappDisplay}
                  </a>
                  <a
                    href={siteConfig.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ig-sheet"
                  >
                    <Image
                      src="/images/instagram-official.svg"
                      alt=""
                      width={18}
                      height={18}
                    />
                    @{siteConfig.instagramHandle}
                  </a>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Botón barra de búsqueda móvil para abrir buscador con 1 toque */}
          <button
            type="button"
            onClick={() => setSearch(true)}
            className="mobile-bar-search-btn"
            aria-label="Buscar productos en la dietética"
          >
            <Search size={16} className="mobile-search-icon" />
            <span className="mobile-search-text">Buscar almendras, sin TACC…</span>
          </button>
        </div>
      </div>
    </header>
  );
}

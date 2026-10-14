"use client";
import { useState, useMemo, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle2,
  RefreshCw,
  Download,
  FileSpreadsheet,
  ShoppingBag,
  Copy,
  Check,
  AlertCircle,
  Plus,
  Eye,
  EyeOff,
  Star,
  Upload,
  LogOut,
  Search,
  FolderKanban,
  Save,
  Edit3,
  DollarSign,
  PackageCheck,
  ChevronDown,
  X,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { formatCurrency } from "@/lib/format-currency";
import { normalizeSearch } from "@/features/catalog/logic";
import type { SheetsConnectionMode, StoredOrder } from "@/server/sheets";
import type { Category, Product } from "@/types/catalog";

type Props = {
  initialSource: SheetsConnectionMode;
  initialSheetIdOrUrl: string;
  initialAppsScriptUrl: string;
  initialProductsTab: string;
  initialOrdersTab: string;
  canWriteOrders: boolean;
  lastSyncedAt: string | null;
  initialError: string | null;
  products: Product[];
  categories: Category[];
  orders: StoredOrder[];
};

const APPS_SCRIPT_CODE = `// Pegá este código en tu Google Sheet: Extensiones -> Apps Script
// Luego hacé clic en "Implementar" -> "Nueva implementación" -> Tipo: "Aplicación web"
// Ejecutar como: "Yo" | Quién tiene acceso: "Cualquier persona"

const PRODUCTS_TAB = "Productos";
const ORDERS_TAB = "Pedidos";

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PRODUCTS_TAB) || ss.getSheets()[0];
  const rows = sheet.getDataRange().getDisplayValues();
  return ContentService
    .createTextOutput(JSON.stringify({ rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const body = JSON.parse(e.postData.contents || "{}");
  if (body.action === "update_order_status" && body.orderId) {
    let ordersSheet = ss.getSheetByName(ORDERS_TAB);
    if (ordersSheet) {
      const data = ordersSheet.getDataRange().getValues();
      for (let r = 1; r < data.length; r++) {
        if (String(data[r][0]) === String(body.orderId)) {
          if (body.status) ordersSheet.getRange(r + 1, 3).setValue(String(body.status).toUpperCase());
          if (body.paymentStatus) ordersSheet.getRange(r + 1, 4).setValue(String(body.paymentStatus).toUpperCase());
          break;
        }
      }
    }
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (body.action !== "create_order" || !body.order) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: "Acción no válida" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const order = body.order;
  let ordersSheet = ss.getSheetByName(ORDERS_TAB);
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet(ORDERS_TAB);
    ordersSheet.appendRow([
      "ID_Pedido", "Fecha_ISO", "Estado", "Pago", "Cliente",
      "Email", "Telefono", "Entrega", "Direccion", "Notas",
      "Detalle_Items", "Cantidad_Unidades", "Total_ARS"
    ]);
  }

  const itemsSummary = (order.items || [])
    .map(i => i.quantity + "x " + i.productName + " (" + i.variantSize + ") [SKU: " + i.sku + "] - $" + i.lineTotal)
    .join(" | ");

  const fullAddress = order.customer.deliveryMethod === "home_delivery"
    ? [order.customer.address, order.customer.city, order.customer.province, order.customer.postalCode].filter(Boolean).join(", ")
    : "Retiro en local";

  ordersSheet.appendRow([
    order.id,
    order.createdAt,
    "PENDIENTE",
    "PENDIENTE",
    order.customer.firstName + " " + order.customer.lastName,
    order.customer.email,
    order.customer.phone,
    order.customer.deliveryMethod === "home_delivery" ? "Envío a domicilio" : "Retiro en local",
    fullAddress,
    order.customer.notes || "",
    itemsSummary,
    order.unitCount,
    order.subtotal
  ]);

  const prodSheet = ss.getSheetByName(PRODUCTS_TAB) || ss.getSheets()[0];
  const data = prodSheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim());
  const skuCol = headers.findIndex(h => h === "sku" || h === "codigo");
  const stockCol = headers.findIndex(h => h.includes("stock") || h.includes("disponible") || h.includes("cantidad"));

  let stockUpdated = false;
  if (stockCol !== -1) {
    for (const item of (order.items || [])) {
      for (let r = 1; r < data.length; r++) {
        if (skuCol !== -1 && String(data[r][skuCol]).trim() === item.sku) {
          const current = parseInt(data[r][stockCol], 10) || 0;
          prodSheet.getRange(r + 1, stockCol + 1).setValue(Math.max(0, current - item.quantity));
          stockUpdated = true;
          break;
        }
      }
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, stockUpdated }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

function sourceLabel(source: SheetsConnectionMode): string {
  switch (source) {
    case "google_sheets_api":
      return "Google Sheets API (Lectura y Escritura)";
    case "google_apps_script":
      return "Google Apps Script (Lectura y Escritura)";
    case "google_sheets_csv":
      return "Google Sheets por Link (Lectura en vivo)";
    case "local_csv_file":
      return "Planilla optimizada activa (Lectura y Escritura)";
    case "local_fallback":
      return "Catálogo base local";
  }
}

type AdminTab = "productos" | "pedidos" | "categorias" | "sheets";

type VariantDraft = {
  id?: string;
  sku: string;
  size: string;
  price: string;
  stock: string;
};

const ADMIN_PAGE_SIZE = 25;

export function SheetsDashboard({
  initialSource,
  initialSheetIdOrUrl,
  initialAppsScriptUrl,
  initialProductsTab,
  initialOrdersTab,
  canWriteOrders: initialCanWrite,
  lastSyncedAt: initialSyncedAt,
  initialError,
  products,
  categories,
  orders,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("productos");

  // Sheets config state
  const [sheetIdOrUrl, setSheetIdOrUrl] = useState(initialSheetIdOrUrl);
  const [appsScriptUrl, setAppsScriptUrl] = useState(initialAppsScriptUrl);
  const [productsTab, setProductsTab] = useState(initialProductsTab);
  const [ordersTab, setOrdersTab] = useState(initialOrdersTab);
  const [source, setSource] = useState<SheetsConnectionMode>(initialSource);
  const [canWriteOrders, setCanWriteOrders] = useState(initialCanWrite);
  const [lastSyncedAt, setLastSyncedAt] = useState(initialSyncedAt);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAdvancedSheets, setShowAdvancedSheets] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    error: boolean;
  } | null>(initialError ? { message: initialError, error: true } : null);

  // Catalog filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "visible" | "hidden" | "out_of_stock"
  >("all");
  const [visibleLimit, setVisibleLimit] = useState(ADMIN_PAGE_SIZE);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Inline variant quick editor: which product is expanded
  const [expandedVariantsProductId, setExpandedVariantsProductId] = useState<
    string | null
  >(null);
  const [variantEdits, setVariantEdits] = useState<
    Record<string, { price: string; stock: string }>
  >({});

  // Product editor modal state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | undefined>(
    undefined,
  );
  const [prodName, setProdName] = useState("");
  const [prodCategory, setProdCategory] = useState(
    categories[0]?.id ?? "despensa-natural",
  );
  const [prodShortDesc, setProdShortDesc] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodImage, setProdImage] = useState("");
  const [prodVisible, setProdVisible] = useState(true);
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodNoSugar, setProdNoSugar] = useState(false);
  const [prodVariants, setProdVariants] = useState<VariantDraft[]>([
    { sku: "", size: "Unidad", price: "3500", stock: "15" },
  ]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Category form state
  const [catId, setCatId] = useState("");
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Orders filter state
  const [orderFilter, setOrderFilter] = useState<string>("all");

  const totalVariants = products.reduce((acc, p) => acc + p.variants.length, 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const totalSalesArs = orders
    .filter((o) => o.paymentStatus === "approved" || o.status === "paid")
    .reduce((sum, o) => sum + o.subtotal, 0);

  const filteredProducts = useMemo(() => {
    const words = normalizeSearch(searchQuery)
      .split(/\s+/)
      .filter(Boolean);

    return products.filter((p) => {
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      if (statusFilter === "visible" && !p.isVisible) return false;
      if (statusFilter === "hidden" && p.isVisible) return false;
      if (
        statusFilter === "out_of_stock" &&
        p.variants.some((v) => v.stock > 0)
      ) {
        return false;
      }
      if (words.length === 0) return true;
      const haystack = normalizeSearch(
        `${p.name} ${p.id} ${p.variants.map((v) => `${v.sku} ${v.size}`).join(" ")}`,
      );
      return words.every((w) => haystack.includes(w));
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  const displayedProducts = filteredProducts.slice(0, visibleLimit);

  const filteredOrders = useMemo(() => {
    if (orderFilter === "all") return orders;
    return orders.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  function openNewProductModal() {
    setEditingProductId(undefined);
    setProdName("");
    setProdCategory(categories[0]?.id ?? "despensa-natural");
    setProdShortDesc("");
    setProdDesc("");
    setProdImage("");
    setProdVisible(true);
    setProdFeatured(false);
    setProdNoSugar(false);
    setProdVariants([{ sku: "", size: "Unidad", price: "3500", stock: "15" }]);
    setShowProductForm(true);
  }

  function openEditProductModal(product: Product) {
    setEditingProductId(product.id);
    setProdName(product.name);
    setProdCategory(product.categoryId);
    setProdShortDesc(product.shortDescription);
    setProdDesc(product.description);
    setProdImage(product.images[0]?.src ?? "");
    setProdVisible(product.isVisible);
    setProdFeatured(product.featured);
    setProdNoSugar(product.tags.includes("sin-azucar-agregada"));
    setProdVariants(
      product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        price: String(v.price),
        stock: String(v.stock),
      })),
    );
    setShowProductForm(true);
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.refresh();
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        ok?: boolean;
        url?: string;
        error?: string;
      };
      if (!response.ok || !data.ok || !data.url) {
        throw new Error(data.error || "No se pudo subir la imagen.");
      }
      setProdImage(data.url);
      setFeedback({
        message: `Imagen subida correctamente (${data.url}).`,
        error: false,
      });
    } catch (err) {
      setFeedback({
        message:
          err instanceof Error ? err.message : "Error al subir la imagen.",
        error: true,
      });
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSaveVariant(
    productId: string,
    variantId: string,
    defaultPrice: number,
    defaultStock: number,
  ) {
    const edit = variantEdits[variantId];
    const price = edit ? Number(edit.price) : defaultPrice;
    const stock = edit ? Number(edit.stock) : defaultStock;
    if (
      !Number.isFinite(price) ||
      price < 1 ||
      !Number.isFinite(stock) ||
      stock < 0
    ) {
      setFeedback({
        message: "Ingresá un precio mayor a 0 y un stock válido.",
        error: true,
      });
      return;
    }

    setBusyKey(`var-${variantId}`);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_variant",
          productId,
          variantId,
          price: Math.round(price),
          stock: Math.round(stock),
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "No se pudo actualizar la variante.");
      }
      setFeedback({
        message: "Precio y stock actualizados correctamente.",
        error: false,
      });
      router.refresh();
    } catch (err) {
      setFeedback({
        message:
          err instanceof Error ? err.message : "Error al guardar variante.",
        error: true,
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleToggleProduct(
    productId: string,
    patch: { isVisible?: boolean; featured?: boolean },
  ) {
    setBusyKey(`prod-${productId}`);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_product",
          productId,
          ...patch,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "No se pudo actualizar el producto.");
      }
      router.refresh();
    } catch (err) {
      setFeedback({
        message:
          err instanceof Error ? err.message : "Error al actualizar producto.",
        error: true,
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUpsertProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey("upsert-product");
    setFeedback(null);

    try {
      const parsedVariants = prodVariants.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        ...(v.sku.trim() ? { sku: v.sku.trim() } : {}),
        size: v.size.trim() || "Unidad",
        price: Math.max(1, Math.round(Number(v.price) || 1000)),
        stock: Math.max(0, Math.round(Number(v.stock) || 0)),
      }));

      const response = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_product",
          ...(editingProductId ? { id: editingProductId } : {}),
          name: prodName,
          categoryId: prodCategory,
          shortDescription: prodShortDesc,
          description: prodDesc,
          image: prodImage,
          isVisible: prodVisible,
          featured: prodFeatured,
          noAddedSugar: prodNoSugar,
          variants: parsedVariants,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "No se pudo guardar el producto.");
      }

      setShowProductForm(false);
      setFeedback({
        message: editingProductId
          ? `Producto "${prodName}" actualizado con éxito.`
          : `Producto "${prodName}" creado correctamente en el catálogo.`,
        error: false,
      });
      router.refresh();
    } catch (err) {
      setFeedback({
        message:
          err instanceof Error ? err.message : "Error al guardar el producto.",
        error: true,
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUpsertCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey("upsert-category");
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_category",
          ...(catId ? { id: catId } : {}),
          name: catName,
          description: catDesc,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "No se pudo guardar la categoría.");
      }
      setCatId("");
      setCatName("");
      setCatDesc("");
      setFeedback({
        message: `Categoría "${catName}" guardada correctamente.`,
        error: false,
      });
      router.refresh();
    } catch (err) {
      setFeedback({
        message:
          err instanceof Error ? err.message : "Error al guardar categoría.",
        error: true,
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleOrderStatusChange(
    orderId: string,
    patch: {
      status?: StoredOrder["status"];
      paymentStatus?: StoredOrder["paymentStatus"];
    },
  ) {
    setBusyKey(`order-${orderId}`);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          ...patch,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "No se pudo actualizar el pedido.");
      }
      router.refresh();
    } catch (err) {
      setFeedback({
        message:
          err instanceof Error ? err.message : "Error al actualizar el pedido.",
        error: true,
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSaveAndSync(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSyncing(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "configure",
          sheetIdOrUrl,
          appsScriptUrl,
          productsTab: productsTab || "Productos",
          ordersTab: ordersTab || "Pedidos",
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        source?: SheetsConnectionMode;
        productCount?: number;
        variantCount?: number;
        canWriteOrders?: boolean;
        lastSyncedAt?: string | null;
        error?: string | null;
      };

      if (data.source) setSource(data.source);
      if (typeof data.canWriteOrders === "boolean")
        setCanWriteOrders(data.canWriteOrders);
      if (data.lastSyncedAt) setLastSyncedAt(data.lastSyncedAt);

      if (!response.ok || data.error) {
        setFeedback({
          message:
            data.error ?? "No se pudo sincronizar con la planilla indicada.",
          error: true,
        });
      } else {
        setFeedback({
          message: `¡Sincronización exitosa! Se cargaron ${data.productCount ?? 0} productos (${data.variantCount ?? 0} variantes).`,
          error: false,
        });
        router.refresh();
      }
    } catch {
      setFeedback({
        message: "Error de red al guardar la configuración.",
        error: true,
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleQuickSync() {
    setSyncing(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        source?: SheetsConnectionMode;
        productCount?: number;
        variantCount?: number;
        canWriteOrders?: boolean;
        lastSyncedAt?: string | null;
        error?: string | null;
      };
      if (data.source) setSource(data.source);
      if (typeof data.canWriteOrders === "boolean")
        setCanWriteOrders(data.canWriteOrders);
      if (data.lastSyncedAt) setLastSyncedAt(data.lastSyncedAt);

      if (data.error) {
        setFeedback({ message: data.error, error: true });
      } else {
        setFeedback({
          message: `Catálogo actualizado con éxito (${data.productCount ?? products.length} productos, ${data.variantCount ?? totalVariants} variantes).`,
          error: false,
        });
        router.refresh();
      }
    } finally {
      setSyncing(false);
    }
  }

  async function copyScript() {
    await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div>
      {/* 1. KPIs / Metrics Overview Cards */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="admin-kpi-icon green">
            <ShoppingBag size={22} />
          </div>
          <div className="admin-kpi-info">
            <span className="admin-kpi-val">{products.length}</span>
            <span className="admin-kpi-label">
              Productos ({totalVariants} variantes)
            </span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-icon amber">
            <PackageCheck size={22} />
          </div>
          <div className="admin-kpi-info">
            <span className="admin-kpi-val">{orders.length}</span>
            <span className="admin-kpi-label">
              {pendingOrders > 0
                ? `${pendingOrders} pedidos pendientes`
                : "Pedidos registrados"}
            </span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-icon blue">
            <DollarSign size={22} />
          </div>
          <div className="admin-kpi-info">
            <span className="admin-kpi-val">
              {formatCurrency(totalSalesArs)}
            </span>
            <span className="admin-kpi-label">Total en ventas cobradas</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-icon purple">
            <FileSpreadsheet size={22} />
          </div>
          <div className="admin-kpi-info">
            <span
              className="admin-kpi-val"
              style={{ fontSize: "1.1rem", textTransform: "capitalize" }}
            >
              {source.includes("sheet") ? "En Línea" : "Catálogo Local"}
            </span>
            <span className="admin-kpi-label">
              {lastSyncedAt
                ? `Actualizado ${new Date(lastSyncedAt).toLocaleTimeString("es-AR")}`
                : "Sincronizado"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Pills Navigation Tabs */}
      <nav className="admin-tab-nav" aria-label="Secciones de administración">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "productos" ? "active" : ""}`}
          onClick={() => setActiveTab("productos")}
        >
          <ShoppingBag size={17} />
          <span>Productos y Stock</span>
          <span className="admin-tab-count">{products.length}</span>
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "pedidos" ? "active" : ""}`}
          onClick={() => setActiveTab("pedidos")}
        >
          <PackageCheck size={17} />
          <span>Pedidos y Entregas</span>
          <span
            className="admin-tab-count"
            style={
              pendingOrders > 0
                ? { background: "#b45309", color: "#fff" }
                : undefined
            }
          >
            {orders.length}
          </span>
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "categorias" ? "active" : ""}`}
          onClick={() => setActiveTab("categorias")}
        >
          <FolderKanban size={17} />
          <span>Categorías</span>
          <span className="admin-tab-count">{categories.length}</span>
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "sheets" ? "active" : ""}`}
          onClick={() => setActiveTab("sheets")}
        >
          <FileSpreadsheet size={17} />
          <span>Google Sheets</span>
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleQuickSync}
            disabled={syncing}
            title="Recargar catálogo desde Google Sheets"
          >
            <RefreshCw
              size={14}
              className={syncing ? "animate-spin" : undefined}
            />
            <span>{syncing ? "Sincronizando…" : "Sincronizar"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            title="Cerrar sesión de administrador"
          >
            <LogOut size={14} />
            <span>Salir</span>
          </Button>
        </div>
      </nav>

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            background: feedback.error ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${feedback.error ? "#fecaca" : "#bbf7d0"}`,
            color: feedback.error ? "#991b1b" : "#166534",
            padding: "0.85rem 1.15rem",
            borderRadius: "10px",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontSize: "0.9rem",
          }}
          role={feedback.error ? "alert" : "status"}
        >
          {feedback.error ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span style={{ flex: 1 }}>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              opacity: 0.7,
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* TAB 1: PRODUCTOS */}
      {activeTab === "productos" && (
        <div>
          {/* Filter Bar */}
          <div className="admin-filter-bar">
            <div className="admin-filter-inputs">
              <div className="admin-search-wrapper">
                <Search size={16} className="admin-search-icon" />
                <input
                  type="search"
                  className="admin-search-input"
                  placeholder="Buscar por nombre o SKU…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleLimit(ADMIN_PAGE_SIZE);
                  }}
                />
              </div>

              <select
                className="admin-select"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setVisibleLimit(ADMIN_PAGE_SIZE);
                }}
              >
                <option value="">Todas las categorías ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="admin-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(
                    e.target.value as
                      | "all"
                      | "visible"
                      | "hidden"
                      | "out_of_stock",
                  );
                  setVisibleLimit(ADMIN_PAGE_SIZE);
                }}
              >
                <option value="all">Todos los estados</option>
                <option value="visible">Solo Visibles</option>
                <option value="hidden">Solo Ocultos</option>
                <option value="out_of_stock">Sin stock</option>
              </select>
            </div>

            <button
              type="button"
              className="admin-btn-primary"
              onClick={openNewProductModal}
            >
              <Plus size={16} />
              <span>Nuevo producto</span>
            </button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.85rem",
              fontSize: "0.85rem",
              color: "#68726b",
            }}
          >
            <span>
              Mostrando {displayedProducts.length} de {filteredProducts.length}{" "}
              productos
            </span>
            <a
              href="/api/catalog/template"
              download
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                color: "#1b351e",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <Download size={14} />
              <span>Exportar CSV</span>
            </a>
          </div>

          {/* Clean Products List */}
          <div className="admin-products-list">
            {displayedProducts.map((p) => {
              const categoryName =
                categories.find((c) => c.id === p.categoryId)?.name ??
                p.categoryId;
              const hasOutOfStock = p.variants.every((v) => v.stock === 0);
              const isExpanded = expandedVariantsProductId === p.id;

              return (
                <div
                  key={p.id}
                  className={`admin-product-row ${!p.isVisible ? "hidden-prod" : ""}`}
                >
                  {/* Thumbnail */}
                  <div className="admin-prod-thumb">
                    {p.images[0]?.src ? (
                      <Image
                        src={p.images[0].src}
                        alt={p.name}
                        width={60}
                        height={60}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <ShoppingBag size={24} />
                    )}
                  </div>

                  {/* Main Details */}
                  <div className="admin-prod-main">
                    <div className="admin-prod-title-row">
                      <h3 className="admin-prod-title">{p.name}</h3>
                      <span className="badge-cat">{categoryName}</span>
                      {p.isVisible ? (
                        <span className="badge-visible">Visible</span>
                      ) : (
                        <span className="badge-hidden">Oculto</span>
                      )}
                      {p.featured && (
                        <span className="badge-featured">⭐ Destacado</span>
                      )}
                      {hasOutOfStock && (
                        <span className="badge-out-of-stock">Sin stock</span>
                      )}
                    </div>

                    <div className="admin-prod-variants-summary">
                      {p.variants.map((v) => (
                        <span key={v.id} className="admin-variant-pill">
                          {v.size}: <strong>{formatCurrency(v.price)}</strong> ·{" "}
                          <span
                            style={{
                              color: v.stock > 0 ? "#1b351e" : "#b91c1c",
                              fontWeight: v.stock === 0 ? 700 : 500,
                            }}
                          >
                            {v.stock > 0 ? `${v.stock} u.` : "Sin stock"}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="admin-prod-actions">
                    <button
                      type="button"
                      className="admin-btn-action"
                      onClick={() =>
                        setExpandedVariantsProductId((curr) =>
                          curr === p.id ? null : p.id,
                        )
                      }
                      title="Ajustar precios y stock rápido"
                    >
                      <Edit3 size={13} />
                      <span>{isExpanded ? "Cerrar" : "Precios y Stock"}</span>
                      <ChevronDown
                        size={12}
                        style={{
                          transform: isExpanded ? "rotate(180deg)" : "none",
                          transition: "transform 0.15s ease",
                        }}
                      />
                    </button>

                    <button
                      type="button"
                      className="admin-btn-action"
                      onClick={() => openEditProductModal(p)}
                      title="Editar información completa del producto"
                    >
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      className="admin-btn-action"
                      disabled={busyKey === `prod-${p.id}`}
                      onClick={() =>
                        handleToggleProduct(p.id, { isVisible: !p.isVisible })
                      }
                      title={
                        p.isVisible
                          ? "Ocultar producto en la tienda"
                          : "Mostrar producto en la tienda"
                      }
                    >
                      {p.isVisible ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} style={{ color: "#166534" }} />
                      )}
                    </button>

                    <button
                      type="button"
                      className={`admin-btn-action ${p.featured ? "active-star" : ""}`}
                      disabled={busyKey === `prod-${p.id}`}
                      onClick={() =>
                        handleToggleProduct(p.id, { featured: !p.featured })
                      }
                      title={
                        p.featured
                          ? "Quitar de destacados"
                          : "Destacar en la portada"
                      }
                    >
                      <Star size={14} />
                    </button>
                  </div>

                  {/* Clean Drawer for Quick Variant Prices & Stock */}
                  {isExpanded && (
                    <div className="admin-quick-drawer">
                      <div className="admin-quick-drawer-header">
                        <span>
                          ⚡ Ajustar precios y stock rápido para:{" "}
                          <strong>{p.name}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedVariantsProductId(null)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "12px",
                            color: "#666",
                          }}
                        >
                          ✕ Cerrar
                        </button>
                      </div>

                      <div className="admin-variants-edit-grid">
                        {p.variants.map((v) => {
                          const currentEdit = variantEdits[v.id];
                          const priceVal = currentEdit?.price ?? String(v.price);
                          const stockVal = currentEdit?.stock ?? String(v.stock);
                          const isDirty =
                            Number(priceVal) !== v.price ||
                            Number(stockVal) !== v.stock;

                          return (
                            <div key={v.id} className="admin-variant-row">
                              <div>
                                <strong>{v.size}</strong>{" "}
                                <span
                                  style={{
                                    fontSize: "0.78rem",
                                    color: "#666",
                                    marginLeft: "0.3rem",
                                  }}
                                >
                                  SKU: {v.sku}
                                </span>
                              </div>

                              <div className="admin-variant-inputs">
                                <label
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                  }}
                                >
                                  <span>Precio:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    className="admin-mini-input"
                                    value={priceVal}
                                    onChange={(e) =>
                                      setVariantEdits((prev) => ({
                                        ...prev,
                                        [v.id]: {
                                          price: e.target.value,
                                          stock: stockVal,
                                        },
                                      }))
                                    }
                                  />
                                </label>

                                <label
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                  }}
                                >
                                  <span>Stock:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    className="admin-mini-input"
                                    style={{ width: "75px" }}
                                    value={stockVal}
                                    onChange={(e) =>
                                      setVariantEdits((prev) => ({
                                        ...prev,
                                        [v.id]: {
                                          price: priceVal,
                                          stock: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                </label>

                                <button
                                  type="button"
                                  className="admin-btn-save-sm"
                                  disabled={busyKey === `var-${v.id}`}
                                  style={{
                                    background: isDirty ? "#1b351e" : "#5a685e",
                                    opacity: isDirty ? 1 : 0.85,
                                  }}
                                  onClick={() =>
                                    handleSaveVariant(
                                      p.id,
                                      v.id,
                                      v.price,
                                      v.stock,
                                    )
                                  }
                                >
                                  <Save size={12} />
                                  <span>
                                    {busyKey === `var-${v.id}`
                                      ? "Guardando…"
                                      : "Guardar"}
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {visibleLimit < filteredProducts.length && (
            <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setVisibleLimit((prev) => prev + ADMIN_PAGE_SIZE)
                }
              >
                Cargar más productos ({filteredProducts.length - visibleLimit}{" "}
                restantes)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PEDIDOS */}
      {activeTab === "pedidos" && (
        <div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className={`admin-tab-btn ${orderFilter === "all" ? "active" : ""}`}
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }}
                onClick={() => setOrderFilter("all")}
              >
                Todos ({orders.length})
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${orderFilter === "pending" ? "active" : ""}`}
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }}
                onClick={() => setOrderFilter("pending")}
              >
                🟡 Pendientes ({orders.filter((o) => o.status === "pending").length})
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${orderFilter === "paid" ? "active" : ""}`}
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }}
                onClick={() => setOrderFilter("paid")}
              >
                🟢 Pagados ({orders.filter((o) => o.status === "paid").length})
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${orderFilter === "preparing" ? "active" : ""}`}
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }}
                onClick={() => setOrderFilter("preparing")}
              >
                🔵 En preparación (
                {orders.filter((o) => o.status === "preparing").length})
              </button>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e9e4da",
                borderRadius: "12px",
                padding: "3rem 1.5rem",
                textAlign: "center",
                color: "#68726b",
              }}
            >
              <PackageCheck size={40} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
              <h3>No hay pedidos en esta categoría</h3>
              <p style={{ fontSize: "0.9rem", marginTop: "0.25rem" }}>
                Los nuevos pedidos que hagan los clientes en la tienda aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="admin-orders-grid">
              {filteredOrders.map((o) => {
                const customerWa = o.customer.phone.replace(/\D/g, "");
                const waMessage = encodeURIComponent(
                  `Hola ${o.customer.firstName}! Te contactamos de Dietética La Familia sobre tu pedido #${o.id}.`,
                );

                return (
                  <div key={o.id} className="admin-order-card">
                    {/* Top Row */}
                    <div className="admin-order-top">
                      <div>
                        <span className="admin-order-id">Pedido #{o.id}</span>
                        <span className="admin-order-date">
                          {new Date(o.createdAt).toLocaleString("es-AR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <span
                          className="admin-badge"
                          style={{
                            background:
                              o.status === "paid" || o.paymentStatus === "approved"
                                ? "#ecfdf5"
                                : o.status === "pending"
                                  ? "#fef3c7"
                                  : "#eff6ff",
                            color:
                              o.status === "paid" || o.paymentStatus === "approved"
                                ? "#065f46"
                                : o.status === "pending"
                                  ? "#92400e"
                                  : "#1e40af",
                            fontWeight: 700,
                            padding: "0.2rem 0.6rem",
                            borderRadius: "6px",
                            fontSize: "0.8rem",
                          }}
                        >
                          {o.status === "pending"
                            ? "🟡 PENDIENTE"
                            : o.status === "paid"
                              ? "🟢 PAGADO"
                              : o.status === "preparing"
                                ? "🔵 EN PREPARACIÓN"
                                : o.status === "ready"
                                  ? "🟣 LISTO PARA RETIRAR"
                                  : o.status === "shipped"
                                    ? "🚚 ENVIADO"
                                    : "CANCELADO"}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="admin-order-body">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {o.customer.firstName} {o.customer.lastName}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "#555", marginTop: "0.2rem" }}>
                          📞 {o.customer.phone} · ✉️ {o.customer.email}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "#666", marginTop: "0.35rem" }}>
                          <strong>Modalidad:</strong>{" "}
                          {o.customer.deliveryMethod === "home_delivery"
                            ? `Envío a domicilio (${[o.customer.address, o.customer.city].filter(Boolean).join(", ")})`
                            : "Retiro en sucursal"}
                        </div>
                        {o.customer.notes && (
                          <div
                            style={{
                              fontSize: "0.8rem",
                              background: "#fef8eb",
                              color: "#854d0e",
                              padding: "0.35rem 0.5rem",
                              borderRadius: "6px",
                              marginTop: "0.4rem",
                            }}
                          >
                            📝 <em>{o.customer.notes}</em>
                          </div>
                        )}
                      </div>

                      {/* Items */}
                      <div className="admin-order-items-box">
                        <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>
                          Productos ({o.unitCount} unidades):
                        </div>
                        {o.items.map((item, idx) => (
                          <div key={idx} className="admin-order-item-line">
                            <span>
                              {item.quantity}x {item.productName} ({item.variantSize})
                            </span>
                            <strong>{formatCurrency(item.lineTotal)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions and Status Selectors */}
                    <div className="admin-order-actions-bar">
                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                        <label style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <span>Estado:</span>
                          <select
                            className="admin-select"
                            style={{ padding: "0.3rem 0.5rem", fontSize: "0.82rem" }}
                            value={o.status}
                            disabled={busyKey === `order-${o.id}`}
                            onChange={(e) =>
                              handleOrderStatusChange(o.id, {
                                status: e.target.value as StoredOrder["status"],
                              })
                            }
                          >
                            <option value="pending">Pendiente</option>
                            <option value="paid">Pagado</option>
                            <option value="preparing">En preparación</option>
                            <option value="ready">Listo para retirar</option>
                            <option value="shipped">Enviado</option>
                            <option value="cancelled">Cancelado</option>
                          </select>
                        </label>

                        <label style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <span>Pago:</span>
                          <select
                            className="admin-select"
                            style={{ padding: "0.3rem 0.5rem", fontSize: "0.82rem" }}
                            value={o.paymentStatus}
                            disabled={busyKey === `order-${o.id}`}
                            onChange={(e) =>
                              handleOrderStatusChange(o.id, {
                                paymentStatus: e.target
                                  .value as StoredOrder["paymentStatus"],
                              })
                            }
                          >
                            <option value="pending">Pendiente</option>
                            <option value="approved">Aprobado</option>
                            <option value="rejected">Rechazado</option>
                          </select>
                        </label>

                        {customerWa && (
                          <a
                            href={`https://wa.me/${customerWa}?text=${waMessage}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-wa-btn"
                          >
                            <span>WhatsApp</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>

                      <div className="admin-order-total">
                        Total: {formatCurrency(o.subtotal)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CATEGORÍAS */}
      {activeTab === "categorias" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {/* Category Form */}
          <form
            onSubmit={handleUpsertCategorySubmit}
            style={{
              background: "#ffffff",
              border: "1px solid #e9e4da",
              borderRadius: "12px",
              padding: "1.5rem",
              height: "fit-content",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem", color: "#1b351e" }}>
              {catId ? "Editar rubro" : "Nuevo rubro"}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1.25rem" }}>
              Las categorías se reflejan automáticamente en el catálogo de la tienda.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Field>
                <FieldLabel htmlFor="cat-name">Nombre de la categoría</FieldLabel>
                <Input
                  id="cat-name"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ej. Frutos secos, Semillas, Suplementos…"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="cat-desc">Descripción (opcional)</FieldLabel>
                <Input
                  id="cat-desc"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Breve reseña del rubro"
                />
              </Field>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={busyKey === "upsert-category"}
                >
                  <Save size={15} />
                  <span>{catId ? "Actualizar categoría" : "Crear categoría"}</span>
                </button>
                {catId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCatId("");
                      setCatName("");
                      setCatDesc("");
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </form>

          {/* Categories List */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e9e4da",
              borderRadius: "12px",
              padding: "1.5rem",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", color: "#1b351e" }}>
              Categorías activas ({categories.length})
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                maxHeight: "520px",
                overflowY: "auto",
              }}
            >
              {categories.map((cat) => {
                const count = products.filter((p) => p.categoryId === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      background: "#faf8f5",
                      border: "1px solid #eee8db",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "0.95rem", color: "#1b351e" }}>
                        {cat.name}
                      </strong>
                      <div style={{ fontSize: "0.78rem", color: "#666" }}>
                        <code>{cat.id}</code> · {count} productos
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCatId(cat.id);
                        setCatName(cat.name);
                        setCatDesc(cat.description);
                      }}
                    >
                      <Edit3 size={12} />
                      <span>Editar</span>
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GOOGLE SHEETS */}
      {activeTab === "sheets" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e9e4da",
              borderRadius: "12px",
              padding: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div
                style={{
                  background: "#eef6f0",
                  color: "#235d33",
                  padding: "0.6rem",
                  borderRadius: "10px",
                }}
              >
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#1b351e" }}>
                  Estado de la Planilla Google Sheets
                </h3>
                <div style={{ fontSize: "0.85rem", color: "#555" }}>
                  Modo de conexión: <strong>{sourceLabel(source)}</strong> ·{" "}
                  <span style={{ color: canWriteOrders ? "#166534" : "#854d0e" }}>
                    {canWriteOrders ? "Lectura y escritura de pedidos activa" : "Lectura en vivo"}
                  </span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: "0.9rem", color: "#444", lineHeight: 1.5, margin: "1rem 0" }}>
              Tu tienda lee los productos, precios y fotos automáticamente. Cada vez que actualices precios o stock en tu planilla de Google, podés hacer clic en <strong>Sincronizar ahora</strong> para reflejar los cambios en segundos.
            </p>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={handleQuickSync}
                disabled={syncing}
              >
                <RefreshCw
                  size={16}
                  className={syncing ? "animate-spin" : undefined}
                />
                <span>{syncing ? "Sincronizando…" : "Sincronizar ahora"}</span>
              </button>

              <a
                href="/api/catalog/template"
                download
                className="admin-btn-store"
                style={{ background: "#ffffff" }}
              >
                <Download size={15} />
                <span>Descargar catálogo CSV</span>
              </a>
            </div>
          </div>

          {/* Advanced Sheets Configuration (Accordion) */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e9e4da",
              borderRadius: "12px",
              padding: "1.25rem",
            }}
          >
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedSheets((prev) => !prev)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "#1b351e",
                  cursor: "pointer",
                  padding: "0.25rem 0",
                }}
              >
                <span>⚙️ Opciones avanzadas de Google Sheets y Apps Script</span>
                <ChevronDown
                  size={16}
                  style={{
                    transform: showAdvancedSheets ? "rotate(180deg)" : "none",
                    transition: "transform 0.15s ease",
                  }}
                />
              </button>

              {showAdvancedSheets && (
                <form
                  onSubmit={handleSaveAndSync}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    marginTop: "1rem",
                  }}
                >
                  <Field>
                    <FieldLabel htmlFor="sheet-id">
                      ID o Link público de Google Sheets
                    </FieldLabel>
                    <Input
                      id="sheet-id"
                      value={sheetIdOrUrl}
                      onChange={(e) => setSheetIdOrUrl(e.target.value)}
                      placeholder="Ej. 2PACX-1vTpKijmFFMP1Ea4... o ID de la planilla"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="script-url">
                      URL de Apps Script (Opcional, para escritura)
                    </FieldLabel>
                    <Input
                      id="script-url"
                      value={appsScriptUrl}
                      onChange={(e) => setAppsScriptUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                    />
                  </Field>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.75rem",
                    }}
                  >
                    <Field>
                      <FieldLabel htmlFor="prod-tab">Pestaña Productos</FieldLabel>
                      <Input
                        id="prod-tab"
                        value={productsTab}
                        onChange={(e) => setProductsTab(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="ord-tab">Pestaña Pedidos</FieldLabel>
                      <Input
                        id="ord-tab"
                        value={ordersTab}
                        onChange={(e) => setOrdersTab(e.target.value)}
                      />
                    </Field>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      marginTop: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="submit"
                      className="admin-btn-primary"
                      disabled={syncing}
                    >
                      <Save size={15} />
                      <span>Guardar y verificar conexión</span>
                    </button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={copyScript}
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      <span>
                        {copied
                          ? "¡Código copiado!"
                          : "Copiar código Apps Script"}
                      </span>
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal for Create / Edit Product */}
      {showProductForm && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">
                {editingProductId ? `Editar: ${prodName}` : "Crear nuevo producto"}
              </h2>
              <button
                type="button"
                onClick={() => setShowProductForm(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpsertProductSubmit} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div className="admin-modal-body">
                <Field>
                  <FieldLabel htmlFor="modal-prod-name">Nombre del producto</FieldLabel>
                  <Input
                    id="modal-prod-name"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Ej. Almendras naturales peladas"
                  />
                </Field>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <Field>
                    <FieldLabel htmlFor="modal-prod-cat">Categoría</FieldLabel>
                    <select
                      id="modal-prod-cat"
                      className="admin-select"
                      style={{ width: "100%" }}
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="modal-prod-short">Subtítulo / Medida</FieldLabel>
                    <Input
                      id="modal-prod-short"
                      value={prodShortDesc}
                      onChange={(e) => setProdShortDesc(e.target.value)}
                      placeholder="Ej. Premium · Origen Mendoza"
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="modal-prod-desc">Descripción</FieldLabel>
                  <Textarea
                    id="modal-prod-desc"
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="Beneficios, propiedades o sugerencias de consumo…"
                    rows={2}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="modal-prod-img">Imagen del producto</FieldLabel>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Input
                      id="modal-prod-img"
                      value={prodImage}
                      onChange={(e) => setProdImage(e.target.value)}
                      placeholder="Link de imagen (URL) o subí un archivo"
                    />
                    <label
                      className="admin-btn-store"
                      style={{ cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      <Upload size={14} />
                      <span>{uploadingImage ? "Subiendo…" : "Subir foto"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                </Field>

                {/* Visibility and tags */}
                <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", padding: "0.5rem 0" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.85rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={prodVisible}
                      onChange={(e) => setProdVisible(e.target.checked)}
                    />
                    <span>Producto visible en catálogo</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.85rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={prodFeatured}
                      onChange={(e) => setProdFeatured(e.target.checked)}
                    />
                    <span>Destacado en portada</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.85rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={prodNoSugar}
                      onChange={(e) => setProdNoSugar(e.target.checked)}
                    />
                    <span>Sin azúcar agregada</span>
                  </label>
                </div>

                {/* Presentations / Variants */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <strong style={{ fontSize: "0.9rem" }}>Presentaciones y Precios:</strong>
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#235d33",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                      onClick={() =>
                        setProdVariants((prev) => [
                          ...prev,
                          { sku: "", size: "500 g", price: "5000", stock: "10" },
                        ])
                      }
                    >
                      <Plus size={14} /> Agregar presentación
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {prodVariants.map((v, idx) => (
                      <div
                        key={v.id ?? idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 100px 80px 30px",
                          gap: "0.5rem",
                          alignItems: "center",
                        }}
                      >
                        <Input
                          placeholder="Presentación (ej. 250 g)"
                          value={v.size}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProdVariants((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, size: val } : item,
                              ),
                            );
                          }}
                        />
                        <Input
                          type="number"
                          min={1}
                          placeholder="$ ARS"
                          value={v.price}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProdVariants((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, price: val } : item,
                              ),
                            );
                          }}
                        />
                        <Input
                          type="number"
                          min={0}
                          placeholder="Stock"
                          value={v.stock}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProdVariants((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, stock: val } : item,
                              ),
                            );
                          }}
                        />
                        {prodVariants.length > 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setProdVariants((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#dc2626",
                            }}
                            title="Quitar presentación"
                          >
                            <X size={16} />
                          </button>
                        ) : (
                          <span />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowProductForm(false)}
                >
                  Cancelar
                </Button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={busyKey === "upsert-product"}
                >
                  <Save size={15} />
                  <span>
                    {busyKey === "upsert-product"
                      ? "Guardando…"
                      : editingProductId
                        ? "Guardar cambios"
                        : "Crear producto"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

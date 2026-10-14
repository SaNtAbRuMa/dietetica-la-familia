import {
  isAdminAuthenticated,
  isUsingDefaultAdminPassword,
} from "@/server/admin-auth";
import {
  getSheetsCatalogSnapshot,
  listStoredOrders,
  resolveSheetsConfig,
} from "@/server/sheets";
import { AdminLoginForm } from "@/features/admin/admin-login";
import { SheetsDashboard } from "@/features/admin/sheets-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return (
      <AdminLoginForm isDefaultPassword={isUsingDefaultAdminPassword()} />
    );
  }

  const [snapshot, config, orders] = await Promise.all([
    getSheetsCatalogSnapshot(),
    resolveSheetsConfig(),
    listStoredOrders(),
  ]);

  return (
    <SheetsDashboard
      initialSource={snapshot.source}
      initialSheetIdOrUrl={config.rawSheet || config.csvUrl}
      initialAppsScriptUrl={config.appsScriptUrl}
      initialProductsTab={config.productsTab}
      initialOrdersTab={config.ordersTab}
      canWriteOrders={snapshot.canWriteOrders}
      lastSyncedAt={snapshot.lastSyncedAt}
      initialError={snapshot.error}
      products={snapshot.products}
      categories={snapshot.categories}
      orders={orders}
    />
  );
}

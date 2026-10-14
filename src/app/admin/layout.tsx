import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import "./admin.css";

export const metadata = {
  title: "Panel de Administración · Dietética La Familia",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-wrapper">
      <header className="admin-navbar">
        <div className="admin-navbar-inner">
          <div className="admin-brand">
            <Image
              src="/images/logo-la-familia-icon.png"
              alt="Logo Dietética La Familia"
              width={34}
              height={34}
              className="admin-brand-logo"
            />
            <div>
              <div className="admin-brand-title">Dietética La Familia</div>
              <span className="admin-brand-badge">Panel de Administración</span>
            </div>
          </div>

          <div className="admin-navbar-actions">
            <Link href="/" target="_blank" rel="noopener noreferrer" className="admin-btn-store">
              <span>Ver tienda online</span>
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </header>

      <main id="contenido" className="admin-container">
        {children}
      </main>
    </div>
  );
}

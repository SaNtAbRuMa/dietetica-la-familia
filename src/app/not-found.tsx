import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container empty-state">
      <p className="eyebrow">404</p>
      <h1>Por acá no era.</h1>
      <p>No encontramos la página que buscás.</p>
      <Link href="/productos" className="text-link">
        Volver a los productos →
      </Link>
    </main>
  );
}

/**
 * Wraps every /admin/* route (login included) with the site's original
 * paper background — the public pages' body background was changed to
 * #fff, but the admin panel keeps its previous look.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-paper">{children}</div>;
}

import type { Metadata } from "next";
import { createGetDashboardSummaryUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import type { DashboardSummary } from "@/application/use-cases/admin/GetDashboardSummaryUseCase";

export const metadata: Metadata = {
  title: "Dashboard | Painel Administrativo",
};

export default async function AdminDashboardPage() {
  const backendConfigured = isBackendConfigured();
  let summary: DashboardSummary | null = null;

  if (backendConfigured) {
    try {
      summary = await createGetDashboardSummaryUseCase().execute();
    } catch {
      summary = null;
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Resumo</h1>
      <div className="mt-6">
        {summary ? (
          <DashboardStats summary={summary} />
        ) : (
          <ConfigurationNotice
            message={
              backendConfigured
                ? "Não foi possível carregar o resumo agora."
                : "Configure o Supabase (.env.local) para ver o resumo do casamento."
            }
          />
        )}
      </div>
    </div>
  );
}

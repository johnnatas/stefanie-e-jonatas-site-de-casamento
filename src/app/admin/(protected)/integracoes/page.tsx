import type { Metadata } from "next";
import { createGetAdminSecuritySettingsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { IntegracoesTabs } from "@/components/admin/IntegracoesTabs";

export const metadata: Metadata = {
  title: "Integrações | Painel Administrativo",
};

interface IntegracoesPageProps {
  searchParams: Promise<{ resetToken?: string }>;
}

export default async function IntegracoesPage({ searchParams }: IntegracoesPageProps) {
  const { resetToken } = await searchParams;
  const backendConfigured = isBackendConfigured();

  if (!backendConfigured) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-forest">Integrações</h1>
        <div className="mt-6">
          <ConfigurationNotice message="Configure o Supabase (.env.local) para gerenciar integrações." />
        </div>
      </div>
    );
  }

  let summary;
  try {
    summary = await createGetAdminSecuritySettingsUseCase().execute();
  } catch {
    return (
      <div>
        <h1 className="font-serif text-3xl text-forest">Integrações</h1>
        <div className="mt-6">
          <ConfigurationNotice message="Não foi possível carregar as integrações agora." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Integrações</h1>
      <div className="mt-8">
        <IntegracoesTabs
          activePaymentProvider={summary.activePaymentProvider}
          infinitePayHandle={summary.infinitePayHandle}
          mercadoPagoAccessTokenLast4={summary.mercadoPagoAccessTokenLast4}
          resendApiKeyLast4={summary.resendApiKeyLast4}
          hasSecretKey={summary.hasSecretKey}
          resetToken={resetToken}
        />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { createGetAdminSecuritySettingsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { MercadoPagoTokenForm } from "@/components/admin/MercadoPagoTokenForm";
import { ResendApiKeyForm } from "@/components/admin/ResendApiKeyForm";
import { SecretKeyForm } from "@/components/admin/SecretKeyForm";

export const metadata: Metadata = {
  title: "Integrações | Painel Administrativo",
};

export default async function IntegracoesPage() {
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

      <div className="mt-8 flex max-w-md flex-col gap-10">
        <MercadoPagoTokenForm
          currentTokenLast4={summary.mercadoPagoAccessTokenLast4}
          hasSecretKey={summary.hasSecretKey}
        />
        <ResendApiKeyForm currentApiKeyLast4={summary.resendApiKeyLast4} hasSecretKey={summary.hasSecretKey} />
        <SecretKeyForm hasSecretKey={summary.hasSecretKey} />
      </div>
    </div>
  );
}

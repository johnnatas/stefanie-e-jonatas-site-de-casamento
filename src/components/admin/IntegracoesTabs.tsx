"use client";

import { useState } from "react";
import type { PaymentProvider } from "@/domain/entities/PaymentProvider";
import { PaymentProviderForm } from "@/components/admin/PaymentProviderForm";
import { MercadoPagoTokenForm } from "@/components/admin/MercadoPagoTokenForm";
import { ResendApiKeyForm } from "@/components/admin/ResendApiKeyForm";
import { SecretKeyForm } from "@/components/admin/SecretKeyForm";
import { ResetSecretKeyWithTokenForm } from "@/components/admin/ResetSecretKeyWithTokenForm";
import { cn } from "@/shared/utils/cn";

type IntegracoesTab = "pagamento" | "notificacoes" | "seguranca";

const TABS: { id: IntegracoesTab; label: string }[] = [
  { id: "pagamento", label: "Pagamento" },
  { id: "notificacoes", label: "Notificações" },
  { id: "seguranca", label: "Segurança" },
];

interface IntegracoesTabsProps {
  activePaymentProvider: PaymentProvider;
  infinitePayHandle: string | null;
  mercadoPagoAccessTokenLast4: string | null;
  resendApiKeyLast4: string | null;
  hasSecretKey: boolean;
  resetToken?: string;
}

export function IntegracoesTabs({
  activePaymentProvider,
  infinitePayHandle,
  mercadoPagoAccessTokenLast4,
  resendApiKeyLast4,
  hasSecretKey,
  resetToken,
}: IntegracoesTabsProps) {
  const [activeTab, setActiveTab] = useState<IntegracoesTab>(resetToken ? "seguranca" : "pagamento");

  return (
    <div>
      <div role="tablist" className="flex gap-6 border-b border-line">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "-mb-px border-b-2 pb-3 font-sans text-sm uppercase tracking-widest transition-colors",
              activeTab === tab.id ? "border-moss text-moss" : "border-transparent text-forest/70 hover:text-moss"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8 flex max-w-md flex-col gap-10">
        {activeTab === "pagamento" && (
          <>
            <PaymentProviderForm activeProvider={activePaymentProvider} infinitePayHandle={infinitePayHandle} />
            {activePaymentProvider === "mercado_pago" && (
              <MercadoPagoTokenForm currentTokenLast4={mercadoPagoAccessTokenLast4} hasSecretKey={hasSecretKey} />
            )}
          </>
        )}

        {activeTab === "notificacoes" && (
          <ResendApiKeyForm currentApiKeyLast4={resendApiKeyLast4} hasSecretKey={hasSecretKey} />
        )}

        {activeTab === "seguranca" && (
          <>
            {resetToken && <ResetSecretKeyWithTokenForm token={resetToken} />}
            <SecretKeyForm hasSecretKey={hasSecretKey} />
          </>
        )}
      </div>
    </div>
  );
}

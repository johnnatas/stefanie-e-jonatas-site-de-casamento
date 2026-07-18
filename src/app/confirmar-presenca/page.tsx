import type { Metadata } from "next";
import { createSearchGuestsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { RsvpSearch } from "@/components/rsvp/RsvpSearch";

export const metadata: Metadata = {
  title: "Confirme sua Presença | Stéfanie & Jonatas",
};

export default async function RsvpPage() {
  const backendConfigured = isBackendConfigured();
  const guests = backendConfigured ? await createSearchGuestsUseCase().execute() : null;

  return (
    <div>
      {!guests ? (
        <div className="mx-auto max-w-2xl px-6 pt-20 pb-20">
          <ConfigurationNotice message="Configure o Supabase (.env.local) para confirmar presença." />
        </div>
      ) : (
        <RsvpSearch guests={guests} />
      )}
    </div>
  );
}

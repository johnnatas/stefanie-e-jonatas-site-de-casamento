import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createListGuestsUseCase } from "@/infrastructure/composition";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { ConfigurationNotice } from "@/components/ui/ConfigurationNotice";
import { GuestForm } from "@/components/admin/GuestForm";

export const metadata: Metadata = {
  title: "Editar Convidado | Painel Administrativo",
};

interface EditGuestPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGuestPage({ params }: EditGuestPageProps) {
  const { id } = await params;
  const backendConfigured = isBackendConfigured();

  if (!backendConfigured) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-forest">Editar convidado</h1>
        <div className="mt-6">
          <ConfigurationNotice message="Configure o Supabase (.env.local) para editar convidados." />
        </div>
      </div>
    );
  }

  let guests;
  try {
    guests = await createListGuestsUseCase().execute();
  } catch {
    return (
      <div>
        <h1 className="font-serif text-3xl text-forest">Editar convidado</h1>
        <div className="mt-6">
          <ConfigurationNotice message="Não foi possível carregar este convidado agora." />
        </div>
      </div>
    );
  }

  const guest = guests.find((candidate) => candidate.id === id);

  if (!guest) {
    notFound();
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">Editar convidado</h1>
      <div className="mt-6">
        <GuestForm
          defaultValues={{
            id: guest.id,
            fullName: guest.fullName,
            nickname: guest.nickname,
            email: guest.email,
            phone: guest.phone,
            companionsCount: guest.companionsCount,
            attendanceStatus: guest.attendanceStatus,
            message: guest.message,
          }}
        />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createListGuestsUseCase } from "@/infrastructure/composition";
import { GuestForm } from "@/components/admin/GuestForm";

export const metadata: Metadata = {
  title: "Editar Convidado | Painel Administrativo",
};

interface EditGuestPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGuestPage({ params }: EditGuestPageProps) {
  const { id } = await params;
  const guests = await createListGuestsUseCase().execute();
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

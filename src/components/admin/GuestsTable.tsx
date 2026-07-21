"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { AttendanceStatus } from "@/domain/entities/Guest";
import { DeleteGuestButton } from "@/components/admin/DeleteGuestButton";

export interface GuestListItem {
  id: string;
  fullName: string;
  nickname?: string;
  email?: string;
  phone?: string;
  companionsCount: number;
  attendanceStatus: AttendanceStatus;
}

interface GuestsTableProps {
  guests: GuestListItem[];
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  declined: "Recusado",
};

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

function isValidStatus(value: string | null): value is AttendanceStatus {
  return value === "pending" || value === "confirmed" || value === "declined";
}

export function GuestsTable({ guests }: GuestsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState<AttendanceStatus | "all">(
    isValidStatus(searchParams.get("status")) ? (searchParams.get("status") as AttendanceStatus) : "all"
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      router.replace(params.toString() ? `/admin/convidados?${params.toString()}` : "/admin/convidados");
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, status, router]);

  const filteredGuests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return guests.filter((guest) => {
      const matchesText =
        !term ||
        guest.fullName.toLowerCase().includes(term) ||
        (guest.nickname?.toLowerCase().includes(term) ?? false);
      const matchesStatus = status === "all" || guest.attendanceStatus === status;
      return matchesText && matchesStatus;
    });
  }, [guests, search, status]);

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[160px]">
          <label htmlFor="guest-search" className="block font-sans text-sm text-forest">
            Buscar por nome
          </label>
          <input
            id="guest-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={inputClassName}
          />
        </div>
        <div className="min-w-[160px]">
          <label htmlFor="guest-status" className="block font-sans text-sm text-forest">
            Status
          </label>
          <select
            id="guest-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as AttendanceStatus | "all")}
            className={inputClassName}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="confirmed">Confirmado</option>
            <option value="declined">Recusado</option>
          </select>
        </div>
      </div>

      {filteredGuests.length === 0 ? (
        <p className="mt-6 font-sans text-forest/70">Nenhum convidado encontrado.</p>
      ) : (
        <div className="mt-6">
          <p className="font-sans text-xs text-forest/70">
            {filteredGuests.length} de {guests.length} convidados
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse font-sans text-sm">
              <thead>
                <tr className="border-b border-line text-left text-forest/70">
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">Contato</th>
                  <th className="py-2 pr-4">Acompanhantes</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4" />
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((guest) => (
                  <tr key={guest.id} className="border-b border-line">
                    <td className="py-3 pr-4 text-forest">
                      {guest.fullName}
                      {guest.nickname && <span className="text-forest/70"> ({guest.nickname})</span>}
                    </td>
                    <td className="py-3 pr-4 text-forest/70">
                      {[guest.email, guest.phone].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="py-3 pr-4 text-forest/70">{guest.companionsCount}</td>
                    <td className="py-3 pr-4 text-forest/70">{STATUS_LABELS[guest.attendanceStatus]}</td>
                    <td className="py-3 pr-4">
                      <Link href={`/admin/convidados/${guest.id}`} className="text-moss hover:text-moss/80">
                        Editar
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <DeleteGuestButton guestId={guest.id} guestName={guest.fullName} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { AttendanceStatus } from "@/domain/entities/Guest";
import { DeleteGuestButton } from "@/components/admin/DeleteGuestButton";
import { CheckIcon, XIcon } from "@/components/admin/icons";
import { updateGuestCompanionsCountAction } from "@/app/admin/(protected)/convidados/updateCompanionsCountAction";

export interface GuestListItem {
  id: string;
  fullName: string;
  nickname?: string;
  email?: string;
  phone?: string;
  companionsCount: number;
  attendanceStatus: AttendanceStatus;
  confirmedAt?: Date;
}

interface GuestsTableProps {
  guests: GuestListItem[];
}

type SortColumn = "name" | "confirmedAt";
type SortDirection = "asc" | "desc";

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

interface CompanionsCountCellProps {
  guest: GuestListItem;
}

function CompanionsCountCell({ guest }: CompanionsCountCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(guest.companionsCount);
  const [displayValue, setDisplayValue] = useState(guest.companionsCount);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setValue(displayValue);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setError(null);
  }

  async function save() {
    setIsSaving(true);
    setError(null);
    const result = await updateGuestCompanionsCountAction(guest.id, value);
    setIsSaving(false);
    if (result.status === "error") {
      setError(result.message ?? "Não foi possível salvar agora.");
      return;
    }
    setDisplayValue(result.companionsCount ?? value);
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <td
        className="py-3 pr-4 text-forest/70"
        data-testid={`companions-count-${guest.id}`}
        onDoubleClick={startEditing}
      >
        {displayValue}
      </td>
    );
  }

  return (
    <td className="py-3 pr-4 text-forest/70">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={10}
          value={value}
          onChange={(event) => setValue(Math.max(0, Number(event.target.value)))}
          aria-label={`Editar acompanhantes de ${guest.fullName}`}
          className="w-16 rounded-md border border-line bg-paper px-2 py-1 font-sans text-forest focus:border-moss focus:outline-none"
          disabled={isSaving}
        />
        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          aria-label="Salvar acompanhantes"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-moss/40 text-moss transition-colors hover:bg-moss/10 disabled:opacity-60"
        >
          <CheckIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={cancelEditing}
          disabled={isSaving}
          aria-label="Cancelar edição de acompanhantes"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-danger/40 text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="mt-1 font-sans text-xs text-danger">{error}</p>}
    </td>
  );
}

export function GuestsTable({ guests }: GuestsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState<AttendanceStatus | "all">(
    isValidStatus(searchParams.get("status")) ? (searchParams.get("status") as AttendanceStatus) : "all"
  );
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      router.replace(params.toString() ? `/admin/convidados?${params.toString()}` : "/admin/convidados");
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, status, router]);

  function toggleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  const filteredGuests = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = guests.filter((guest) => {
      const matchesText =
        !term ||
        guest.fullName.toLowerCase().includes(term) ||
        (guest.nickname?.toLowerCase().includes(term) ?? false);
      const matchesStatus = status === "all" || guest.attendanceStatus === status;
      return matchesText && matchesStatus;
    });

    if (!sortColumn) {
      return filtered;
    }

    const direction = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortColumn === "name") {
        return a.fullName.localeCompare(b.fullName, "pt-BR") * direction;
      }
      const aTime = a.confirmedAt?.getTime() ?? 0;
      const bTime = b.confirmedAt?.getTime() ?? 0;
      return (bTime - aTime) * direction;
    });
  }, [guests, search, status, sortColumn, sortDirection]);

  function sortIndicator(column: SortColumn) {
    if (sortColumn !== column) return null;
    if (column === "confirmedAt") {
      return sortDirection === "asc" ? " ▼" : " ▲";
    }
    return sortDirection === "asc" ? " ▲" : " ▼";
  }

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
            <table className="w-full min-w-[720px] border-collapse font-sans text-sm">
              <thead>
                <tr className="border-b border-line text-left text-forest/70">
                  <th className="py-2 pr-4">
                    <button type="button" onClick={() => toggleSort("name")} className="hover:text-forest">
                      Nome{sortIndicator("name")}
                    </button>
                  </th>
                  <th className="py-2 pr-4">Contato</th>
                  <th className="py-2 pr-4">Acompanhantes</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">
                    <button type="button" onClick={() => toggleSort("confirmedAt")} className="hover:text-forest">
                      Confirmado em{sortIndicator("confirmedAt")}
                    </button>
                  </th>
                  <th className="py-2 pr-4" />
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((guest) => (
                  <tr key={guest.id} className="border-b border-line">
                    <td className="py-3 pr-4 text-forest">
                      <Link href={`/admin/convidados/${guest.id}`} className="hover:text-moss">
                        {guest.fullName}
                      </Link>
                      {guest.nickname && <span className="text-forest/70"> ({guest.nickname})</span>}
                    </td>
                    <td className="py-3 pr-4 text-forest/70">
                      {[guest.email, guest.phone].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <CompanionsCountCell guest={guest} />
                    <td className="py-3 pr-4 text-forest/70">{STATUS_LABELS[guest.attendanceStatus]}</td>
                    <td className="py-3 pr-4 text-forest/70">
                      {guest.confirmedAt ? guest.confirmedAt.toLocaleDateString("pt-BR") : "—"}
                    </td>
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

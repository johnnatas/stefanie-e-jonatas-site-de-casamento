"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Gift, GiftStatus } from "@/domain/entities/Gift";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { DeleteGiftButton } from "@/components/admin/DeleteGiftButton";

interface GiftsTableProps {
  gifts: Gift[];
}

const STATUS_LABEL: Record<GiftStatus, string> = {
  available: "Disponível",
  reserved: "Reservado",
  paid: "Presenteado",
};

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

function isValidStatus(value: string | null): value is GiftStatus {
  return value === "available" || value === "reserved" || value === "paid";
}

export function GiftsTable({ gifts }: GiftsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categories = useMemo(() => Array.from(new Set(gifts.map((gift) => gift.category))).sort(), [gifts]);

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "all");
  const [status, setStatus] = useState<GiftStatus | "all">(
    isValidStatus(searchParams.get("status")) ? (searchParams.get("status") as GiftStatus) : "all"
  );

  function syncUrl(nextSearch: string, nextCategory: string, nextStatus: GiftStatus | "all") {
    const params = new URLSearchParams();
    if (nextSearch) params.set("search", nextSearch);
    if (nextCategory !== "all") params.set("category", nextCategory);
    if (nextStatus !== "all") params.set("status", nextStatus);
    router.replace(params.toString() ? `/admin/presentes?${params.toString()}` : "/admin/presentes");
  }

  const filteredGifts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return gifts.filter((gift) => {
      const matchesText = !term || gift.name.toLowerCase().includes(term);
      const matchesCategory = category === "all" || gift.category === category;
      const matchesStatus = status === "all" || gift.status === status;
      return matchesText && matchesCategory && matchesStatus;
    });
  }, [gifts, search, category, status]);

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="gift-search" className="block font-sans text-sm text-forest">
            Buscar por nome
          </label>
          <input
            id="gift-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              syncUrl(event.target.value, category, status);
            }}
            className={inputClassName}
          />
        </div>
        <div className="min-w-[160px]">
          <label htmlFor="gift-category" className="block font-sans text-sm text-forest">
            Categoria
          </label>
          <select
            id="gift-category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              syncUrl(search, event.target.value, status);
            }}
            className={inputClassName}
          >
            <option value="all">Todas</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label htmlFor="gift-status" className="block font-sans text-sm text-forest">
            Status
          </label>
          <select
            id="gift-status"
            value={status}
            onChange={(event) => {
              const nextStatus = event.target.value as GiftStatus | "all";
              setStatus(nextStatus);
              syncUrl(search, category, nextStatus);
            }}
            className={inputClassName}
          >
            <option value="all">Todos</option>
            <option value="available">Disponível</option>
            <option value="reserved">Reservado</option>
            <option value="paid">Presenteado</option>
          </select>
        </div>
      </div>

      {filteredGifts.length === 0 ? (
        <p className="mt-6 font-sans text-forest/70">Nenhum presente encontrado.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-line text-left text-forest/70">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Categoria</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4" />
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {filteredGifts.map((gift) => (
                <tr key={gift.id} className="border-b border-line">
                  <td className="py-3 pr-4 text-forest">{gift.name}</td>
                  <td className="py-3 pr-4 text-forest/70">{gift.category}</td>
                  <td className="py-3 pr-4 text-forest/70">{formatCurrency(gift.price)}</td>
                  <td className="py-3 pr-4 text-forest/70">{STATUS_LABEL[gift.status]}</td>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/presentes/${gift.id}`} className="text-moss hover:text-moss/80">
                      Editar
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <DeleteGiftButton giftId={gift.id!} giftName={gift.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

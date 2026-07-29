"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { GiftStatus } from "@/domain/entities/Gift";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { DeleteGiftButton } from "@/components/admin/DeleteGiftButton";

export interface GiftListItem {
  id: string;
  name: string;
  category: string;
  price: number;
  status: GiftStatus;
  createdAt: Date;
}

interface GiftsTableProps {
  gifts: GiftListItem[];
}

const STATUS_LABEL: Record<GiftStatus, string> = {
  available: "Disponível",
  reserved: "Reservado",
  paid: "Presenteado",
};

const PAGE_SIZE = 20;

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
  const [page, setPage] = useState(() => {
    const parsed = Number(searchParams.get("page"));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category !== "all") params.set("category", category);
      if (status !== "all") params.set("status", status);
      if (page > 1) params.set("page", String(page));
      router.replace(params.toString() ? `/admin/presentes?${params.toString()}` : "/admin/presentes");
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, category, status, page, router]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleCategoryChange(value: string) {
    setCategory(value);
    setPage(1);
  }

  function handleStatusChange(value: GiftStatus | "all") {
    setStatus(value);
    setPage(1);
  }

  const filteredGifts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return gifts
      .filter((gift) => {
        const matchesText = !term || gift.name.toLowerCase().includes(term);
        const matchesCategory = category === "all" || gift.category === category;
        const matchesStatus = status === "all" || gift.status === status;
        return matchesText && matchesCategory && matchesStatus;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [gifts, search, category, status]);

  const totalPages = Math.max(1, Math.ceil(filteredGifts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedGifts = filteredGifts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[160px]">
          <label htmlFor="gift-search" className="block font-sans text-sm text-forest">
            Buscar por nome
          </label>
          <input
            id="gift-search"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
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
            onChange={(event) => handleCategoryChange(event.target.value)}
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
            onChange={(event) => handleStatusChange(event.target.value as GiftStatus | "all")}
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
        <div className="mt-6">
          <p className="font-sans text-xs text-forest/70">
            {filteredGifts.length} de {gifts.length} presentes
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse font-sans text-sm">
              <thead>
                <tr className="border-b border-line text-left text-forest/70">
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">Categoria</th>
                  <th className="py-2 pr-4">Valor</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {paginatedGifts.map((gift) => (
                  <tr key={gift.id} className="border-b border-line">
                    <td className="py-3 pr-4 text-forest">
                      <Link href={`/admin/presentes/${gift.id}`} className="hover:text-moss">
                        {gift.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-forest/70">{gift.category}</td>
                    <td className="py-3 pr-4 text-forest/70">{formatCurrency(gift.price)}</td>
                    <td className="py-3 pr-4 text-forest/70">{STATUS_LABEL[gift.status]}</td>
                    <td className="py-3 pr-4">
                      <DeleteGiftButton giftId={gift.id} giftName={gift.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="font-sans text-xs uppercase tracking-widest text-forest disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="font-sans text-xs text-forest/70">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="font-sans text-xs uppercase tracking-widest text-forest disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

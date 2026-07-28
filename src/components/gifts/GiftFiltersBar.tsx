"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { shareOrCopyLink } from "@/shared/utils/shareOrCopyLink";

interface GiftFiltersBarProps {
  categories: string[];
}

const SORT_OPTIONS = [
  { value: "recentes", label: "Mais recentes" },
  { value: "nome-asc", label: "Nome (A-Z)" },
  { value: "nome-desc", label: "Nome (Z-A)" },
  { value: "valor-asc", label: "Valor (menor-maior)" },
  { value: "valor-desc", label: "Valor (maior-menor)" },
];

const STATUS_OPTIONS = [
  { value: "available", label: "Disponível" },
  { value: "reserved", label: "Reservado" },
  { value: "paid", label: "Presenteado" },
];

const fieldClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm text-forest focus:border-moss focus:outline-none";
const buttonClassName =
  "min-h-11 rounded-full border border-line px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest transition-colors hover:border-moss";

export function GiftFiltersBar({ categories }: GiftFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get("q") ?? "";
  const currentCategories = searchParams.getAll("categoria");
  const currentSituacao = searchParams.get("situacao") ?? "";
  const currentOrdenar = searchParams.get("ordenar") ?? "recentes";

  const [searchInput, setSearchInput] = useState(currentQuery);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [previousQuery, setPreviousQuery] = useState(currentQuery);
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, isPanelOpen, () => setIsPanelOpen(false));

  if (previousQuery !== currentQuery) {
    setPreviousQuery(currentQuery);
    setSearchInput(currentQuery);
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput === currentQuery) return;
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) {
        params.set("q", searchInput);
      } else {
        params.delete("q");
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput, currentQuery, searchParams, pathname, router]);

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function setSingleParam(key: string, value: string | null) {
    pushParams((params) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
  }

  function toggleCategory(category: string) {
    pushParams((params) => {
      const selected = new Set(params.getAll("categoria"));
      if (selected.has(category)) {
        selected.delete(category);
      } else {
        selected.add(category);
      }
      params.delete("categoria");
      selected.forEach((item) => params.append("categoria", item));
    });
  }

  function clearFilters() {
    const params = new URLSearchParams();
    const status = searchParams.get("status");
    if (status) params.set("status", status);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  async function handleShare() {
    const result = await shareOrCopyLink({ title: "Lista de Presentes", url: window.location.href });
    if (result === "copied") {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  }

  const activeFilterCount =
    (currentQuery ? 1 : 0) + (currentCategories.length > 0 ? 1 : 0) + (currentSituacao ? 1 : 0);

  function renderControls(idPrefix: string) {
    return (
      <>
        <div>
          <label htmlFor={`${idPrefix}-search`} className="block font-sans text-xs uppercase tracking-widest text-forest/70">
            Buscar
          </label>
          <input
            id={`${idPrefix}-search`}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nome do presente"
            className={fieldClassName}
          />
        </div>

        <div>
          <span className="block font-sans text-xs uppercase tracking-widest text-forest/70">Categoria</span>
          <div className="mt-2 flex flex-wrap gap-3">
            {categories.map((category) => (
              <label key={category} className="flex items-center gap-1.5 font-sans text-sm text-forest">
                <input
                  type="checkbox"
                  checked={currentCategories.includes(category)}
                  onChange={() => toggleCategory(category)}
                />
                {category}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor={`${idPrefix}-situacao`} className="block font-sans text-xs uppercase tracking-widest text-forest/70">
            Situação
          </label>
          <select
            id={`${idPrefix}-situacao`}
            value={currentSituacao}
            onChange={(event) => setSingleParam("situacao", event.target.value || null)}
            className={fieldClassName}
          >
            <option value="">Todas</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${idPrefix}-ordenar`} className="block font-sans text-xs uppercase tracking-widest text-forest/70">
            Ordenar por
          </label>
          <select
            id={`${idPrefix}-ordenar`}
            value={currentOrdenar}
            onChange={(event) => setSingleParam("ordenar", event.target.value === "recentes" ? null : event.target.value)}
            className={fieldClassName}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={clearFilters} className={buttonClassName}>
            Limpar filtros
          </button>
          <button type="button" onClick={handleShare} className={buttonClassName}>
            {copyFeedback ? "Link copiado!" : "Compartilhar"}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="mb-8">
      <div className="hidden sm:flex sm:flex-wrap sm:items-end sm:gap-4">{renderControls("filters-desktop")}</div>

      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setIsPanelOpen(true)}
          className="relative min-h-11 w-full rounded-full border border-line bg-paper px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest"
        >
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-moss text-[10px] text-paper">
              {activeFilterCount}
            </span>
          )}
        </button>

        {isPanelOpen && (
          <div className="fixed inset-0 z-50 bg-forest/40 p-4" onClick={() => setIsPanelOpen(false)}>
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Filtros"
              onClick={(event) => event.stopPropagation()}
              className="flex h-full w-full flex-col gap-4 overflow-y-auto rounded-lg bg-paper p-6"
            >
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                aria-label="Fechar"
                className="self-end font-sans text-2xl leading-none text-forest/60 hover:text-forest"
              >
                &times;
              </button>
              {renderControls("filters-mobile")}
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                className="min-h-11 rounded-full bg-moss px-4 py-2 font-sans text-xs uppercase tracking-widest text-paper"
              >
                Aplicar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

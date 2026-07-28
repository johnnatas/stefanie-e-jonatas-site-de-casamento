"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { shareOrCopyLink } from "@/shared/utils/shareOrCopyLink";
import { ShareIcon, CheckIcon } from "@/components/ui/ShareIcon";

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

const STATUS_SELECT_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "available", label: "Disponível" },
  { value: "reserved", label: "Reservado" },
  { value: "paid", label: "Presenteado" },
];

const labelClassName = "block font-sans text-xs uppercase tracking-widest text-forest/70";
const fieldClassName =
  "mt-1 min-h-11 w-full rounded-md border border-line bg-mist px-3 py-2 font-sans text-sm text-forest focus:border-moss focus:outline-none";
const buttonClassName =
  "flex min-h-11 items-center justify-center gap-2 rounded-full border border-line px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest transition-colors hover:border-moss";
const optionButtonClassName =
  "flex w-full items-center justify-between whitespace-nowrap px-3 py-2 text-left font-sans text-sm transition-colors hover:bg-paper-soft";

function SelectChevron({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 8"
      className={`pointer-events-none h-2.5 w-2.5 flex-shrink-0 fill-none stroke-forest/60 transition-transform ${isOpen ? "rotate-180" : ""}`}
    >
      <path d="M1 1.5L6 6.5L11 1.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function useCloseOnOutsideOrEscape(isOpen: boolean, close: () => void, containerRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, close, containerRef]);
}

interface CustomSelectProps {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function CustomSelect({ id, label, value, options, onChange }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useCloseOnOutsideOrEscape(isOpen, () => setIsOpen(false), containerRef);

  const selectedLabel = options.find((option) => option.value === value)?.label ?? label;

  return (
    <div>
      <span id={`${id}-label`} className={labelClassName}>
        {label}
      </span>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={`${id}-label ${id}`}
          onClick={() => setIsOpen((open) => !open)}
          className={`${fieldClassName} flex items-center justify-between gap-2 text-left`}
        >
          <span>{selectedLabel}</span>
          <SelectChevron isOpen={isOpen} />
        </button>
        {isOpen && (
          <ul
            role="listbox"
            aria-labelledby={`${id}-label`}
            className="absolute z-20 mt-1 w-max min-w-full max-w-xs overflow-hidden rounded-md border border-line bg-mist"
          >
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`${optionButtonClassName} ${option.value === value ? "bg-moss/10 text-moss" : "text-forest"}`}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface CustomMultiSelectProps {
  id: string;
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

function CustomMultiSelect({ id, label, options, selected, onToggle }: CustomMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useCloseOnOutsideOrEscape(isOpen, () => setIsOpen(false), containerRef);

  if (options.length === 0) return null;

  const triggerLabel =
    selected.length === 0 ? "Todas" : selected.length === 1 ? selected[0] : `${selected.length} selecionadas`;

  return (
    <div>
      <span id={`${id}-label`} className={labelClassName}>
        {label}
      </span>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={`${id}-label ${id}`}
          onClick={() => setIsOpen((open) => !open)}
          className={`${fieldClassName} flex items-center justify-between gap-2 text-left`}
        >
          <span>{triggerLabel}</span>
          <SelectChevron isOpen={isOpen} />
        </button>
        {isOpen && (
          <ul
            role="listbox"
            aria-multiselectable="true"
            aria-labelledby={`${id}-label`}
            className="absolute z-20 mt-1 w-max min-w-full max-w-xs overflow-hidden rounded-md border border-line bg-mist"
          >
            {options.map((option) => {
              const isActive = selected.includes(option);
              return (
                <li key={option}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => onToggle(option)}
                    className={`${optionButtonClassName} ${isActive ? "bg-moss/10 text-moss" : "text-forest"}`}
                  >
                    {option}
                    {isActive && <CheckIcon className="h-4 w-4 flex-shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

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
        <div className="sm:min-w-[180px] sm:flex-1">
          <label htmlFor={`${idPrefix}-search`} className={labelClassName}>
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

        <CustomMultiSelect
          id={`${idPrefix}-categoria`}
          label="Categoria"
          options={categories}
          selected={currentCategories}
          onToggle={toggleCategory}
        />

        <CustomSelect
          id={`${idPrefix}-situacao`}
          label="Situação"
          value={currentSituacao}
          options={STATUS_SELECT_OPTIONS}
          onChange={(value) => setSingleParam("situacao", value || null)}
        />

        <CustomSelect
          id={`${idPrefix}-ordenar`}
          label="Ordenar por"
          value={currentOrdenar}
          options={SORT_OPTIONS}
          onChange={(value) => setSingleParam("ordenar", value === "recentes" ? null : value)}
        />

        <div className="flex flex-wrap items-end gap-2">
          <button type="button" onClick={clearFilters} className={buttonClassName}>
            Limpar filtros
          </button>
          <button type="button" onClick={handleShare} className={buttonClassName}>
            {copyFeedback ? <CheckIcon className="h-4 w-4" /> : <ShareIcon className="h-4 w-4" />}
            <span>{copyFeedback ? "Link copiado!" : "Compartilhar"}</span>
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="mb-8">
      <div className="hidden rounded-lg border border-line bg-mist p-5 sm:flex sm:flex-wrap sm:items-end sm:gap-5">
        {renderControls("filters-desktop")}
      </div>

      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setIsPanelOpen(true)}
          className="relative min-h-11 w-full rounded-full border border-line bg-mist px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest"
        >
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-moss text-xs text-paper">
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
              className="flex h-full w-full flex-col gap-4 overflow-y-auto rounded-lg bg-mist p-6"
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

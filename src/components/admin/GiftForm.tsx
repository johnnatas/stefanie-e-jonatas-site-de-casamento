"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import {
  upsertGiftAction,
  type UpsertGiftActionState,
} from "@/app/admin/(protected)/presentes/actions";
import { fetchGiftLinkMetadataAction } from "@/app/admin/(protected)/presentes/linkAutofillAction";
import { GiftFormValues } from "@/components/admin/giftFormSchema";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";
import { cn } from "@/shared/utils/cn";

interface GiftFormProps {
  defaultValues?: GiftFormValues;
  checkoutUrl?: string | null;
  existingCategories?: string[];
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const NEW_CATEGORY_OPTION = "__new__";

const initialUpsertGiftActionState: UpsertGiftActionState = { status: "idle" };

interface LinkFetchState {
  status: "idle" | "pending" | "success" | "error";
  message?: string;
}

const initialLinkFetchState: LinkFetchState = { status: "idle" };

export function GiftForm({ defaultValues, checkoutUrl, existingCategories = [] }: GiftFormProps) {
  const [state, formAction, isPending] = useActionState(upsertGiftAction, initialUpsertGiftActionState);
  const [imageUrl, setImageUrl] = useState<string | null>(defaultValues?.imageUrl ?? null);
  const [linkFetchState, setLinkFetchState] = useState<LinkFetchState>(initialLinkFetchState);
  const categoryIsKnown = !!defaultValues?.category && existingCategories.includes(defaultValues.category);
  const [isNewCategory, setIsNewCategory] = useState(existingCategories.length === 0 || (!!defaultValues?.category && !categoryIsKnown));

  const productLinkRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  async function handleFetchLinkMetadata() {
    const url = productLinkRef.current?.value.trim();
    if (!url) return;

    setLinkFetchState({ status: "pending" });
    const result = await fetchGiftLinkMetadataAction(url);

    if (result.status === "error") {
      setLinkFetchState({ status: "error", message: result.message ?? "Não foi possível buscar dados desse link." });
      return;
    }

    const found: string[] = [];
    if (result.title && nameInputRef.current) {
      nameInputRef.current.value = result.title;
      found.push("título");
    }
    if (result.price !== undefined && priceInputRef.current) {
      priceInputRef.current.value = String(result.price);
      found.push("valor");
    }
    if (result.imageUrl) {
      setImageUrl(result.imageUrl);
      found.push("imagem");
    }

    const allFields = ["título", "valor", "imagem"];
    const missing = allFields.filter((field) => !found.includes(field));
    const message =
      missing.length === 0
        ? "Título, valor e imagem encontrados."
        : `${found.length > 0 ? found.join(", ") + " encontrado(s). " : ""}Preencha ${missing.join(", ")} manualmente.`;

    setLinkFetchState({ status: "success", message });
  }

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-8">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <div className="flex flex-col gap-4">
        <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">Sobre o presente</span>

        <div>
          <label htmlFor="productLink" className="block font-sans text-sm text-forest">
            Link do produto (opcional)
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="productLink"
              ref={productLinkRef}
              type="url"
              placeholder="Cole o link do produto"
              className={cn(inputClassName, "min-w-0")}
            />
            <button
              type="button"
              onClick={handleFetchLinkMetadata}
              disabled={linkFetchState.status === "pending"}
              className="shrink-0 rounded-full border border-line px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest transition-colors hover:border-moss disabled:opacity-60"
            >
              {linkFetchState.status === "pending" ? "Buscando..." : "Buscar dados do link"}
            </button>
          </div>
          {linkFetchState.message && (
            <p
              role="status"
              aria-live="polite"
              className={`mt-1 font-sans text-xs ${linkFetchState.status === "error" ? "text-danger" : "text-moss"}`}
            >
              {linkFetchState.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="name" className="block font-sans text-sm text-forest">
            Nome
          </label>
          <input
            id="name"
            name="name"
            ref={nameInputRef}
            defaultValue={defaultValues?.name}
            required
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="description" className="block font-sans text-sm text-forest">
            Descrição
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={defaultValues?.description}
            required
            rows={3}
            className={inputClassName}
          />
        </div>

        <PhotoUploadField
          name="image"
          currentUrl={imageUrl}
          label="Foto do presente"
          className="h-40 w-full rounded-md"
          showRemoveCheckbox={false}
        />
      </div>

      <div className="flex flex-col gap-4">
        <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">Valor e categoria</span>

        <div>
          <label htmlFor="price" className="block font-sans text-sm text-forest">
            Valor (R$)
          </label>
          <input
            id="price"
            name="price"
            ref={priceInputRef}
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaultValues?.price}
            required
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="category" className="block font-sans text-sm text-forest">
            Categoria
          </label>
          {isNewCategory ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                id="category"
                name="category"
                defaultValue={!categoryIsKnown ? defaultValues?.category : undefined}
                required
                className={inputClassName}
              />
              {existingCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsNewCategory(false)}
                  className="shrink-0 font-sans text-xs uppercase tracking-widest text-moss hover:text-forest"
                >
                  Escolher existente
                </button>
              )}
            </div>
          ) : (
            <select
              id="category"
              name="category"
              defaultValue={defaultValues?.category}
              required
              className={inputClassName}
              onChange={(event) => {
                if (event.target.value === NEW_CATEGORY_OPTION) {
                  setIsNewCategory(true);
                }
              }}
            >
              {!defaultValues?.category && <option value="">Selecione...</option>}
              {existingCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value={NEW_CATEGORY_OPTION}>+ Nova categoria</option>
            </select>
          )}
        </div>
      </div>

      {defaultValues?.id && (
        <div className="flex flex-col gap-4">
          <span className="font-sans text-xs uppercase tracking-[0.2em] text-forest/70">Administrativo</span>

          <div className="rounded-md border border-line bg-paper-soft p-4">
            <label htmlFor="secretKey" className="block font-sans text-sm font-medium text-forest">
              Chave secreta
            </label>
            <p id="secretKey-hint" className="mt-1 font-sans text-xs text-forest/70">
              Necessária para confirmar mudanças de valor — protege contra alterações indevidas no preço do
              presente.
            </p>
            <input
              id="secretKey"
              name="secretKey"
              type="password"
              autoComplete="off"
              aria-describedby="secretKey-hint"
              className={cn(inputClassName, "mt-2 bg-paper")}
            />
          </div>

          {checkoutUrl && (
            <div>
              <label htmlFor="checkoutUrl" className="block font-sans text-sm text-forest">
                Link de pagamento
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="checkoutUrl"
                  type="text"
                  readOnly
                  value={checkoutUrl}
                  onFocus={(event) => event.target.select()}
                  className={cn(inputClassName, "min-w-0")}
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(checkoutUrl)}
                  className="shrink-0 rounded-full border border-line px-4 py-2 font-sans text-xs uppercase tracking-widest text-forest transition-colors hover:border-moss"
                >
                  Copiar link
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar presente"}
        </button>
        <Link
          href="/admin/presentes"
          className="font-sans text-sm uppercase tracking-widest text-forest/70 hover:text-moss"
        >
          Cancelar
        </Link>
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}

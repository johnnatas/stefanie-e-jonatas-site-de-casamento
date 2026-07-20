"use client";

import { useActionState, useRef, useState } from "react";
import {
  upsertGiftAction,
  type UpsertGiftActionState,
} from "@/app/admin/(protected)/presentes/actions";
import { fetchGiftLinkMetadataAction } from "@/app/admin/(protected)/presentes/linkAutofillAction";
import { GiftFormValues } from "@/components/admin/giftFormSchema";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";

interface GiftFormProps {
  defaultValues?: GiftFormValues;
  checkoutUrl?: string | null;
}

const inputClassName =
  "mt-1 w-full rounded-md border border-line bg-paper px-4 py-2 font-sans text-forest focus:border-moss focus:outline-none";

const initialUpsertGiftActionState: UpsertGiftActionState = { status: "idle" };

interface LinkFetchState {
  status: "idle" | "pending" | "success" | "error";
  message?: string;
}

const initialLinkFetchState: LinkFetchState = { status: "idle" };

export function GiftForm({ defaultValues, checkoutUrl }: GiftFormProps) {
  const [state, formAction, isPending] = useActionState(upsertGiftAction, initialUpsertGiftActionState);
  const [imageUrl, setImageUrl] = useState<string | null>(defaultValues?.imageUrl ?? null);
  const [linkFetchState, setLinkFetchState] = useState<LinkFetchState>(initialLinkFetchState);

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
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

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
            className={inputClassName}
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
        <input
          id="category"
          name="category"
          defaultValue={defaultValues?.category}
          required
          className={inputClassName}
        />
      </div>

      {defaultValues?.id && (
        <div>
          <label htmlFor="secretKey" className="block font-sans text-sm text-forest">
            Chave secreta (obrigatória se alterar o valor)
          </label>
          <input
            id="secretKey"
            name="secretKey"
            type="password"
            autoComplete="off"
            className={inputClassName}
          />
        </div>
      )}

      {defaultValues?.id && checkoutUrl && (
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
              className={inputClassName}
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

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-8 py-3 font-sans text-sm uppercase tracking-widest text-paper transition-colors hover:bg-moss/80 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar presente"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}

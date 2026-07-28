"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent } from "react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { compressImage, BALANCED_COMPRESSION } from "@/shared/utils/compressImage";

interface PhotoUploadFieldProps {
  name: string;
  currentUrl: string | null;
  label: string;
  className?: string;
  showRemoveCheckbox?: boolean;
}

export function PhotoUploadField({
  name,
  currentUrl,
  label,
  className = "h-24 w-full rounded-md",
  showRemoveCheckbox = true,
}: PhotoUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const removeCheckboxRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function processFile(file: File) {
    setIsCompressing(true);
    try {
      const compressed = await compressImage(file, BALANCED_COMPRESSION);

      try {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(compressed);
        if (fileInputRef.current) {
          fileInputRef.current.files = dataTransfer.files;
        }
      } catch {
        // Some environments don't support assigning input.files
        // programmatically — the preview still updates below, but the
        // original (uncompressed) file remains what actually submits.
      }

      if (removeCheckboxRef.current) {
        removeCheckboxRef.current.checked = false;
      }

      setPreviewUrl((existing) => {
        if (existing) URL.revokeObjectURL(existing);
        return URL.createObjectURL(compressed);
      });
    } finally {
      setIsCompressing(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  }

  async function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const item = Array.from(event.clipboardData.items).find((entry) => entry.type.startsWith("image/"));
    if (!item) return;

    const file = item.getAsFile();
    if (!file) return;

    event.preventDefault();
    await processFile(file);
  }

  return (
    <div className="flex flex-col gap-2" tabIndex={0} onPaste={handlePaste}>
      <input type="hidden" name={`${name}CurrentUrl`} value={currentUrl ?? ""} />
      {previewUrl ? (
        <img src={previewUrl} alt={label} className={`object-cover ${className}`} />
      ) : (
        <PhotoOrPlaceholder src={currentUrl} label={label} className={className} />
      )}
      <input
        ref={fileInputRef}
        type="file"
        name={`${name}File`}
        accept="image/*"
        onChange={handleFileChange}
        className="font-sans text-sm text-forest"
      />
      <span className="font-sans text-xs text-forest/60">Ou clique aqui e cole uma imagem (Ctrl+V)</span>
      {isCompressing && <span className="font-sans text-xs text-forest/70">Comprimindo...</span>}
      {showRemoveCheckbox && (currentUrl || previewUrl) && (
        <label className="flex items-center gap-2 font-sans text-xs text-forest/70">
          <input ref={removeCheckboxRef} type="checkbox" name={`${name}Remove`} />
          Remover esta foto
        </label>
      )}
    </div>
  );
}

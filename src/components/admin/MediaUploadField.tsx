"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { compressImage, BALANCED_COMPRESSION } from "@/shared/utils/compressImage";
import type { MediaKind } from "@/infrastructure/supabase/resolveMediaField";

interface MediaUploadFieldProps {
  name: string;
  currentUrl: string | null;
  currentType: MediaKind;
  label: string;
  onTypeChange: (type: MediaKind) => void;
}

export function MediaUploadField({ name, currentUrl, currentType, label, onTypeChange }: MediaUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (currentType === "video") {
      setPreviewUrl((existing) => {
        if (existing) URL.revokeObjectURL(existing);
        return URL.createObjectURL(file);
      });
      return;
    }

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
        // Some environments don't support assigning input.files programmatically —
        // the preview still updates below, but the original (uncompressed) file
        // remains what actually submits.
      }

      setPreviewUrl((existing) => {
        if (existing) URL.revokeObjectURL(existing);
        return URL.createObjectURL(compressed);
      });
    } finally {
      setIsCompressing(false);
    }
  }

  const displayUrl = previewUrl ?? currentUrl;

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={`${name}CurrentUrl`} value={currentUrl ?? ""} />
      <input type="hidden" name={`${name}Type`} value={currentType} />

      <div className="flex items-center gap-4 font-sans text-sm text-forest">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name={`${name}-type-choice`}
            checked={currentType === "photo"}
            onChange={() => onTypeChange("photo")}
          />
          Foto
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name={`${name}-type-choice`}
            checked={currentType === "video"}
            onChange={() => onTypeChange("video")}
          />
          Vídeo
        </label>
      </div>

      {displayUrl ? (
        currentType === "video" ? (
          <video src={displayUrl} muted loop autoPlay playsInline className="h-40 w-full rounded-md object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt={label} className="h-40 w-full rounded-md object-cover" />
        )
      ) : (
        <div className="flex h-40 w-full items-center justify-center rounded-md border border-line bg-paper-soft font-sans text-xs text-forest/70">
          Sem arquivo
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        name={`${name}File`}
        accept={currentType === "video" ? "video/*" : "image/*"}
        onChange={handleFileChange}
        className="font-sans text-sm text-forest"
      />
      {isCompressing && <span className="font-sans text-xs text-forest/70">Comprimindo...</span>}
    </div>
  );
}

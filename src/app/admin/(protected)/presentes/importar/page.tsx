import type { Metadata } from "next";
import Link from "next/link";
import { ImportGiftsForm } from "@/components/admin/ImportGiftsForm";

export const metadata: Metadata = {
  title: "Importar Presentes | Painel Administrativo",
};

export default function ImportGiftsPage() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Link href="/admin/presentes" className="font-sans text-sm text-forest/70 hover:text-forest">
          ← Voltar
        </Link>
      </div>
      <h1 className="mt-2 font-serif text-3xl text-forest">Importar presentes</h1>
      <a
        href="/templates/presentes-modelo.xlsx"
        download
        className="mt-2 inline-block font-sans text-sm text-moss hover:text-moss/80"
      >
        Baixar planilha modelo
      </a>
      <div className="mt-6">
        <ImportGiftsForm />
      </div>
    </div>
  );
}

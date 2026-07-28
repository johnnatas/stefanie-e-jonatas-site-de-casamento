import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerAuthClient } from "@/infrastructure/supabase/serverAuthClient";
import { ResetPasswordForm } from "@/components/admin/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Redefinir senha | Painel Administrativo",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { code } = await searchParams;

  let linkIsValid = false;
  if (code) {
    const supabase = await createSupabaseServerAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    linkIsValid = !error;
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-20">
      <h1 className="text-center font-serif text-3xl text-forest">Redefinir senha</h1>
      <div className="mt-10">
        {linkIsValid ? (
          <ResetPasswordForm />
        ) : (
          <p className="text-center font-sans text-sm text-forest/70">
            Esse link de redefinição é inválido ou já expirou. Peça um novo link na tela de{" "}
            <Link href="/admin/esqueci-senha" className="text-moss underline">
              esqueci minha senha
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}

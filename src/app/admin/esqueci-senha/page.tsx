import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/admin/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Esqueci minha senha | Painel Administrativo",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-20">
      <h1 className="text-center font-serif text-3xl text-forest">Esqueceu sua senha?</h1>
      <p className="mt-2 text-center font-sans text-sm text-forest/70">
        Informe o e-mail da sua conta administrativa para receber um link de redefinição.
      </p>
      <div className="mt-10">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}

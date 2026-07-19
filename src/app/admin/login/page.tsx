import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Login Administrativo | Stéfanie & Jonatas",
};

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-20">
      <h1 className="text-center font-serif text-3xl text-forest">Painel Administrativo</h1>
      <p className="mt-2 text-center font-sans text-sm text-forest/70">Acesso restrito aos noivos.</p>
      <div className="mt-10">
        <LoginForm />
      </div>
    </div>
  );
}

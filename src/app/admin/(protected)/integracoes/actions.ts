"use server";

import {
  createUpdateMercadoPagoAccessTokenUseCase,
  createUpdateResendApiKeyUseCase,
  createUpdateSecretKeyUseCase,
  createRequestSecretKeyResetUseCase,
  createResetSecretKeyWithTokenUseCase,
} from "@/infrastructure/composition";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";
import { createSupabaseServerAuthClient } from "@/infrastructure/supabase/serverAuthClient";
import { getEnv } from "@/infrastructure/config/env";

export interface UpdateMercadoPagoTokenActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function updateMercadoPagoTokenAction(
  _prevState: UpdateMercadoPagoTokenActionState,
  formData: FormData
): Promise<UpdateMercadoPagoTokenActionState> {
  const token = (formData.get("token") as string) || "";
  const secretKey = (formData.get("secretKey") as string) || "";

  try {
    await createUpdateMercadoPagoAccessTokenUseCase().execute({ token, secretKey });
  } catch (error) {
    if (error instanceof InvalidSecurityCredentialError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Não foi possível salvar o Access Token agora." };
  }

  return { status: "success", message: "Access Token atualizado com sucesso." };
}

export interface UpdateSecretKeyActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function updateSecretKeyAction(
  _prevState: UpdateSecretKeyActionState,
  formData: FormData
): Promise<UpdateSecretKeyActionState> {
  const currentKey = (formData.get("currentKey") as string) || undefined;
  const newKey = (formData.get("newKey") as string) || "";
  const confirmKey = (formData.get("confirmKey") as string) || "";

  if (newKey !== confirmKey) {
    return { status: "error", message: "As chaves novas não coincidem." };
  }

  try {
    await createUpdateSecretKeyUseCase().execute({ currentKey, newKey });
  } catch (error) {
    if (error instanceof InvalidSecurityCredentialError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Não foi possível salvar a chave secreta agora." };
  }

  return { status: "success", message: "Chave secreta atualizada com sucesso." };
}

export interface RequestSecretKeyResetActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function requestSecretKeyResetAction(
  _prevState: RequestSecretKeyResetActionState,
  _formData: FormData
): Promise<RequestSecretKeyResetActionState> {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { status: "error", message: "Não foi possível identificar seu e-mail de acesso." };
  }

  try {
    await createRequestSecretKeyResetUseCase().execute({
      requesterEmail: user.email,
      buildResetUrl: (token) => `${getEnv().NEXT_PUBLIC_SITE_URL}/admin/integracoes?resetToken=${token}`,
    });
  } catch {
    return { status: "error", message: "Não foi possível enviar o e-mail agora." };
  }

  return { status: "success", message: `Enviamos um link de redefinição para ${user.email}.` };
}

export interface ResetSecretKeyWithTokenActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function resetSecretKeyWithTokenAction(
  _prevState: ResetSecretKeyWithTokenActionState,
  formData: FormData
): Promise<ResetSecretKeyWithTokenActionState> {
  const token = (formData.get("token") as string) || "";
  const newKey = (formData.get("newKey") as string) || "";
  const confirmKey = (formData.get("confirmKey") as string) || "";

  if (newKey !== confirmKey) {
    return { status: "error", message: "As chaves novas não coincidem." };
  }

  try {
    await createResetSecretKeyWithTokenUseCase().execute({ token, newKey });
  } catch (error) {
    if (error instanceof InvalidSecurityCredentialError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Não foi possível redefinir a chave agora." };
  }

  return { status: "success", message: "Chave secreta redefinida com sucesso." };
}

export interface UpdateResendApiKeyActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function updateResendApiKeyAction(
  _prevState: UpdateResendApiKeyActionState,
  formData: FormData
): Promise<UpdateResendApiKeyActionState> {
  const apiKey = (formData.get("apiKey") as string) || "";
  const secretKey = (formData.get("secretKey") as string) || "";

  try {
    await createUpdateResendApiKeyUseCase().execute({ apiKey, secretKey });
  } catch (error) {
    if (error instanceof InvalidSecurityCredentialError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Não foi possível salvar a API Key agora." };
  }

  return { status: "success", message: "API Key atualizada com sucesso." };
}

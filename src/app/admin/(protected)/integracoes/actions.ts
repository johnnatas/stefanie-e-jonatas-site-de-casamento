"use server";

import {
  createUpdateMercadoPagoAccessTokenUseCase,
  createUpdateResendApiKeyUseCase,
  createUpdateSecretKeyUseCase,
} from "@/infrastructure/composition";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

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

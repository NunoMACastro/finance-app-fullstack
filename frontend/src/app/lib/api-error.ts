import { isApiError } from "./http-client";

export function getErrorMessage(error: unknown, fallback = "Ocorreu um erro inesperado"): string {
  if (isApiError(error)) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

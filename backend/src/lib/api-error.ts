export type ApiErrorDetails = Record<string, string>;

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: ApiErrorDetails;

  constructor(status: number, code: string, message: string, details?: ApiErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message: string, code = "BAD_REQUEST", details?: ApiErrorDetails): never {
  throw new ApiError(400, code, message, details);
}

export function unauthorized(message = "Não autenticado", code = "UNAUTHORIZED"): never {
  throw new ApiError(401, code, message);
}

export function forbidden(message = "Acesso negado", code = "FORBIDDEN"): never {
  throw new ApiError(403, code, message);
}

export function notFound(message = "Recurso não encontrado", code = "NOT_FOUND"): never {
  throw new ApiError(404, code, message);
}

export function conflict(message: string, code = "CONFLICT"): never {
  throw new ApiError(409, code, message);
}

export function unprocessable(message: string, code = "UNPROCESSABLE_ENTITY", details?: ApiErrorDetails): never {
  throw new ApiError(422, code, message, details);
}

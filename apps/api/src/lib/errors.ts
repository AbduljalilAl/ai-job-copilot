export interface AppErrorOptions {
  code: string;
  message: string;
  statusCode: number;
  details?: string[];
}

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: string[];

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

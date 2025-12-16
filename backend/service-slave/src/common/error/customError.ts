export class CustomError extends Error {
  public event: string;
  public context: unknown;
  public timestamp: number;
  public originalError: unknown;

  constructor(params: {
    message: string;
    error: unknown;
    event: string;
    context: unknown;
  }) {
    super(params.message ?? 'CustomError');

    Object.setPrototypeOf(this, new.target.prototype);

    this.name = 'CustomError';
    this.timestamp = Date.now();
    this.event = params.event;
    this.context = params.context;
    this.originalError = params.error;

    if (params.error instanceof Error && params.error.stack) {
      this.stack = params.error.stack;
    }
  }
}

// Erro HTTP tipado — o middleware de erro converte para resposta JSON.
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(msg = 'Requisição inválida', details?: unknown) {
    return new HttpError(400, msg, details);
  }
  static unauthorized(msg = 'Não autenticado') {
    return new HttpError(401, msg);
  }
  static forbidden(msg = 'Acesso negado') {
    return new HttpError(403, msg);
  }
  static notFound(msg = 'Recurso não encontrado') {
    return new HttpError(404, msg);
  }
  static conflict(msg = 'Conflito de dados') {
    return new HttpError(409, msg);
  }
}

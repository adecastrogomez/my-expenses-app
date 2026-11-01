export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const badRequest = (m) => new HttpError(400, m);
export const notFound = (m = 'No encontrado') => new HttpError(404, m);

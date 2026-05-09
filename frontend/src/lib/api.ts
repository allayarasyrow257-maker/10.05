const BACKEND_HOST = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:3001`
  : (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');

const API_URL = `${BACKEND_HOST}/api`;

export const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  // Frontend public assets — keep relative so Next.js serves them directly.
  if (path.startsWith('/meal images')) return path;
  if (path.startsWith('/category icon/')) return path;
  return `${BACKEND_HOST}${path}`;
};

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private getHeaders(auth = false): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async upload<T>(path: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('image', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) await this.handleError(res);
    return res.json();
  }

  private async handleError(res: Response): Promise<never> {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
      else if (body.errors) message = body.errors.map((e: any) => `${e.path}: ${e.msg}`).join(', ');
      else if (body.message) message = body.message;
    } catch {
      message = await res.text().catch(() => message);
    }
    throw new Error(message);
  }

  async get<T>(path: string, auth = false): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(auth),
    });
    if (!res.ok) await this.handleError(res);
    return res.json();
  }

  async post<T>(path: string, data: unknown, auth = false): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getHeaders(auth),
      body: JSON.stringify(data),
    });
    if (!res.ok) await this.handleError(res);
    return res.json();
  }

  async put<T>(path: string, data: unknown, auth = false): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(auth),
      body: JSON.stringify(data),
    });
    if (!res.ok) await this.handleError(res);
    return res.json();
  }

  async delete<T>(path: string, auth = false): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(auth),
    });
    if (!res.ok) await this.handleError(res);
    return res.json();
  }
}

export const api = new ApiClient();

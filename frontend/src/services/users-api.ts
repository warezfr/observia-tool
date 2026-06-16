import axios from 'axios';

const client = axios.create({ baseURL: '/api/v1' });

// Attach a stored bearer token (used when auth is enabled).
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('observia_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'viewer';
  is_active: boolean;
}

export interface UserCreate {
  username: string;
  password: string;
  role: 'admin' | 'viewer';
}

export const usersApi = {
  list: () => client.get<User[]>('/users/').then((r) => r.data),
  create: (data: UserCreate) => client.post<User>('/users/', data).then((r) => r.data),
  delete: (id: number) => client.delete(`/users/${id}`),
};

export interface MeResponse {
  username: string;
  role: string;
  auth_enabled: boolean;
}

export const authApi = {
  me: () => client.get<MeResponse>('/auth/me').then((r) => r.data),
  login: (username: string, password: string) =>
    client
      .post<{ access_token: string; role: string; username: string }>('/auth/login', {
        username,
        password,
      })
      .then((r) => r.data),
};

import { api } from './client';
import type { AdminData } from '@/types';

export function getAdminData() {
  return api<AdminData>('/api/admin');
}

export function saveAdminSettings(data: Record<string, string>) {
  return api<{ ok: boolean }>('/admin/settings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteUser(userId: number) {
  return api<{ ok: boolean }>(`/admin/users/${userId}/delete`, { method: 'POST' });
}

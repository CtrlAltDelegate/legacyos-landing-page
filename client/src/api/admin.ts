import { api } from './client';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  plan: string;
  isAdmin: boolean;
  onboardingComplete: boolean;
  createdAt: string;
  _count: { wingAssessments: number; assets: number };
}

export interface AdminAffiliateLink {
  wingId: string;
  wingName: string;
  wingEmoji: string;
  level: number;
  productName: string;
  actionLabel: string;
  actionUrl: string;
  isActive: boolean;
  hasOverride: boolean;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<{ users: AdminUser[] }>('/admin/users');
  return data.users;
}

export async function updateAdminUser(
  id: string,
  patch: { plan?: string; isAdmin?: boolean }
): Promise<void> {
  await api.patch(`/admin/users/${id}`, patch);
}

export async function getAffiliateLinks(): Promise<AdminAffiliateLink[]> {
  const { data } = await api.get<{ links: AdminAffiliateLink[] }>('/admin/affiliate-links');
  return data.links;
}

export async function upsertAffiliateLink(
  wingId: string,
  level: number,
  payload: { productName?: string; actionLabel?: string; actionUrl: string; isActive?: boolean }
): Promise<void> {
  await api.put(`/admin/affiliate-links/${wingId}/${level}`, payload);
}

export async function deleteAffiliateLink(wingId: string, level: number): Promise<void> {
  await api.delete(`/admin/affiliate-links/${wingId}/${level}`);
}

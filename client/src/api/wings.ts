import { api } from './client';

export type WingId =
  | 'growth'
  | 'preservation'
  | 'philanthropy'
  | 'experiences'
  | 'legacy'
  | 'operations';

export interface WingStep {
  level: number;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  isInternal?: boolean;
  isAffiliate?: boolean;
}

export interface WingQuestion {
  id: string;
  text: string;
}

export interface WingSummary {
  id: WingId;
  name: string;
  emoji: string;
  tagline: string;
  philosophy: string;
  color: string;
  level: number;
  levelLabel: string;
  assessed: boolean;
  stepCompletedAt: string | null; // ISO date when current step was marked done
  nextStep: WingStep;
  questions: WingQuestion[];
  answers: Record<string, boolean>;
}

export interface WingDetail extends WingSummary {
  steps: WingStep[];
}

export async function getAllWings(): Promise<WingSummary[]> {
  const { data } = await api.get<{ wings: WingSummary[] }>('/wings');
  return data.wings;
}

export async function getWing(wingId: WingId): Promise<WingDetail> {
  const { data } = await api.get<WingDetail>(`/wings/${wingId}`);
  return data;
}

export async function submitAssessment(
  wingId: WingId,
  answers: Record<string, boolean>
): Promise<{ level: number; levelLabel: string; nextStep: WingStep }> {
  const { data } = await api.post(`/wings/${wingId}/assess`, { answers });
  return data;
}

export async function completeStep(
  wingId: WingId
): Promise<{ stepCompletedAt: string }> {
  const { data } = await api.post(`/wings/${wingId}/complete-step`);
  return data;
}

export async function uncompleteStep(wingId: WingId): Promise<void> {
  await api.delete(`/wings/${wingId}/complete-step`);
}

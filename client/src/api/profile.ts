import { api } from './client';

export type ProfileAnswers = Record<string, unknown>;

export interface FamilyProfileResponse {
  answers: ProfileAnswers;
  completedAt: string | null;
}

export async function getFamilyProfile(): Promise<FamilyProfileResponse> {
  const { data } = await api.get<FamilyProfileResponse>('/profile/family');
  return data;
}

export async function saveFamilyProfile(
  answers: ProfileAnswers,
  complete = false
): Promise<FamilyProfileResponse> {
  const { data } = await api.put<FamilyProfileResponse>('/profile/family', {
    answers,
    complete,
  });
  return data;
}

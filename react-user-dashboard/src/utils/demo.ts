import apiClient from './apiClient';

export const demoMode = import.meta.env.VITE_PUBLIC_DEMO === 'true';
export const portfolioUrl = 'https://liam-portfolio-rho.vercel.app/projects/tourneyhub/';
export const authStorage = demoMode ? sessionStorage : localStorage;
export interface DemoSession {
  token?: string;
  userId: number;
  role: string;
  persona: 'organiser' | 'member';
  expiresAt: string;
  records: { organiser: number; member: number; workshop: number; attendanceRequest: number; activeCompetition: number; activeCategory: number };
  progress?: { signup: string; signupRegistration?: number; attendance: string; reviewedAt?: string; tournament: boolean };
}
export function saveDemo(session: DemoSession) {
  if (session.token) authStorage.setItem('authToken',session.token);
  authStorage.setItem('userId',String(session.userId));
  authStorage.setItem('role',session.role);
}
export async function startDemo() {
  const { data } = await apiClient.post<DemoSession>('/demo/session',{});
  saveDemo(data);
  return data;
}

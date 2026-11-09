export interface User {
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
}
export interface AuthData {
  accessToken: string;
  refreshToken: string;
  user: User;
}
export interface Student {
  fullName: string;
  group: string;
  isuId: string;
  dormitory: number;
  room: number;
  settlementDate: string;
  isForeign: boolean;
  notes: string;
}
export type StudentField = keyof Student;
export interface StudentPage {
  items: Student[];
  total: number;
}
export type Filters = Partial<Record<StudentField | 'search' | 'dateFrom' | 'dateTo', string>>;

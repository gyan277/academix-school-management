/**
 * Shared types between client and server
 */

export type UserRole = "admin" | "teacher" | "registrar";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  assignedClasses?: string[]; // For teachers
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
}

// Teacher Management Types

export interface TeacherProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'teacher';
  phone: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  assigned_classes: string[]; // Populated from teacher_classes join
}

export interface CreateTeacherRequest {
  email: string;
  full_name: string;
  phone: string;
  password: string;
  classes?: string[];
}

export interface CreateTeacherResponse {
  success: boolean;
  teacher?: TeacherProfile;
  credentials?: {
    email: string;
    password: string;
  };
  error?: string;
}

export interface UpdateTeacherRequest {
  full_name: string;
  phone: string;
  classes: string[];
}

export interface UpdateTeacherResponse {
  success: boolean;
  teacher?: TeacherProfile;
  error?: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  credentials?: {
    email: string;
    password: string;
  };
  error?: string;
}

export interface User {
  id: number;
  email: string;
  role: 'student' | 'tutor' | 'admin';
}

export interface Profile {
  id?: number;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  phone?: string;
  bio?: string;
  city?: string;
  is_public: boolean;
}

export interface TutorProfile extends Profile {
  education?: string;
  experience?: string;
  subjects?: string;
  hourly_rate?: number;
  is_verified?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: 'student' | 'tutor';
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface ApiError {
  message: string;
  error: string;
  statusCode: number;
}
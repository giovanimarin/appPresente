export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    schoolId: string;
  };
}

export interface OtpSendRequest {
  phone: string;
}

export interface OtpVerifyRequest {
  phone: string;
  code: string;
}

export interface OtpVerifyResponse {
  token: string;
  guardian: {
    id: string;
    name: string;
    phone: string;
    schoolId: string;
  };
  students: Array<{
    id: string;
    name: string;
    classId: string;
  }>;
  isFirstAccess: boolean;
}

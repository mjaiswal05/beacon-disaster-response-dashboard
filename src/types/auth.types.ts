export interface ERTLoginRequest {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  token: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface LoginResponse {
  success?: string;
  data?: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
  trace_id?: string;
}

export interface RefreshTokenResponse {
  success?: string;
  data?: {
    access_token: string;
    token_type: string;
    expires_in: number;
  };
  trace_id?: string;
}

// Authentication service for custom IAM API
// Use proxy in development to avoid CORS, direct URL in production
const API_BASE_URL = import.meta.env.DEV
  ? "" // Use Vite proxy in development (empty because endpoints already include /api)
  : import.meta.env.VITE_API_BASE_URL || "https://beacon-tcd.tech";

export interface ERTLoginRequest {
  username: string;
  password: string;
}

export interface ERTLoginResponse {
  token?: string;
  user?: {
    id: string;
    username: string;
    role: string;
  };
  message?: string;
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

class AuthService {
  private currentUser: AuthUser | null = null;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    // Check for existing token in localStorage on initialization
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const storedToken = localStorage.getItem("beacon_auth_token");
    const storedRefreshToken = localStorage.getItem("beacon_refresh_token");
    const storedUser = localStorage.getItem("beacon_auth_user");

    if (storedToken && storedUser) {
      try {
        this.token = storedToken;
        this.refreshToken = storedRefreshToken;
        this.currentUser = JSON.parse(storedUser);
      } catch (error) {
        this.clearStorage();
      }
    }
  }

  private saveToStorage(
    accessToken: string,
    refreshToken: string,
    user: AuthUser,
  ) {
    localStorage.setItem("beacon_auth_token", accessToken);
    localStorage.setItem("beacon_refresh_token", refreshToken);
    localStorage.setItem("beacon_auth_user", JSON.stringify(user));
  }

  private clearStorage() {
    localStorage.removeItem("beacon_auth_token");
    localStorage.removeItem("beacon_refresh_token");
    localStorage.removeItem("beacon_auth_user");
    sessionStorage.clear();
  }

  /**
   * Decode JWT token to extract user info
   */
  private decodeToken(token: string): any {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Failed to decode token:", error);
      return null;
    }
  }

  /**
   * Extract user role from token
   */
  private getUserRoleFromToken(token: string): string {
    const decoded = this.decodeToken(token);
    if (!decoded) {
      return ""; // Cannot determine role - treat as unauthenticated
    }

    // Check for roles in different possible locations in the JWT
    // Keycloak typically stores roles in: realm_access.roles or resource_access
    if (decoded.realm_access?.roles) {
      const roles = decoded.realm_access.roles;
      // Priority order: Check for specific roles in order of privilege
      if (roles.includes("ROLE_SYS_ADMIN") || roles.includes("admin")) {
        return "ROLE_SYS_ADMIN";
      }
      if (
        roles.includes("ROLE_ERT_MEMBER") ||
        roles.includes("ROLE_ERT_MEMBERS")
      ) {
        return "ROLE_ERT_MEMBERS"; // Return with S to match database
      }
      if (roles.includes("ROLE_GROUND_STAFF")) {
        return "ROLE_GROUND_STAFF";
      }
      if (roles.includes("ROLE_CITIZEN")) {
        return "ROLE_CITIZEN";
      }
      // If we have roles but none match, return the first one
      if (roles.length > 0) {
        return roles[0];
      }
    }

    // Fallback: check resource_access
    if (decoded.resource_access) {
      const resources = Object.values(decoded.resource_access) as any[];
      for (const resource of resources) {
        if (resource.roles && resource.roles.length > 0) {
          const roles = resource.roles;
          if (roles.includes("ROLE_SYS_ADMIN") || roles.includes("admin")) {
            return "ROLE_SYS_ADMIN";
          }
          if (
            roles.includes("ROLE_ERT_MEMBER") ||
            roles.includes("ROLE_ERT_MEMBERS")
          ) {
            return "ROLE_ERT_MEMBERS";
          }
          if (roles.includes("ROLE_GROUND_STAFF")) {
            return "ROLE_GROUND_STAFF";
          }
          if (roles.includes("ROLE_CITIZEN")) {
            return "ROLE_CITIZEN";
          }
        }
      }
    }

    // No recognized role found - deny elevated access
    console.warn(
      "Could not determine role from token - treating as unauthenticated",
    );
    return "";
  }

  /**
   * Get user email from token
   */
  private getUserEmailFromToken(token: string): string {
    const decoded = this.decodeToken(token);
    return (
      decoded?.email || decoded?.preferred_username || decoded?.sub || "unknown"
    );
  }

  /**
   * Get user ID from token
   */
  private getUserIdFromToken(token: string): string {
    const decoded = this.decodeToken(token);
    return decoded?.sub || decoded?.user_id || "unknown";
  }

  /**
   * Get first name from token
   */
  private getFirstNameFromToken(token: string): string | undefined {
    const decoded = this.decodeToken(token);
    return (
      decoded?.given_name ||
      decoded?.first_name ||
      decoded?.firstName ||
      undefined
    );
  }

  /**
   * Get last name from token
   */
  private getLastNameFromToken(token: string): string | undefined {
    const decoded = this.decodeToken(token);
    return (
      decoded?.family_name ||
      decoded?.last_name ||
      decoded?.lastName ||
      undefined
    );
  }

  /**
   * Get phone from token
   */
  private getPhoneFromToken(token: string): string | undefined {
    const decoded = this.decodeToken(token);
    return decoded?.phone_number || decoded?.phone || undefined;
  }

  /**
   * ERT Member Login - Direct username/password authentication
   */
  async loginERT(credentials: ERTLoginRequest): Promise<AuthUser> {
    return await this.performRealLogin(credentials);
  }

  /**
   * Perform actual API login call
   */
  private async performRealLogin(
    credentials: ERTLoginRequest,
  ): Promise<AuthUser> {
    try {
      const requestBody = JSON.stringify(credentials);

      const response = await fetch(`${API_BASE_URL}/api/iam/v1/auth/login`, {
        method: "POST",
        mode: "cors", // Explicitly set CORS mode
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: requestBody,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }

        // Extract meaningful error message
        let errorMessage = "Login failed";
        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (response.status === 500) {
          errorMessage =
            "Server error. Please check your credentials or try again later.";
        }

        throw new Error(`${errorMessage} (Error ${response.status})`);
      }

      const ertResponse: LoginResponse = await response.json();

      if (!ertResponse.data?.access_token || !ertResponse.data?.refresh_token) {
        throw new Error("Invalid response from server - missing tokens");
      }

      // Extract user info from JWT token
      const role = this.getUserRoleFromToken(ertResponse.data.access_token);
      const email = this.getUserEmailFromToken(ertResponse.data.access_token);
      const userId = this.getUserIdFromToken(ertResponse.data.access_token);
      const firstName = this.getFirstNameFromToken(
        ertResponse.data.access_token,
      );
      const lastName = this.getLastNameFromToken(ertResponse.data.access_token);
      const phone = this.getPhoneFromToken(ertResponse.data.access_token);

      const user: AuthUser = {
        id: userId,
        username: email,
        role: role, // ✅ FIXED: Now extracting role from JWT token instead of hardcoding
        token: ertResponse.data.access_token,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
      };

      console.log("Login successful:", {
        email,
        role,
        userId,
        firstName,
        lastName,
      }); // Debug log

      this.currentUser = user;
      this.token = ertResponse.data.access_token;
      this.refreshToken = ertResponse.data.refresh_token;
      this.saveToStorage(
        ertResponse.data.access_token,
        ertResponse.data.refresh_token,
        user,
      );

      return user;
    } catch (error) {
      // Check if it's a CORS error
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        throw new Error(
          "CORS Error: Cannot connect to authentication server. Please contact your system administrator.",
        );
      }

      throw error;
    }
  }

  /**
   * Logout user and clear all session data
   */
  async logout(): Promise<void> {
    try {
      // Call logout endpoint on server with Authorization header
      if (this.token) {
        await fetch(`${API_BASE_URL}/api/iam/v1/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
        });
      }

      this.currentUser = null;
      this.token = null;
      this.refreshToken = null;
      this.clearStorage();
    } catch (error) {
      // Still clear local data even if server call fails
      this.currentUser = null;
      this.token = null;
      this.refreshToken = null;
      this.clearStorage();
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/iam/v1/auth/refresh`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token: this.refreshToken }),
          },
        );

        if (!response.ok) {
          throw new Error("Token refresh failed");
        }

        const data: RefreshTokenResponse = await response.json();

        if (!data.data?.access_token) {
          throw new Error("Invalid refresh response");
        }

        this.token = data.data.access_token;

        // Update user role from new token
        if (this.currentUser) {
          const newRole = this.getUserRoleFromToken(data.data.access_token);
          this.currentUser.role = newRole;
          this.currentUser.token = data.data.access_token;
        }

        // Update stored token and user
        if (this.refreshToken && this.currentUser) {
          localStorage.setItem("beacon_auth_token", data.data.access_token);
          localStorage.setItem(
            "beacon_auth_user",
            JSON.stringify(this.currentUser),
          );
        }

        return data.data.access_token;
      } catch (error) {
        // Clear auth state on refresh failure
        this.currentUser = null;
        this.token = null;
        this.refreshToken = null;
        this.clearStorage();
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Make authenticated API request with automatic token refresh on 401
   */
  async authenticatedFetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    // Add Authorization header
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401) {
      try {
        const newToken = await this.refreshAccessToken();

        // Retry original request with new token
        const retryHeaders = {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
          "Content-Type": "application/json",
        };

        response = await fetch(url, {
          ...options,
          headers: retryHeaders,
        });
      } catch (error) {
        // Redirect to login will be handled by the component
        throw new Error("Session expired. Please login again.");
      }
    }

    // Handle 403 Forbidden - user doesn't have permission
    if (response.status === 403) {
      throw new Error("Insufficient permissions to access this resource");
    }

    return response;
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.token !== null;
  }

  /**
   * Get current user data
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Get current auth token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get authorization header for API requests
   */
  getAuthHeader(): { Authorization: string } | {} {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  /**
   * Check if current user is ERT member
   */
  isERTMember(): boolean {
    return (
      this.currentUser?.role === "ROLE_ERT_MEMBER" ||
      this.currentUser?.role === "ROLE_ERT_MEMBERS" ||
      this.currentUser?.role === "ERT" ||
      this.currentUser?.role === "ert"
    );
  }
}

// Export singleton instance
export const authService = new AuthService();

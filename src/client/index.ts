/**
 * HTTP client module for MCP RESTful API Server
 * Provides axios wrapper with authentication integration and error handling for RESTful API operations and JSON Server
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from "axios";
import { AuthenticationStrategy } from "../auth";
import { ServerConfig } from "../config";

/**
 * API response interface for consistent response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  data?: T;
  error?: string;
  headers?: Record<string, string>;
}

/**
 * API request options interface
 */
export interface ApiRequestOptions {
  path: string;
  body?: any;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
}

/**
 * HTTP client error class for better error handling
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public originalError?: any,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * ApiClient class that wraps axios with authentication and error handling
 */
export class ApiClient {
  private axiosInstance: AxiosInstance;
  private authStrategy: AuthenticationStrategy;
  private baseUrl: string;

  constructor(config: ServerConfig, authStrategy: AuthenticationStrategy) {
    this.baseUrl = config.baseUrl;
    this.authStrategy = authStrategy;

    // Create axios instance with base configuration
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000, // 30 second timeout
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Set up request interceptor for authentication
    this.setupRequestInterceptor();

    // Set up response interceptor for error handling
    this.setupResponseInterceptor();
  }

  /**
   * Set up request interceptor to apply authentication
   */
  private setupRequestInterceptor(): void {
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        try {
          // Apply authentication to the request
          const authConfig = this.authStrategy.applyAuth(config);
          return { ...config, ...authConfig } as InternalAxiosRequestConfig;
        } catch (error) {
          return Promise.reject(new ApiClientError("Authentication failed", undefined, "AUTH_ERROR", error));
        }
      },
      error => {
        return Promise.reject(new ApiClientError("Request configuration failed", undefined, "REQUEST_CONFIG_ERROR", error));
      },
    );
  }

  /**
   * Set up response interceptor for consistent error handling
   */
  private setupResponseInterceptor(): void {
    this.axiosInstance.interceptors.response.use(
      response => {
        // Return successful responses as-is
        return response;
      },
      (error: AxiosError) => {
        // Transform axios errors into ApiClientError
        if (error.response) {
          // Server responded with error status
          return Promise.reject(new ApiClientError(`HTTP ${error.response.status}: ${error.response.statusText}`, error.response.status, "HTTP_ERROR", error));
        } else if (error.request) {
          // Request was made but no response received
          return Promise.reject(new ApiClientError("Network error: No response received", undefined, "NETWORK_ERROR", error));
        } else {
          // Something else happened
          return Promise.reject(new ApiClientError(`Request failed: ${error.message}`, undefined, "REQUEST_ERROR", error));
        }
      },
    );
  }

  /**
   * Transform axios response to ApiResponse format
   */
  private transformResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
    return {
      success: true,
      status: response.status,
      data: response.data,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Transform error to ApiResponse format
   */
  private transformError(error: ApiClientError): ApiResponse {
    return {
      success: false,
      status: error.status || 0,
      error: error.message,
    };
  }

  /**
   * Build query string from parameters
   */
  private buildQueryString(params: Record<string, string>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    return searchParams.toString();
  }

  /**
   * Perform GET request
   */
  async get<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    try {
      let url = options.path;

      // Add query parameters if provided
      if (options.queryParams && Object.keys(options.queryParams).length > 0) {
        const queryString = this.buildQueryString(options.queryParams);
        url += (url.includes("?") ? "&" : "?") + queryString;
      }

      const config: AxiosRequestConfig = options.headers
        ? {
            headers: options.headers,
          }
        : {};

      const response = await this.axiosInstance.get<T>(url, config);
      return this.transformResponse(response);
    } catch (error) {
      if (error instanceof ApiClientError) {
        return this.transformError(error);
      }
      return this.transformError(new ApiClientError(`GET request failed: ${error instanceof Error ? error.message : "Unknown error"}`, undefined, "GET_ERROR", error));
    }
  }

  /**
   * Perform POST request
   */
  async post<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    try {
      const config: AxiosRequestConfig = options.headers
        ? {
            headers: options.headers,
          }
        : {};

      const response = await this.axiosInstance.post<T>(options.path, options.body, config);
      return this.transformResponse(response);
    } catch (error) {
      if (error instanceof ApiClientError) {
        return this.transformError(error);
      }
      return this.transformError(new ApiClientError(`POST request failed: ${error instanceof Error ? error.message : "Unknown error"}`, undefined, "POST_ERROR", error));
    }
  }

  /**
   * Perform PUT request
   */
  async put<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    try {
      const config: AxiosRequestConfig = options.headers
        ? {
            headers: options.headers,
          }
        : {};

      const response = await this.axiosInstance.put<T>(options.path, options.body, config);
      return this.transformResponse(response);
    } catch (error) {
      if (error instanceof ApiClientError) {
        return this.transformError(error);
      }
      return this.transformError(new ApiClientError(`PUT request failed: ${error instanceof Error ? error.message : "Unknown error"}`, undefined, "PUT_ERROR", error));
    }
  }

  /**
   * Perform PATCH request
   */
  async patch<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    try {
      const config: AxiosRequestConfig = options.headers
        ? {
            headers: options.headers,
          }
        : {};

      const response = await this.axiosInstance.patch<T>(options.path, options.body, config);
      return this.transformResponse(response);
    } catch (error) {
      if (error instanceof ApiClientError) {
        return this.transformError(error);
      }
      return this.transformError(new ApiClientError(`PATCH request failed: ${error instanceof Error ? error.message : "Unknown error"}`, undefined, "PATCH_ERROR", error));
    }
  }

  /**
   * Perform DELETE request
   */
  async delete<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    try {
      const config: AxiosRequestConfig = options.headers
        ? {
            headers: options.headers,
          }
        : {};

      const response = await this.axiosInstance.delete<T>(options.path, config);
      return this.transformResponse(response);
    } catch (error) {
      if (error instanceof ApiClientError) {
        return this.transformError(error);
      }
      return this.transformError(new ApiClientError(`DELETE request failed: ${error instanceof Error ? error.message : "Unknown error"}`, undefined, "DELETE_ERROR", error));
    }
  }

  /**
   * Get the base URL for this client
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get the authentication type being used
   */
  getAuthType(): string {
    return this.authStrategy.getAuthType();
  }
}

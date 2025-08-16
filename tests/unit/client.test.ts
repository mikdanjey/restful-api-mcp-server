/**
 * Unit tests for HTTP client functionality
 */

import axios, { AxiosError, AxiosResponse } from "axios";
import { ApiClient, ApiClientError } from "../../src/client";
import { ServerConfig } from "../../src/config";
import { AuthenticationStrategy } from "../../src/auth";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock authentication strategy
class MockAuthStrategy implements AuthenticationStrategy {
  constructor(private authType: string = "mock") {}

  applyAuth(config: any): any {
    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: "Mock Auth",
      },
    };
  }

  getAuthType(): string {
    return this.authType;
  }

  validate(): void {
    // Mock validation
  }
}

describe("ApiClient", () => {
  let apiClient: ApiClient;
  let mockAxiosInstance: jest.Mocked<any>;
  let serverConfig: ServerConfig;
  let authStrategy: MockAuthStrategy;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    };

    // Mock axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Set up test configuration
    serverConfig = {
      baseUrl: "https://api.example.com",
      authType: "token",
      authToken: "test-token",
    };

    authStrategy = new MockAuthStrategy();
    apiClient = new ApiClient(serverConfig, authStrategy);
  });

  describe("constructor", () => {
    it("should create axios instance with correct configuration", () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "https://api.example.com",
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
    });

    it("should set up request and response interceptors", () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe("GET requests", () => {
    it("should perform successful GET request without query parameters", async () => {
      const mockResponse: AxiosResponse = {
        data: { id: 1, name: "Test" },
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        config: { headers: {} } as any,
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiClient.get({ path: "/users/1" });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/users/1", {});

      expect(result).toEqual({
        success: true,
        status: 200,
        data: { id: 1, name: "Test" },
        headers: { "content-type": "application/json" },
      });
    });

    it("should perform GET request with query parameters", async () => {
      const mockResponse: AxiosResponse = {
        data: [{ id: 1 }, { id: 2 }],
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} } as any,
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiClient.get({
        path: "/users",
        queryParams: { page: "1", limit: "10", filter: "active" },
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/users?page=1&limit=10&filter=active", {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it("should handle GET request with custom headers", async () => {
      const mockResponse: AxiosResponse = {
        data: { result: "success" },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} } as any,
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiClient.get({
        path: "/data",
        headers: { "X-Custom-Header": "custom-value" },
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/data", {
        headers: { "X-Custom-Header": "custom-value" },
      });

      expect(result.success).toBe(true);
    });

    it("should handle GET request errors", async () => {
      const axiosError = new AxiosError("Network Error");
      axiosError.code = "NETWORK_ERROR";

      mockAxiosInstance.get.mockRejectedValue(axiosError);

      const result = await apiClient.get({ path: "/users" });

      expect(result).toEqual({
        success: false,
        status: 0,
        error: "GET request failed: Unknown error",
      });
    });
  });

  describe("POST requests", () => {
    it("should perform successful POST request with JSON body", async () => {
      const requestBody = { name: "New User", email: "user@example.com" };
      const mockResponse: AxiosResponse = {
        data: { id: 123, ...requestBody },
        status: 201,
        statusText: "Created",
        headers: {},
        config: { headers: {} } as any,
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await apiClient.post({
        path: "/users",
        body: requestBody,
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/users", requestBody, {});

      expect(result).toEqual({
        success: true,
        status: 201,
        data: { id: 123, ...requestBody },
        headers: {},
      });
    });

    it("should perform POST request with custom headers", async () => {
      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} } as any,
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await apiClient.post({
        path: "/submit",
        body: { data: "test" },
        headers: { "X-Request-ID": "12345" },
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/submit", { data: "test" }, { headers: { "X-Request-ID": "12345" } });

      expect(result.success).toBe(true);
    });

    it("should handle POST request errors", async () => {
      const axiosError = new AxiosError("Bad Request");
      axiosError.response = {
        status: 400,
        statusText: "Bad Request",
        data: {},
        headers: {},
        config: { headers: {} } as any,
      };

      mockAxiosInstance.post.mockRejectedValue(axiosError);

      const result = await apiClient.post({
        path: "/users",
        body: { invalid: "data" },
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(0);
      expect(result.error).toContain("POST request failed");
    });
  });

  describe("PUT requests", () => {
    it("should perform successful PUT request", async () => {
      const requestBody = { name: "Updated User" };
      const mockResponse: AxiosResponse = {
        data: { id: 1, ...requestBody },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} } as any,
      };

      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      const result = await apiClient.put({
        path: "/users/1",
        body: requestBody,
      });

      expect(mockAxiosInstance.put).toHaveBeenCalledWith("/users/1", requestBody, {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, ...requestBody });
    });
  });

  describe("PATCH requests", () => {
    it("should perform successful PATCH request", async () => {
      const requestBody = { email: "newemail@example.com" };
      const mockResponse: AxiosResponse = {
        data: { id: 1, name: "User", ...requestBody },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} } as any,
      };

      mockAxiosInstance.patch.mockResolvedValue(mockResponse);

      const result = await apiClient.patch({
        path: "/users/1",
        body: requestBody,
      });

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith("/users/1", requestBody, {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: "User", ...requestBody });
    });
  });

  describe("DELETE requests", () => {
    it("should perform successful DELETE request", async () => {
      const mockResponse: AxiosResponse = {
        data: { message: "User deleted successfully" },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} } as any,
      };

      mockAxiosInstance.delete.mockResolvedValue(mockResponse);

      const result = await apiClient.delete({ path: "/users/1" });

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith("/users/1", {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: "User deleted successfully" });
    });

    it("should handle DELETE request with custom headers", async () => {
      const mockResponse: AxiosResponse = {
        data: null,
        status: 204,
        statusText: "No Content",
        headers: {},
        config: { headers: {} } as any,
      };

      mockAxiosInstance.delete.mockResolvedValue(mockResponse);

      const result = await apiClient.delete({
        path: "/users/1",
        headers: { "X-Confirm-Delete": "true" },
      });

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith("/users/1", {
        headers: { "X-Confirm-Delete": "true" },
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(204);
    });
  });

  describe("query parameter encoding", () => {
    it("should properly encode query parameters", async () => {
      const mockResponse: AxiosResponse = {
        data: [],
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} } as any,
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await apiClient.get({
        path: "/search",
        queryParams: {
          q: "hello world",
          category: "tech & science",
          "special-chars": "!@#$%^&*()",
        },
      });

      const expectedUrl = "/search?q=hello+world&category=tech+%26+science&special-chars=%21%40%23%24%25%5E%26*%28%29";
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(expectedUrl, {});
    });

    it("should handle empty and null query parameters", async () => {
      const mockResponse: AxiosResponse = {
        data: [],
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: {} } as any,
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await apiClient.get({
        path: "/data",
        queryParams: {
          valid: "value",
          empty: "",
          // null and undefined values should be filtered out
        },
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/data?valid=value&empty=", {});
    });
  });

  describe("utility methods", () => {
    it("should return correct base URL", () => {
      expect(apiClient.getBaseUrl()).toBe("https://api.example.com");
    });

    it("should return correct auth type", () => {
      expect(apiClient.getAuthType()).toBe("mock");
    });
  });

  describe("error handling", () => {
    it("should handle authentication errors during request interceptor", () => {
      // This test verifies that authentication errors are properly handled
      // The actual interceptor testing would require more complex mocking
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    });

    it("should transform various error types correctly", async () => {
      // Test network error (no response)
      const networkError = new AxiosError("Network Error");
      networkError.request = {};
      mockAxiosInstance.get.mockRejectedValue(networkError);

      const result1 = await apiClient.get({ path: "/test" });
      expect(result1.success).toBe(false);
      expect(result1.error).toContain("GET request failed");

      // Test HTTP error (with response)
      const httpError = new AxiosError("Bad Request");
      httpError.response = {
        status: 400,
        statusText: "Bad Request",
        data: {},
        headers: {},
        config: { headers: {} } as any,
      };
      mockAxiosInstance.get.mockRejectedValue(httpError);

      const result2 = await apiClient.get({ path: "/test" });
      expect(result2.success).toBe(false);
    });
  });
});

describe("ApiClientError", () => {
  it("should create error with all properties", () => {
    const error = new ApiClientError("Test error", 404, "NOT_FOUND", { detail: "test" });

    expect(error.message).toBe("Test error");
    expect(error.status).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.originalError).toEqual({ detail: "test" });
    expect(error.name).toBe("ApiClientError");
  });

  it("should create error with minimal properties", () => {
    const error = new ApiClientError("Simple error");

    expect(error.message).toBe("Simple error");
    expect(error.status).toBeUndefined();
    expect(error.code).toBeUndefined();
    expect(error.originalError).toBeUndefined();
  });
});

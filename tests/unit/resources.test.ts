/**
 * Unit tests for resource provider functionality
 */

import { ApiResourceProvider, ApiEndpointInfo } from "../../src/resources";
import { ApiClient, ApiResponse } from "../../src/client";
import { ServerConfig } from "../../src/config";

// Mock the ApiClient
jest.mock("../../src/client");

describe("ApiResourceProvider", () => {
  let mockApiClient: jest.Mocked<ApiClient>;
  let config: ServerConfig;
  let resourceProvider: ApiResourceProvider;

  beforeEach(() => {
    // Create mock API client
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      getBaseUrl: jest.fn().mockReturnValue("https://jsonplaceholder.typicode.com"),
      getAuthType: jest.fn().mockReturnValue("token"),
    } as unknown as jest.Mocked<ApiClient>;

    // Create test configuration
    config = {
      baseUrl: "https://jsonplaceholder.typicode.com",
      authType: "token",
      authToken: "test-token",
    };

    // Create resource provider instance
    resourceProvider = new ApiResourceProvider(mockApiClient, config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getResourceTemplate", () => {
    it("should return the correct resource template", () => {
      const template = resourceProvider.getResourceTemplate();

      expect(template).toEqual({
        uriTemplate: "api://endpoints/{endpoint}",
        name: "API Endpoints",
        description: "Available API endpoints and their documentation",
      });
    });
  });

  // describe("validateBaseUrlAccessibility", () => {
  //   it("should return true when base URL is accessible", async () => {
  //     const mockResponse: ApiResponse = {
  //       success: true,
  //       status: 200,
  //       data: { message: "OK" },
  //     };
  //     mockApiClient.get.mockResolvedValue(mockResponse);

  //     const result = await resourceProvider.validateBaseUrlAccessibility();

  //     expect(result).toBe(true);
  //     expect(resourceProvider.isBaseUrlAccessible()).toBe(true);
  //     expect(mockApiClient.get).toHaveBeenCalledWith({ path: "/" });
  //   });

  //   it("should return true for 4xx errors (client errors are still accessible)", async () => {
  //     const mockResponse: ApiResponse = {
  //       success: false,
  //       status: 404,
  //       error: "Not Found",
  //     };
  //     mockApiClient.get.mockResolvedValue(mockResponse);

  //     const result = await resourceProvider.validateBaseUrlAccessibility();

  //     expect(result).toBe(true);
  //     expect(resourceProvider.isBaseUrlAccessible()).toBe(true);
  //   });

  //   it("should return false when base URL is not accessible (5xx errors)", async () => {
  //     const mockResponse: ApiResponse = {
  //       success: false,
  //       status: 500,
  //       error: "Internal Server Error",
  //     };
  //     mockApiClient.get.mockResolvedValue(mockResponse);

  //     const result = await resourceProvider.validateBaseUrlAccessibility();

  //     expect(result).toBe(false);
  //     expect(resourceProvider.isBaseUrlAccessible()).toBe(false);
  //   });

  //   it("should return false when request throws an error", async () => {
  //     mockApiClient.get.mockRejectedValue(new Error("Network error"));

  //     const result = await resourceProvider.validateBaseUrlAccessibility();

  //     expect(result).toBe(false);
  //     expect(resourceProvider.isBaseUrlAccessible()).toBe(false);
  //   });
  // });

  describe("discoverEndpoints", () => {
    it("should return standard endpoints when no specific endpoints are discovered", async () => {
      // Mock all discovery requests to fail
      mockApiClient.get.mockResolvedValue({
        success: false,
        status: 404,
        error: "Not Found",
      });

      const endpoints = await resourceProvider.discoverEndpoints();

      expect(endpoints).toHaveLength(6); // 6 standard CRUD endpoints
      expect(endpoints[0]).toMatchObject({
        path: "/{resource}",
        methods: ["GET"],
        description: "Retrieve a collection of resources",
      });
      expect(endpoints[1]).toMatchObject({
        path: "/{resource}/{id}",
        methods: ["GET"],
        description: "Retrieve a specific resource by ID",
      });
    });

    it("should discover common API endpoints", async () => {
      // Mock successful responses for some common paths
      mockApiClient.get.mockImplementation(async options => {
        if (options.path === "/api") {
          return { success: true, status: 200, data: { version: "1.0" } };
        }
        if (options.path === "/health") {
          return { success: true, status: 200, data: { status: "healthy" } };
        }
        return { success: false, status: 404, error: "Not Found" };
      });

      const endpoints = await resourceProvider.discoverEndpoints();

      // Should include standard endpoints plus discovered ones
      expect(endpoints.length).toBeGreaterThan(6);

      // Check for discovered endpoints
      const discoveredPaths = endpoints.map(e => e.path);
      expect(discoveredPaths).toContain("/api");
      expect(discoveredPaths).toContain("/health");
    });

    it("should discover resource endpoints from API root", async () => {
      // Mock successful responses for API root and users resource
      mockApiClient.get.mockImplementation(async options => {
        if (options.path === "/api") {
          return { success: true, status: 200, data: { version: "1.0" } };
        }
        if (options.path === "/api/users") {
          return { success: true, status: 200, data: [{ id: 1, name: "John" }] };
        }
        return { success: false, status: 404, error: "Not Found" };
      });

      const endpoints = await resourceProvider.discoverEndpoints();

      // Check for discovered resource endpoints
      const discoveredPaths = endpoints.map(e => e.path);
      expect(discoveredPaths).toContain("/api");
      expect(discoveredPaths).toContain("/api/users");
      expect(discoveredPaths).toContain("/api/users/{id}");
    });
  });

  describe("listResources", () => {
    it("should return list of resources including API info", async () => {
      // Mock discovery to return standard endpoints only
      mockApiClient.get.mockResolvedValue({
        success: false,
        status: 404,
        error: "Not Found",
      });

      const result = await resourceProvider.listResources();

      expect(result.resources).toHaveLength(7); // 6 standard endpoints + 1 info resource

      // Check API info resource
      expect(result.resources[0]).toMatchObject({
        uri: "api://endpoints/info",
        name: "API Information",
        description: "General information about the configured API",
        mimeType: "application/json",
      });

      // Check endpoint resources
      expect(result.resources[1]).toMatchObject({
        uri: "api://endpoints/endpoint-0",
        name: "GET /{resource}",
        description: "Retrieve a collection of resources",
        mimeType: "application/json",
      });
    });
  });

  describe("readResource", () => {
    beforeEach(() => {
      // Mock discovery to return standard endpoints only
      mockApiClient.get.mockResolvedValue({
        success: false,
        status: 404,
        error: "Not Found",
      });
    });

    it("should return API info for info resource", async () => {
      const result = await resourceProvider.readResource("api://endpoints/info");

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]?.uri).toBe("api://endpoints/info");
      expect(result.contents[0]?.mimeType).toBe("application/json");

      const content = JSON.parse(result.contents[0]?.text as string);
      expect(content.api).toMatchObject({
        baseUrl: "https://jsonplaceholder.typicode.com",
        authType: "token",
      });
      expect(content.tools).toHaveLength(5); // 5 CRUD tools
    });

    it("should return endpoint details for specific endpoint", async () => {
      const result = await resourceProvider.readResource("api://endpoints/endpoint-0");

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]?.uri).toBe("api://endpoints/endpoint-0");
      expect(result.contents[0]?.mimeType).toBe("application/json");

      const content = JSON.parse(result.contents[0]?.text as string);
      expect(content.endpoint).toMatchObject({
        path: "/{resource}",
        methods: ["GET"],
        description: "Retrieve a collection of resources",
        baseUrl: "https://jsonplaceholder.typicode.com",
        authType: "token",
      });
      expect(content.usage.example).toMatchObject({
        tool: "api_get",
        arguments: {
          path: "/users",
        },
      });
    });

    it("should throw error for invalid resource URI", async () => {
      await expect(resourceProvider.readResource("invalid://uri")).rejects.toThrow("Invalid resource URI: invalid://uri");
    });

    it("should throw error for non-existent endpoint index", async () => {
      await expect(resourceProvider.readResource("api://endpoints/endpoint-999")).rejects.toThrow("Endpoint not found: api://endpoints/endpoint-999");
    });
  });

  describe("generateUsageExample", () => {
    it("should generate GET example with query parameters", () => {
      const endpoint: ApiEndpointInfo = {
        path: "/{resource}",
        methods: ["GET"],
        description: "Test endpoint",
        parameters: {
          query: {
            limit: "Limit results",
          },
        },
      };

      // Access private method through any cast for testing
      const example = (resourceProvider as any).generateUsageExample(endpoint);

      expect(example).toMatchObject({
        tool: "api_get",
        arguments: {
          path: "/users",
          queryParams: {
            limit: "10",
            offset: "0",
          },
        },
      });
    });

    it("should generate POST example with body", () => {
      const endpoint: ApiEndpointInfo = {
        path: "/{resource}",
        methods: ["POST"],
        description: "Test endpoint",
        parameters: {
          body: "JSON object",
        },
      };

      const example = (resourceProvider as any).generateUsageExample(endpoint);

      expect(example).toMatchObject({
        tool: "api_post",
        arguments: {
          path: "/users",
          body: {
            name: "John Doe",
            email: "john@example.com",
          },
        },
      });
    });

    it("should generate simple example without optional parameters", () => {
      const endpoint: ApiEndpointInfo = {
        path: "/{resource}/{id}",
        methods: ["DELETE"],
        description: "Test endpoint",
      };

      const example = (resourceProvider as any).generateUsageExample(endpoint);

      expect(example).toMatchObject({
        tool: "api_delete",
        arguments: {
          path: "/users/123",
        },
      });
    });
  });
});

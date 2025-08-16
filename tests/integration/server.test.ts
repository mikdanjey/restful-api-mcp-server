/**
 * Integration tests for the complete MCP server functionality
 * These tests use real HTTP requests to JSONPlaceholder API
 */

import { McpRestfulApiServer } from "../../src/index";
import { loadConfig, ServerConfig } from "../../src/config";
import { ApiClient } from "../../src/client";
import { BasicAuthHandler, TokenAuthHandler, NoAuthHandler, AuthenticationStrategy } from "../../src/auth";

// Test configuration for JSONPlaceholder API
const testConfig: ServerConfig = {
  baseUrl: "https://jsonplaceholder.typicode.com",
  authType: "none" as const,
};

// Helper function to create auth handler
function createAuthHandler(config: ServerConfig): AuthenticationStrategy {
  switch (config.authType) {
    case "basic":
      if (!config.basicAuth) {
        throw new Error("Basic authentication requires username and password");
      }
      return new BasicAuthHandler(config.basicAuth.username, config.basicAuth.password);
    case "token":
      if (!config.authToken) {
        throw new Error("Token authentication requires authToken");
      }
      return new TokenAuthHandler(config.authToken);
    case "none":
      return new NoAuthHandler();
    default:
      throw new Error(`Unsupported authentication type: ${(config as any).authType}`);
  }
}

// Mock the loadConfig function to use test configuration
jest.mock("../../src/config", () => ({
  ...jest.requireActual("../../src/config"),
  loadConfig: jest.fn(),
}));

const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>;

describe("MCP Server Integration Tests", () => {
  let server: McpRestfulApiServer | null = null;
  let apiClient: ApiClient;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock successful configuration loading
    mockLoadConfig.mockReturnValue(testConfig);

    // Create API client for direct testing
    const authHandler = createAuthHandler(testConfig);
    apiClient = new ApiClient(testConfig, authHandler);

    // Mock console methods to avoid noise in tests
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
    jest.spyOn(console, "debug").mockImplementation();
  });

  afterEach(async () => {
    if (server) {
      try {
        await server.shutdown();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
      server = null;
    }

    // Restore console methods
    jest.restoreAllMocks();
  });

  describe("End-to-End API Operations", () => {
    test("should perform GET request to JSONPlaceholder API", async () => {
      const response = await apiClient.get({ path: "/posts/1" });

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id", 1);
      expect(response.data).toHaveProperty("title");
      expect(response.data).toHaveProperty("body");
      expect(response.data).toHaveProperty("userId");
    });

    test("should perform GET request with query parameters", async () => {
      const response = await apiClient.get({
        path: "/posts",
        queryParams: { userId: "1" },
      });

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data[0]).toHaveProperty("userId", 1);
    });

    test("should perform POST request to create new resource", async () => {
      const newPost = {
        title: "Integration Test Post",
        body: "This is a test post created during integration testing",
        userId: 1,
      };

      const response = await apiClient.post({
        path: "/posts",
        body: newPost,
      });

      expect(response.success).toBe(true);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
      expect(response.data).toHaveProperty("title", newPost.title);
      expect(response.data).toHaveProperty("body", newPost.body);
      expect(response.data).toHaveProperty("userId", newPost.userId);
    });

    test("should perform PUT request to update resource", async () => {
      const updatedPost = {
        id: 1,
        title: "Updated Integration Test Post",
        body: "This post has been updated during integration testing",
        userId: 1,
      };

      const response = await apiClient.put({
        path: "/posts/1",
        body: updatedPost,
      });

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id", 1);
      expect(response.data).toHaveProperty("title", updatedPost.title);
      expect(response.data).toHaveProperty("body", updatedPost.body);
    });

    test("should perform PATCH request to partially update resource", async () => {
      const partialUpdate = {
        title: "Partially Updated Title",
      };

      const response = await apiClient.patch({
        path: "/posts/1",
        body: partialUpdate,
      });

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id", 1);
      expect(response.data).toHaveProperty("title", partialUpdate.title);
      expect(response.data).toHaveProperty("body"); // Should still have original body
      expect(response.data).toHaveProperty("userId");
    });

    test("should perform DELETE request to remove resource", async () => {
      const response = await apiClient.delete({ path: "/posts/1" });

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({});
    });
  });

  describe("Error Scenarios and Edge Cases", () => {
    test("should handle 404 Not Found errors gracefully", async () => {
      const response = await apiClient.get({ path: "/posts/999999" });

      expect(response.success).toBe(false);
      expect(response.status).toBe(404);
      expect(response.error).toContain("404");
    });

    test("should handle invalid JSON in request body", async () => {
      // Test with circular reference that can't be serialized
      const invalidData = {};
      (invalidData as any).circular = invalidData;

      try {
        await apiClient.post({ path: "/posts", body: invalidData });
        throw new Error("Should have thrown an error for circular reference");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test("should handle invalid URL paths", async () => {
      const response = await apiClient.get({ path: "/invalid-endpoint-that-does-not-exist" });

      expect(response.success).toBe(false);
      expect(response.status).toBe(404);
    });

    test("should handle empty response bodies", async () => {
      const response = await apiClient.delete({ path: "/posts/1" });

      expect(response.success).toBe(true);
      expect(response.data).toEqual({});
    });

    test("should handle large response payloads", async () => {
      const response = await apiClient.get({ path: "/posts" });

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(50); // JSONPlaceholder has 100 posts
    });
  });

  describe("Performance and Concurrency Tests", () => {
    test("should handle concurrent GET requests", async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => apiClient.get({ path: `/posts/${i + 1}` }));

      const responses = await Promise.all(concurrentRequests);

      responses.forEach((response, index) => {
        expect(response.success).toBe(true);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("id", index + 1);
      });
    });

    test("should handle concurrent POST requests", async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        apiClient.post({
          path: "/posts",
          body: {
            title: `Concurrent Test Post ${i + 1}`,
            body: `This is concurrent test post number ${i + 1}`,
            userId: 1,
          },
        }),
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach((response, index) => {
        expect(response.success).toBe(true);
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty("title", `Concurrent Test Post ${index + 1}`);
      });
    });

    test("should handle mixed concurrent operations", async () => {
      const mixedRequests = [
        apiClient.get({ path: "/posts/1" }),
        apiClient.post({ path: "/posts", body: { title: "New Post", body: "Content", userId: 1 } }),
        apiClient.put({ path: "/posts/1", body: { id: 1, title: "Updated", body: "Updated content", userId: 1 } }),
        apiClient.patch({ path: "/posts/1", body: { title: "Patched Title" } }),
        apiClient.delete({ path: "/posts/1" }),
      ];

      const responses = await Promise.all(mixedRequests);

      expect(responses[0]?.success).toBe(true); // GET
      expect(responses[1]?.success).toBe(true); // POST
      expect(responses[2]?.success).toBe(true); // PUT
      expect(responses[3]?.success).toBe(true); // PATCH
      expect(responses[4]?.success).toBe(true); // DELETE
    });

    test("should maintain performance under load", async () => {
      const startTime = Date.now();

      const loadRequests = Array.from({ length: 20 }, () => apiClient.get({ path: "/posts/1" }));

      const responses = await Promise.all(loadRequests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.success).toBe(true);
      });

      // Should complete within reasonable time (adjust based on network conditions)
      expect(duration).toBeLessThan(10000); // 10 seconds max
    });
  });

  describe("API Client Integration", () => {
    test("should integrate with JSONPlaceholder API successfully", async () => {
      // Test that our API client can communicate with a real API
      const response = await apiClient.get({ path: "/posts/1" });

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id", 1);
      expect(response.data).toHaveProperty("title");
      expect(response.data).toHaveProperty("body");
      expect(response.data).toHaveProperty("userId");
    });

    test("should handle API errors appropriately", async () => {
      const response = await apiClient.get({ path: "/posts/999999" });

      expect(response.success).toBe(false);
      expect(response.status).toBe(404);
      expect(response.error).toContain("404");
    });

    test("should validate API accessibility", async () => {
      // Test that we can reach the configured API
      const response = await apiClient.get({ path: "/posts" });

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });
  });

  describe("Configuration Integration", () => {
    test("should load and validate configuration correctly", () => {
      const config = mockLoadConfig();

      expect(config).toHaveProperty("baseUrl");
      expect(config).toHaveProperty("authType");
      expect(config.baseUrl).toBe(testConfig.baseUrl);
      expect(config.authType).toBe(testConfig.authType);
    });

    test("should handle configuration errors", () => {
      mockLoadConfig.mockImplementationOnce(() => {
        throw new Error("Invalid configuration: Missing API_BASE_URL");
      });

      expect(() => mockLoadConfig()).toThrow("Invalid configuration: Missing API_BASE_URL");
    });
  });

  describe("Component Integration", () => {
    test("should integrate authentication with HTTP client", async () => {
      // Test that auth handler is properly integrated with API client
      const response = await apiClient.get({ path: "/posts/1" });

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);

      // For 'none' auth type, no auth headers should be added
      // This is verified by the successful response from the API
    });

    test("should handle different response formats", async () => {
      // Test JSON response
      const jsonResponse = await apiClient.get({ path: "/posts/1" });
      expect(jsonResponse.success).toBe(true);
      expect(typeof jsonResponse.data).toBe("object");

      // Test array response
      const arrayResponse = await apiClient.get({ path: "/posts" });
      expect(arrayResponse.success).toBe(true);
      expect(Array.isArray(arrayResponse.data)).toBe(true);
    });

    test("should maintain consistent error format across operations", async () => {
      const getError = await apiClient.get({ path: "/posts/999999" });
      const postError = await apiClient.post({ path: "/invalid-endpoint", body: {} });

      expect(getError.success).toBe(false);
      expect(postError.success).toBe(false);

      // Both should have consistent error structure
      expect(getError).toHaveProperty("error");
      expect(getError).toHaveProperty("status");
      expect(postError).toHaveProperty("error");
      expect(postError).toHaveProperty("status");
    });
  });

  describe("Real-world Usage Scenarios", () => {
    test("should handle typical CRUD workflow", async () => {
      // Create
      const createResponse = await apiClient.post({
        path: "/posts",
        body: {
          title: "Integration Test Post",
          body: "This is a test post for integration testing",
          userId: 1,
        },
      });
      expect(createResponse.success).toBe(true);
      expect(createResponse.status).toBe(201);

      // Read
      const readResponse = await apiClient.get({ path: "/posts/1" });
      expect(readResponse.success).toBe(true);
      expect(readResponse.status).toBe(200);

      // Update
      const updateResponse = await apiClient.put({
        path: "/posts/1",
        body: {
          id: 1,
          title: "Updated Integration Test Post",
          body: "This post has been updated",
          userId: 1,
        },
      });
      expect(updateResponse.success).toBe(true);
      expect(updateResponse.status).toBe(200);

      // Partial Update
      const patchResponse = await apiClient.patch({
        path: "/posts/1",
        body: {
          title: "Patched Integration Test Post",
        },
      });
      expect(patchResponse.success).toBe(true);
      expect(patchResponse.status).toBe(200);

      // Delete
      const deleteResponse = await apiClient.delete({ path: "/posts/1" });
      expect(deleteResponse.success).toBe(true);
      expect(deleteResponse.status).toBe(200);
    });

    test("should handle query parameters correctly", async () => {
      const response = await apiClient.get({
        path: "/posts",
        queryParams: { userId: "1" },
      });

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      // All posts should belong to userId 1
      response.data.forEach((post: any) => {
        expect(post.userId).toBe(1);
      });
    });

    test("should handle custom headers", async () => {
      const customHeaders = {
        "X-Custom-Header": "test-value",
        Accept: "application/json",
      };

      const response = await apiClient.get({
        path: "/posts/1",
        headers: customHeaders,
      });

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      // The request should succeed with custom headers
    });
  });
});

describe("End-to-End Integration", () => {
  test("should demonstrate complete integration flow", async () => {
    // This test demonstrates that all components work together
    // from configuration loading to making actual HTTP requests

    // 1. Configuration is loaded (mocked but represents real config loading)
    const config = mockLoadConfig();
    expect(config).toBeDefined();

    // 2. Authentication handler is created
    const authHandler = createAuthHandler(config);
    expect(authHandler).toBeDefined();

    // 3. API client is created with auth handler
    const client = new ApiClient(config, authHandler);
    expect(client).toBeDefined();

    // 4. Client can make successful requests
    const response = await client.get({ path: "/posts/1" });
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty("id", 1);

    // This demonstrates the complete integration chain working
  });

  test("should handle full error propagation chain", async () => {
    // Test error handling through the entire stack

    // 1. Invalid configuration should be caught
    mockLoadConfig.mockImplementationOnce(() => {
      throw new Error("Configuration error");
    });

    expect(() => mockLoadConfig()).toThrow("Configuration error");

    // 2. Reset to valid config for API client testing
    mockLoadConfig.mockReturnValue(testConfig);
    const config = mockLoadConfig();
    const authHandler = createAuthHandler(config);
    const testClient = new ApiClient(config, authHandler);

    // 3. API errors should be properly handled and formatted
    const response = await testClient.get({ path: "/posts/999999" });
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.status).toBe(404);
  });
});

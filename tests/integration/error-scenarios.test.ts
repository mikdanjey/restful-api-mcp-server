/**
 * Integration tests for error scenarios and edge cases
 */

import { ApiClient } from "../../src/client";
import { NoAuthHandler } from "../../src/auth";
import { ServerConfig } from "../../src/config";

describe("Error Scenarios Integration Tests", () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    const config: ServerConfig = {
      baseUrl: "https://jsonplaceholder.typicode.com",
      authType: "none",
    };
    const authHandler = new NoAuthHandler();
    apiClient = new ApiClient(config, authHandler);
  });

  describe("HTTP Error Status Codes", () => {
    test("should handle 404 Not Found errors", async () => {
      const response = await apiClient.get({ path: "/posts/999999" });

      expect(response.success).toBe(false);
      expect(response.status).toBe(404);
      expect(response.error).toContain("404");
    });

    test("should handle invalid endpoints", async () => {
      const response = await apiClient.get({ path: "/invalid-endpoint" });

      expect(response.success).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  describe("Network and Connection Errors", () => {
    test("should handle DNS resolution failures", async () => {
      const config: ServerConfig = {
        baseUrl: "https://this-domain-does-not-exist-12345.com",
        authType: "none",
      };
      const authHandler = new NoAuthHandler();
      const invalidClient = new ApiClient(config, authHandler);

      const response = await invalidClient.get({ path: "/test" });

      expect(response.success).toBe(false);
      expect(response.error).toMatch(/ENOTFOUND|getaddrinfo|DNS|Network error|No response/i);
    });

    test("should handle connection refused errors", async () => {
      const config: ServerConfig = {
        baseUrl: "http://localhost:99999", // Port that should not be in use
        authType: "none",
      };
      const authHandler = new NoAuthHandler();
      const invalidClient = new ApiClient(config, authHandler);

      const response = await invalidClient.get({ path: "/test" });

      expect(response.success).toBe(false);
      expect(response.error).toMatch(/ECONNREFUSED|connect|Invalid URL|Request failed/i);
    });
  });

  describe("Request Data Validation Errors", () => {
    test("should handle empty request bodies", async () => {
      const response = await apiClient.post({ path: "/posts", body: {} });

      expect(response.success).toBe(true);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
    });

    test("should handle null and undefined values", async () => {
      const dataWithNulls = {
        title: null,
        body: undefined,
        userId: 1,
      };

      const response = await apiClient.post({ path: "/posts", body: dataWithNulls });

      expect(response.success).toBe(true);
      expect(response.status).toBe(201);
    });
  });

  describe("Response Handling Edge Cases", () => {
    test("should handle empty response bodies", async () => {
      const response = await apiClient.delete({ path: "/posts/1" });

      expect(response.success).toBe(true);
      expect(response.data).toEqual({});
    });

    test("should handle large response payloads", async () => {
      const response = await apiClient.get({ path: "/posts" });

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(50);
    });
  });

  describe("Concurrent Error Scenarios", () => {
    test("should handle concurrent requests with mixed success/failure", async () => {
      const mixedRequests = [
        apiClient.get({ path: "/posts/1" }), // Should succeed
        apiClient.get({ path: "/posts/999999" }), // Should fail (404)
        apiClient.post({ path: "/posts", body: { title: "Test", body: "Test", userId: 1 } }), // Should succeed
        apiClient.get({ path: "/invalid-endpoint" }), // Should fail (404)
      ];

      const responses = await Promise.all(mixedRequests);

      expect(responses[0]?.success).toBe(true); // GET posts/1
      expect(responses[1]?.success).toBe(false); // GET posts/999999
      expect(responses[1]?.status).toBe(404);
      expect(responses[2]?.success).toBe(true); // POST posts
      expect(responses[3]?.success).toBe(false); // GET invalid-endpoint
      expect(responses[3]?.status).toBe(404);
    });
  });

  describe("Recovery and Resilience", () => {
    test("should recover from temporary network issues", async () => {
      // First, make a request to an invalid endpoint
      const invalidResponse = await apiClient.get({ path: "/invalid-endpoint" });
      expect(invalidResponse.success).toBe(false);

      // Then make a valid request to ensure the client still works
      const validResponse = await apiClient.get({ path: "/posts/1" });
      expect(validResponse.success).toBe(true);
      expect(validResponse.data).toHaveProperty("id", 1);
    });

    test("should maintain state across multiple error scenarios", async () => {
      // Sequence of requests with various error conditions
      const responses = [];

      // Valid request
      responses.push(await apiClient.get({ path: "/posts/1" }));

      // Invalid request
      responses.push(await apiClient.get({ path: "/posts/999999" }));

      // Another valid request
      responses.push(await apiClient.get({ path: "/posts/2" }));

      // Invalid endpoint
      responses.push(await apiClient.get({ path: "/invalid" }));

      // Final valid request
      responses.push(await apiClient.get({ path: "/posts/3" }));

      // Check that valid requests succeeded and invalid ones failed appropriately
      expect(responses[0]?.success).toBe(true);
      expect(responses[1]?.success).toBe(false);
      expect(responses[2]?.success).toBe(true);
      expect(responses[3]?.success).toBe(false);
      expect(responses[4]?.success).toBe(true);

      // Verify data integrity
      expect(responses[0]?.data).toHaveProperty("id", 1);
      expect(responses[2]?.data).toHaveProperty("id", 2);
      expect(responses[4]?.data).toHaveProperty("id", 3);
    });
  });
});

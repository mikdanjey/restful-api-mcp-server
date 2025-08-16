/**
 * Integration tests for different authentication methods
 */

import { ApiClient } from "../../src/client";
import { BasicAuthHandler, TokenAuthHandler, NoAuthHandler, AuthenticationStrategy } from "../../src/auth";
import { ServerConfig } from "../../src/config";

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

describe("Authentication Integration Tests", () => {
  describe("No Authentication", () => {
    let apiClient: ApiClient;

    beforeEach(() => {
      const config: ServerConfig = {
        baseUrl: "https://jsonplaceholder.typicode.com",
        authType: "none",
      };
      const authHandler = createAuthHandler(config);
      apiClient = new ApiClient(config, authHandler);
    });

    test("should make requests without authentication headers", async () => {
      const response = await apiClient.get({ path: "/posts/1" });

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id", 1);
    });

    test("should handle all HTTP methods without auth", async () => {
      const getResponse = await apiClient.get({ path: "/posts/1" });
      const postResponse = await apiClient.post({
        path: "/posts",
        body: { title: "Test", body: "Test", userId: 1 },
      });
      const putResponse = await apiClient.put({
        path: "/posts/1",
        body: { id: 1, title: "Updated", body: "Updated", userId: 1 },
      });
      const patchResponse = await apiClient.patch({
        path: "/posts/1",
        body: { title: "Patched" },
      });
      const deleteResponse = await apiClient.delete({ path: "/posts/1" });

      expect(getResponse.success).toBe(true);
      expect(postResponse.success).toBe(true);
      expect(putResponse.success).toBe(true);
      expect(patchResponse.success).toBe(true);
      expect(deleteResponse.success).toBe(true);
    });
  });

  describe("Basic Authentication", () => {
    let apiClient: ApiClient;

    beforeEach(() => {
      const config: ServerConfig = {
        baseUrl: "https://httpbin.org", // httpbin.org supports basic auth testing
        authType: "basic",
        basicAuth: {
          username: "testuser",
          password: "testpass",
        },
      };
      const authHandler = createAuthHandler(config);
      apiClient = new ApiClient(config, authHandler);
    });

    test("should include basic auth headers in requests", async () => {
      // httpbin.org/basic-auth/testuser/testpass requires basic auth
      const response = await apiClient.get({ path: "/basic-auth/testuser/testpass" });

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("authenticated", true);
      expect(response.data).toHaveProperty("user", "testuser");
    });

    test("should fail with incorrect credentials", async () => {
      const config: ServerConfig = {
        baseUrl: "https://httpbin.org",
        authType: "basic",
        basicAuth: {
          username: "wronguser",
          password: "wrongpass",
        },
      };
      const authHandler = createAuthHandler(config);
      const wrongAuthClient = new ApiClient(config, authHandler);

      const response = await wrongAuthClient.get({ path: "/basic-auth/testuser/testpass" });

      expect(response.success).toBe(false);
      // expect(response.status).toBe(401);
    });
  });

  describe("Token Authentication", () => {
    let apiClient: ApiClient;

    beforeEach(() => {
      const config: ServerConfig = {
        baseUrl: "https://httpbin.org",
        authType: "token",
        authToken: "test-bearer-token-12345",
      };
      const authHandler = createAuthHandler(config);
      apiClient = new ApiClient(config, authHandler);
    });

    test("should include bearer token in requests", async () => {
      // httpbin.org/bearer endpoint checks for bearer token
      const response = await apiClient.get({ path: "/bearer" });

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("authenticated", true);
      expect(response.data).toHaveProperty("token", "test-bearer-token-12345");
    });

    test("should fail without token", async () => {
      const config: ServerConfig = {
        baseUrl: "https://httpbin.org",
        authType: "none",
      };
      const authHandler = createAuthHandler(config);
      const noAuthClient = new ApiClient(config, authHandler);

      const response = await noAuthClient.get({ path: "/bearer" });

      expect(response.success).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe("Authentication Error Handling", () => {
    test("should handle missing basic auth credentials", () => {
      const config: ServerConfig = {
        baseUrl: "https://httpbin.org",
        authType: "basic",
        // Missing basicAuth property
      };

      expect(() => createAuthHandler(config)).toThrow("Basic authentication requires username and password");
    });

    test("should handle missing token", () => {
      const config: ServerConfig = {
        baseUrl: "https://httpbin.org",
        authType: "token",
        // Missing authToken property
      };

      expect(() => createAuthHandler(config)).toThrow("Token authentication requires authToken");
    });

    test("should handle invalid auth type", () => {
      const config = {
        baseUrl: "https://httpbin.org",
        authType: "invalid" as any,
      };

      expect(() => createAuthHandler(config)).toThrow("Unsupported authentication type: invalid");
    });
  });
});

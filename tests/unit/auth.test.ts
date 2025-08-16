/**
 * Unit tests for authentication handlers
 */

import { AxiosRequestConfig } from "axios";
import { BaseAuthenticationHandler, BasicAuthHandler, TokenAuthHandler, NoAuthHandler } from "../../src/auth";

// Mock concrete implementation for testing the base class
class MockAuthenticationHandler extends BaseAuthenticationHandler {
  private shouldThrowOnValidate: boolean;
  private mockHeaders: Record<string, string>;

  constructor(authType: string, mockHeaders: Record<string, string> = {}, shouldThrowOnValidate = false) {
    super(authType);
    this.mockHeaders = mockHeaders;
    this.shouldThrowOnValidate = shouldThrowOnValidate;
  }

  applyAuth(config: AxiosRequestConfig): AxiosRequestConfig {
    const clonedConfig = this.cloneConfig(config);
    clonedConfig.headers = {
      ...clonedConfig.headers,
      ...this.mockHeaders,
    };
    return clonedConfig;
  }

  validate(): void {
    if (this.shouldThrowOnValidate) {
      throw new Error("Mock validation error");
    }
  }
}

describe("AuthenticationStrategy Interface", () => {
  let mockHandler: MockAuthenticationHandler;

  beforeEach(() => {
    mockHandler = new MockAuthenticationHandler("mock", { "X-Mock-Auth": "test" });
  });

  describe("applyAuth", () => {
    it("should apply authentication headers to request config", () => {
      const config: AxiosRequestConfig = {
        url: "/test",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      };

      const result = mockHandler.applyAuth(config);

      expect(result.headers).toEqual({
        "Content-Type": "application/json",
        "X-Mock-Auth": "test",
      });
    });

    it("should not modify the original config object", () => {
      const config: AxiosRequestConfig = {
        url: "/test",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      };

      const originalHeaders = { ...config.headers };
      mockHandler.applyAuth(config);

      expect(config.headers).toEqual(originalHeaders);
    });

    it("should handle config without existing headers", () => {
      const config: AxiosRequestConfig = {
        url: "/test",
        method: "GET",
      };

      const result = mockHandler.applyAuth(config);

      expect(result.headers).toEqual({
        "X-Mock-Auth": "test",
      });
    });
  });

  describe("getAuthType", () => {
    it("should return the correct authentication type", () => {
      expect(mockHandler.getAuthType()).toBe("mock");
    });

    it("should return different auth types for different handlers", () => {
      const handler1 = new MockAuthenticationHandler("basic");
      const handler2 = new MockAuthenticationHandler("token");

      expect(handler1.getAuthType()).toBe("basic");
      expect(handler2.getAuthType()).toBe("token");
    });
  });

  describe("validate", () => {
    it("should not throw when validation passes", () => {
      expect(() => mockHandler.validate()).not.toThrow();
    });

    it("should throw when validation fails", () => {
      const failingHandler = new MockAuthenticationHandler("mock", {}, true);

      expect(() => failingHandler.validate()).toThrow("Mock validation error");
    });
  });
});

describe("BaseAuthenticationHandler", () => {
  let mockHandler: MockAuthenticationHandler;

  beforeEach(() => {
    mockHandler = new MockAuthenticationHandler("test-auth");
  });

  describe("cloneConfig", () => {
    it("should create a deep clone of the config object", () => {
      const config: AxiosRequestConfig = {
        url: "/test",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Custom": "value",
        },
        data: { test: "data" },
      };

      // Access the protected method through the mock implementation
      const cloned = (mockHandler as any).cloneConfig(config);

      expect(cloned).toEqual(config);
      expect(cloned).not.toBe(config);
      expect(cloned.headers).not.toBe(config.headers);
    });

    it("should handle config without headers", () => {
      const config: AxiosRequestConfig = {
        url: "/test",
        method: "GET",
      };

      const cloned = (mockHandler as any).cloneConfig(config);

      expect(cloned).toEqual({
        url: "/test",
        method: "GET",
        headers: {},
      });
    });
  });

  describe("constructor", () => {
    it("should set the auth type correctly", () => {
      const handler = new MockAuthenticationHandler("custom-auth");
      expect(handler.getAuthType()).toBe("custom-auth");
    });
  });
});

describe("BasicAuthHandler", () => {
  let basicAuthHandler: BasicAuthHandler;

  beforeEach(() => {
    basicAuthHandler = new BasicAuthHandler("testuser", "testpass");
  });

  describe("constructor", () => {
    it("should set auth type to basic", () => {
      expect(basicAuthHandler.getAuthType()).toBe("basic");
    });
  });

  describe("applyAuth", () => {
    it("should add basic authorization header", () => {
      const config: AxiosRequestConfig = {
        url: "/test",
        method: "GET",
      };

      const result = basicAuthHandler.applyAuth(config);
      const expectedCredentials = Buffer.from("testuser:testpass").toString("base64");

      expect(result.headers?.["Authorization"]).toBe(`Basic ${expectedCredentials}`);
    });

    it("should preserve existing headers", () => {
      const config: AxiosRequestConfig = {
        url: "/test",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Custom": "value",
        },
      };

      const result = basicAuthHandler.applyAuth(config);
      const expectedCredentials = Buffer.from("testuser:testpass").toString("base64");

      expect(result.headers).toEqual({
        "Content-Type": "application/json",
        "X-Custom": "value",
        Authorization: `Basic ${expectedCredentials}`,
      });
    });

    it("should handle special characters in credentials", () => {
      const handler = new BasicAuthHandler("user@domain.com", "p@ssw0rd!");
      const config: AxiosRequestConfig = { url: "/test" };

      const result = handler.applyAuth(config);
      const expectedCredentials = Buffer.from("user@domain.com:p@ssw0rd!").toString("base64");

      expect(result.headers?.["Authorization"]).toBe(`Basic ${expectedCredentials}`);
    });
  });

  describe("validate", () => {
    it("should not throw for valid credentials", () => {
      expect(() => basicAuthHandler.validate()).not.toThrow();
    });

    it("should throw for empty username", () => {
      const handler = new BasicAuthHandler("", "password");
      expect(() => handler.validate()).toThrow("Basic authentication requires a valid username");
    });

    it("should throw for undefined username", () => {
      const handler = new BasicAuthHandler(undefined as any, "password");
      expect(() => handler.validate()).toThrow("Basic authentication requires a valid username");
    });

    it("should throw for empty password", () => {
      const handler = new BasicAuthHandler("username", "");
      expect(() => handler.validate()).toThrow("Basic authentication requires a valid password");
    });

    it("should throw for undefined password", () => {
      const handler = new BasicAuthHandler("username", undefined as any);
      expect(() => handler.validate()).toThrow("Basic authentication requires a valid password");
    });

    it("should throw for non-string username", () => {
      const handler = new BasicAuthHandler(123 as any, "password");
      expect(() => handler.validate()).toThrow("Basic authentication requires a valid username");
    });

    it("should throw for non-string password", () => {
      const handler = new BasicAuthHandler("username", 123 as any);
      expect(() => handler.validate()).toThrow("Basic authentication requires a valid password");
    });
  });
});

describe("TokenAuthHandler", () => {
  let tokenAuthHandler: TokenAuthHandler;

  beforeEach(() => {
    tokenAuthHandler = new TokenAuthHandler("test-token-123");
  });

  describe("constructor", () => {
    it("should set auth type to token", () => {
      expect(tokenAuthHandler.getAuthType()).toBe("token");
    });
  });

  describe("applyAuth", () => {
    it("should add bearer authorization header", () => {
      const config: AxiosRequestConfig = {
        url: "/test",
        method: "GET",
      };

      const result = tokenAuthHandler.applyAuth(config);

      expect(result.headers?.["Authorization"]).toBe("Bearer test-token-123");
    });

    it("should preserve existing headers", () => {
      const config: AxiosRequestConfig = {
        url: "/test",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Custom": "value",
        },
      };

      const result = tokenAuthHandler.applyAuth(config);

      expect(result.headers).toEqual({
        "Content-Type": "application/json",
        "X-Custom": "value",
        Authorization: "Bearer test-token-123",
      });
    });

    it("should handle complex tokens", () => {
      const complexToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const handler = new TokenAuthHandler(complexToken);
      const config: AxiosRequestConfig = { url: "/test" };

      const result = handler.applyAuth(config);

      expect(result.headers?.["Authorization"]).toBe(`Bearer ${complexToken}`);
    });
  });

  describe("validate", () => {
    it("should not throw for valid token", () => {
      expect(() => tokenAuthHandler.validate()).not.toThrow();
    });

    it("should throw for empty token", () => {
      const handler = new TokenAuthHandler("");
      expect(() => handler.validate()).toThrow("Token authentication requires a valid token");
    });

    it("should throw for whitespace-only token", () => {
      const handler = new TokenAuthHandler("   ");
      expect(() => handler.validate()).toThrow("Token authentication requires a non-empty token");
    });

    it("should throw for undefined token", () => {
      const handler = new TokenAuthHandler(undefined as any);
      expect(() => handler.validate()).toThrow("Token authentication requires a valid token");
    });

    it("should throw for non-string token", () => {
      const handler = new TokenAuthHandler(123 as any);
      expect(() => handler.validate()).toThrow("Token authentication requires a valid token");
    });
  });
});

describe("NoAuthHandler", () => {
  let noAuthHandler: NoAuthHandler;

  beforeEach(() => {
    noAuthHandler = new NoAuthHandler();
  });

  describe("constructor", () => {
    it("should set auth type to none", () => {
      expect(noAuthHandler.getAuthType()).toBe("none");
    });
  });

  describe("applyAuth", () => {
    it("should not add any authorization headers", () => {
      const config: AxiosRequestConfig = {
        url: "/test",
        method: "GET",
      };

      const result = noAuthHandler.applyAuth(config);

      expect(result.headers?.["Authorization"]).toBeUndefined();
    });

    it("should preserve existing headers without adding auth", () => {
      const config: AxiosRequestConfig = {
        url: "/test",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Custom": "value",
        },
      };

      const result = noAuthHandler.applyAuth(config);

      expect(result.headers).toEqual({
        "Content-Type": "application/json",
        "X-Custom": "value",
      });
      expect(result.headers?.["Authorization"]).toBeUndefined();
    });

    it("should return a cloned config object", () => {
      const config: AxiosRequestConfig = {
        url: "/test",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      };

      const result = noAuthHandler.applyAuth(config);

      expect(result).toEqual(config);
      expect(result).not.toBe(config);
      expect(result.headers).not.toBe(config.headers);
    });
  });

  describe("validate", () => {
    it("should not throw for no auth handler", () => {
      expect(() => noAuthHandler.validate()).not.toThrow();
    });
  });
});

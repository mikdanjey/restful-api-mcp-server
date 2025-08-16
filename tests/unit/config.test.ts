/**
 * Unit tests for configuration management
 */

import { loadConfig, parseConfig, validateRequiredEnvVars, ConfigurationError, ConfigSchema, type ValidatedEnv } from "../../src/config";

describe("Configuration Management", () => {
  describe("ConfigSchema validation", () => {
    it("should validate valid configuration with basic auth", () => {
      const validEnv = {
        API_BASE_URL: "https://api.example.com",
        API_AUTH_TYPE: "basic",
        API_BASIC_AUTH_USERNAME: "user",
        API_BASIC_AUTH_PASSWORD: "pass",
      };

      const result = ConfigSchema.parse(validEnv);
      expect(result).toEqual(validEnv);
    });

    it("should validate valid configuration with token auth", () => {
      const validEnv = {
        API_BASE_URL: "https://api.example.com",
        API_AUTH_TYPE: "token",
        API_AUTH_TOKEN: "bearer-token-123",
      };

      const result = ConfigSchema.parse(validEnv);
      expect(result).toEqual(validEnv);
    });

    it("should validate valid configuration with no auth", () => {
      const validEnv = {
        API_BASE_URL: "https://api.example.com",
        API_AUTH_TYPE: "none",
      };

      const result = ConfigSchema.parse(validEnv);
      expect(result).toEqual(validEnv);
    });

    it("should reject invalid URL", () => {
      const invalidEnv = {
        API_BASE_URL: "not-a-url",
        API_AUTH_TYPE: "none",
      };

      expect(() => ConfigSchema.parse(invalidEnv)).toThrow();
    });

    it("should reject invalid auth type", () => {
      const invalidEnv = {
        API_BASE_URL: "https://api.example.com",
        API_AUTH_TYPE: "invalid",
      };

      expect(() => ConfigSchema.parse(invalidEnv)).toThrow();
    });

    it("should require token when auth type is token", () => {
      const invalidEnv = {
        API_BASE_URL: "https://api.example.com",
        API_AUTH_TYPE: "token",
        // Missing API_AUTH_TOKEN
      };

      expect(() => ConfigSchema.parse(invalidEnv)).toThrow("API_AUTH_TOKEN is required");
    });

    it("should require username when auth type is basic", () => {
      const invalidEnv = {
        API_BASE_URL: "https://api.example.com",
        API_AUTH_TYPE: "basic",
        API_BASIC_AUTH_PASSWORD: "pass",
        // Missing API_BASIC_AUTH_USERNAME
      };

      expect(() => ConfigSchema.parse(invalidEnv)).toThrow("API_BASIC_AUTH_USERNAME is required");
    });

    it("should require password when auth type is basic", () => {
      const invalidEnv = {
        API_BASE_URL: "https://api.example.com",
        API_AUTH_TYPE: "basic",
        API_BASIC_AUTH_USERNAME: "user",
        // Missing API_BASIC_AUTH_PASSWORD
      };

      expect(() => ConfigSchema.parse(invalidEnv)).toThrow("API_BASIC_AUTH_PASSWORD is required");
    });
  });

  describe("parseConfig", () => {
    it("should parse basic auth configuration correctly", () => {
      const validatedEnv: ValidatedEnv = {
        API_BASE_URL: "https://api.example.com",
        API_AUTH_TYPE: "basic",
        API_BASIC_AUTH_USERNAME: "user",
        API_BASIC_AUTH_PASSWORD: "pass",
      };

      const config = parseConfig(validatedEnv);

      expect(config).toEqual({
        baseUrl: "https://api.example.com",
        authType: "basic",
        basicAuth: {
          username: "user",
          password: "pass",
        },
      });
    });

    it("should parse token auth configuration correctly", () => {
      const validatedEnv: ValidatedEnv = {
        API_BASE_URL: "https://api.example.com",
        API_AUTH_TYPE: "token",
        API_AUTH_TOKEN: "bearer-token-123",
      };

      const config = parseConfig(validatedEnv);

      expect(config).toEqual({
        baseUrl: "https://api.example.com",
        authType: "token",
        authToken: "bearer-token-123",
      });
    });

    it("should parse no auth configuration correctly", () => {
      const validatedEnv: ValidatedEnv = {
        API_BASE_URL: "https://api.example.com",
        API_AUTH_TYPE: "none",
      };

      const config = parseConfig(validatedEnv);

      expect(config).toEqual({
        baseUrl: "https://api.example.com",
        authType: "none",
      });
    });
  });

  describe("loadConfig", () => {
    // Mock console.log to avoid test output noise
    beforeEach(() => {
      jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should load valid configuration successfully", () => {
      const mockEnv = {
        API_BASE_URL: "https://api.example.com",
        API_AUTH_TYPE: "none",
      };

      const config = loadConfig(mockEnv);

      expect(config).toEqual({
        baseUrl: "https://api.example.com",
        authType: "none",
      });
    });

    it("should throw ConfigurationError for invalid configuration", () => {
      const mockEnv = {
        API_BASE_URL: "invalid-url",
        API_AUTH_TYPE: "none",
      };

      expect(() => loadConfig(mockEnv)).toThrow(ConfigurationError);
      expect(() => loadConfig(mockEnv)).toThrow("Configuration validation failed");
    });

    it("should throw ConfigurationError for missing required fields", () => {
      const mockEnv = {
        API_BASE_URL: "https://api.example.com",
        // Missing API_AUTH_TYPE
      };

      expect(() => loadConfig(mockEnv)).toThrow(ConfigurationError);
    });

    it("should load configuration correctly without exposing sensitive data", () => {
      const mockEnv = {
        API_BASE_URL: "https://api.example.com",
        API_AUTH_TYPE: "basic",
        API_BASIC_AUTH_USERNAME: "user",
        API_BASIC_AUTH_PASSWORD: "secret",
      };

      const config = loadConfig(mockEnv);

      // Verify configuration is loaded correctly
      expect(config).toEqual({
        baseUrl: "https://api.example.com",
        authType: "basic",
        basicAuth: {
          username: "user",
          password: "secret",
        },
      });

      // Verify sensitive data is not logged (console.log should not be called with password)
      expect(console.log).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          password: "secret",
        }),
      );
    });
  });

  describe("validateRequiredEnvVars", () => {
    it("should return empty array for valid environment", () => {
      const mockEnv = {
        API_BASE_URL: "https://api.example.com",
        API_AUTH_TYPE: "none",
      };

      const missing = validateRequiredEnvVars(mockEnv);
      expect(missing).toEqual([]);
    });

    it("should return missing variables", () => {
      const mockEnv = {};

      const missing = validateRequiredEnvVars(mockEnv);
      expect(missing).toEqual(["API_BASE_URL", "API_AUTH_TYPE"]);
    });

    it("should return partially missing variables", () => {
      const mockEnv = {
        API_BASE_URL: "https://api.example.com",
      };

      const missing = validateRequiredEnvVars(mockEnv);
      expect(missing).toEqual(["API_AUTH_TYPE"]);
    });
  });

  describe("ConfigurationError", () => {
    it("should create error with message and details", () => {
      const details = { test: "data" };
      const error = new ConfigurationError("Test error", details);

      expect(error.message).toBe("Test error");
      expect(error.name).toBe("ConfigurationError");
      expect(error.details).toEqual(details);
    });

    it("should create error without details", () => {
      const error = new ConfigurationError("Test error");

      expect(error.message).toBe("Test error");
      expect(error.name).toBe("ConfigurationError");
      expect(error.details).toBeUndefined();
    });
  });
});

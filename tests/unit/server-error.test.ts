/**
 * Unit tests for ServerError class
 */

import { ServerError } from "../../src/index";

describe("ServerError", () => {
  describe("constructor", () => {
    it("should create error with message and code", () => {
      const error = new ServerError("Test error message", "TEST_ERROR");

      expect(error.message).toBe("Test error message");
      expect(error.code).toBe("TEST_ERROR");
      expect(error.name).toBe("ServerError");
      expect(error.details).toBeUndefined();
    });

    it("should create error with message, code, and details", () => {
      const details = { userId: 123, action: "login" };
      const error = new ServerError("Authentication failed", "AUTH_ERROR", details);

      expect(error.message).toBe("Authentication failed");
      expect(error.code).toBe("AUTH_ERROR");
      expect(error.name).toBe("ServerError");
      expect(error.details).toEqual(details);
    });

    it("should create error with complex details object", () => {
      const details = {
        originalError: new Error("Original error"),
        context: {
          requestId: "req-123",
          timestamp: "2023-01-01T00:00:00Z",
        },
        metadata: {
          retryCount: 3,
          lastAttempt: Date.now(),
        },
      };

      const error = new ServerError("Complex error", "COMPLEX_ERROR", details);

      expect(error.message).toBe("Complex error");
      expect(error.code).toBe("COMPLEX_ERROR");
      expect(error.details).toEqual(details);
    });

    it("should create error with null details", () => {
      const error = new ServerError("Null details error", "NULL_ERROR", null);

      expect(error.message).toBe("Null details error");
      expect(error.code).toBe("NULL_ERROR");
      expect(error.details).toBeNull();
    });

    it("should create error with undefined details", () => {
      const error = new ServerError("Undefined details error", "UNDEFINED_ERROR", undefined);

      expect(error.message).toBe("Undefined details error");
      expect(error.code).toBe("UNDEFINED_ERROR");
      expect(error.details).toBeUndefined();
    });
  });

  describe("inheritance", () => {
    it("should be an instance of Error", () => {
      const error = new ServerError("Test error", "TEST_ERROR");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ServerError);
    });

    it("should have correct prototype chain", () => {
      const error = new ServerError("Test error", "TEST_ERROR");

      expect(Object.getPrototypeOf(error)).toBe(ServerError.prototype);
      expect(Object.getPrototypeOf(ServerError.prototype)).toBe(Error.prototype);
    });

    it("should be catchable as Error", () => {
      const error = new ServerError("Test error", "TEST_ERROR");

      try {
        throw error;
      } catch (caught) {
        expect(caught).toBeInstanceOf(Error);
        expect(caught).toBeInstanceOf(ServerError);
        expect((caught as ServerError).code).toBe("TEST_ERROR");
      }
    });
  });

  describe("error properties", () => {
    it("should maintain stack trace", () => {
      const error = new ServerError("Stack trace test", "STACK_ERROR");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("Stack trace test");
      expect(error.stack).toContain("ServerError");
    });

    it("should be serializable to JSON", () => {
      const details = { key: "value", number: 42 };
      const error = new ServerError("JSON test", "JSON_ERROR", details);

      // Note: Error objects don't serialize well by default, but we can access properties
      const serialized = {
        name: error.name,
        message: error.message,
        code: error.code,
        details: error.details,
      };

      expect(JSON.stringify(serialized)).toBe(
        JSON.stringify({
          name: "ServerError",
          message: "JSON test",
          code: "JSON_ERROR",
          details: { key: "value", number: 42 },
        }),
      );
    });
  });

  describe("error codes", () => {
    it("should support different error code formats", () => {
      const errors = [
        new ServerError("Test 1", "SIMPLE_ERROR"),
        new ServerError("Test 2", "COMPLEX_ERROR_CODE"),
        new ServerError("Test 3", "error-with-dashes"),
        new ServerError("Test 4", "error.with.dots"),
        new ServerError("Test 5", "MixedCaseError"),
      ];

      expect(errors[0]!.code).toBe("SIMPLE_ERROR");
      expect(errors[1]!.code).toBe("COMPLEX_ERROR_CODE");
      expect(errors[2]!.code).toBe("error-with-dashes");
      expect(errors[3]!.code).toBe("error.with.dots");
      expect(errors[4]!.code).toBe("MixedCaseError");
    });

    it("should support empty error code", () => {
      const error = new ServerError("Empty code test", "");

      expect(error.code).toBe("");
      expect(error.message).toBe("Empty code test");
    });
  });
});

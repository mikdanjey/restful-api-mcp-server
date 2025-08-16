/**
 * Unit tests for Logger utility class
 */

import { Logger } from "../../src/index";

describe("Logger", () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
    debug: jest.SpyInstance;
  };

  beforeEach(() => {
    // Mock console methods
    consoleSpy = {
      log: jest.spyOn(console, "log").mockImplementation(() => {}),
      warn: jest.spyOn(console, "warn").mockImplementation(() => {}),
      error: jest.spyOn(console, "error").mockImplementation(() => {}),
      debug: jest.spyOn(console, "debug").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env["DEBUG"];
    delete process.env["NODE_ENV"];
  });

  describe("info", () => {
    it("should log info messages with timestamp and level", () => {
      Logger.info("Test message");

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Test message/);
    });

    it("should log info messages with context", () => {
      const context = { userId: 123, action: "login" };
      Logger.info("User action", context);

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toMatch(/INFO: User action/);
      expect(logCall).toContain(JSON.stringify(context));
    });
  });

  describe("warn", () => {
    it("should log warning messages with timestamp and level", () => {
      Logger.warn("Warning message");

      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      const logCall = consoleSpy.warn.mock.calls[0][0];
      expect(logCall).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] WARN: Warning message/);
    });

    it("should log warning messages with context", () => {
      const context = { code: "DEPRECATED_API" };
      Logger.warn("API deprecated", context);

      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      const logCall = consoleSpy.warn.mock.calls[0][0];
      expect(logCall).toMatch(/WARN: API deprecated/);
      expect(logCall).toContain(JSON.stringify(context));
    });
  });

  describe("error", () => {
    it("should log error messages with timestamp and level", () => {
      Logger.error("Error message");

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      const logCall = consoleSpy.error.mock.calls[0][0];
      expect(logCall).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] ERROR: Error message/);
    });

    it("should log error messages with context", () => {
      const context = { errorCode: 500, stack: "Error stack trace" };
      Logger.error("Server error", context);

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      const logCall = consoleSpy.error.mock.calls[0][0];
      expect(logCall).toMatch(/ERROR: Server error/);
      expect(logCall).toContain(JSON.stringify(context));
    });
  });

  describe("debug", () => {
    it("should not log debug messages by default", () => {
      Logger.debug("Debug message");

      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it("should log debug messages when DEBUG=true", () => {
      process.env["DEBUG"] = "true";
      Logger.debug("Debug message");

      expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
      const logCall = consoleSpy.debug.mock.calls[0][0];
      expect(logCall).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] DEBUG: Debug message/);
    });

    it("should log debug messages when NODE_ENV=development", () => {
      process.env["NODE_ENV"] = "development";
      Logger.debug("Debug message");

      expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
      const logCall = consoleSpy.debug.mock.calls[0][0];
      expect(logCall).toMatch(/DEBUG: Debug message/);
    });

    it("should log debug messages with context in debug mode", () => {
      process.env["DEBUG"] = "true";
      const context = { requestId: "abc123" };
      Logger.debug("Request processed", context);

      expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
      const logCall = consoleSpy.debug.mock.calls[0][0];
      expect(logCall).toMatch(/DEBUG: Request processed/);
      expect(logCall).toContain(JSON.stringify(context));
    });
  });

  describe("formatMessage", () => {
    it("should format messages without context", () => {
      Logger.info("Simple message");

      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Simple message$/);
    });

    it("should format messages with context", () => {
      const context = { key: "value" };
      Logger.info("Message with context", context);

      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toMatch(/INFO: Message with context {"key":"value"}$/);
    });

    it("should handle complex context objects", () => {
      const context = {
        nested: { object: true },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
      };
      Logger.info("Complex context", context);

      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toContain("INFO: Complex context");
      expect(logCall).toContain(JSON.stringify(context));
    });
  });
});

/**
 * Unit tests for McpRestfulApiServer class
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpRestfulApiServer, ServerError } from "../../src/index";
import { loadConfig } from "../../src/config";
import { BasicAuthHandler, TokenAuthHandler, NoAuthHandler } from "../../src/auth";
import { ApiClient } from "../../src/client";
import { GetToolHandler, PostToolHandler, PutToolHandler, PatchToolHandler, DeleteToolHandler } from "../../src/tools";
import { ApiResourceProvider } from "../../src/resources";

// Mock all dependencies
jest.mock("@modelcontextprotocol/sdk/server/index.js");
jest.mock("@modelcontextprotocol/sdk/server/stdio.js");
jest.mock("../../src/config");
jest.mock("../../src/auth");
jest.mock("../../src/client");
jest.mock("../../src/tools");
jest.mock("../../src/resources");

describe("McpRestfulApiServer", () => {
  let server: McpRestfulApiServer;
  let mockServer: jest.Mocked<Server>;
  let mockTransport: jest.Mocked<StdioServerTransport>;
  let mockApiClient: jest.Mocked<ApiClient>;
  let mockResourceProvider: jest.Mocked<ApiResourceProvider>;

  beforeEach(() => {
    // Mock console methods
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "debug").mockImplementation(() => {});

    // Mock Server
    mockServer = {
      setRequestHandler: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
    } as any;
    (Server as jest.MockedClass<typeof Server>).mockImplementation(() => mockServer);

    // Mock StdioServerTransport
    mockTransport = {
      onclose: jest.fn(),
      onerror: jest.fn(),
    } as any;
    (StdioServerTransport as jest.MockedClass<typeof StdioServerTransport>).mockImplementation(() => mockTransport);

    // Mock ApiClient
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      getBaseUrl: jest.fn().mockReturnValue("https://api.example.com"),
      getAuthType: jest.fn().mockReturnValue("none"),
    } as any;
    (ApiClient as jest.MockedClass<typeof ApiClient>).mockImplementation(() => mockApiClient);

    // Mock ResourceProvider
    mockResourceProvider = {
      validateBaseUrlAccessibility: jest.fn().mockResolvedValue(true),
      listResources: jest.fn().mockResolvedValue({ resources: [] }),
      readResource: jest.fn().mockResolvedValue({ contents: [] }),
    } as any;
    (ApiResourceProvider as jest.MockedClass<typeof ApiResourceProvider>).mockImplementation(() => mockResourceProvider);

    // Mock tool handlers
    const mockToolHandler = {
      getToolName: jest.fn(),
      getToolDefinition: jest.fn(),
      handleCall: jest.fn(),
    };
    (GetToolHandler as jest.MockedClass<typeof GetToolHandler>).mockImplementation(
      () =>
        ({
          ...mockToolHandler,
          getToolName: jest.fn().mockReturnValue("api_get"),
          getToolDefinition: jest.fn().mockReturnValue({ name: "api_get", description: "GET tool" }),
        }) as any,
    );
    (PostToolHandler as jest.MockedClass<typeof PostToolHandler>).mockImplementation(
      () =>
        ({
          ...mockToolHandler,
          getToolName: jest.fn().mockReturnValue("api_post"),
          getToolDefinition: jest.fn().mockReturnValue({ name: "api_post", description: "POST tool" }),
        }) as any,
    );
    (PutToolHandler as jest.MockedClass<typeof PutToolHandler>).mockImplementation(
      () =>
        ({
          ...mockToolHandler,
          getToolName: jest.fn().mockReturnValue("api_put"),
          getToolDefinition: jest.fn().mockReturnValue({ name: "api_put", description: "PUT tool" }),
        }) as any,
    );
    (PatchToolHandler as jest.MockedClass<typeof PatchToolHandler>).mockImplementation(
      () =>
        ({
          ...mockToolHandler,
          getToolName: jest.fn().mockReturnValue("api_patch"),
          getToolDefinition: jest.fn().mockReturnValue({ name: "api_patch", description: "PATCH tool" }),
        }) as any,
    );
    (DeleteToolHandler as jest.MockedClass<typeof DeleteToolHandler>).mockImplementation(
      () =>
        ({
          ...mockToolHandler,
          getToolName: jest.fn().mockReturnValue("api_delete"),
          getToolDefinition: jest.fn().mockReturnValue({ name: "api_delete", description: "DELETE tool" }),
        }) as any,
    );

    // Mock auth handlers
    const mockAuthHandler = {
      applyAuth: jest.fn(),
      getAuthType: jest.fn(),
      validate: jest.fn(),
    };
    (BasicAuthHandler as jest.MockedClass<typeof BasicAuthHandler>).mockImplementation(
      () =>
        ({
          ...mockAuthHandler,
          getAuthType: jest.fn().mockReturnValue("basic"),
        }) as any,
    );
    (TokenAuthHandler as jest.MockedClass<typeof TokenAuthHandler>).mockImplementation(
      () =>
        ({
          ...mockAuthHandler,
          getAuthType: jest.fn().mockReturnValue("token"),
        }) as any,
    );
    (NoAuthHandler as jest.MockedClass<typeof NoAuthHandler>).mockImplementation(
      () =>
        ({
          ...mockAuthHandler,
          getAuthType: jest.fn().mockReturnValue("none"),
        }) as any,
    );

    server = new McpRestfulApiServer();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create server instance with correct configuration", () => {
      expect(Server).toHaveBeenCalledWith(
        {
          name: "mcp-restful-api-server",
          version: "1.0.0",
        },
        {
          capabilities: {
            tools: {},
            resources: {},
          },
        },
      );
    });
  });

  describe("initialize", () => {
    it("should initialize successfully with valid configuration", async () => {
      const mockConfig = {
        baseUrl: "https://api.example.com",
        authType: "none" as const,
      };
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockReturnValue(mockConfig);

      await server.initialize();

      expect(loadConfig).toHaveBeenCalled();
      expect(NoAuthHandler).toHaveBeenCalled();
      expect(ApiClient).toHaveBeenCalledWith(mockConfig, expect.any(Object));
      expect(ApiResourceProvider).toHaveBeenCalledWith(mockApiClient, mockConfig);
      expect(mockResourceProvider.validateBaseUrlAccessibility).toHaveBeenCalled();
    });

    it("should initialize with basic authentication", async () => {
      const mockConfig = {
        baseUrl: "https://api.example.com",
        authType: "basic" as const,
        basicAuth: {
          username: "user",
          password: "pass",
        },
      };
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockReturnValue(mockConfig);

      await server.initialize();

      expect(BasicAuthHandler).toHaveBeenCalledWith("user", "pass");
    });

    it("should initialize with token authentication", async () => {
      const mockConfig = {
        baseUrl: "https://api.example.com",
        authType: "token" as const,
        authToken: "test-token",
      };
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockReturnValue(mockConfig);

      await server.initialize();

      expect(TokenAuthHandler).toHaveBeenCalledWith("test-token");
    });

    it("should handle authentication validation errors", async () => {
      const mockConfig = {
        baseUrl: "https://api.example.com",
        authType: "basic" as const,
        basicAuth: {
          username: "user",
          password: "pass",
        },
      };
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockReturnValue(mockConfig);

      const mockAuthHandler = {
        getAuthType: jest.fn().mockReturnValue("basic"),
        validate: jest.fn().mockImplementation(() => {
          throw new Error("Invalid credentials");
        }),
      };
      (BasicAuthHandler as jest.MockedClass<typeof BasicAuthHandler>).mockImplementation(() => mockAuthHandler as any);

      await expect(server.initialize()).rejects.toThrow("Invalid credentials");
    });

    it("should register all tool handlers", async () => {
      const mockConfig = {
        baseUrl: "https://api.example.com",
        authType: "none" as const,
      };
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockReturnValue(mockConfig);

      await server.initialize();

      expect(GetToolHandler).toHaveBeenCalledWith(mockApiClient);
      expect(PostToolHandler).toHaveBeenCalledWith(mockApiClient);
      expect(PutToolHandler).toHaveBeenCalledWith(mockApiClient);
      expect(PatchToolHandler).toHaveBeenCalledWith(mockApiClient);
      expect(DeleteToolHandler).toHaveBeenCalledWith(mockApiClient);
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(4); // 2 for tools, 2 for resources
    });

    it("should handle API accessibility validation failure gracefully", async () => {
      const mockConfig = {
        baseUrl: "https://api.example.com",
        authType: "none" as const,
      };
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockReturnValue(mockConfig);
      mockResourceProvider.validateBaseUrlAccessibility.mockResolvedValue(false);

      await server.initialize();

      expect(mockResourceProvider.validateBaseUrlAccessibility).toHaveBeenCalled();
      // Should not throw, just log warning
    });

    it("should handle API accessibility validation errors gracefully", async () => {
      const mockConfig = {
        baseUrl: "https://api.example.com",
        authType: "none" as const,
      };
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockReturnValue(mockConfig);
      mockResourceProvider.validateBaseUrlAccessibility.mockRejectedValue(new Error("Network error"));

      await server.initialize();

      expect(mockResourceProvider.validateBaseUrlAccessibility).toHaveBeenCalled();
      // Should not throw, just log warning
    });
  });

  describe("start", () => {
    beforeEach(async () => {
      const mockConfig = {
        baseUrl: "https://api.example.com",
        authType: "none" as const,
      };
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockReturnValue(mockConfig);
      await server.initialize();
    });

    it("should start server with stdio transport", async () => {
      await server.start();

      expect(StdioServerTransport).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
    });

    it("should set up transport error handlers", async () => {
      await server.start();

      expect(mockTransport.onclose).toBeDefined();
      expect(mockTransport.onerror).toBeDefined();
    });

    it("should handle server connection errors", async () => {
      mockServer.connect.mockRejectedValue(new Error("Connection failed"));

      await expect(server.start()).rejects.toThrow(ServerError);
      await expect(server.start()).rejects.toThrow("Failed to start server");
    });
  });

  describe("shutdown", () => {
    beforeEach(async () => {
      const mockConfig = {
        baseUrl: "https://api.example.com",
        authType: "none" as const,
      };
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockReturnValue(mockConfig);
      await server.initialize();
    });

    it("should shutdown server gracefully", async () => {
      await server.shutdown();

      expect(mockServer.close).toHaveBeenCalled();
    });

    it("should handle shutdown errors", async () => {
      mockServer.close.mockRejectedValue(new Error("Shutdown failed"));

      await expect(server.shutdown()).rejects.toThrow("Shutdown failed");
    });
  });

  describe("getServer", () => {
    it("should return server instance", () => {
      const serverInstance = server.getServer();
      expect(serverInstance).toBe(mockServer);
    });
  });

  describe("request handlers", () => {
    beforeEach(async () => {
      const mockConfig = {
        baseUrl: "https://api.example.com",
        authType: "none" as const,
      };
      (loadConfig as jest.MockedFunction<typeof loadConfig>).mockReturnValue(mockConfig);
      await server.initialize();
    });

    it("should register request handlers", () => {
      // Verify that setRequestHandler was called for tools and resources
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(4);
    });
  });
});

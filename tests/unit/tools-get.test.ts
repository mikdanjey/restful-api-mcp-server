/**
 * Unit tests for GET operation tool handler
 */

import { GetToolHandler } from "../../src/tools";
import { ApiClient, ApiResponse } from "../../src/client";
import { CallToolRequest, TextContent } from "@modelcontextprotocol/sdk/types.js";

// Mock the ApiClient
jest.mock("../../src/client");

describe("GetToolHandler", () => {
  let mockApiClient: jest.Mocked<ApiClient>;
  let getHandler: GetToolHandler;

  beforeEach(() => {
    mockApiClient = {
      get: jest.fn(),
      getBaseUrl: jest.fn().mockReturnValue("https://api.example.com"),
      getAuthType: jest.fn().mockReturnValue("none"),
    } as any;

    getHandler = new GetToolHandler(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getToolDefinition", () => {
    it("should return correct tool definition", () => {
      const definition = getHandler.getToolDefinition();

      expect(definition.name).toBe("api_get");
      expect(definition.description).toContain("GET request");
      expect(definition.inputSchema.type).toBe("object");
      expect(definition.inputSchema.properties).toHaveProperty("path");
      expect(definition.inputSchema.properties).toHaveProperty("queryParams");
      expect(definition.inputSchema.properties).toHaveProperty("headers");
      expect(definition.inputSchema.required).toEqual(["path"]);
    });
  });

  describe("getToolName", () => {
    it("should return correct tool name", () => {
      expect(getHandler.getToolName()).toBe("api_get");
    });
  });

  describe("handleCall", () => {
    const createRequest = (args: any): CallToolRequest => ({
      method: "tools/call",
      params: {
        name: "api_get",
        arguments: args,
      },
    });

    const parseResponse = (result: any) => {
      return JSON.parse((result.content[0] as TextContent).text);
    };

    it("should handle successful GET request with path only", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { id: 1, name: "Test" },
        headers: { "content-type": "application/json" },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const request = createRequest({ path: "/users/1" });
      const result = await getHandler.handleCall(request);

      expect(mockApiClient.get).toHaveBeenCalledWith({
        path: "/users/1",
        queryParams: undefined,
        headers: undefined,
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe("text");

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
      expect(responseData.status).toBe(200);
      expect(responseData.data).toEqual({ id: 1, name: "Test" });
    });

    it("should handle GET request with query parameters", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: [{ id: 1 }, { id: 2 }],
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const request = createRequest({
        path: "/users",
        queryParams: { page: "1", limit: "10" },
      });

      const result = await getHandler.handleCall(request);

      expect(mockApiClient.get).toHaveBeenCalledWith({
        path: "/users",
        queryParams: { page: "1", limit: "10" },
        headers: undefined,
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it("should handle GET request with custom headers", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { message: "success" },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const request = createRequest({
        path: "/api/data",
        headers: { "X-Custom-Header": "custom-value" },
      });

      const result = await getHandler.handleCall(request);

      expect(mockApiClient.get).toHaveBeenCalledWith({
        path: "/api/data",
        queryParams: undefined,
        headers: { "X-Custom-Header": "custom-value" },
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
    });

    it("should handle GET request with both query params and headers", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { results: [] },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const request = createRequest({
        path: "/search",
        queryParams: { q: "test", sort: "name" },
        headers: { Accept: "application/json" },
      });

      const result = await getHandler.handleCall(request);

      expect(mockApiClient.get).toHaveBeenCalledWith({
        path: "/search",
        queryParams: { q: "test", sort: "name" },
        headers: { Accept: "application/json" },
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
    });

    it("should handle API error response", async () => {
      const mockResponse: ApiResponse = {
        success: false,
        status: 404,
        error: "Not Found",
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const request = createRequest({ path: "/nonexistent" });
      const result = await getHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Not Found");
      expect(responseData.details.status).toBe(404);
    });

    it("should handle missing path parameter", async () => {
      const request = createRequest({});
      const result = await getHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Required");
    });

    it("should handle empty path parameter", async () => {
      const request = createRequest({ path: "" });
      const result = await getHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("cannot be empty");
    });

    it("should handle invalid path parameter type", async () => {
      const request = createRequest({ path: 123 });
      const result = await getHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid arguments");
    });

    it("should handle unexpected errors", async () => {
      mockApiClient.get.mockRejectedValue(new Error("Network error"));

      const request = createRequest({ path: "/users" });
      const result = await getHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Network error");
    });

    it("should validate query parameters are strings", async () => {
      const request = createRequest({
        path: "/test",
        queryParams: { valid: "string", invalid: 123 },
      });

      const result = await getHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid arguments");
    });

    it("should validate headers are strings", async () => {
      const request = createRequest({
        path: "/test",
        headers: { valid: "string", invalid: 123 },
      });

      const result = await getHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid arguments");
    });
  });
});

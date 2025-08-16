/**
 * Unit tests for PATCH operation tool handler
 */

import { PatchToolHandler } from "../../src/tools";
import { ApiClient, ApiResponse } from "../../src/client";
import { CallToolRequest, TextContent } from "@modelcontextprotocol/sdk/types.js";

// Mock the ApiClient
jest.mock("../../src/client");

describe("PatchToolHandler", () => {
  let mockApiClient: jest.Mocked<ApiClient>;
  let patchHandler: PatchToolHandler;

  beforeEach(() => {
    mockApiClient = {
      patch: jest.fn(),
      getBaseUrl: jest.fn().mockReturnValue("https://api.example.com"),
      getAuthType: jest.fn().mockReturnValue("none"),
    } as any;

    patchHandler = new PatchToolHandler(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getToolDefinition", () => {
    it("should return correct tool definition", () => {
      const definition = patchHandler.getToolDefinition();

      expect(definition.name).toBe("api_patch");
      expect(definition.description).toContain("PATCH request");
      expect(definition.description).toContain("JSON body");
      expect(definition.inputSchema.type).toBe("object");
      expect(definition.inputSchema.properties).toHaveProperty("path");
      expect(definition.inputSchema.properties).toHaveProperty("body");
      expect(definition.inputSchema.properties).toHaveProperty("headers");
      expect(definition.inputSchema.required).toEqual(["path"]);
    });
  });

  describe("getToolName", () => {
    it("should return correct tool name", () => {
      expect(patchHandler.getToolName()).toBe("api_patch");
    });
  });

  describe("handleCall", () => {
    const createRequest = (args: any): CallToolRequest => ({
      method: "tools/call",
      params: {
        name: "api_patch",
        arguments: args,
      },
    });

    const parseResponse = (result: any) => {
      return JSON.parse((result.content[0] as TextContent).text);
    };

    it("should handle successful PATCH request with path only", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { id: 1, name: "Patched" },
        headers: { "content-type": "application/json" },
      };

      mockApiClient.patch.mockResolvedValue(mockResponse);

      const request = createRequest({ path: "/users/1" });
      const result = await patchHandler.handleCall(request);

      expect(mockApiClient.patch).toHaveBeenCalledWith({
        path: "/users/1",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe("text");

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
      expect(responseData.status).toBe(200);
      expect(responseData.data).toEqual({ id: 1, name: "Patched" });
    });

    it("should handle PATCH request with JSON body", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { id: 2, name: "Jane Doe", email: "jane.doe@example.com" },
      };

      mockApiClient.patch.mockResolvedValue(mockResponse);

      const requestBody = { email: "jane.doe@example.com" };
      const request = createRequest({
        path: "/users/2",
        body: requestBody,
      });

      const result = await patchHandler.handleCall(request);

      expect(mockApiClient.patch).toHaveBeenCalledWith({
        path: "/users/2",
        body: requestBody,
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
      expect(responseData.status).toBe(200);
      expect(responseData.data.email).toBe("jane.doe@example.com");
    });

    it("should handle PATCH request with custom headers", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { message: "patched" },
      };

      mockApiClient.patch.mockResolvedValue(mockResponse);

      const request = createRequest({
        path: "/api/data/1",
        headers: { "X-Custom-Header": "custom-value" },
      });

      const result = await patchHandler.handleCall(request);

      expect(mockApiClient.patch).toHaveBeenCalledWith({
        path: "/api/data/1",
        headers: { "X-Custom-Header": "custom-value" },
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
    });

    it("should handle PATCH request with both body and headers", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { id: 3, status: "patched" },
      };

      mockApiClient.patch.mockResolvedValue(mockResponse);

      const requestBody = { status: "active" };
      const request = createRequest({
        path: "/posts/3",
        body: requestBody,
        headers: { "Content-Type": "application/json" },
      });

      const result = await patchHandler.handleCall(request);

      expect(mockApiClient.patch).toHaveBeenCalledWith({
        path: "/posts/3",
        body: requestBody,
        headers: { "Content-Type": "application/json" },
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
    });

    it("should handle API error response", async () => {
      const mockResponse: ApiResponse = {
        success: false,
        status: 422,
        error: "Unprocessable Entity",
      };

      mockApiClient.patch.mockResolvedValue(mockResponse);

      const request = createRequest({
        path: "/users/999",
        body: { invalid: "field" },
      });
      const result = await patchHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Unprocessable Entity");
      expect(responseData.details.status).toBe(422);
    });

    it("should handle missing path parameter", async () => {
      const request = createRequest({});
      const result = await patchHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Required");
    });

    it("should handle empty path parameter", async () => {
      const request = createRequest({ path: "" });
      const result = await patchHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("cannot be empty");
    });

    it("should handle invalid path parameter type", async () => {
      const request = createRequest({ path: 123 });
      const result = await patchHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid arguments");
    });

    it("should handle unexpected errors", async () => {
      mockApiClient.patch.mockRejectedValue(new Error("Network error"));

      const request = createRequest({ path: "/users/1" });
      const result = await patchHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Network error");
    });

    it("should handle partial update with PATCH semantics", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { id: 4, name: "John Doe", email: "john.doe@example.com", status: "active" },
      };

      mockApiClient.patch.mockResolvedValue(mockResponse);

      // PATCH typically sends only the fields to update
      const partialUpdate = {
        status: "active",
      };

      const request = createRequest({
        path: "/users/4",
        body: partialUpdate,
      });

      const result = await patchHandler.handleCall(request);

      expect(mockApiClient.patch).toHaveBeenCalledWith({
        path: "/users/4",
        body: partialUpdate,
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
      expect(responseData.data.status).toBe("active");
    });

    it("should handle null body", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { message: "patched" },
      };

      mockApiClient.patch.mockResolvedValue(mockResponse);

      const request = createRequest({
        path: "/users/1",
        body: null,
      });

      const result = await patchHandler.handleCall(request);

      expect(mockApiClient.patch).toHaveBeenCalledTimes(1);

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
    });

    it("should validate headers are strings", async () => {
      const request = createRequest({
        path: "/test",
        headers: { valid: "string", invalid: 123 },
      });

      const result = await patchHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid arguments");
    });
  });
});

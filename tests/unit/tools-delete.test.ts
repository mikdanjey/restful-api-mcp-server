/**
 * Unit tests for DELETE operation tool handler
 */

import { DeleteToolHandler } from "../../src/tools";
import { ApiClient, ApiResponse } from "../../src/client";
import { CallToolRequest, TextContent } from "@modelcontextprotocol/sdk/types.js";

// Mock the ApiClient
jest.mock("../../src/client");

describe("DeleteToolHandler", () => {
  let mockApiClient: jest.Mocked<ApiClient>;
  let deleteHandler: DeleteToolHandler;

  beforeEach(() => {
    mockApiClient = {
      delete: jest.fn(),
      getBaseUrl: jest.fn().mockReturnValue("https://api.example.com"),
      getAuthType: jest.fn().mockReturnValue("none"),
    } as any;

    deleteHandler = new DeleteToolHandler(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getToolDefinition", () => {
    it("should return correct tool definition", () => {
      const definition = deleteHandler.getToolDefinition();

      expect(definition.name).toBe("api_delete");
      expect(definition.description).toContain("DELETE request");
      expect(definition.inputSchema.type).toBe("object");
      expect(definition.inputSchema.properties).toHaveProperty("path");
      expect(definition.inputSchema.properties).toHaveProperty("headers");
      expect(definition.inputSchema.properties).not.toHaveProperty("body");
      expect(definition.inputSchema.properties).not.toHaveProperty("queryParams");
      expect(definition.inputSchema.required).toEqual(["path"]);
    });
  });

  describe("getToolName", () => {
    it("should return correct tool name", () => {
      expect(deleteHandler.getToolName()).toBe("api_delete");
    });
  });

  describe("handleCall", () => {
    const createRequest = (args: any): CallToolRequest => ({
      method: "tools/call",
      params: {
        name: "api_delete",
        arguments: args,
      },
    });

    const parseResponse = (result: any) => {
      return JSON.parse((result.content[0] as TextContent).text);
    };

    it("should handle successful DELETE request with path only", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 204,
        headers: { "content-type": "application/json" },
      };

      mockApiClient.delete.mockResolvedValue(mockResponse);

      const request = createRequest({ path: "/users/1" });
      const result = await deleteHandler.handleCall(request);

      expect(mockApiClient.delete).toHaveBeenCalledWith({
        path: "/users/1",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe("text");

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
      expect(responseData.status).toBe(204);
    });

    it("should handle DELETE request with response data", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { message: "User deleted successfully", id: 1 },
      };

      mockApiClient.delete.mockResolvedValue(mockResponse);

      const request = createRequest({ path: "/users/1" });
      const result = await deleteHandler.handleCall(request);

      expect(mockApiClient.delete).toHaveBeenCalledWith({
        path: "/users/1",
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
      expect(responseData.status).toBe(200);
      expect(responseData.data.message).toBe("User deleted successfully");
    });

    it("should handle DELETE request with custom headers", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 204,
      };

      mockApiClient.delete.mockResolvedValue(mockResponse);

      const request = createRequest({
        path: "/api/data/1",
        headers: { "X-Custom-Header": "custom-value" },
      });

      const result = await deleteHandler.handleCall(request);

      expect(mockApiClient.delete).toHaveBeenCalledWith({
        path: "/api/data/1",
        headers: { "X-Custom-Header": "custom-value" },
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
    });

    it("should handle DELETE request with authorization headers", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 204,
      };

      mockApiClient.delete.mockResolvedValue(mockResponse);

      const request = createRequest({
        path: "/protected/resource/1",
        headers: { Authorization: "Bearer token123" },
      });

      const result = await deleteHandler.handleCall(request);

      expect(mockApiClient.delete).toHaveBeenCalledWith({
        path: "/protected/resource/1",
        headers: { Authorization: "Bearer token123" },
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

      mockApiClient.delete.mockResolvedValue(mockResponse);

      const request = createRequest({ path: "/users/999" });
      const result = await deleteHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Not Found");
      expect(responseData.details.status).toBe(404);
    });

    it("should handle forbidden delete operation", async () => {
      const mockResponse: ApiResponse = {
        success: false,
        status: 403,
        error: "Forbidden",
      };

      mockApiClient.delete.mockResolvedValue(mockResponse);

      const request = createRequest({ path: "/admin/users/1" });
      const result = await deleteHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Forbidden");
      expect(responseData.details.status).toBe(403);
    });

    it("should handle missing path parameter", async () => {
      const request = createRequest({});
      const result = await deleteHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Required");
    });

    it("should handle empty path parameter", async () => {
      const request = createRequest({ path: "" });
      const result = await deleteHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("cannot be empty");
    });

    it("should handle invalid path parameter type", async () => {
      const request = createRequest({ path: 123 });
      const result = await deleteHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid arguments");
    });

    it("should handle unexpected errors", async () => {
      mockApiClient.delete.mockRejectedValue(new Error("Network error"));

      const request = createRequest({ path: "/users/1" });
      const result = await deleteHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Network error");
    });

    it("should handle bulk delete operations", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { deleted: 5, message: "Bulk delete completed" },
      };

      mockApiClient.delete.mockResolvedValue(mockResponse);

      const request = createRequest({
        path: "/users/bulk",
        headers: { "Content-Type": "application/json" },
      });

      const result = await deleteHandler.handleCall(request);

      expect(mockApiClient.delete).toHaveBeenCalledWith({
        path: "/users/bulk",
        headers: { "Content-Type": "application/json" },
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
      expect(responseData.data.deleted).toBe(5);
    });

    it("should validate headers are strings", async () => {
      const request = createRequest({
        path: "/test",
        headers: { valid: "string", invalid: 123 },
      });

      const result = await deleteHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid arguments");
    });

    it("should not accept body parameter", async () => {
      const request = createRequest({
        path: "/users/1",
        body: { shouldNotBeAccepted: true },
      });

      const result = await deleteHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid arguments");
    });

    it("should not accept queryParams parameter", async () => {
      const request = createRequest({
        path: "/users/1",
        queryParams: { shouldNotBeAccepted: "true" },
      });

      const result = await deleteHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid arguments");
    });
  });
});

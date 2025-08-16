/**
 * Unit tests for PUT operation tool handler
 */

import { PutToolHandler } from "../../src/tools";
import { ApiClient, ApiResponse } from "../../src/client";
import { CallToolRequest, TextContent } from "@modelcontextprotocol/sdk/types.js";

// Mock the ApiClient
jest.mock("../../src/client");

describe("PutToolHandler", () => {
  let mockApiClient: jest.Mocked<ApiClient>;
  let putHandler: PutToolHandler;

  beforeEach(() => {
    mockApiClient = {
      put: jest.fn(),
      getBaseUrl: jest.fn().mockReturnValue("https://api.example.com"),
      getAuthType: jest.fn().mockReturnValue("none"),
    } as any;

    putHandler = new PutToolHandler(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getToolDefinition", () => {
    it("should return correct tool definition", () => {
      const definition = putHandler.getToolDefinition();

      expect(definition.name).toBe("api_put");
      expect(definition.description).toContain("PUT request");
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
      expect(putHandler.getToolName()).toBe("api_put");
    });
  });

  describe("handleCall", () => {
    const createRequest = (args: any): CallToolRequest => ({
      method: "tools/call",
      params: {
        name: "api_put",
        arguments: args,
      },
    });

    const parseResponse = (result: any) => {
      return JSON.parse((result.content[0] as TextContent).text);
    };

    it("should handle successful PUT request with path only", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { id: 1, name: "Updated" },
        headers: { "content-type": "application/json" },
      };

      mockApiClient.put.mockResolvedValue(mockResponse);

      const request = createRequest({ path: "/users/1" });
      const result = await putHandler.handleCall(request);

      expect(mockApiClient.put).toHaveBeenCalledWith({
        path: "/users/1",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe("text");

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
      expect(responseData.status).toBe(200);
      expect(responseData.data).toEqual({ id: 1, name: "Updated" });
    });

    it("should handle PUT request with JSON body", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { id: 2, name: "Jane Doe", email: "jane@example.com" },
      };

      mockApiClient.put.mockResolvedValue(mockResponse);

      const requestBody = { name: "Jane Doe", email: "jane@example.com" };
      const request = createRequest({
        path: "/users/2",
        body: requestBody,
      });

      const result = await putHandler.handleCall(request);

      expect(mockApiClient.put).toHaveBeenCalledWith({
        path: "/users/2",
        body: requestBody,
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
      expect(responseData.status).toBe(200);
      expect(responseData.data.name).toBe("Jane Doe");
    });

    it("should handle PUT request with custom headers", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { message: "updated" },
      };

      mockApiClient.put.mockResolvedValue(mockResponse);

      const request = createRequest({
        path: "/api/data/1",
        headers: { "X-Custom-Header": "custom-value" },
      });

      const result = await putHandler.handleCall(request);

      expect(mockApiClient.put).toHaveBeenCalledWith({
        path: "/api/data/1",
        headers: { "X-Custom-Header": "custom-value" },
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
    });

    it("should handle PUT request with both body and headers", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { id: 3, status: "updated" },
      };

      mockApiClient.put.mockResolvedValue(mockResponse);

      const requestBody = { title: "Updated Post", content: "Updated content" };
      const request = createRequest({
        path: "/posts/3",
        body: requestBody,
        headers: { "Content-Type": "application/json" },
      });

      const result = await putHandler.handleCall(request);

      expect(mockApiClient.put).toHaveBeenCalledWith({
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
        status: 404,
        error: "Not Found",
      };

      mockApiClient.put.mockResolvedValue(mockResponse);

      const request = createRequest({
        path: "/users/999",
        body: { name: "Updated Name" },
      });
      const result = await putHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Not Found");
      expect(responseData.details.status).toBe(404);
    });

    it("should handle missing path parameter", async () => {
      const request = createRequest({});
      const result = await putHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Required");
    });

    it("should handle empty path parameter", async () => {
      const request = createRequest({ path: "" });
      const result = await putHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("cannot be empty");
    });

    it("should handle invalid path parameter type", async () => {
      const request = createRequest({ path: 123 });
      const result = await putHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid arguments");
    });

    it("should handle unexpected errors", async () => {
      mockApiClient.put.mockRejectedValue(new Error("Network error"));

      const request = createRequest({ path: "/users/1" });
      const result = await putHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Network error");
    });

    it("should handle complex nested body objects", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { id: 4, updated: true },
      };

      mockApiClient.put.mockResolvedValue(mockResponse);

      const complexBody = {
        user: {
          name: "John Smith",
          profile: {
            age: 35,
            preferences: ["music", "sports"],
          },
        },
        metadata: {
          lastModified: "2023-01-01T00:00:00Z",
        },
      };

      const request = createRequest({
        path: "/complex/4",
        body: complexBody,
      });

      const result = await putHandler.handleCall(request);

      expect(mockApiClient.put).toHaveBeenCalledWith({
        path: "/complex/4",
        body: complexBody,
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
    });

    it("should handle null body", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 200,
        data: { message: "updated" },
      };

      mockApiClient.put.mockResolvedValue(mockResponse);

      const request = createRequest({
        path: "/users/1",
        body: null,
      });

      const result = await putHandler.handleCall(request);

      expect(mockApiClient.put).toHaveBeenCalledTimes(1);

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
    });

    it("should validate headers are strings", async () => {
      const request = createRequest({
        path: "/test",
        headers: { valid: "string", invalid: 123 },
      });

      const result = await putHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid arguments");
    });
  });
});

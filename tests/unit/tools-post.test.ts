/**
 * Unit tests for POST operation tool handler
 */

import { PostToolHandler } from "../../src/tools";
import { ApiClient, ApiResponse } from "../../src/client";
import { CallToolRequest, TextContent } from "@modelcontextprotocol/sdk/types.js";

// Mock the ApiClient
jest.mock("../../src/client");

describe("PostToolHandler", () => {
  let mockApiClient: jest.Mocked<ApiClient>;
  let postHandler: PostToolHandler;

  beforeEach(() => {
    mockApiClient = {
      post: jest.fn(),
      getBaseUrl: jest.fn().mockReturnValue("https://api.example.com"),
      getAuthType: jest.fn().mockReturnValue("none"),
    } as any;

    postHandler = new PostToolHandler(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getToolDefinition", () => {
    it("should return correct tool definition", () => {
      const definition = postHandler.getToolDefinition();

      expect(definition.name).toBe("api_post");
      expect(definition.description).toContain("POST request");
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
      expect(postHandler.getToolName()).toBe("api_post");
    });
  });

  describe("handleCall", () => {
    const createRequest = (args: any): CallToolRequest => ({
      method: "tools/call",
      params: {
        name: "api_post",
        arguments: args,
      },
    });

    const parseResponse = (result: any) => {
      return JSON.parse((result.content[0] as TextContent).text);
    };

    it("should handle successful POST request with path only", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 201,
        data: { id: 1, name: "Created" },
        headers: { "content-type": "application/json" },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const request = createRequest({ path: "/users" });
      const result = await postHandler.handleCall(request);

      expect(mockApiClient.post).toHaveBeenCalledWith({
        path: "/users",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe("text");

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
      expect(responseData.status).toBe(201);
      expect(responseData.data).toEqual({ id: 1, name: "Created" });
    });

    it("should handle POST request with JSON body", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 201,
        data: { id: 2, name: "John Doe", email: "john@example.com" },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const requestBody = { name: "John Doe", email: "john@example.com" };
      const request = createRequest({
        path: "/users",
        body: requestBody,
      });

      const result = await postHandler.handleCall(request);

      expect(mockApiClient.post).toHaveBeenCalledWith({
        path: "/users",
        body: requestBody,
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
      expect(responseData.status).toBe(201);
      expect(responseData.data.name).toBe("John Doe");
    });

    it("should handle POST request with custom headers", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 201,
        data: { message: "created" },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const request = createRequest({
        path: "/api/data",
        headers: { "X-Custom-Header": "custom-value" },
      });

      const result = await postHandler.handleCall(request);

      expect(mockApiClient.post).toHaveBeenCalledWith({
        path: "/api/data",
        headers: { "X-Custom-Header": "custom-value" },
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
    });

    it("should handle POST request with both body and headers", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 201,
        data: { id: 3, status: "created" },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const requestBody = { title: "New Post", content: "Post content" };
      const request = createRequest({
        path: "/posts",
        body: requestBody,
        headers: { "Content-Type": "application/json" },
      });

      const result = await postHandler.handleCall(request);

      expect(mockApiClient.post).toHaveBeenCalledWith({
        path: "/posts",
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
        status: 400,
        error: "Bad Request",
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const request = createRequest({
        path: "/users",
        body: { invalid: "data" },
      });
      const result = await postHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Bad Request");
      expect(responseData.details.status).toBe(400);
    });

    it("should handle missing path parameter", async () => {
      const request = createRequest({});
      const result = await postHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Required");
    });

    it("should handle empty path parameter", async () => {
      const request = createRequest({ path: "" });
      const result = await postHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("cannot be empty");
    });

    it("should handle invalid path parameter type", async () => {
      const request = createRequest({ path: 123 });
      const result = await postHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid arguments");
    });

    it("should handle unexpected errors", async () => {
      mockApiClient.post.mockRejectedValue(new Error("Network error"));

      const request = createRequest({ path: "/users" });
      const result = await postHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Network error");
    });

    it("should handle complex nested body objects", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 201,
        data: { id: 4, created: true },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const complexBody = {
        user: {
          name: "Jane Doe",
          profile: {
            age: 30,
            preferences: ["coding", "reading"],
          },
        },
        metadata: {
          source: "api",
          timestamp: "2023-01-01T00:00:00Z",
        },
      };

      const request = createRequest({
        path: "/complex",
        body: complexBody,
      });

      const result = await postHandler.handleCall(request);

      expect(mockApiClient.post).toHaveBeenCalledWith({
        path: "/complex",
        body: complexBody,
      });

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
    });

    it("should handle null body", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        status: 201,
        data: { message: "created" },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const request = createRequest({
        path: "/users",
        body: null,
      });

      const result = await postHandler.handleCall(request);

      // Check that the call was made successfully
      expect(mockApiClient.post).toHaveBeenCalledTimes(1);

      expect(result.content).toHaveLength(1);
      const responseData = parseResponse(result);
      expect(responseData.success).toBe(true);
    });

    it("should validate headers are strings", async () => {
      const request = createRequest({
        path: "/test",
        headers: { valid: "string", invalid: 123 },
      });

      const result = await postHandler.handleCall(request);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBe(true);

      const responseData = parseResponse(result);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid arguments");
    });
  });
});

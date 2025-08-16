/**
 * MCP tool handlers module for RESTful API operations and JSON Server
 * Implements CRUD operation tools for the MCP server
 */

import { z } from "zod";
import { CallToolRequest, CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { ApiClient, ApiResponse } from "../client";

/**
 * Base request schema for all API operations
 */
export const BaseRequestSchema = z
  .object({
    path: z.string().min(1, "Path is required and cannot be empty"),
    headers: z.record(z.string()).optional(),
  })
  .strict();

/**
 * Request schema for operations with query parameters
 */
export const QueryRequestSchema = BaseRequestSchema.extend({
  queryParams: z.record(z.string()).optional(),
}).strict();

/**
 * Request schema for operations with request body
 */
export const BodyRequestSchema = BaseRequestSchema.extend({
  body: z.any().optional(),
}).strict();

/**
 * Tool handler interface for MCP tools
 */
export interface ToolHandler {
  /**
   * Get the tool definition for MCP registration
   */
  getToolDefinition(): Tool;

  /**
   * Handle the tool call request
   */
  handleCall(request: CallToolRequest): Promise<CallToolResult>;

  /**
   * Get the tool name
   */
  getToolName(): string;
}

/**
 * Base tool handler abstract class with common functionality
 */
export abstract class BaseToolHandler implements ToolHandler {
  protected apiClient: ApiClient;
  protected toolName: string;

  constructor(apiClient: ApiClient, toolName: string) {
    this.apiClient = apiClient;
    this.toolName = toolName;
  }

  /**
   * Get the tool name
   */
  getToolName(): string {
    return this.toolName;
  }

  /**
   * Get the tool definition for MCP registration
   * Must be implemented by concrete tool handlers
   */
  abstract getToolDefinition(): Tool;

  /**
   * Handle the tool call request
   * Must be implemented by concrete tool handlers
   */
  abstract handleCall(request: CallToolRequest): Promise<CallToolResult>;

  /**
   * Validate request arguments using a Zod schema
   */
  protected validateArguments<T>(schema: z.ZodSchema<T>, args: unknown): T {
    try {
      return schema.parse(args);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors
          .map(err => {
            const path = err.path.length > 0 ? err.path.join(".") : "root";
            return `${path}: ${err.message}`;
          })
          .join(", ");

        throw new Error(`Invalid arguments: ${errorMessages}`);
      }
      throw new Error(`Argument validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Format successful API response for MCP
   */
  protected formatSuccessResponse<T>(response: ApiResponse<T>): CallToolResult {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: response.success,
              status: response.status,
              data: response.data,
              headers: response.headers,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  /**
   * Format error response for MCP
   */
  protected formatErrorResponse(error: string, details?: any): CallToolResult {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error,
              details,
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Handle API response and format for MCP
   */
  protected handleApiResponse<T>(response: ApiResponse<T>): CallToolResult {
    if (response.success) {
      return this.formatSuccessResponse(response);
    } else {
      return this.formatErrorResponse(response.error || "Unknown API error", {
        status: response.status,
      });
    }
  }

  /**
   * Handle unexpected errors and format for MCP
   */
  protected handleError(error: unknown): CallToolResult {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorDetails =
      error instanceof Error
        ? {
            name: error.name,
            stack: error.stack,
          }
        : undefined;

    return this.formatErrorResponse(errorMessage, errorDetails);
  }

  /**
   * Safely extract path from arguments
   */
  protected extractPath(args: unknown): string {
    if (typeof args === "object" && args !== null && "path" in args) {
      const path = (args as any).path;
      if (typeof path === "string" && path.length > 0) {
        return path;
      }
    }
    throw new Error("Path parameter is required and must be a non-empty string");
  }

  /**
   * Safely extract optional headers from arguments
   */
  protected extractHeaders(args: unknown): Record<string, string> | undefined {
    if (typeof args === "object" && args !== null && "headers" in args) {
      const headers = (args as any).headers;
      if (headers && typeof headers === "object") {
        // Validate that all header values are strings
        const validHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers)) {
          if (typeof value === "string") {
            validHeaders[key] = value;
          }
        }
        return Object.keys(validHeaders).length > 0 ? validHeaders : undefined;
      }
    }
    return undefined;
  }

  /**
   * Safely extract optional query parameters from arguments
   */
  protected extractQueryParams(args: unknown): Record<string, string> | undefined {
    if (typeof args === "object" && args !== null && "queryParams" in args) {
      const queryParams = (args as any).queryParams;
      if (queryParams && typeof queryParams === "object") {
        // Validate that all query parameter values are strings
        const validParams: Record<string, string> = {};
        for (const [key, value] of Object.entries(queryParams)) {
          if (typeof value === "string") {
            validParams[key] = value;
          }
        }
        return Object.keys(validParams).length > 0 ? validParams : undefined;
      }
    }
    return undefined;
  }

  /**
   * Safely extract optional body from arguments
   */
  protected extractBody(args: unknown): any {
    if (typeof args === "object" && args !== null && "body" in args) {
      return (args as any).body;
    }
    return undefined;
  }
}
/**
 * 
GET operation tool handler
 */
export class GetToolHandler extends BaseToolHandler {
  constructor(apiClient: ApiClient) {
    super(apiClient, "api_get");
  }

  getToolDefinition(): Tool {
    return {
      name: this.toolName,
      description: "Perform GET request to the configured API endpoint",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "API endpoint path (relative to base URL)",
            minLength: 1,
          },
          queryParams: {
            type: "object",
            description: "Optional query parameters as key-value pairs",
            additionalProperties: {
              type: "string",
            },
          },
          headers: {
            type: "object",
            description: "Optional custom headers as key-value pairs",
            additionalProperties: {
              type: "string",
            },
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
    };
  }

  async handleCall(request: CallToolRequest): Promise<CallToolResult> {
    try {
      // Validate arguments using Zod schema
      const validatedArgs = this.validateArguments(QueryRequestSchema, request.params.arguments);

      // Make GET request using the API client
      const requestOptions: any = {
        path: validatedArgs.path,
      };

      if (validatedArgs.queryParams) {
        requestOptions.queryParams = validatedArgs.queryParams;
      }

      if (validatedArgs.headers) {
        requestOptions.headers = validatedArgs.headers;
      }

      const response = await this.apiClient.get(requestOptions);

      // Return formatted response
      return this.handleApiResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
} /**

 * POST operation tool handler
 */
export class PostToolHandler extends BaseToolHandler {
  constructor(apiClient: ApiClient) {
    super(apiClient, "api_post");
  }

  getToolDefinition(): Tool {
    return {
      name: this.toolName,
      description: "Perform POST request to the configured API endpoint with JSON body support",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "API endpoint path (relative to base URL)",
            minLength: 1,
          },
          body: {
            type: "object",
            description: "Optional JSON request body",
          },
          headers: {
            type: "object",
            description: "Optional custom headers as key-value pairs",
            additionalProperties: {
              type: "string",
            },
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
    };
  }

  async handleCall(request: CallToolRequest): Promise<CallToolResult> {
    try {
      // Validate arguments using Zod schema
      const validatedArgs = this.validateArguments(BodyRequestSchema, request.params.arguments);

      // Make POST request using the API client
      const requestOptions: any = {
        path: validatedArgs.path,
      };

      if ("body" in validatedArgs) {
        requestOptions.body = validatedArgs.body;
      }

      if (validatedArgs.headers) {
        requestOptions.headers = validatedArgs.headers;
      }

      const response = await this.apiClient.post(requestOptions);

      // Return formatted response
      return this.handleApiResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
} /**

 * PUT operation tool handler
 */
export class PutToolHandler extends BaseToolHandler {
  constructor(apiClient: ApiClient) {
    super(apiClient, "api_put");
  }

  getToolDefinition(): Tool {
    return {
      name: this.toolName,
      description: "Perform PUT request to the configured API endpoint with JSON body support",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "API endpoint path (relative to base URL)",
            minLength: 1,
          },
          body: {
            type: "object",
            description: "Optional JSON request body",
          },
          headers: {
            type: "object",
            description: "Optional custom headers as key-value pairs",
            additionalProperties: {
              type: "string",
            },
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
    };
  }

  async handleCall(request: CallToolRequest): Promise<CallToolResult> {
    try {
      // Validate arguments using Zod schema
      const validatedArgs = this.validateArguments(BodyRequestSchema, request.params.arguments);

      // Make PUT request using the API client
      const requestOptions: any = {
        path: validatedArgs.path,
      };

      if ("body" in validatedArgs) {
        requestOptions.body = validatedArgs.body;
      }

      if (validatedArgs.headers) {
        requestOptions.headers = validatedArgs.headers;
      }

      const response = await this.apiClient.put(requestOptions);

      // Return formatted response
      return this.handleApiResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
} /*
 *
 * PATCH operation tool handler
 */
export class PatchToolHandler extends BaseToolHandler {
  constructor(apiClient: ApiClient) {
    super(apiClient, "api_patch");
  }

  getToolDefinition(): Tool {
    return {
      name: this.toolName,
      description: "Perform PATCH request to the configured API endpoint with JSON body support",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "API endpoint path (relative to base URL)",
            minLength: 1,
          },
          body: {
            type: "object",
            description: "Optional JSON request body",
          },
          headers: {
            type: "object",
            description: "Optional custom headers as key-value pairs",
            additionalProperties: {
              type: "string",
            },
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
    };
  }

  async handleCall(request: CallToolRequest): Promise<CallToolResult> {
    try {
      // Validate arguments using Zod schema
      const validatedArgs = this.validateArguments(BodyRequestSchema, request.params.arguments);

      // Make PATCH request using the API client
      const requestOptions: any = {
        path: validatedArgs.path,
      };

      if ("body" in validatedArgs) {
        requestOptions.body = validatedArgs.body;
      }

      if (validatedArgs.headers) {
        requestOptions.headers = validatedArgs.headers;
      }

      const response = await this.apiClient.patch(requestOptions);

      // Return formatted response
      return this.handleApiResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
} /**
 * DE
LETE operation tool handler
 */
export class DeleteToolHandler extends BaseToolHandler {
  constructor(apiClient: ApiClient) {
    super(apiClient, "api_delete");
  }

  getToolDefinition(): Tool {
    return {
      name: this.toolName,
      description: "Perform DELETE request to the configured API endpoint",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "API endpoint path (relative to base URL)",
            minLength: 1,
          },
          headers: {
            type: "object",
            description: "Optional custom headers as key-value pairs",
            additionalProperties: {
              type: "string",
            },
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
    };
  }

  async handleCall(request: CallToolRequest): Promise<CallToolResult> {
    try {
      // Validate arguments using Zod schema
      const validatedArgs = this.validateArguments(BaseRequestSchema, request.params.arguments);

      // Make DELETE request using the API client
      const requestOptions: any = {
        path: validatedArgs.path,
      };

      if (validatedArgs.headers) {
        requestOptions.headers = validatedArgs.headers;
      }

      const response = await this.apiClient.delete(requestOptions);

      // Return formatted response
      return this.handleApiResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

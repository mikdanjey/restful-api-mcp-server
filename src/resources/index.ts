/**
 * MCP resource providers module for RESTful API operations and JSON Server
 * Handles API discovery and endpoint documentation
 */

import { Resource, ResourceTemplate, ListResourcesResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { ApiClient } from "../client";
import { ServerConfig } from "../config";

/**
 * API endpoint information interface
 */
export interface ApiEndpointInfo {
  path: string;
  methods: string[];
  description: string;
  parameters?: {
    path?: Record<string, string>;
    query?: Record<string, string>;
    body?: any;
  };
}

/**
 * Resource provider for API discovery and endpoint documentation
 */
export class ApiResourceProvider {
  private apiClient: ApiClient;
  private config: ServerConfig;
  private baseUrlAccessible: boolean = false;

  constructor(apiClient: ApiClient, config: ServerConfig) {
    this.apiClient = apiClient;
    this.config = config;
  }

  /**
   * Get the resource template for API endpoints
   */
  getResourceTemplate(): ResourceTemplate {
    return {
      uriTemplate: "api://endpoints/{endpoint}",
      name: "API Endpoints",
      description: "Available API endpoints and their documentation",
    };
  }

  /**
   * Validate that the API base URL is accessible
   */
  async validateBaseUrlAccessibility(): Promise<boolean> {
    try {
      // Try to make a simple request to the base URL to check accessibility
      // We'll try a HEAD request first, then GET if HEAD fails
      const response = await this.apiClient.get({ path: "/" });
      this.baseUrlAccessible = response.success || response.status < 500;
      return this.baseUrlAccessible;
    } catch (_error) {
      // If we can't reach the base URL, we'll still allow the resource provider
      // but mark it as inaccessible
      this.baseUrlAccessible = false;
      // API base URL is not accessible
      // console.warn(`API base URL ${this.config.baseUrl} is not accessible`);
      return false;
    }
  }

  /**
   * Discover and document available endpoints
   * This method attempts to discover common REST patterns and endpoints
   */
  async discoverEndpoints(): Promise<ApiEndpointInfo[]> {
    const discoveredEndpoints: ApiEndpointInfo[] = [];

    // Add standard CRUD operation patterns
    const standardEndpoints = this.getStandardEndpoints();
    discoveredEndpoints.push(...standardEndpoints);

    // Try to discover specific endpoints by making test requests
    const specificEndpoints = await this.probeForCommonEndpoints();
    discoveredEndpoints.push(...specificEndpoints);

    return discoveredEndpoints;
  }

  /**
   * Get standard REST API endpoint patterns
   */
  private getStandardEndpoints(): ApiEndpointInfo[] {
    return [
      {
        path: "/{resource}",
        methods: ["GET"],
        description: "Retrieve a collection of resources",
        parameters: {
          path: {
            resource: "The resource path (e.g., users, posts, etc.)",
          },
          query: {
            limit: "Maximum number of items to return",
            offset: "Number of items to skip",
            page: "Page number for pagination",
            sort: "Field to sort by",
            order: "Sort order (asc/desc)",
            filter: "Filter criteria",
          },
        },
      },
      {
        path: "/{resource}/{id}",
        methods: ["GET"],
        description: "Retrieve a specific resource by ID",
        parameters: {
          path: {
            resource: "The resource type (e.g., users, posts, etc.)",
            id: "The unique identifier of the resource",
          },
        },
      },
      {
        path: "/{resource}",
        methods: ["POST"],
        description: "Create a new resource",
        parameters: {
          path: {
            resource: "The resource type to create",
          },
          body: "JSON object containing the resource data to create",
        },
      },
      {
        path: "/{resource}/{id}",
        methods: ["PUT"],
        description: "Update an entire resource by ID (replace)",
        parameters: {
          path: {
            resource: "The resource type to update",
            id: "The unique identifier of the resource",
          },
          body: "JSON object containing the complete updated resource data",
        },
      },
      {
        path: "/{resource}/{id}",
        methods: ["PATCH"],
        description: "Partially update a resource by ID (merge)",
        parameters: {
          path: {
            resource: "The resource type to update",
            id: "The unique identifier of the resource",
          },
          body: "JSON object containing only the fields to update",
        },
      },
      {
        path: "/{resource}/{id}",
        methods: ["DELETE"],
        description: "Delete a resource by ID",
        parameters: {
          path: {
            resource: "The resource type to delete",
            id: "The unique identifier of the resource",
          },
        },
      },
    ];
  }

  /**
   * Probe for common API endpoints to discover what's available
   */
  private async probeForCommonEndpoints(): Promise<ApiEndpointInfo[]> {
    const discoveredEndpoints: ApiEndpointInfo[] = [];

    // Common endpoint patterns to test
    const commonPaths = ["/api", "/v1", "/api/v1", "/health", "/status", "/info", "/version", "/docs", "/swagger", "/openapi"];

    for (const path of commonPaths) {
      try {
        const response = await this.apiClient.get({ path });

        if (response.success) {
          discoveredEndpoints.push({
            path,
            methods: ["GET"],
            description: `Discovered endpoint: ${path}`,
            parameters: {},
          });

          // If this looks like an API root, try to discover more
          if (path.includes("api") || path.includes("v1")) {
            await this.discoverFromApiRoot(path, discoveredEndpoints);
          }
        }
      } catch (_error) {
        // Ignore errors during discovery - endpoint might not exist
        continue;
      }
    }

    return discoveredEndpoints;
  }

  /**
   * Try to discover endpoints from an API root path
   */
  private async discoverFromApiRoot(rootPath: string, discoveredEndpoints: ApiEndpointInfo[]): Promise<void> {
    // Common resource names to test
    const commonResources = ["users", "posts", "comments", "articles", "products", "orders", "items", "data"];

    for (const resource of commonResources) {
      const resourcePath = `${rootPath}/${resource}`;

      try {
        const response = await this.apiClient.get({ path: resourcePath });

        if (response.success) {
          discoveredEndpoints.push({
            path: resourcePath,
            methods: ["GET", "POST"],
            description: `Discovered resource collection: ${resource}`,
            parameters: {
              path: {
                resource: `Resource type: ${resource}`,
              },
              query: {
                limit: "Maximum number of items to return",
                offset: "Number of items to skip",
              },
              body: `JSON object for creating new ${resource}`,
            },
          });

          // Also add the individual resource endpoint
          discoveredEndpoints.push({
            path: `${resourcePath}/{id}`,
            methods: ["GET", "PUT", "PATCH", "DELETE"],
            description: `Discovered individual resource: ${resource} by ID`,
            parameters: {
              path: {
                resource: `Resource type: ${resource}`,
                id: `Unique identifier for the ${resource}`,
              },
              body: `JSON object for updating ${resource}`,
            },
          });
        }
      } catch (_error) {
        // Ignore errors during discovery
        continue;
      }
    }
  }

  /**
   * Get available API endpoints information (backwards compatibility)
   */
  private async getAvailableEndpoints(): Promise<ApiEndpointInfo[]> {
    return await this.discoverEndpoints();
  }

  /**
   * List available resources
   */
  async listResources(): Promise<ListResourcesResult> {
    const endpoints = await this.getAvailableEndpoints();

    const resources: Resource[] = endpoints.map((endpoint, index) => ({
      uri: `api://endpoints/endpoint-${index}`,
      name: `${endpoint.methods.join(", ")} ${endpoint.path}`,
      description: endpoint.description,
      mimeType: "application/json",
    }));

    // Add a general API information resource
    resources.unshift({
      uri: "api://endpoints/info",
      name: "API Information",
      description: "General information about the configured API",
      mimeType: "application/json",
    });

    return {
      resources,
    };
  }

  /**
   * Read a specific resource
   */
  async readResource(uri: string): Promise<ReadResourceResult> {
    if (uri === "api://endpoints/info") {
      return this.getApiInfo();
    }

    // Extract endpoint index from URI
    const match = uri.match(/api:\/\/endpoints\/endpoint-(\d+)/);
    if (!match || !match[1]) {
      throw new Error(`Invalid resource URI: ${uri}`);
    }

    const endpointIndex = parseInt(match[1], 10);
    const endpoints = await this.getAvailableEndpoints();

    if (endpointIndex < 0 || endpointIndex >= endpoints.length) {
      throw new Error(`Endpoint not found: ${uri}`);
    }

    const endpoint = endpoints[endpointIndex];
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${uri}`);
    }

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              endpoint: {
                path: endpoint.path,
                methods: endpoint.methods,
                description: endpoint.description,
                parameters: endpoint.parameters,
                baseUrl: this.config.baseUrl,
                authType: this.config.authType,
              },
              usage: {
                example: this.generateUsageExample(endpoint),
                notes: [
                  "Replace {resource} and {id} with actual values",
                  "All requests are made relative to the configured base URL",
                  "Authentication is handled automatically based on configuration",
                  "Discovered endpoints are based on common REST patterns and API probing",
                ],
              },
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  /**
   * Get general API information
   */
  private async getApiInfo(): Promise<ReadResourceResult> {
    return {
      contents: [
        {
          uri: "api://endpoints/info",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              api: {
                baseUrl: this.config.baseUrl,
                authType: this.config.authType,
                accessible: this.baseUrlAccessible,
                lastChecked: new Date().toISOString(),
              },
              capabilities: {
                supportedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
                supportedContentTypes: ["application/json"],
                authenticationMethods: ["basic", "token", "none"],
              },
              tools: [
                {
                  name: "api_get",
                  description: "Perform GET requests to retrieve data",
                },
                {
                  name: "api_post",
                  description: "Perform POST requests to create resources",
                },
                {
                  name: "api_put",
                  description: "Perform PUT requests to update entire resources",
                },
                {
                  name: "api_patch",
                  description: "Perform PATCH requests to partially update resources",
                },
                {
                  name: "api_delete",
                  description: "Perform DELETE requests to remove resources",
                },
              ],
              usage: {
                notes: [
                  "This is a generic REST API client that works with any RESTful service",
                  "Configure the API base URL and authentication through environment variables",
                  "Use the provided tools to perform CRUD operations on any endpoint",
                ],
              },
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  /**
   * Generate usage example for an endpoint
   */
  private generateUsageExample(endpoint: ApiEndpointInfo): any {
    if (!endpoint.methods || endpoint.methods.length === 0) {
      throw new Error("Endpoint must have at least one method");
    }

    const method = endpoint.methods[0]!.toLowerCase();
    const examplePath = endpoint.path.replace("{resource}", "users").replace("{id}", "123");

    const example: any = {
      tool: `api_${method}`,
      arguments: {
        path: examplePath,
      },
    };

    if (endpoint.parameters?.query) {
      example.arguments.queryParams = {
        limit: "10",
        offset: "0",
      };
    }

    if (endpoint.parameters?.body && ["POST", "PUT", "PATCH"].includes(endpoint.methods[0]!)) {
      example.arguments.body = {
        name: "John Doe",
        email: "john@example.com",
      };
    }

    return example;
  }

  /**
   * Check if the base URL is accessible
   */
  isBaseUrlAccessible(): boolean {
    return this.baseUrlAccessible;
  }
}

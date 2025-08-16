#!/usr/bin/env node

/**
 * Main entry point for the MCP RESTful API Server for RESTful API operations and JSON Server
 */

// Load environment variables from .env file first
import "dotenv/config";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { loadConfig, ConfigurationError } from "./config/index";
import { BasicAuthHandler, TokenAuthHandler, NoAuthHandler, AuthenticationStrategy } from "./auth/index";
import { ApiClient } from "./client/index";
import { GetToolHandler, PostToolHandler, PutToolHandler, PatchToolHandler, DeleteToolHandler, ToolHandler } from "./tools/index";
import { ApiResourceProvider } from "./resources/index";

/**
 * Logger utility for structured logging
 */
export class Logger {
  private static formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  static info(message: string, context?: any): void {
    console.log(this.formatMessage("info", message, context));
  }

  static warn(message: string, context?: any): void {
    console.warn(this.formatMessage("warn", message, context));
  }

  static error(message: string, context?: any): void {
    console.error(this.formatMessage("error", message, context));
  }

  static debug(message: string, context?: any): void {
    if (process.env["DEBUG"] === "true" || process.env["NODE_ENV"] === "development") {
      console.debug(this.formatMessage("debug", message, context));
    }
  }
}

/**
 * Server error class for better error handling
 */
export class ServerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
  ) {
    super(message);
    this.name = "ServerError";
  }
}

/**
 * Main MCP Server class
 */
export class McpRestfulApiServer {
  private server: Server;
  private apiClient: ApiClient | null = null;
  private toolHandlers: ToolHandler[] = [];
  private resourceProvider: ApiResourceProvider | null = null;

  constructor() {
    this.server = new Server(
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
  }

  /**
   * Initialize the server with configuration and components
   */
  async initialize(): Promise<void> {
    try {
      // Initialization started - no logging to avoid interfering with MCP protocol

      // Load and validate configuration
      const config = loadConfig();
      // Logger.info('Configuration loaded successfully', {
      //   baseUrl: config.baseUrl,
      //   authType: config.authType,
      //   hasAuthToken: !!config.authToken,
      //   hasBasicAuth: !!config.basicAuth,
      // });

      // Create authentication strategy
      const authStrategy = this.createAuthenticationStrategy(config);
      // Authentication strategy created

      // Validate authentication configuration
      authStrategy.validate();
      Logger.debug("Authentication configuration validated");

      // Create API client
      this.apiClient = new ApiClient(config, authStrategy);
      // API client initialized

      // Create and register tool handlers
      await this.registerToolHandlers();
      // Tool handlers registered

      // Create and register resource provider
      await this.registerResourceProvider(config);
      // Resource provider registered

      // Validate API accessibility
      await this.validateApiAccessibility();

      // Server initialized successfully
    } catch (error) {
      Logger.error("Failed to initialize server", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Create authentication strategy based on configuration
   */
  private createAuthenticationStrategy(config: any): AuthenticationStrategy {
    switch (config.authType) {
      case "basic":
        if (!config.basicAuth) {
          throw new ConfigurationError("Basic authentication configuration is missing");
        }
        return new BasicAuthHandler(config.basicAuth.username, config.basicAuth.password);

      case "token":
        if (!config.authToken) {
          throw new ConfigurationError("Token authentication configuration is missing");
        }
        return new TokenAuthHandler(config.authToken);

      case "none":
        return new NoAuthHandler();

      default:
        throw new ConfigurationError(`Unsupported authentication type: ${config.authType}`);
    }
  }

  /**
   * Register all tool handlers with the MCP server
   */
  private async registerToolHandlers(): Promise<void> {
    if (!this.apiClient) {
      throw new ServerError("API client must be initialized before registering tool handlers", "INITIALIZATION_ERROR");
    }

    try {
      // Create tool handlers
      this.toolHandlers = [
        new GetToolHandler(this.apiClient),
        new PostToolHandler(this.apiClient),
        new PutToolHandler(this.apiClient),
        new PatchToolHandler(this.apiClient),
        new DeleteToolHandler(this.apiClient),
      ];

      Logger.debug("Tool handlers created", {
        tools: this.toolHandlers.map(h => h.getToolName()),
      });

      // Register list tools handler
      this.server.setRequestHandler(ListToolsRequestSchema, async () => {
        try {
          Logger.debug("Handling list tools request");
          const tools = this.toolHandlers.map(handler => handler.getToolDefinition());
          Logger.debug("Returning tools list", { count: tools.length });
          return { tools };
        } catch (error) {
          Logger.error("Error handling list tools request", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
          throw new ServerError("Failed to list tools", "LIST_TOOLS_ERROR", error);
        }
      });

      // Register call tool handler
      this.server.setRequestHandler(CallToolRequestSchema, async request => {
        const toolName = request.params.name;
        Logger.debug("Handling tool call request", {
          toolName,
          hasArguments: !!request.params.arguments,
        });

        try {
          const handler = this.toolHandlers.find(h => h.getToolName() === toolName);

          if (!handler) {
            Logger.warn("Unknown tool requested", { toolName });
            throw new ServerError(`Unknown tool: ${toolName}`, "UNKNOWN_TOOL");
          }

          Logger.debug("Executing tool handler", { toolName });
          const result = await handler.handleCall(request);
          Logger.debug("Tool execution completed", {
            toolName,
            success: !result.isError,
          });

          return result;
        } catch (error) {
          Logger.error("Error handling tool call", {
            toolName,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
          });

          if (error instanceof ServerError) {
            throw error;
          }

          throw new ServerError(`Failed to execute tool ${toolName}`, "TOOL_EXECUTION_ERROR", error);
        }
      });
    } catch (error) {
      Logger.error("Failed to register tool handlers", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Register resource provider with the MCP server
   */
  private async registerResourceProvider(config: any): Promise<void> {
    if (!this.apiClient) {
      throw new ServerError("API client must be initialized before registering resource provider", "INITIALIZATION_ERROR");
    }

    try {
      // Create resource provider
      this.resourceProvider = new ApiResourceProvider(this.apiClient, config);
      Logger.debug("Resource provider created");

      // Register list resources handler
      this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
        Logger.debug("Handling list resources request");

        try {
          if (!this.resourceProvider) {
            throw new ServerError("Resource provider not initialized", "RESOURCE_PROVIDER_ERROR");
          }

          const result = await this.resourceProvider.listResources();
          Logger.debug("Resources listed successfully", { count: result.resources.length });
          return result;
        } catch (error) {
          Logger.error("Error handling list resources request", {
            error: error instanceof Error ? error.message : "Unknown error",
          });

          if (error instanceof ServerError) {
            throw error;
          }

          throw new ServerError("Failed to list resources", "LIST_RESOURCES_ERROR", error);
        }
      });

      // Register read resource handler
      this.server.setRequestHandler(ReadResourceRequestSchema, async request => {
        const uri = request.params.uri;
        Logger.debug("Handling read resource request", { uri });

        try {
          if (!this.resourceProvider) {
            throw new ServerError("Resource provider not initialized", "RESOURCE_PROVIDER_ERROR");
          }

          const result = await this.resourceProvider.readResource(uri);
          Logger.debug("Resource read successfully", { uri });
          return result;
        } catch (error) {
          Logger.error("Error handling read resource request", {
            uri,
            error: error instanceof Error ? error.message : "Unknown error",
          });

          if (error instanceof ServerError) {
            throw error;
          }

          throw new ServerError(`Failed to read resource ${uri}`, "READ_RESOURCE_ERROR", error);
        }
      });
    } catch (error) {
      Logger.error("Failed to register resource provider", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Validate that the API is accessible
   */
  private async validateApiAccessibility(): Promise<void> {
    if (!this.resourceProvider) {
      throw new ServerError("Resource provider not initialized", "INITIALIZATION_ERROR");
    }

    try {
      Logger.debug("Validating API base URL accessibility");
      const isAccessible = await this.resourceProvider.validateBaseUrlAccessibility();

      if (isAccessible) {
        // API base URL is accessible
      } else {
        // API base URL is not accessible - server will still start but API calls may fail
      }
    } catch (error) {
      Logger.warn("Could not validate API accessibility", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Don't throw here - accessibility validation is not critical for server startup
    }
  }

  /**
   * Start the server with stdio transport
   */
  async start(): Promise<void> {
    try {
      Logger.info("Starting MCP server with stdio transport");
      const transport = new StdioServerTransport();

      // Set up error handling for the transport
      transport.onclose = () => {
        Logger.info("Transport connection closed");
      };

      transport.onerror = error => {
        Logger.error("Transport error occurred", {
          error: error instanceof Error ? error.message : "Unknown transport error",
        });
      };

      await this.server.connect(transport);
      Logger.info("MCP RESTful API Server for RESTful API operations and JSON Server started and listening on stdio");
    } catch (error) {
      Logger.error("Failed to start server", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new ServerError("Failed to start server", "SERVER_START_ERROR", error);
    }
  }

  /**
   * Gracefully shutdown the server
   */
  async shutdown(): Promise<void> {
    try {
      Logger.info("Shutting down MCP RESTful API Server for RESTful API operations and JSON Server...");

      // Close server connections
      await this.server.close();

      Logger.info("Server shutdown completed");
    } catch (error) {
      Logger.error("Error during server shutdown", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get the server instance
   */
  getServer(): Server {
    return this.server;
  }
}

/**
 * Global server instance for graceful shutdown
 */
let serverInstance: McpRestfulApiServer | null = null;

/**
 * Handle graceful shutdown
 */
async function handleShutdown(signal: string): Promise<void> {
  Logger.info(`Received ${signal}, shutting down gracefully...`);

  if (serverInstance) {
    try {
      await serverInstance.shutdown();
    } catch (error) {
      Logger.error("Error during graceful shutdown", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  process.exit(0);
}

/**
 * Handle uncaught exceptions and unhandled rejections
 */
process.on("uncaughtException", error => {
  Logger.error("Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", reason => {
  Logger.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

/**
 * Command line interface for the server
 */
interface CliOptions {
  help?: boolean;
  version?: boolean;
  debug?: boolean;
  config?: string | undefined;
}

/**
 * Parse command line arguments
 */
function parseCliArguments(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!arg) {
      continue;
    }

    switch (arg) {
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "-v":
      case "--version":
        options.version = true;
        break;
      case "-d":
      case "--debug":
        options.debug = true;
        process.env["DEBUG"] = "true";
        break;
      case "-c":
      case "--config":
        if (i + 1 < args.length) {
          const configPath = args[i + 1];
          if (configPath && !configPath.startsWith("-")) {
            options.config = configPath;
            i++; // Skip next argument as it's the config file path
          } else {
            throw new Error("--config option requires a file path");
          }
        } else {
          throw new Error("--config option requires a file path");
        }
        break;
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        break;
    }
  }

  return options;
}

/**
 * Display help information
 */
function displayHelp(): void {
  const packageJson = require("../package.json");
  console.log(`
${packageJson.name} v${packageJson.version}
${packageJson.description}

Usage: mcp-restful-api-server [options]

Options:
  -h, --help     Show this help message
  -v, --version  Show version information
  -d, --debug    Enable debug logging
  -c, --config   Specify config file path (future use)

Environment Variables (can be set in .env file):
  API_BASE_URL              Base URL for the REST API (required)
  API_AUTH_TYPE             Authentication type: basic, token, or none (required)
  API_AUTH_TOKEN            Bearer token for token authentication
  API_BASIC_AUTH_USERNAME   Username for basic authentication
  API_BASIC_AUTH_PASSWORD   Password for basic authentication
  DEBUG                     Enable debug logging (true/false)

Setup:
  npm run setup             Create .env file and build the project
  cp .env.example .env      Copy example configuration file

Examples:
  # Using .env file (recommended)
  npm run setup
  # Edit .env file with your configuration
  mcp-restful-api-server

  # Using environment variables - Basic authentication
  API_BASE_URL=https://api.example.com \\
  API_AUTH_TYPE=basic \\
  API_BASIC_AUTH_USERNAME=user \\
  API_BASIC_AUTH_PASSWORD=pass \\
  mcp-restful-api-server

  # Using environment variables - Token authentication
  API_BASE_URL=https://api.example.com \\
  API_AUTH_TYPE=token \\
  API_AUTH_TOKEN=your-token-here \\
  mcp-restful-api-server

  # Using environment variables - No authentication (JSONPlaceholder)
  API_BASE_URL=https://jsonplaceholder.typicode.com \\
  API_AUTH_TYPE=none \\
  mcp-restful-api-server

  # Using environment variables - Local JSON Server
  API_BASE_URL=http://localhost:3000 \\
  API_AUTH_TYPE=none \\
  mcp-restful-api-server

For more information, visit: https://github.com/your-org/mcp-restful-api-server
`);
}

/**
 * Display version information
 */
function displayVersion(): void {
  const packageJson = require("../package.json");
  console.log(`${packageJson.name} v${packageJson.version}`);
}

/**
 * Main function to start the server
 */
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const options = parseCliArguments();

    // Handle help and version options
    if (options.help) {
      displayHelp();
      process.exit(0);
    }

    if (options.version) {
      displayVersion();
      process.exit(0);
    }

    // Set debug mode if requested
    if (options.debug) {
      // Debug mode enabled - only log in debug mode to avoid interfering with MCP protocol
      Logger.debug("Debug mode enabled");
    }

    // Startup information - only in debug mode
    if (options.debug) {
      const packageJson = require("../package.json");
      Logger.debug(`Starting ${packageJson.name} v${packageJson.version}`);
    }

    serverInstance = new McpRestfulApiServer();

    // Set up graceful shutdown handlers
    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));

    await serverInstance.initialize();
    await serverInstance.start();

    // Keep the process running
    process.stdin.resume();
  } catch (error) {
    if (error instanceof ConfigurationError) {
      Logger.error("Configuration Error", {
        message: error.message,
        details: error.details,
      });

      if (error.details?.zodError) {
        Logger.error("Validation details", {
          errors: error.details.zodError.errors,
        });
      }
    } else if (error instanceof ServerError) {
      Logger.error("Server Error", {
        message: error.message,
        code: error.code,
        details: error.details,
      });
    } else {
      Logger.error("Unexpected Error", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }

    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

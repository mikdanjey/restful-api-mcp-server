/**
 * Configuration management module for MCP RESTful API Server
 * Handles environment variable parsing and validation for RESTful API operations and JSON Server
 */

import { z } from "zod";

/**
 * Authentication type enumeration
 */
export type AuthType = "basic" | "token" | "none";

/**
 * Basic authentication configuration
 */
export interface BasicAuthConfig {
  username: string;
  password: string;
}

/**
 * Server configuration interface
 */
export interface ServerConfig {
  baseUrl: string;
  authType: AuthType;
  authToken?: string;
  basicAuth?: BasicAuthConfig;
}

/**
 * Zod schema for validating environment variables
 */
export const EnvSchema = z.object({
  API_BASE_URL: z.string().url("API_BASE_URL must be a valid URL"),
  API_AUTH_TYPE: z.enum(["basic", "token", "none"], {
    errorMap: () => ({ message: "API_AUTH_TYPE must be one of: basic, token, none" }),
  }),
  API_AUTH_TOKEN: z.string().optional(),
  API_BASIC_AUTH_USERNAME: z.string().optional(),
  API_BASIC_AUTH_PASSWORD: z.string().optional(),
});

/**
 * Refined schema with conditional validation based on auth type
 */
export const ConfigSchema = EnvSchema.refine(
  data => {
    if (data.API_AUTH_TYPE === "token") {
      return data.API_AUTH_TOKEN && data.API_AUTH_TOKEN.length > 0;
    }
    return true;
  },
  {
    message: 'API_AUTH_TOKEN is required when API_AUTH_TYPE is "token"',
    path: ["API_AUTH_TOKEN"],
  },
)
  .refine(
    data => {
      if (data.API_AUTH_TYPE === "basic") {
        return data.API_BASIC_AUTH_USERNAME && data.API_BASIC_AUTH_USERNAME.length > 0;
      }
      return true;
    },
    {
      message: 'API_BASIC_AUTH_USERNAME is required when API_AUTH_TYPE is "basic"',
      path: ["API_BASIC_AUTH_USERNAME"],
    },
  )
  .refine(
    data => {
      if (data.API_AUTH_TYPE === "basic") {
        return data.API_BASIC_AUTH_PASSWORD && data.API_BASIC_AUTH_PASSWORD.length > 0;
      }
      return true;
    },
    {
      message: 'API_BASIC_AUTH_PASSWORD is required when API_AUTH_TYPE is "basic"',
      path: ["API_BASIC_AUTH_PASSWORD"],
    },
  );

/**
 * Type for validated environment variables
 */
export type ValidatedEnv = z.infer<typeof ConfigSchema>;

/**
 * Parse and transform environment variables into ServerConfig
 */
export function parseConfig(env: ValidatedEnv): ServerConfig {
  const config: ServerConfig = {
    baseUrl: env.API_BASE_URL,
    authType: env.API_AUTH_TYPE,
  };

  if (env.API_AUTH_TYPE === "token" && env.API_AUTH_TOKEN) {
    config.authToken = env.API_AUTH_TOKEN;
  }

  if (env.API_AUTH_TYPE === "basic" && env.API_BASIC_AUTH_USERNAME && env.API_BASIC_AUTH_PASSWORD) {
    config.basicAuth = {
      username: env.API_BASIC_AUTH_USERNAME,
      password: env.API_BASIC_AUTH_PASSWORD,
    };
  }

  return config;
}

/**
 * Configuration error class for better error handling
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public details?: any,
  ) {
    super(message);
    this.name = "ConfigurationError";
  }
}

/**
 * Load and validate configuration from environment variables
 * @param env - Environment variables object (defaults to process.env)
 * @returns Validated ServerConfig
 * @throws ConfigurationError if validation fails
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  try {
    // Validate environment variables using Zod schema
    const validatedEnv = ConfigSchema.parse(env);

    // Transform validated environment variables into ServerConfig
    const config = parseConfig(validatedEnv);

    // Log configuration (without sensitive data) for debugging
    // console.log('Configuration loaded successfully:', {
    //   baseUrl: config.baseUrl,
    //   authType: config.authType,
    //   hasAuthToken: !!config.authToken,
    //   hasBasicAuth: !!config.basicAuth,
    // });

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format Zod validation errors into a readable message
      const errorMessages = error.errors
        .map(err => {
          const path = err.path.join(".");
          return `${path}: ${err.message}`;
        })
        .join(", ");

      throw new ConfigurationError(`Configuration validation failed: ${errorMessages}`, { zodError: error });
    }

    // Re-throw other errors as ConfigurationError
    throw new ConfigurationError(`Failed to load configuration: ${error instanceof Error ? error.message : "Unknown error"}`, { originalError: error });
  }
}

/**
 * Validate that required environment variables are present
 * This is a helper function for early validation without full parsing
 */
export function validateRequiredEnvVars(env: Record<string, string | undefined> = process.env): string[] {
  const missing: string[] = [];

  if (!env["API_BASE_URL"]) {
    missing.push("API_BASE_URL");
  }

  if (!env["API_AUTH_TYPE"]) {
    missing.push("API_AUTH_TYPE");
  }

  return missing;
}

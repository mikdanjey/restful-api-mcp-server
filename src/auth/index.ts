/**
 * Authentication module for MCP RESTful API Server
 * Handles different authentication strategies (basic, token, none) for RESTful API operations and JSON Server
 */

import { AxiosRequestConfig } from "axios";

/**
 * Authentication strategy interface for different auth types
 */
export interface AuthenticationStrategy {
  /**
   * Apply authentication to the request configuration
   * @param config - Axios request configuration to modify
   * @returns Modified request configuration with authentication applied
   */
  applyAuth(config: AxiosRequestConfig): AxiosRequestConfig;

  /**
   * Get the authentication type identifier
   * @returns String identifier for the authentication type
   */
  getAuthType(): string;

  /**
   * Validate that the authentication strategy has all required configuration
   * @throws Error if authentication configuration is invalid or incomplete
   */
  validate(): void;
}

/**
 * Base authentication handler class providing common functionality
 */
export abstract class BaseAuthenticationHandler implements AuthenticationStrategy {
  protected authType: string;

  constructor(authType: string) {
    this.authType = authType;
  }

  /**
   * Apply authentication to the request configuration
   * Must be implemented by concrete authentication handlers
   */
  abstract applyAuth(config: AxiosRequestConfig): AxiosRequestConfig;

  /**
   * Get the authentication type identifier
   */
  getAuthType(): string {
    return this.authType;
  }

  /**
   * Validate authentication configuration
   * Must be implemented by concrete authentication handlers
   */
  abstract validate(): void;

  /**
   * Helper method to safely clone request configuration
   */
  protected cloneConfig(config: AxiosRequestConfig): AxiosRequestConfig {
    return {
      ...config,
      headers: {
        ...config.headers,
      },
    };
  }
}
/*
 *
 * Basic authentication handler for username/password authentication
 */
export class BasicAuthHandler extends BaseAuthenticationHandler {
  private username: string;
  private password: string;

  constructor(username: string, password: string) {
    super("basic");
    this.username = username;
    this.password = password;
  }

  applyAuth(config: AxiosRequestConfig): AxiosRequestConfig {
    const clonedConfig = this.cloneConfig(config);

    // Create base64 encoded credentials
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString("base64");

    clonedConfig.headers = {
      ...clonedConfig.headers,
      Authorization: `Basic ${credentials}`,
    };

    return clonedConfig;
  }

  validate(): void {
    if (!this.username || typeof this.username !== "string") {
      throw new Error("Basic authentication requires a valid username");
    }
    if (!this.password || typeof this.password !== "string") {
      throw new Error("Basic authentication requires a valid password");
    }
  }
}

/**
 * Token authentication handler for bearer token authentication
 */
export class TokenAuthHandler extends BaseAuthenticationHandler {
  private token: string;

  constructor(token: string) {
    super("token");
    this.token = token;
  }

  applyAuth(config: AxiosRequestConfig): AxiosRequestConfig {
    const clonedConfig = this.cloneConfig(config);

    clonedConfig.headers = {
      ...clonedConfig.headers,
      Authorization: `Bearer ${this.token}`,
    };

    return clonedConfig;
  }

  validate(): void {
    if (!this.token || typeof this.token !== "string") {
      throw new Error("Token authentication requires a valid token");
    }
    if (this.token.trim().length === 0) {
      throw new Error("Token authentication requires a non-empty token");
    }
  }
}

/**
 * No authentication handler for unauthenticated requests
 */
export class NoAuthHandler extends BaseAuthenticationHandler {
  constructor() {
    super("none");
  }

  applyAuth(config: AxiosRequestConfig): AxiosRequestConfig {
    // Simply return a clone of the config without any authentication headers
    return this.cloneConfig(config);
  }

  validate(): void {
    // No validation needed for no authentication
  }
}

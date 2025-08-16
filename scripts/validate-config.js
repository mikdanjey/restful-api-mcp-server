#!/usr/bin/env node

/**
 * Configuration validation script for MCP RESTful API Server
 * Helps users verify their .env configuration before starting the server
 */

require("dotenv/config");
const { loadConfig, validateRequiredEnvVars } = require("../dist/config/index.js");

console.log("🔍 Validating MCP RESTful API Server for RESTful API operations and JSON Server configuration...\n");

try {
  // Check for missing required environment variables
  const missing = validateRequiredEnvVars();
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error("\nPlease set these variables in your .env file or environment.\n");
    process.exit(1);
  }

  // Try to load and validate the full configuration
  const config = loadConfig();

  console.log("✅ Configuration is valid!");
  console.log("\nConfiguration summary:");
  console.log(`   Base URL: ${config.baseUrl}`);
  console.log(`   Auth Type: ${config.authType}`);

  if (config.authType === "token") {
    console.log(`   Has Auth Token: ${config.authToken ? "✅" : "❌"}`);
  } else if (config.authType === "basic") {
    console.log(`   Basic Auth Username: ${config.basicAuth?.username || "Not set"}`);
    console.log(`   Basic Auth Password: ${config.basicAuth?.password ? "✅ Set" : "❌ Not set"}`);
  }

  console.log("\n🚀 Ready to start the server with: npm start");
} catch (error) {
  console.error("❌ Configuration validation failed:");
  console.error(`   ${error.message}\n`);

  if (error.details?.zodError) {
    console.error("Validation errors:");
    error.details.zodError.errors.forEach(err => {
      console.error(`   - ${err.path.join(".")}: ${err.message}`);
    });
    console.error("");
  }

  console.error("Please check your .env file or environment variables.\n");
  process.exit(1);
}

# MCP RESTful API Server

A Model Context Protocol server for RESTful API operations and JSON Server. This server acts as a bridge between Large Language Models and REST APIs, enabling AI models to interact with external services through the Model Context Protocol.

## Features

- **Complete CRUD Operations**: GET, POST, PUT, PATCH, and DELETE HTTP methods
- **JSON Server Compatible**: Works seamlessly with JSON Server and other RESTful APIs
- **Multiple Authentication Methods**: Basic auth, Bearer token, or no authentication
- **Environment-based Configuration**: Easy setup through environment variables
- **Resource Discovery**: Exposes API endpoints as discoverable MCP resources
- **Comprehensive Error Handling**: Detailed error messages and logging
- **TypeScript**: Full type safety and excellent developer experience
- **Production Ready**: Includes build optimization, linting, and testing

## Installation

### Local Installation

```bash
# Clone the repository
git https://github.com/mikdanjey/restful-api-mcp-server.git
cd restful-api-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Quick Start

### Option 1: Using .env file (Recommended)

1. **Run the setup script:**

```bash
npm run setup
```

This will:

- Copy `.env.example` to `.env`
- Install dependencies
- Build the project

2. **Edit the .env file with your API configuration:**

```bash
# Edit .env file
API_BASE_URL=https://jsonplaceholder.typicode.com
API_AUTH_TYPE=none
```

3. **Start the server:**

```bash
npm start
```

### Option 2: Using environment variables

1. **Set up environment variables:**

```bash
# For JSONPlaceholder API (no authentication)
export API_BASE_URL="https://jsonplaceholder.typicode.com"
export API_AUTH_TYPE="none"

# For APIs with Bearer token authentication
export API_BASE_URL="https://api.example.com"
export API_AUTH_TYPE="token"
export API_AUTH_TOKEN="your-bearer-token-here"

# For APIs with Basic authentication
export API_BASE_URL="https://api.example.com"
export API_AUTH_TYPE="basic"
export API_BASIC_AUTH_USERNAME="your-username"
export API_BASIC_AUTH_PASSWORD="your-password"
```

2. **Start the server:**

```bash
# If installed globally
restful-api-mcp-server

# If running from source
npm start

# With debug logging
restful-api-mcp-server --debug
```

## Configuration

The server can be configured using environment variables or a `.env` file. The `.env` file approach is recommended for development.

### Using .env File

1. Copy the example file: `cp .env.example .env`
2. Edit `.env` with your configuration
3. The server will automatically load these variables on startup

### Environment Variables

| Variable                  | Required    | Description                                        | Example                     |
| ------------------------- | ----------- | -------------------------------------------------- | --------------------------- |
| `API_BASE_URL`            | Yes         | Base URL of the REST API                           | `https://api.example.com`   |
| `API_AUTH_TYPE`           | Yes         | Authentication method                              | `basic`, `token`, or `none` |
| `API_AUTH_TOKEN`          | Conditional | Bearer token (required when `API_AUTH_TYPE=token`) | `eyJhbGciOiJIUzI1NiIs...`   |
| `API_BASIC_AUTH_USERNAME` | Conditional | Username (required when `API_AUTH_TYPE=basic`)     | `admin`                     |
| `API_BASIC_AUTH_PASSWORD` | Conditional | Password (required when `API_AUTH_TYPE=basic`)     | `secret123`                 |
| `DEBUG`                   | No          | Enable debug logging                               | `true` or `false`           |

### Command Line Options

```bash
restful-api-mcp-server [options]

Options:
  -h, --help     Show help message
  -v, --version  Show version information
  -d, --debug    Enable debug logging
  -c, --config   Specify config file path (future use)
```

## MCP Tools

The server provides the following MCP tools for interacting with REST APIs:

### `api_get`

Perform GET requests to retrieve data.

**Parameters:**

- `path` (string, required): API endpoint path (e.g., "/users/1")
- `queryParams` (object, optional): Query parameters as key-value pairs
- `headers` (object, optional): Additional HTTP headers

**Example:**

```json
{
  "name": "api_get",
  "arguments": {
    "path": "/users",
    "queryParams": {
      "page": "1",
      "limit": "10"
    },
    "headers": {
      "Accept": "application/json"
    }
  }
}
```

### `api_post`

Create new resources via POST requests.

**Parameters:**

- `path` (string, required): API endpoint path
- `body` (object, optional): Request body data
- `headers` (object, optional): Additional HTTP headers

### `api_put`

Update resources via PUT requests (full replacement).

**Parameters:**

- `path` (string, required): API endpoint path
- `body` (object, optional): Request body data
- `headers` (object, optional): Additional HTTP headers

### `api_patch`

Partially update resources via PATCH requests.

**Parameters:**

- `path` (string, required): API endpoint path
- `body` (object, optional): Request body data
- `headers` (object, optional): Additional HTTP headers

### `api_delete`

Delete resources via DELETE requests.

**Parameters:**

- `path` (string, required): API endpoint path
- `headers` (object, optional): Additional HTTP headers

## MCP Resources

The server exposes API endpoints as discoverable MCP resources:

- **Resource URI**: `api://endpoints/{endpoint}`
- **Description**: Provides documentation about available API endpoints and their supported operations

## Development

### Prerequisites

- Node.js 20.0.0 or higher
- npm or yarn package manager

### Setup

```bash
# Clone the repository
git clone https://github.com/mikdanjey/restful-api-mcp-server.git
cd restful-api-mcp-server

# Run the setup script (installs dependencies, creates .env, and builds)
npm run setup

# Or do it manually:
# npm install
# cp .env.example .env
# Edit .env with your configuration
# npm run build
```

### Available Scripts

```bash
# Setup
npm run setup           # Complete setup: create .env, install deps, build
npm run setup:env       # Create .env file from .env.example
npm run validate        # Validate configuration before starting

# Development
npm run dev             # Build and watch for changes
npm run build:dev       # Build for development
npm run start:dev       # Build and start in one command
npm run type-check      # Run TypeScript type checking

# Production
npm run build           # Full production build with linting and type checking
npm run build:prod      # Optimized production build
npm start              # Start the built server

# Testing
npm test               # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Run ESLint with auto-fix
npm run clean          # Clean build artifacts

# Alternative: Using Make
make setup             # Same as npm run setup
make build             # Same as npm run build
make start             # Same as npm start
make dev               # Same as npm run dev
make test              # Same as npm test
make lint              # Same as npm run lint
```

### Project Structure

```
src/
├── auth/           # Authentication strategies
├── client/         # HTTP client wrapper
├── config/         # Configuration management
├── resources/      # MCP resource providers
├── tools/          # MCP tool handlers
├── types/          # TypeScript type definitions
└── index.ts        # Main entry point

tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── fixtures/       # Test fixtures and mocks
```

## Examples

### Using with JSONPlaceholder API

```bash
# Set up environment
export API_BASE_URL="https://jsonplaceholder.typicode.com"
export API_AUTH_TYPE="none"

# Start the server
restful-api-mcp-server

# The server will provide tools to interact with JSONPlaceholder:
# - GET /posts, /users, /comments, etc.
# - POST /posts (creates mock resources)
# - PUT /posts/1 (updates mock resources)
# - DELETE /posts/1 (deletes mock resources)
```

### Using with JSON Server

```bash
# Start a local JSON Server (install with: npm install -g json-server)
echo '{"posts": [{"id": 1, "title": "Hello World"}], "users": [{"id": 1, "name": "John"}]}' > db.json
json-server --watch db.json --port 3000

# Set up environment for local JSON Server
export API_BASE_URL="http://localhost:3000"
export API_AUTH_TYPE="none"

# Start the MCP server
restful-api-mcp-server

# The server will provide tools to interact with JSON Server:
# - GET /posts, /users (retrieve data)
# - POST /posts (create new posts)
# - PUT /posts/1 (update posts)
# - DELETE /posts/1 (delete posts)
```

### Using with GitHub API

```bash
# Set up environment
export API_BASE_URL="https://api.github.com"
export API_AUTH_TYPE="token"
export API_AUTH_TOKEN="ghp_your_github_token_here"

# Start the server
restful-api-mcp-server

# The server will provide tools to interact with GitHub API:
# - GET /user (get authenticated user)
# - GET /repos/owner/repo (get repository info)
# - POST /repos/owner/repo/issues (create issues)
```

## Error Handling

The server provides comprehensive error handling:

- **Configuration Errors**: Clear messages for missing or invalid environment variables
- **Authentication Errors**: Detailed feedback for authentication failures
- **Network Errors**: Timeout and connection error handling
- **HTTP Errors**: Proper handling of 4xx and 5xx status codes
- **Validation Errors**: Input validation with helpful error messages

All errors are returned in a consistent format with appropriate error codes and details.

## Troubleshooting

### Configuration Issues

If you're having trouble with configuration:

1. **Validate your configuration:**

   ```bash
   npm run validate
   ```

2. **Check your .env file:**

   ```bash
   cat .env
   ```

3. **Verify required environment variables are set:**
   - `API_BASE_URL` - Must be a valid URL
   - `API_AUTH_TYPE` - Must be 'basic', 'token', or 'none'
   - For token auth: `API_AUTH_TOKEN` must be set
   - For basic auth: `API_BASIC_AUTH_USERNAME` and `API_BASIC_AUTH_PASSWORD` must be set

### Common Issues

- **"Configuration validation failed"**: Check that all required environment variables are set correctly
- **"API base URL is not accessible"**: Verify the URL is correct and the API is running
- **Authentication errors**: Verify your credentials are correct for the API
- **Build errors**: Make sure you have Node.js 18+ and run `npm install`

### Debug Mode

Enable debug logging to get more detailed information:

```bash
# Using .env file
echo "DEBUG=true" >> .env

# Using environment variable
DEBUG=true npm start

# Using command line flag
npm start -- --debug
```

## Logging

The server includes structured logging:

- **Info Level**: Server startup, configuration, and operation status
- **Warn Level**: Non-critical issues and warnings
- **Error Level**: Errors and exceptions with full context
- **Debug Level**: Detailed debugging information (enabled with `--debug` or `DEBUG=true`)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for your changes
5. Run the test suite (`npm test`)
6. Run linting (`npm run lint`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: Report bugs and request features on [GitHub Issues](https://github.com/your-org/restful-api-mcp-server/issues)
- **Documentation**: Full documentation available in the [docs](docs/) directory
- **Examples**: More examples available in the [examples](examples/) directory

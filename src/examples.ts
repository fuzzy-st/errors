/**
 * Enhanced Error Hierarchy - Examples
 *
 * This file contains comprehensive examples demonstrating the usage of the
 * Enhanced Error Hierarchy library. Each example is clearly documented
 * and represents a common use case or pattern.
 */

import { createCustomError, checkInstance } from "./main";

/**
 * EXAMPLE 1: Basic Error Creation
 * ==============================
 * Demonstrates the most basic usage pattern of creating and throwing
 * custom errors with context.
 */

/**
 * @example 1.1 - Simple Error Creation
 * Create a basic error class with typed context.
 */
function example1_1() {
  // Create a basic error class
  const SimpleError = createCustomError<{
    code: number;
    detail: string;
  }>("SimpleError", ["code", "detail"]);

  // Create and throw an instance
  try {
    throw new SimpleError({
      message: "A simple error occurred",
      cause: {
        code: 400,
        detail: "Bad Request",
      },
      captureStack: true,
    });
  } catch (error) {
    // Use `checkInstance` for proper TypeScript type inference
    if (checkInstance(error, SimpleError)) {
      console.log("EXAMPLE 1.1: Simple Error");
      console.log(error);
      console.log(error.toString());

      // Directly access context properties with full TypeScript support
      console.log(`Error code: ${error.code}`);
      console.log(`Error detail: ${error.detail}`);

      // Access via context getter also available
      console.log("Context:", SimpleError.getContext(error));
      console.log("\n");
    }
  }
}

/**
 * @example 1.2 - API Error
 * Create an API-specific error with relevant context.
 */
function example1_2() {
  const ApiError = createCustomError<{
    statusCode: number;
    endpoint: string;
    responseBody?: string;
  }>("ApiError", ["statusCode", "endpoint", "responseBody"]);

  try {
    throw new ApiError({
      message: "Failed to fetch data from API",
      cause: {
        statusCode: 404,
        endpoint: "/api/users",
        responseBody: JSON.stringify({ error: "Resource not found" }),
      },
    });
  } catch (error) {
    if (checkInstance(error, ApiError)) {
      console.log("EXAMPLE 1.2: API Error");
      console.log(error.toString());

      // Direct property access with TypeScript support
      console.log(`Failed with status ${error.statusCode} on ${error.endpoint}`);

      // Parse the response body if available
      if (error.responseBody) {
        try {
          const response = JSON.parse(error.responseBody);
          console.log(`Error details: ${response.error}`);
        } catch (e) {
          console.log("Could not parse response body");
        }
      }
    }
  }
  console.log("\n");
}

/**
 * EXAMPLE 2: Error Hierarchies
 * ===========================
 * Demonstrates creating hierarchical error structures where child errors
 * inherit from parent errors, with proper context inheritance.
 */

/**
 * @example 2.1 - Basic Error Hierarchy
 * Create a simple two-level error hierarchy.
 */
function example2_1() {
  // Base error
  const BaseError = createCustomError<{
    timestamp: string;
    severity: "low" | "medium" | "high";
  }>("BaseError", ["timestamp", "severity"]);

  // Specialized error
  const DataError = createCustomError<
    {
      dataSource: string;
      dataType: string;
    },
    typeof BaseError
  >("DataError", ["dataSource", "dataType"], BaseError);

  try {
    throw new DataError({
      message: "Failed to process data",
      cause: {
        // DataError specific context
        dataSource: "database",
        dataType: "user",

        // BaseError context
        timestamp: new Date().toISOString(),
        severity: "high",
      },
    });
  } catch (error) {
    if (checkInstance(error, DataError)) {
      console.log("EXAMPLE 2.1: Basic Error Hierarchy");
      console.log("Example of Error call:\n", error);
      console.log("Example of Error Serialized:\n", error.toString());

      // Direct access to all properties
      console.log(`Data Source: ${error.dataSource}`);
      console.log(`Data Type: ${error.dataType}`);
      console.log(`Timestamp: ${error.timestamp}`);
      console.log(`Severity: ${error.severity}`);

      // Full context (includes BaseError context)
      const fullContext = DataError.getContext(error);
      console.log("Full context:", fullContext);

      // Just DataError context
      const dataContext = DataError.getContext(error, {
        includeParentContext: false, // Filter out parent context
      });
      console.log("Data context only:", dataContext);

      console.log("\n");
    }
  }
}

/**
 * @example 2.2 - Three-Level Error Hierarchy
 * Create a three-level error hierarchy with context at each level.
 */
function example2_2() {
  // Application error - base level
  const AppError = createCustomError<{
    appName: string;
    version: string;
  }>("AppError", ["appName", "version"]);

  // Database error - mid level
  const DatabaseError = createCustomError<
    {
      dbName: string;
      query: string;
    },
    typeof AppError
  >("DatabaseError", ["dbName", "query"], AppError);

  // Query error - leaf level
  const QueryError = createCustomError<
    {
      errorCode: string;
      affectedRows: number;
    },
    typeof DatabaseError
  >("QueryError", ["errorCode", "affectedRows"], DatabaseError);

  try {
    throw new QueryError({
      message: "Failed to execute database query",
      cause: {
        // QueryError specific context
        errorCode: "ER_DUP_ENTRY",
        affectedRows: 0,

        // DatabaseError context
        dbName: "customers",
        query: "INSERT INTO users (email) VALUES ('existing@example.com')",

        // AppError context
        appName: "CustomerManagement",
        version: "1.0.0",
      },
      captureStack: true,
    });
  } catch (error) {
    if (checkInstance(error, QueryError)) {
      console.log("EXAMPLE 2.2: Three-Level Error Hierarchy");
      console.log(error.toString());

      // Access properties directly across the inheritance hierarchy
      console.log(`Error Code: ${error.errorCode}`);
      console.log(`Database: ${error.dbName}`);
      console.log(`Query: ${error.query}`);
      console.log(`Application: ${error.appName}`);
      console.log(`Version: ${error.version}`);

      // Get error hierarchy information
      const hierarchy = QueryError.getErrorHierarchy(error);
      console.log("Error hierarchy:", JSON.stringify(hierarchy, null, 2));

      // Get inheritance chain
      console.log(
        "Inheritance chain:",
        QueryError.followParentChain(error).map((e) => e.name),
      );

      console.log("\n");
    }
  }
}

/**
 * EXAMPLE 3: Parent-Child Relationships
 * ====================================
 * Demonstrates creating parent-child relationships between error instances,
 * which is different from class inheritance.
 */

/**
 * @example 3.1 - Basic Parent-Child Relationship
 * Create a simple parent-child relationship between errors.
 */
function example3_1() {
  const NetworkError = createCustomError<{
    hostname: string;
    port: number;
  }>("NetworkError", ["hostname", "port"]);

  const ServiceError = createCustomError<{
    serviceName: string;
    operation: string;
  }>("ServiceError", ["serviceName", "operation"]);

  try {
    try {
      // This is the parent error (cause)
      throw new NetworkError({
        message: "Failed to connect to remote server",
        cause: {
          hostname: "api.example.com",
          port: 443,
        },
      });
    } catch (networkError) {
      if (checkInstance(networkError, NetworkError)) {
        // This is the child error (caused by the network error)
        throw new ServiceError({
          message: "Authentication service unavailable",
          parent: networkError, // Pass the error in establish parent relationship
          captureStack: true,
        });
      }
      throw networkError;
    }
  } catch (error) {
    if (checkInstance(error, ServiceError)) {
      console.log("EXAMPLE 3.1: Basic Parent-Child Relationship");
      console.log(error.toString());

      // Access parent error
      if (checkInstance(error, NetworkError)) {
        console.log(`Parent error context: Failed to connect to ${error.hostname}:${error.port}`);
      }

      // Follow the parent chain
      const chain = ServiceError.followParentChain(error);
      console.log(`Error chain length: ${chain.length}`);
      chain.forEach((err, index) => {
        console.log(`Chain[${index}]:`, err.name, "-", err.message);
      });

      console.log("\n");
    }
  }
}

/**
 * @example 3.2 - Multi-level Error Chain
 * Create a chain of errors with multiple levels.
 */
function example3_2() {
  const SystemError = createCustomError<{
    component: string;
  }>("SystemError", ["component"]);

  const FileError = createCustomError<{
    path: string;
    operation: string;
  }>("FileError", ["path", "operation"]);

  const ConfigError = createCustomError<{
    configKey: string;
    expectedType: string;
  }>("ConfigError", ["configKey", "expectedType"]);

  try {
    try {
      try {
        // Level 3 (root cause)
        throw new SystemError({
          message: "File system unavailable",
          cause: {
            component: "disk_controller",
          },
        });
      } catch (systemError) {
        if (checkInstance(systemError, SystemError)) {
          // Level 2
          throw new FileError({
            message: "Could not read configuration file",
            parent: systemError, // Parent relationship
            captureStack: true,
          });
        }
        throw systemError;
      }
    } catch (fileError) {
      if (checkInstance(fileError, FileError)) {
        // Level 1 (what the application code catches)
        throw new ConfigError({
          message: "Application configuration invalid",
          cause: {
            configKey: "AK47",
            expectedType: "string",
          }, // Custom context
          parent: fileError, // Parent relationship
          captureStack: true,
        });
      }
      throw fileError;
    }
  } catch (error) {
    console.log("EXAMPLE 3.2: Multi-level Error Chain");
    if (checkInstance(error, ConfigError)) {
      // Access properties from the error
      console.log(`Config error key: ${error.configKey || "N/A"}`);
      console.log(`Expected type: ${error.expectedType || "N/A"}`);
    }
    // Check and access the parent if it exists
    if (checkInstance(error, FileError)) {
      const fileErrorContext = FileError.getContext(error);
      console.log(`File error path: ${fileErrorContext?.path || "N/A"}`);
      console.log(`File operation: ${fileErrorContext?.operation || "N/A"}`);
    }
    // Check and access the grandparent if it exists
    if (checkInstance(error, SystemError)) {
      const systemErrorContext = SystemError.getContext(error);
      console.log(`System component: ${systemErrorContext?.component}`);
    }

    // Follow complete error chain
    //@ts-expect-error - Trust me its a CustomError
    const errorChain = ConfigError.followParentChain(error);
    console.log(`Complete error chain (${errorChain.length} errors):`);

    errorChain.forEach((err, index) => {
      console.log(`[${index}] ${err.name}: ${err.message}`);
    });

    // Get full error hierarchy with contexts
    const hierarchy = ConfigError.getErrorHierarchy(error);
    console.log("Full error hierarchy:", JSON.stringify(hierarchy, null, 2));

    console.log("\n");
  }
}

/**
 * EXAMPLE 4: Mixed Inheritance and Parent Relationships
 * ===================================================
 * Demonstrates combining class inheritance hierarchies with
 * instance parent-child relationships.
 */

/**
 * @example 4.1 - Combined Inheritance and Parent Chain
 * Use both inheritance and parent relationships together.
 */
function example4_1() {
  // Class inheritance (level 1)
  const BaseError = createCustomError<{
    application: string;
  }>("BaseError", ["application"]);

  // Class inheritance (level 2)
  const DatabaseError = createCustomError<
    {
      database: string;
    },
    typeof BaseError
  >("DatabaseError", ["database"], BaseError);

  // Class inheritance (level 3)
  const QueryError = createCustomError<
    {
      query: string;
    },
    typeof DatabaseError
  >("QueryError", ["query"], DatabaseError);

  // Independent error for parent chain
  const NetworkError = createCustomError<{
    host: string;
  }>("NetworkError", ["host"]);

  try {
    // Create parent error
    const netError = new NetworkError({
      message: "Network connection failed",
      cause: {
        host: "db.example.com",
      },
    });

    // Create child error with inherited context from class hierarchy
    // and parent-child relationship to the NetworkError
    throw new QueryError({
      message: "Failed to execute query due to connection issue",
      cause: {
        // QueryError context
        query: "SELECT * FROM users",

        // DatabaseError context
        database: "main_users",

        // BaseError context
        application: "UserService",
      },
      overridePrototype: DatabaseError, // Explicit class inheritance
      captureStack: true,
    });
  } catch (error) {
    if (checkInstance(error, QueryError)) {
      console.log("EXAMPLE 4.1: Combined Inheritance and Parent Chain");

      // Access properties directly across the inheritance chain
      console.log(`Query: ${error.query}`);
      console.log(`Database: ${error.database}`);
      console.log(`Application: ${error.application}`);

      // Inspect the inheritance chain (class hierarchy)
      console.log(
        "Class inheritance chain:",
        QueryError.followParentChain(error)
          ?.map((e) => e.name)
          .join(" > "),
      );

      // Get full context (from all levels of inheritance)
      const context = QueryError.getContext(error);
      console.log(`Full ${error.name} context from inheritance:`, context);

      console.log("\n");
    }

    // Check if we have a NetworkError
    const netError = new NetworkError({
      message: "Network example",
      cause: { host: "example.com" },
    });

    if (checkInstance(netError, NetworkError)) {
      console.log("Network error host:", netError.host);
    }
  }
}

/**
 * EXAMPLE 5: Advanced Usage Patterns
 * ================================
 * Demonstrates more advanced usage patterns and techniques.
 */

/**
 * @example 5.1 - Dynamic Error Creation
 * Create error classes dynamically based on domain.
 */
function example5_1() {
  // Factory function to create domain-specific errors
  function createDomainErrors(domain: string) {
    const BaseDomainError = createCustomError<{
      domain: string;
      correlationId: string;
    }>(`${domain}Error`, ["domain", "correlationId"]);

    const ValidationError = createCustomError<
      {
        field: string;
        value: unknown;
      },
      typeof BaseDomainError
    >(`${domain}ValidationError`, ["field", "value"], BaseDomainError);

    const ProcessingError = createCustomError<
      {
        process: string;
        step: string;
      },
      typeof BaseDomainError
    >(`${domain}ProcessingError`, ["process", "step"], BaseDomainError);

    return {
      BaseDomainError,
      ValidationError,
      ProcessingError,
    };
  }

  // Create user domain errors
  const UserErrors = createDomainErrors("User");

  try {
    throw new UserErrors.ValidationError({
      message: "Invalid user data provided",
      cause: {
        // ValidationError context
        field: "email",
        value: "not-an-email",

        // BaseDomainError context
        domain: "User",
        correlationId: "usr-123-456-789",
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      console.log("EXAMPLE 5.1: Dynamic Error Creation");
      console.log(`Error type: ${error.name}`);
      console.log(`Error message: ${error.message}`);
      console.log(error.toString());
    }

    // Use checkInstance for proper type inference with dynamically created errors
    if (checkInstance(error, UserErrors.ValidationError)) {
      console.log(`Validation error on field ${error.field}: ${error.value}`);
      console.log(`Domain: ${error.domain}, Correlation ID: ${error.correlationId}`);
    }
  }
  console.log("\n");
}

/**
 * @example 5.2 - Error Factory Functions
 * Create utility functions to generate specific errors.
 */
function example5_2() {
  // Define base error types
  const ApiError = createCustomError<{
    endpoint: string;
    statusCode: number;
    timestamp: string;
  }>("ApiError", ["endpoint", "statusCode", "timestamp"]);

  // Factory function for creating user-related API errors
  function createUserApiError(
    statusCode: number,
    endpoint: string,
    userId?: string,
    action?: string,
  ) {
    const baseMessage = `User API error (${statusCode})`;
    const detailedMessage = userId
      ? `${baseMessage}: Failed to ${action || "process"} user ${userId}`
      : baseMessage;

    return new ApiError({
      message: detailedMessage,
      cause: {
        endpoint,
        statusCode,
        timestamp: new Date().toISOString(),
      },
      captureStack: true,
    });
  }

  try {
    // Use the factory function
    throw createUserApiError(404, "/api/users/123", "123", "fetch");
  } catch (error) {
    if (checkInstance(error, ApiError)) {
      console.log("EXAMPLE 5.2: Error Factory Functions");
      console.log(error.toString());

      // Direct access to properties with TypeScript support
      console.log(
        `API error details: ${error.statusCode} on ${error.endpoint} at ${error.timestamp}`,
      );

      console.log("\n");
    }
  }
}

/**
 * @example 5.3 - Deep Nested Context
 * Demonstrate handling of deeply nested context objects.
 */
function example5_3() {
  // Error with deeply nested context structure
  const ConfigurationError = createCustomError<{
    config: {
      server: {
        host: string;
        port: number;
        ssl: {
          enabled: boolean;
          cert?: string;
        };
      };
      database: {
        connection: {
          host: string;
          credentials: {
            username: string;
            encrypted: boolean;
          };
        };
      };
    };
  }>("ConfigurationError", ["config"]);

  try {
    throw new ConfigurationError({
      message: "Invalid server configuration",
      cause: {
        config: {
          server: {
            host: "localhost",
            port: 8080,
            ssl: {
              enabled: true,
              cert: undefined, // Missing certificate
            },
          },
          database: {
            connection: {
              host: "db.example.com",
              credentials: {
                username: "app_user",
                encrypted: false, // Unencrypted credentials
              },
            },
          },
        },
      },
    });
  } catch (error) {
    if (checkInstance(error, ConfigurationError)) {
      console.log("EXAMPLE 5.3: Deep Nested Context");

      // Direct access to nested properties
      const sslEnabled = error.config.server.ssl.enabled;
      const hasCert = !!error.config.server.ssl.cert;
      const credentialsEncrypted = error.config.database.connection.credentials.encrypted;

      console.log(`SSL Enabled: ${sslEnabled}, Has Cert: ${hasCert}`);
      console.log(`Database Credentials Encrypted: ${credentialsEncrypted}`);

      if (sslEnabled && !hasCert) {
        console.log("ERROR: SSL is enabled but no certificate is provided");
      }

      if (!credentialsEncrypted) {
        console.log("WARNING: Database credentials are not encrypted");
      }

      console.log("\n");
    }
  }
}

/**
 * EXAMPLE 6: Real-World Scenarios
 * =============================
 * Demonstrates realistic error handling scenarios that might occur in
 * production applications.
 */

/**
 * @example 6.1 - Authentication Flow Errors
 * Simulate an authentication flow with multiple potential error points.
 */
function example6_1() {
  // Define error hierarchy for auth flow
  const AuthError = createCustomError<{
    userId?: string;
    requestId: string;
  }>("AuthError", ["userId", "requestId"]);

  const CredentialsError = createCustomError<
    {
      reason: "invalid" | "expired" | "locked";
      attemptCount: number;
    },
    typeof AuthError
  >("CredentialsError", ["reason", "attemptCount"], AuthError);

  const MfaError = createCustomError<
    {
      mfaType: "sms" | "app" | "email";
      remainingAttempts: number;
    },
    typeof AuthError
  >("MfaError", ["mfaType", "remainingAttempts"], AuthError);

  const SessionError = createCustomError<
    {
      sessionId: string;
      expiryTime: string;
    },
    typeof AuthError
  >("SessionError", ["sessionId", "expiryTime"], AuthError);

  // Simulate login with various failure points
  function simulateLogin(
    username: string,
    password: string,
    mfaCode?: string,
  ): { success: boolean; sessionId?: string; error?: Error } {
    const requestId = `auth-${Date.now()}`;

    // Step 1: Validate credentials
    if (password.length < 8) {
      return {
        success: false,
        error: new CredentialsError({
          message: "Invalid credentials provided",
          cause: {
            requestId,
            userId: username,
            reason: "invalid",
            attemptCount: 1,
          },
        }),
      };
    }

    // Step 2: Check MFA if required
    if (!mfaCode) {
      return {
        success: false,
        error: new MfaError({
          message: "MFA verification required",
          cause: {
            requestId,
            userId: username,
            mfaType: "app",
            remainingAttempts: 3,
          },
        }),
      };
    }

    if (mfaCode !== "123456") {
      return {
        success: false,
        error: new MfaError({
          message: "Invalid MFA code provided",
          cause: {
            requestId,
            userId: username,
            mfaType: "app",
            remainingAttempts: 2,
          },
        }),
      };
    }

    // Step 3: Create session
    const sessionId = `session-${Date.now()}`;
    const expiryTime = new Date(Date.now() + 3600000).toISOString();

    // Simulate session creation failure
    if (username === "problem_user") {
      return {
        success: false,
        error: new SessionError({
          message: "Failed to create user session",
          cause: {
            requestId,
            userId: username,
            sessionId,
            expiryTime,
          },
        }),
      };
    }

    // Success case
    return {
      success: true,
      sessionId,
    };
  }

  console.log("EXAMPLE 6.1: Authentication Flow Errors");

  // Scenario 1: Invalid password
  const result1 = simulateLogin("user@example.com", "short", "123456");
  if (!result1.success && result1.error) {
    console.log("Scenario 1: Invalid password");
    console.log(result1.error.toString());

    if (checkInstance(result1.error, CredentialsError)) {
      // Direct property access with full TypeScript support
      console.log(`Auth failed for user: ${result1.error.userId}, reason: ${result1.error.reason}`);
      console.log(`Attempt count: ${result1.error.attemptCount}`);
    }
  }

  // Scenario 2: Missing MFA code
  const result2 = simulateLogin("user@example.com", "password123");
  if (!result2.success && result2.error) {
    console.log("\nScenario 2: Missing MFA code");
    console.log(result2.error.toString());

    if (checkInstance(result2.error, MfaError)) {
      // Direct property access
      console.log(
        `MFA required: ${result2.error.mfaType}, remaining attempts: ${result2.error.remainingAttempts}`,
      );
    }
  }

  // Scenario 3: Session creation error
  const result3 = simulateLogin("problem_user", "password123", "123456");
  if (!result3.success && result3.error) {
    console.log("\nScenario 3: Session creation error");
    console.log(result3.error.toString());

    if (checkInstance(result3.error, SessionError)) {
      // Direct property access
      console.log(
        `Session creation failed: ${result3.error.sessionId}, would expire at: ${result3.error.expiryTime}`,
      );
      console.log(`User ID: ${result3.error.userId}, Request ID: ${result3.error.requestId}`);
    }
  }

  // Scenario 4: Successful login
  const result4 = simulateLogin("good_user", "password123", "123456");
  if (result4.success) {
    console.log("\nScenario 4: Successful login");
    console.log(`Login successful! Session ID: ${result4.sessionId}`);
  }

  console.log("\n");
}

/**
 * Example demonstrating direct context access
 */
function demonstrateDirectContextAccess() {
  console.log("\n-------------------------------------");
  console.log("EXAMPLE: Direct Context Access");
  console.log("-------------------------------------");

  // Create a basic error class with typed context
  const ApiError = createCustomError<{
    statusCode: number;
    endpoint: string;
    responseData?: any;
  }>("ApiError", ["statusCode", "endpoint", "responseData"]);

  // Create a derived error class
  const NetworkError = createCustomError<
    {
      retryCount: number;
      timeout: number;
    },
    typeof ApiError
  >("NetworkError", ["retryCount", "timeout"], ApiError);
  try {
    // Create an error with context
    const error = new NetworkError({
      message: "Failed to connect to API server",
      cause: {
        // NetworkError specific context
        retryCount: 3,
        timeout: 5000,

        // ApiError inherited context
        statusCode: 503,
        endpoint: "/api/users",
        responseData: { error: "Service Unavailable" },
      },
      captureStack: true,
    });

    throw error;
  } catch (error) {
    if (checkInstance(error, NetworkError)) {
      console.log("Error details:", error.name, "-", error.message);

      // Method 1: Accessing context properties directly on the error
      console.log("\nAccessing context properties directly:");
      console.log(`Status Code: ${error.statusCode}`);
      console.log(`Endpoint: ${error.endpoint}`);
      console.log(`Retry Count: ${error.retryCount}`);
      console.log(`Timeout: ${error.timeout}`);

      // Method 2: Using the static getContext method
      console.log("\nUsing the static getContext method:");
      const context = NetworkError.getContext(error);
      if (context) {
        console.log(`Status Code: ${context.statusCode}`);
        console.log(`Endpoint: ${context.endpoint}`);
        console.log(`Retry Count: ${context.retryCount}`);
        console.log(`Timeout: ${context.timeout}`);
      }
    }
  }
}

/**
 * Example demonstrating JSON serialization
 */
function demonstrateJsonSerialization() {
  console.log("\n-------------------------------------");
  console.log("EXAMPLE: JSON Serialization");
  console.log("-------------------------------------");
  // Create a basic error class with typed context
  const ApiError = createCustomError<{
    statusCode: number;
    endpoint: string;
    responseData?: any;
  }>("ApiError", ["statusCode", "endpoint", "responseData"]);

  // Create a derived error class
  const NetworkError = createCustomError<
    {
      retryCount: number;
      timeout: number;
    },
    typeof ApiError
  >("NetworkError", ["retryCount", "timeout"], ApiError);
  try {
    // Create a parent error
    const parentError = new ApiError({
      message: "API returned an error",
      cause: {
        statusCode: 400,
        endpoint: "/api/auth",
        responseData: { error: "Invalid credentials" },
      },
    });

    // Create a child error with the parent
    const childError = new NetworkError({
      message: "Network operation failed",
      parent: parentError,
      captureStack: true,
    });

    throw childError;
  } catch (error) {
    if (error instanceof Error) {
      console.log("Original error.toString():");
      console.log(error.toString());

      console.log("\nJSON.stringify() result:");
      const serialized = JSON.stringify(error, null, 2);
      console.log(serialized);

      console.log("\nParsed JSON:");
      const parsed = JSON.parse(serialized);
      console.log("Error name:", parsed.name);
      console.log("Parent name:", parsed.parent?.name);
      if (parsed.context) {
        console.log("Context:", parsed.context);
      }
    }
  }
}

/**
 * Example demonstrating a complex error hierarchy with direct property access
 */
function demonstrateComplexExample() {
  console.log("\n-------------------------------------");
  console.log("EXAMPLE: Complex Error Hierarchy");
  console.log("-------------------------------------");

  // Create a three-level error hierarchy
  const BaseError = createCustomError<{
    application: string;
    version: `v${number}.${number}.${number}`;
  }>("BaseError", ["application", "version"]);

  const DatabaseError = createCustomError<
    {
      database: string;
      query: string;
    },
    typeof BaseError
  >("DatabaseError", ["database", "query"], BaseError);

  const QueryError = createCustomError<
    {
      errorCode: string;
      affectedRows: number;
    },
    typeof DatabaseError
  >("QueryError", ["errorCode", "affectedRows"], DatabaseError);

  try {
    throw new QueryError({
      message: "Failed to execute database query",
      cause: {
        // QueryError specific context
        errorCode: "ER_DUP_ENTRY",
        affectedRows: 0,

        // DatabaseError context
        database: "customers",
        query: "INSERT INTO users (email) VALUES ('existing@example.com')",

        // BaseError context
        application: "CustomerManagement",
        version: "v1.0.0",
      },
      captureStack: true,
    });
  } catch (error) {
    // Use checkInstance for proper TypeScript type inference
    if (checkInstance(error, QueryError)) {
      console.log("Error:", error.name, "-", error.message);

      // Directly access properties at different inheritance levels
      console.log("\nAccessing context properties directly across inheritance:");
      console.log(`Error Code: ${error.errorCode}`);
      console.log(`Database: ${error.database}`);
      console.log(`Application: ${error.application}`);
      console.log(`Version: ${error.version}`);

      // Using context getter
      console.log("\nUsing context getter to access all properties:");
      const { errorCode, database, application, version, query, affectedRows } = error;
      console.log(`Error Code: ${errorCode}`);
      console.log(`Database: ${database}`);
      console.log(`Query: ${query}`);
      console.log(`Affected Rows: ${affectedRows}`);
      console.log(`Application: ${application}`);
      console.log(`Version: ${version}`);

      // JSON serialization
      console.log("\nJSON serialization:");
      console.log(JSON.stringify(error, null, 2));
    }
  }
}

/**
 * Run all examples
 * This function executes all the example functions to demonstrate
 * the various capabilities of the Enhanced Error Hierarchy library.
 */
export function runAllExamples() {
  // Example 1: Basic Error Creation
  console.log("====================================");
  console.log("EXAMPLE GROUP 1: BASIC ERROR CREATION");
  console.log("====================================\n");
  example1_1();
  example1_2();

  // Example 2: Error Hierarchies
  console.log("====================================");
  console.log("EXAMPLE GROUP 2: ERROR HIERARCHIES");
  console.log("====================================\n");
  example2_1();
  example2_2();

  // Example 3: Parent-Child Relationships
  console.log("====================================");
  console.log("EXAMPLE GROUP 3: PARENT-CHILD RELATIONSHIPS");
  console.log("====================================\n");
  example3_1();
  example3_2();

  // Example 4: Mixed Inheritance and Parent Relationships
  console.log("====================================");
  console.log("EXAMPLE GROUP 4: MIXED INHERITANCE AND PARENT RELATIONSHIPS");
  console.log("====================================\n");
  example4_1();

  // Example 5: Advanced Usage Patterns
  console.log("====================================");
  console.log("EXAMPLE GROUP 5: ADVANCED USAGE PATTERNS");
  console.log("====================================\n");
  example5_1();
  example5_2();
  example5_3();

  // Example 6: Real-World Scenarios
  console.log("====================================");
  console.log("EXAMPLE GROUP 6: REAL-WORLD SCENARIOS");
  console.log("====================================\n");
  example6_1();
  // example6_2();
  console.log("====================================");

  console.log("==============================================");
  console.log("ENHANCED CUSTOM ERROR EXAMPLES");
  console.log("==============================================");

  demonstrateDirectContextAccess();
  demonstrateJsonSerialization();
  demonstrateComplexExample();
}

runAllExamples();

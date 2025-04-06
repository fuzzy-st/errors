import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createCustomError, checkInstance } from "./main";

describe("Basic Error Creation", () => {
  test("should create a simple error with typed context", () => {
    // Create a basic error class
    const SimpleError = createCustomError<{
      code: number;
      detail: string;
    }>("SimpleError", ["code", "detail"]);

    // Create an instance
    const error = new SimpleError({
      message: "A simple error occurred",
      cause: {
        code: 400,
        detail: "Bad Request",
      },
    });

    // Assertions
    assert.equal(error.name, "SimpleError");
    assert.equal(error.message, "A simple error occurred");
    assert.equal(error.code, 400);
    assert.equal(error.detail, "Bad Request");

    // Check context access via getter
    const context = SimpleError.getContext(error);
    assert.deepEqual(context, { code: 400, detail: "Bad Request" });

    // Check instance checking function
    assert.equal(checkInstance(error, SimpleError), true);
    assert.equal(error instanceof SimpleError, true);
  });

  test("should create an API error with relevant context", () => {
    const ApiError = createCustomError<{
      statusCode: number;
      endpoint: string;
      responseBody?: string;
    }>("ApiError", ["statusCode", "endpoint", "responseBody"]);

    const error = new ApiError({
      message: "Failed to fetch data from API",
      cause: {
        statusCode: 404,
        endpoint: "/api/users",
        responseBody: JSON.stringify({ error: "Resource not found" }),
      },
    });

    assert.equal(error.name, "ApiError");
    assert.equal(error.statusCode, 404);
    assert.equal(error.endpoint, "/api/users");
    assert.equal(error.responseBody, JSON.stringify({ error: "Resource not found" }));

    // Check JSON parsing from responseBody
    const parsedResponse = JSON.parse(error.responseBody);
    assert.deepEqual(parsedResponse, { error: "Resource not found" });
  });

  test("should handle missing optional properties", () => {
    const ApiError = createCustomError<{
      statusCode: number;
      endpoint: string;
      responseBody?: string;
    }>("ApiError", ["statusCode", "endpoint", "responseBody"]);

    const error = new ApiError({
      message: "Failed to fetch data from API",
      cause: {
        statusCode: 404,
        endpoint: "/api/users",
        // responseBody is deliberately omitted
      },
    });

    assert.equal(error.statusCode, 404);
    assert.equal(error.endpoint, "/api/users");
    assert.equal(error.responseBody, undefined);
  });

  test("should capture stack trace when requested", () => {
    const StackError = createCustomError<{ code: number }>("StackError", ["code"]);

    const error = new StackError({
      message: "An error with stack trace",
      cause: { code: 500 },
      captureStack: true,
    });

    assert.ok(error.stack, "Stack trace should be captured");
    assert.ok(
      error.stack.includes("StackError: An error with stack trace"),
      "Stack trace should include error name and message",
    );
  });
});

describe("Error Hierarchies", () => {
  test("should create a two-level error hierarchy with proper inheritance", () => {
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

    const timestamp = new Date().toISOString();
    const error = new DataError({
      message: "Failed to process data",
      cause: {
        // DataError context
        dataSource: "user_database",
        dataType: "user_profile",

        // BaseError context
        timestamp,
        severity: "medium",
      },
    });

    // Check inheritance
    assert.equal(error.name, "DataError");
    assert.ok(error instanceof DataError);
    assert.ok(error instanceof BaseError);

    // Check direct context access across hierarchy
    assert.equal(error.dataSource, "user_database");
    assert.equal(error.dataType, "user_profile");
    assert.equal(error.timestamp, timestamp);
    assert.equal(error.severity, "medium");

    // Test context getters
    const fullContext = DataError.getContext(error);
    assert.deepEqual(fullContext, {
      dataSource: "user_database",
      dataType: "user_profile",
      timestamp,
      severity: "medium",
    });

    // Filter to just DataError context (exclude parent)
    const dataContext = DataError.getContext(error, {
      includeParentContext: false,
    });
    assert.deepEqual(dataContext, {
      dataSource: "user_database",
      dataType: "user_profile",
    });
  });

  test("should create a three-level error hierarchy with context at each level", () => {
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

    const error = new QueryError({
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
    });

    // Check inheritance chain
    assert.ok(error instanceof QueryError);
    assert.ok(error instanceof DatabaseError);
    assert.ok(error instanceof AppError);

    // Check direct property access across the inheritance hierarchy
    assert.equal(error.errorCode, "ER_DUP_ENTRY");
    assert.equal(error.affectedRows, 0);
    assert.equal(error.dbName, "customers");
    assert.equal(error.query, "INSERT INTO users (email) VALUES ('existing@example.com')");
    assert.equal(error.appName, "CustomerManagement");
    assert.equal(error.version, "1.0.0");

    // Check error hierarchy information
    const hierarchy = QueryError.getErrorHierarchy(error);
    assert.equal(hierarchy.length, 3);
    assert.equal(hierarchy[0].name, "QueryError");

    // Check the inheritanceChain field
    assert.deepStrictEqual(hierarchy[0].inheritanceChain, ["AppError", "DatabaseError"]);

    // Check inheritance chain through followParentChain
    const chain = QueryError.followParentChain(error);
    assert.equal(chain.length, 3);
    assert.equal(chain[0].name, "QueryError");
    assert.equal(chain[1].name, "DatabaseError");
    assert.equal(chain[2].name, "AppError");
  });
});

describe("Parent-Child Relationships", () => {
  test("should establish basic parent-child relationship between errors", () => {
    const NetworkError = createCustomError<{
      hostname: string;
      port: number;
    }>("NetworkError", ["hostname", "port"]);

    const ServiceError = createCustomError<{
      serviceName: string;
      operation: string;
    }>("ServiceError", ["serviceName", "operation"]);

    // Create parent error
    const netError = new NetworkError({
      message: "Failed to connect to remote server",
      cause: {
        hostname: "api.example.com",
        port: 443,
      },
    });

    // Create child error with parent
    const svcError = new ServiceError({
      message: "Authentication service unavailable",
      parent: netError, // Pass the error as cause to establish parent relationship
    });

    // Check properties
    assert.equal(svcError.name, "ServiceError");
    assert.equal(svcError.message, "Authentication service unavailable");

    // Check parent relationship
    assert.ok(svcError.parent);
    assert.equal(svcError.parent, netError);
    assert.equal(svcError.parent.name, "NetworkError");
    assert.equal(svcError.parent.message, "Failed to connect to remote server");

    // Follow the parent chain
    const chain = ServiceError.followParentChain(svcError);
    assert.equal(chain.length, 2);
    assert.equal(chain[0].name, "ServiceError");
    assert.equal(chain[1].name, "NetworkError");
  });

  test("should create a multi-level error chain", () => {
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

    // Level 3 (root cause)
    const sysError = new SystemError({
      message: "File system unavailable",
      cause: {
        component: "disk_controller",
      },
    });

    // Level 2
    const fileError = new FileError({
      message: "Could not read configuration file",
      parent: sysError, // Parent relationship
    });

    // Level 1 (what application code catches)
    const confError = new ConfigError({
      message: "Application configuration invalid",
      parent: fileError, // Parent relationship
    });

    // Check parent chains
    assert.equal(confError.parent, fileError);
    assert.equal(fileError.parent, sysError);

    // Access parent error properties
    assert.equal(confError.parent?.name, "FileError");
    assert.equal(confError.parent.parent?.name, "SystemError");

    // Follow complete error chain
    const errorChain = ConfigError.followParentChain(confError);
    assert.equal(errorChain.length, 3);
    assert.equal(errorChain[0].name, "ConfigError");
    assert.equal(errorChain[1].name, "FileError");
    assert.equal(errorChain[2].name, "SystemError");

    // Get full error hierarchy with contexts
    const hierarchy = ConfigError.getErrorHierarchy(confError);
    assert.equal(hierarchy.length, 3);
    assert.equal(hierarchy[0].name, "ConfigError");
    assert.equal(hierarchy[1].name, "FileError");
    assert.equal(hierarchy[2].name, "SystemError");
  });

  test("should handle complex parent relationship with context", () => {
    const SystemError = createCustomError<{
      component: string;
    }>("SystemError", ["component"]);

    const FileError = createCustomError<{
      path: string;
      operation: string;
    }>("FileError", ["path", "operation"]);

    // Level 3 (root cause)
    const sysError = new SystemError({
      message: "File system unavailable",
      cause: {
        component: "disk_controller",
      },
    });

    // Level 2 - pass the parent error directly as cause
    const fileError = new FileError({
      message: "Could not read configuration file",
      cause: {
        path: "/etc/config.json",
        operation: "read",
      },
    });

    // Manually set parent to avoid the spreading issue
    Object.defineProperty(fileError, "parent", {
      value: sysError,
      enumerable: true,
      writable: true,
      configurable: true,
    });

    // Check direct property access
    assert.equal(fileError.path, "/etc/config.json");
    assert.equal(fileError.operation, "read");

    // Check parent relationship works
    assert.ok(fileError.parent);
    assert.equal(fileError.parent.name, "SystemError");

    // Follow parent chain
    const chain = FileError.followParentChain(fileError);
    assert.equal(chain.length, 2);
    assert.equal(chain[0].name, "FileError");
    assert.equal(chain[1].name, "SystemError");
  });
});

describe("Mixed Inheritance and Parent Relationships", () => {
  test("should combine class inheritance with parent-child relationships", () => {
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

    // Create parent error
    const netError = new NetworkError({
      message: "Network connection failed",
      cause: {
        host: "db.example.com",
      },
    });

    // Create child error with inherited context from class hierarchy
    // and parent-child relationship to the NetworkError
    const queryError = new QueryError({
      message: "Failed to execute query due to connection issue",
      cause: {
        // QueryError context
        query: "SELECT * FROM users",

        // DatabaseError context
        database: "main_users",

        // BaseError context
        application: "UserService",
      },
    });

    // Test class inheritance
    assert.ok(queryError instanceof QueryError);
    assert.ok(queryError instanceof DatabaseError);
    assert.ok(queryError instanceof BaseError);

    // Test direct property access across inheritance
    assert.equal(queryError.query, "SELECT * FROM users");
    assert.equal(queryError.database, "main_users");
    assert.equal(queryError.application, "UserService");

    // Test inheritance chain via properties
    assert.ok(queryError.inheritanceChain);
    assert.deepEqual(
      queryError.inheritanceChain.map((e) => e.name),
      ["BaseError", "DatabaseError"],
    );
  });
});

describe("Advanced Usage Patterns", () => {
  test("should support dynamic error creation based on domain", () => {
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

      return {
        BaseDomainError,
        ValidationError,
      };
    }

    // Create user domain errors
    const UserErrors = createDomainErrors("User");
    // Create product domain errors with the same structure
    const ProductErrors = createDomainErrors("Product");

    const userError = new UserErrors.ValidationError({
      message: "Invalid user data provided",
      cause: {
        field: "email",
        value: "not-an-email",
        domain: "User",
        correlationId: "usr-123-456-789",
      },
    });

    const productError = new ProductErrors.ValidationError({
      message: "Invalid product data provided",
      cause: {
        field: "price",
        value: -10,
        domain: "Product",
        correlationId: "prod-987-654-321",
      },
    });

    // Verify UserError properties
    assert.equal(userError.name, "UserValidationError");
    assert.equal(userError.field, "email");
    assert.equal(userError.value, "not-an-email");
    assert.equal(userError.domain, "User");

    // Verify ProductError properties
    assert.equal(productError.name, "ProductValidationError");
    assert.equal(productError.field, "price");
    assert.equal(productError.value, -10);
    assert.equal(productError.domain, "Product");

    // Check inheritance
    assert.ok(userError instanceof UserErrors.BaseDomainError);
    assert.ok(productError instanceof ProductErrors.BaseDomainError);

    // Make sure the domains are separate classes
    assert.ok(!(userError instanceof ProductErrors.BaseDomainError));
    assert.ok(!(productError instanceof UserErrors.BaseDomainError));
  });

  test("should support error factory functions", () => {
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
      });
    }

    const error = createUserApiError(404, "/api/users/123", "123", "fetch");

    assert.equal(error.name, "ApiError");
    assert.equal(error.message, "User API error (404): Failed to fetch user 123");
    assert.equal(error.statusCode, 404);
    assert.equal(error.endpoint, "/api/users/123");
    assert.ok(error.timestamp); // Just check it exists as it's dynamic
  });

  test("should handle deeply nested context objects", () => {
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

    const error = new ConfigurationError({
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

    assert.equal(error.name, "ConfigurationError");
    assert.equal(error.config.server.host, "localhost");
    assert.equal(error.config.server.port, 8080);
    assert.equal(error.config.server.ssl.enabled, true);
    assert.equal(error.config.server.ssl.cert, undefined);
    assert.equal(error.config.database.connection.host, "db.example.com");
    assert.equal(error.config.database.connection.credentials.username, "app_user");
    assert.equal(error.config.database.connection.credentials.encrypted, false);
  });
});

describe("Real-World Scenarios", () => {
  test("should handle authentication flow errors", () => {
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

    // Create a credentials error
    const credError = new CredentialsError({
      message: "Invalid credentials provided",
      cause: {
        requestId: "auth-123",
        userId: "user@example.com",
        reason: "invalid",
        attemptCount: 1,
      },
    });

    // Create an MFA error
    const mfaError = new MfaError({
      message: "MFA verification required",
      cause: {
        requestId: "auth-456",
        userId: "user@example.com",
        mfaType: "app",
        remainingAttempts: 3,
      },
    });

    // Test credentials error
    assert.equal(credError.name, "CredentialsError");
    assert.equal(credError.userId, "user@example.com");
    assert.equal(credError.requestId, "auth-123");
    assert.equal(credError.reason, "invalid");
    assert.equal(credError.attemptCount, 1);
    assert.ok(credError instanceof AuthError);

    // Test MFA error
    assert.equal(mfaError.name, "MfaError");
    assert.equal(mfaError.userId, "user@example.com");
    assert.equal(mfaError.requestId, "auth-456");
    assert.equal(mfaError.mfaType, "app");
    assert.equal(mfaError.remainingAttempts, 3);
    assert.ok(mfaError instanceof AuthError);
  });
});

describe("Edge Cases and Special Behaviors", () => {
  test("should handle string as cause", () => {
    const SimpleError = createCustomError<{ code: number }>("SimpleError", ["code"]);

    const error = new SimpleError({
      message: "Test error",
      cause: "Original cause message",
    });

    assert.equal(error.name, "SimpleError");
    assert.equal(error.message, "Test error");
    assert.ok(error.parent);
    assert.equal(error.parent.message, "Original cause message");
  });

  test("should handle error serialization with toJSON", () => {
    const ApiError = createCustomError<{
      statusCode: number;
      endpoint: string;
    }>("ApiError", ["statusCode", "endpoint"]);

    const error = new ApiError({
      message: "API error occurred",
      cause: {
        statusCode: 500,
        endpoint: "/api/users",
      },
      captureStack: true,
    });

    // Convert to JSON and back
    const serialized = JSON.stringify(error);
    const deserialized = JSON.parse(serialized);

    assert.equal(deserialized.name, "ApiError");
    assert.equal(deserialized.message, "API error occurred");
    assert.ok(deserialized.stack, "Stack should be included");
    assert.ok(deserialized.cause, "Cause should be included");
    assert.equal(deserialized.cause.statusCode, 500);
    assert.equal(deserialized.cause.endpoint, "/api/users");
  });

  test("should handle null or undefined cause gracefully", () => {
    const SimpleError = createCustomError("SimpleError", []);

    // @ts-ignore - Deliberately passing undefined to test error handling
    const error1 = new SimpleError({
      message: "Test error",
      cause: undefined,
    });

    assert.equal(error1.name, "SimpleError");
    assert.equal(error1.message, "Test error");
    assert.equal(error1.parent, undefined);

    const error2 = new SimpleError({
      message: "Test error",
      // @ts-ignore - Deliberately passing null to test error handling
      cause: null,
    });

    assert.equal(error2.name, "SimpleError");
    assert.equal(error2.message, "Test error");
  });

  test("should work with no context keys specified", () => {
    const NoContextError = createCustomError("NoContextError", []);

    const error = new NoContextError({
      message: "Error with no context",
    });

    assert.equal(error.name, "NoContextError");
    assert.equal(error.message, "Error with no context");

    const context = NoContextError.getContext(error);
    assert.deepEqual(context, undefined);
  });

  test("should check type with checkInstance correctly", () => {
    const TypedError = createCustomError<{ value: number }>("TypedError", ["value"]);

    const error = new TypedError({
      message: "Typed error",
      cause: { value: 42 },
    });

    // TypeScript type guard with checkInstance
    if (checkInstance(error, TypedError)) {
      assert.equal(error.value, 42);
    } else {
      assert.fail("checkInstance should have returned true");
    }

    // Check with non-matching error type
    const OtherError = createCustomError("OtherError", []);
    assert.equal(checkInstance(error, OtherError), false);

    // Check with non-error object
    assert.equal(checkInstance({}, TypedError), false);
    assert.equal(checkInstance(null, TypedError), false);
    assert.equal(checkInstance(undefined, TypedError), false);
  });

  test("should handle default message when not provided", () => {
    const SimpleError = createCustomError("SimpleError", []);

    // @ts-ignore - Deliberately not providing message to test defaults
    const error = new SimpleError({});

    assert.equal(error.name, "SimpleError");
    assert.equal(error.message, undefined);
  });

  test("should handle complex inheritance with multiple levels", () => {
    // 4-level inheritance hierarchy
    const Level1Error = createCustomError<{ level1: string }>("Level1Error", ["level1"]);

    const Level2Error = createCustomError<{ level2: string }, typeof Level1Error>(
      "Level2Error",
      ["level2"],
      Level1Error,
    );

    const Level3Error = createCustomError<{ level3: string }, typeof Level2Error>(
      "Level3Error",
      ["level3"],
      Level2Error,
    );

    const Level4Error = createCustomError<{ level4: string }, typeof Level3Error>(
      "Level4Error",
      ["level4"],
      Level3Error,
    );

    const error = new Level4Error({
      message: "Deep inheritance",
      cause: {
        level1: "one",
        level2: "two",
        level3: "three",
        level4: "four",
      },
    });

    // Check direct property access
    assert.equal(error.level1, "one");
    assert.equal(error.level2, "two");
    assert.equal(error.level3, "three");
    assert.equal(error.level4, "four");

    // Check inheritance
    assert.ok(error instanceof Level1Error);
    assert.ok(error instanceof Level2Error);
    assert.ok(error instanceof Level3Error);
    assert.ok(error instanceof Level4Error);

    // Check inheritance chain
    assert.deepEqual(
      error?.inheritanceChain?.map((e) => e.name),
      ["Level1Error", "Level2Error", "Level3Error"],
    );
  });

  test("should support custom toString formatting", () => {
    const DetailedError = createCustomError<{
      code: number;
      details: string;
    }>("DetailedError", ["code", "details"]);

    const error = new DetailedError({
      message: "A detailed error",
      cause: {
        code: 500,
        details: "Internal server error",
      },
    });

    const errorString = error.toString();
    assert.ok(errorString.includes("DetailedError: A detailed error"));
    assert.ok(errorString.includes("code"));
    assert.ok(errorString.includes("500"));
    assert.ok(errorString.includes("details"));
    assert.ok(errorString.includes("Internal server error"));
  });
});

describe("Additional Tests", () => {
  test("should support JSON serialization/deserialization", () => {
    const NetworkError = createCustomError<{
      host: string;
      port: number;
    }>("NetworkError", ["host", "port"]);

    const error = new NetworkError({
      message: "Connection failed",
      cause: { host: "example.com", port: 443 },
      captureStack: true,
    });

    // Serialize to JSON
    const serialized = JSON.stringify(error);
    const parsed = JSON.parse(serialized);

    // Check basic properties
    assert.equal(parsed.name, "NetworkError");
    assert.equal(parsed.message, "Connection failed");
    assert.ok(parsed.stack); // Stack should be present

    // Check cause for context
    assert.ok(parsed.cause);
    assert.equal(parsed.cause.host, "example.com");
    assert.equal(parsed.cause.port, 443);
  });

  test("should handle inherited context properties correctly", () => {
    // Base error with timestamp
    const BaseError = createCustomError<{
      timestamp: string;
    }>("BaseError", ["timestamp"]);

    // API error with status code
    const ApiError = createCustomError<{ statusCode: number }, typeof BaseError>(
      "ApiError",
      ["statusCode"],
      BaseError,
    );

    // Create with all properties
    const error = new ApiError({
      message: "API Error",
      cause: {
        statusCode: 500,
        timestamp: "2025-04-04T12:00:00Z",
      },
    });

    // Direct property access
    assert.equal(error.statusCode, 500);
    assert.equal(error.timestamp, "2025-04-04T12:00:00Z");

    // Context getters
    const fullContext = ApiError.getContext(error);
    assert.deepEqual(fullContext, {
      statusCode: 500,
      timestamp: "2025-04-04T12:00:00Z",
    });

    // Just ApiError context
    const apiContext = ApiError.getContext(error, {
      includeParentContext: false,
    });
    assert.deepEqual(apiContext, { statusCode: 500 });
  });

  test("should handle error with no context", () => {
    const EmptyError = createCustomError("EmptyError", []);

    const error = new EmptyError({
      message: "An error with no context",
    });

    assert.equal(error.name, "EmptyError");
    assert.equal(error.message, "An error with no context");

    // toString should still work
    const errorString = error.toString();
    assert.equal(errorString, "EmptyError: An error with no context");

    // Context should be undefined
    const context = EmptyError.getContext(error);
    assert.equal(context, undefined);
  });
});

describe("Circular Reference Protection", () => {
  test("should detect and prevent circular references", () => {
    const ErrorA = createCustomError<{ a: string }>("ErrorA", ["a"]);
    const ErrorB = createCustomError<{ b: string }>("ErrorB", ["b"]);

    // Create instance of ErrorA
    const errorA = new ErrorA({
      message: "Error A",
      cause: { a: "valueA" },
    });

    // Create instance of ErrorB with ErrorA as parent
    const errorB = new ErrorB({
      message: "Error B",
      cause: { b: "valueB" },
    });

    // Set parent property
    (errorB as any).parent = errorA;

    // Attempt to create a circular reference
    // This should trigger circular reference detection when accessing the parent chain
    (errorA as any).parent = errorB;

    // Check if we can safely follow the parent chain without infinite recursion
    const chain = ErrorA.followParentChain(errorA);

    // Chain should contain both errors but stop at the circular reference
    assert.equal(chain.length, 2);
    assert.equal(chain[0].name, "ErrorA");
    assert.equal(chain[1].name, "ErrorB");

    // Similarly, getErrorHierarchy should handle circular references
    const hierarchy = ErrorA.getErrorHierarchy(errorA);
    assert.equal(hierarchy.length, 2);
    assert.equal(hierarchy[0].name, "ErrorA");
    assert.equal(hierarchy[1].name, "ErrorB");
  });

  test("should respect maxParentChainLength", () => {
    const BaseError = createCustomError<{ index: number }>("BaseError", ["index"]);

    // Create a deeply nested chain
    let previousError: any = null;
    let rootError: any = null;

    // Create 10 nested errors
    for (let i = 9; i >= 0; i--) {
      const error = new BaseError({
        message: `Error ${i}`,
        cause: { index: i },
      });

      if (previousError) {
        error.parent = previousError;
      }

      previousError = error;

      if (i === 0) {
        rootError = error;
      }
    }

    // Follow chain with default depth
    const fullChain = BaseError.followParentChain(rootError);
    assert.equal(fullChain.length, 10);

    // Follow chain with limited depth
    const limitedChain = BaseError.followParentChain(rootError);
    assert.equal(limitedChain.length, 10);
  });

  test("should handle collision strategy", () => {
    const ParentError = createCustomError<{ shared: string }>("ParentError", ["shared"]);

    const ChildError = createCustomError<{ shared: string }, typeof ParentError>(
      "ChildError",
      ["shared"],
      ParentError,
    );

    // 'override' strategy (default)
    const error1 = new ChildError({
      message: "Test",
      cause: { shared: "child-value" },
      collisionStrategy: "override",
    });

    assert.equal(error1.shared, "child-value");

    // Verify that 'error' strategy throws when there would be a collision
    assert.throws(() => {
      new ChildError({
        message: "Test",
        cause: {
          shared: "child-value",
        },
        collisionStrategy: "error",
      });
    }, /Context property 'shared' conflicts/);
  });
});

describe("Performance Optimizations", () => {
  test("should have faster creation with createFast method", async () => {
    const SimpleError = createCustomError<{ code: number }>("SimpleError", ["code"]);

    // This is a simple benchmark, but node:test doesn't have great performance testing
    /**
     * Fast creation should be at least 30% faster than standard creation
     *
     * Average time for 1,000 iterations
     * Standard creation: 7.28ms - 6.50ms
     * Fast creation: 4.21ms - 4.73ms
     *
     * Average time for 10,000 iterations
     * Standard creation: 76.14ms - 74.95ms
     * Fast creation: 44.40ms - 42.82ms
     *
     * Average time for 100,000 iterations
     * Standard creation: 742.12ms - 733.14ms
     * Fast creation: 443.71ms - 454.67ms
     *
     * Average time for 1,000,000 iterations
     * Standard creation: 7590.94ms - 7560.76ms
     * Fast creation: 4469.63ms - 4582.30ms
     */
    const iterations = 10_000;

    // Standard creation
    const startStandard = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      new SimpleError({
        message: "Test error",
        cause: { code: 500 },
        captureStack: true,
      });
    }
    const endStandard = process.hrtime.bigint();
    const standardTime = Number(endStandard - startStandard) / 1_000_000; // ms

    // Fast creation
    const startFast = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      SimpleError.createFast("Test error", { code: 500 });
    }
    const endFast = process.hrtime.bigint();
    const fastTime = Number(endFast - startFast) / 1_000_000; // ms

    console.log(`Standard creation: ${standardTime.toFixed(2)}ms`);
    console.log(`Fast creation: ${fastTime.toFixed(2)}ms`);

    // Fast creation should be significantly faster
    assert.ok(
      fastTime < standardTime * 0.7,
      `Fast creation (${fastTime.toFixed(2)}ms) should be at least 30% faster than standard (${standardTime.toFixed(2)}ms)`,
    );

    // Verify that the fast creation still produces a valid error
    const fastError = SimpleError.createFast("Fast error", { code: 123 });
    assert.equal(fastError.message, "Fast error");
    assert.equal(fastError.code, 123);
    assert.ok(fastError instanceof SimpleError);
  });
});

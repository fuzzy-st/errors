/**
 * Enhanced Error Hierarchy - Examples
 *
 * This file contains comprehensive examples demonstrating the usage of the
 * Enhanced Error Hierarchy library. Each example is clearly documented
 * and represents a common use case or pattern.
 */

import { createCustomError } from "./main";

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
				code: 100,
				detail: "This is a simple error with context",
			},
			captureStack: true,
		});
	} catch (error) {
		if (error instanceof SimpleError) {
			console.log("EXAMPLE 1.1: Simple Error");
			console.log(error);
			console.log(error.toString());
			console.log("Context:", error.context);
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
		if (error instanceof ApiError) {
			console.log("EXAMPLE 1.2: API Error");
			console.log(error.toString());
			const context = ApiError.getContext(error);
			console.log(
				`Failed with status ${context?.statusCode} on ${context?.endpoint}`,
			);
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
				// DataError context
				dataSource: "user_database",
				dataType: "user_profile",

				// BaseError context
				timestamp: new Date().toISOString(),
				severity: "medium",
			},
		});
	} catch (error) {
		if (error instanceof DataError) {
			console.log("EXAMPLE 2.1: Basic Error Hierarchy");
			console.log("Example of Error call:\n", error);
			console.log("Example of Error Serialised:\n", error.toString());

			// Full context (includes BaseError context)
			const fullContext = DataError.getContext(error);
			console.log("Full context:", fullContext);

			// Just DataError context
			const dataContext = DataError.getContext(error, {
				includeParentContext: false,
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
		if (error instanceof QueryError) {
			console.log("EXAMPLE 2.2: Three-Level Error Hierarchy");
			console.log(error.toString());

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
			if (networkError instanceof NetworkError) {
				// This is the child error (caused by the network error)
				throw new ServiceError({
					message: "Authentication service unavailable",
					cause: networkError, // Pass the error as cause to establish parent relationship
					captureStack: true,
				});
			}
			throw networkError;
		}
	} catch (error) {
		if (error instanceof ServiceError) {
			console.log("EXAMPLE 3.1: Basic Parent-Child Relationship");
			console.log(error.toString());

			// Access parent error
			if (error instanceof NetworkError) {
				const parentContext = NetworkError.getContext(error);
				console.log(
					`Parent error context: Failed to connect to ${parentContext.hostname}:${parentContext.port}`,
				);
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
				// Level 2
				throw new FileError({
					message: "Could not read configuration file",
					cause: systemError, // Parent relationship
					captureStack: true,
				});
			}
		} catch (fileError) {
			// Level 1 (what the application code catches)
			throw new ConfigError({
				message: "Application configuration invalid",
				cause: fileError, // Parent relationship
				captureStack: true,
			});
		}
	} catch (error) {
		if (error instanceof ConfigError) {
			console.log("EXAMPLE 3.2: Multi-level Error Chain");

			// Follow complete error chain
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
			inherits: DatabaseError, // Explicit class inheritance
			captureStack: true,
		});
	} catch (error) {
		if (error instanceof QueryError) {
			console.log("EXAMPLE 4.1: Combined Inheritance and Parent Chain");

			// Inspect the inheritance chain (class hierarchy)
			console.log(
				"Class inheritance chain:",
				QueryError.followParentChain(error)?.map((e) => e.name).join(" > "),
			);

			// Get full context (from all levels of inheritance)
			const context = QueryError.getContext(error);
			console.log(`Full ${error.name} context from inheritance:`, context);

			console.log("\n");
		}
		if(error instanceof NetworkError) {
			console.log("EXAMPLE 4.1: Combined Inheritance and Parent Chain");
			const context = NetworkError.getContext(error);
			console.log("Network error context:", context);
		}
		if (error instanceof DatabaseError) {
			const context = DatabaseError.getContext(error,{includeParentContext: false});
			console.log("Database error context:", context);
		}
		if (error instanceof BaseError) {
			const context = BaseError.getContext(error,{includeParentContext: false});
			console.log("Base error context:", context);
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
		if (error instanceof UserErrors.ValidationError) {
			const validationCtx = UserErrors.ValidationError.getContext(error);
			console.log(
				validationCtx && `Validation error on field ${validationCtx.field}: ${validationCtx.value}`,
			);
		}
		if (error instanceof UserErrors.BaseDomainError) {
			const baseCtx = UserErrors.BaseDomainError.getContext(error);
			console.log(
				baseCtx &&
					`Base domain error in ${baseCtx.domain} with correlation ID ${baseCtx.correlationId}`,
			);
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
		if (error instanceof ApiError) {
			console.log("EXAMPLE 5.2: Error Factory Functions");
			console.log(error.toString());

			const context = ApiError.getContext(error);
			console.log(
				context && `API error details: ${context.statusCode} on ${context.endpoint} at ${context.timestamp}`,
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
		if (error instanceof ConfigurationError) {
			console.log("EXAMPLE 5.3: Deep Nested Context");

			const context = ConfigurationError.getContext(error);
			if (!context) {
				console.error("No context available");
				return;
			}
			// Access nested properties
			const sslEnabled = context.config.server.ssl.enabled;
			const hasCert = !!context.config.server.ssl.cert;
			const credentialsEncrypted =
				context.config.database.connection.credentials.encrypted;

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

		if (result1.error instanceof CredentialsError) {
			const context = CredentialsError.getContext(result1.error);
			console.log(
				`Auth failed for user: ${context?.userId}, reason: ${context.reason}`,
			);
		}
	}

	// Scenario 2: Missing MFA code
	const result2 = simulateLogin("user@example.com", "password123");
	if (!result2.success && result2.error) {
		console.log("\nScenario 2: Missing MFA code");
		console.log(result2.error.toString());

		if (result2.error instanceof MfaError) {
			const context = MfaError.getContext(result2.error);
			console.log(
				`MFA required: ${context.mfaType}, remaining attempts: ${context.remainingAttempts}`,
			);
		}
	}

	// Scenario 3: Session creation error
	const result3 = simulateLogin("problem_user", "password123", "123456");
	if (!result3.success && result3.error) {
		console.log("\nScenario 3: Session creation error");
		console.log(result3.error.toString());

		if (result3.error instanceof SessionError) {
			const context = SessionError.getContext(result3.error);
			console.log(
				`Session creation failed: ${context?.sessionId}, would expire at: ${context?.expiryTime}`,
			);
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
 * @example 6.2 - API Integration Error Handling
 * Demonstrate handling errors from an external API integration.
 */
function example6_2() {
	// Define integration error types
	const IntegrationError = createCustomError<{
		service: string;
		endpoint: string;
		timestamp: string;
	}>("IntegrationError", ["service", "endpoint", "timestamp"]);

	const HttpError = createCustomError<
		{
			statusCode: number;
			method: "GET" | "POST" | "PUT" | "DELETE";
			headers?: Record<string, string>;
		},
		typeof IntegrationError
	>("HttpError", ["statusCode", "method", "headers"], IntegrationError);

	const ApiError = createCustomError<
		{
			errorCode: string;
			errorMessage: string;
			responseBody?: string;
		},
		typeof HttpError
	>("ApiError", ["errorCode", "errorMessage", "responseBody"], HttpError);

	const RateLimitError = createCustomError<
		{
			limitType: "requests" | "bandwidth";
			resetTime: string;
			currentUsage: number;
			limit: number;
		},
		typeof ApiError
	>(
		"RateLimitError",
		["limitType", "resetTime", "currentUsage", "limit"],
		ApiError,
	);

	// Simulate API call with error response
	function simulateApiCall(endpoint: string, exceededLimit = false) {
		const timestamp = new Date().toISOString();
		const service = "payment-gateway";

		try {
			if (exceededLimit) {
				// Simulate rate limit error
				throw new RateLimitError({
					message: "API rate limit exceeded",
					cause: {
						// RateLimitError context
						limitType: "requests",
						resetTime: new Date(Date.now() + 30000).toISOString(),
						currentUsage: 1001,
						limit: 1000,

						// ApiError context
						errorCode: "RATE_LIMIT_EXCEEDED",
						errorMessage:
							"You have exceeded the 1000 requests per minute limit",
						responseBody: JSON.stringify({
							error: "rate_limit_exceeded",
							message: "API rate limit exceeded",
							reset_at: new Date(Date.now() + 30000).toISOString(),
						}),

						// HttpError context
						statusCode: 429,
						method: "POST",
						headers: {
							"X-RateLimit-Limit": "1000",
							"X-RateLimit-Remaining": "0",
							"X-RateLimit-Reset": "30",
						},

						// IntegrationError context
						service,
						endpoint,
						timestamp,
					},
				});
			}
				// Simulate generic API error
				throw new ApiError({
					message: "Payment processing failed",
					cause: {
						// ApiError context
						errorCode: "INSUFFICIENT_FUNDS",
						errorMessage: "The payment method has insufficient funds",
						responseBody: JSON.stringify({
							error: "insufficient_funds",
							message:
								"The card has insufficient funds to complete this transaction",
							transaction_id: "tx_12345",
						}),

						// HttpError context
						statusCode: 400,
						method: "POST",

						// IntegrationError context
						service,
						endpoint,
						timestamp,
					},
				});
		} catch (error) {
			return error;
		}
	}

	console.log("EXAMPLE 6.2: API Integration Error Handling");

	// Scenario 1: General API error
	const error1 = simulateApiCall("/api/payments/process");
	if (error1 instanceof ApiError) {
		console.log("Scenario 1: General API Error");

		const apiContext = ApiError.getContext(error1);
		const httpContext = HttpError.getContext(error1);

		console.log(error1&& `${error1.name}: ${error1.message}`);
		console.log(apiContext && `API Error Code: ${apiContext.errorCode}`);
		console.log(httpContext && `HTTP Status: ${httpContext.statusCode}`);

		// Extract structured data from response body if available
		if (apiContext?.responseBody) {
			try {
				const responseData = JSON.parse(apiContext.responseBody);
				console.log(`Transaction ID: ${responseData.transaction_id || "N/A"}`);
			} catch (e) {
				console.log("Could not parse response body");
			}
		}
	}

	// Scenario 2: Rate limit error
	const error2 = simulateApiCall("/api/payments/process", true);
	if (error2 && error2 instanceof RateLimitError) {
		console.log("\nScenario 2: Rate Limit Error");

		const rateLimitContext = RateLimitError.getContext(error2);
		const integrationContext = IntegrationError.getContext(error2);

		console.log(`${error2.name}: ${error2.message}`);
		console.log(integrationContext && `Service: ${integrationContext.service}`);
		console.log(`Limit Type: ${rateLimitContext?.limitType}`);
		console.log(
			`Current Usage: ${rateLimitContext?.currentUsage}/${rateLimitContext?.limit}`,
		);
		console.log(`Reset Time: ${rateLimitContext?.resetTime}`);

		// Calculate and display waiting time
		const resetTime = rateLimitContext && new Date(rateLimitContext.resetTime).getTime();
		const currentTime = Date.now();
		const waitTimeMs = resetTime && Math.max(0, resetTime - currentTime);
		const waitTimeSec = waitTimeMs && Math.ceil(waitTimeMs / 1000);

		console.log(`Recommended wait time: ${waitTimeSec} seconds`);

		// Get error hierarchy
		const hierarchy = RateLimitError.getErrorHierarchy(error2);
		console.log("\nError Hierarchy:", JSON.stringify(hierarchy, null, 2));
	}

	console.log("\n");
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
	example6_2();
	console.log("====================================");
};

runAllExamples();
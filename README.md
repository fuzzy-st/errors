# Custom Errors

A *very* powerful, fully **type-safe**, *dependency free* utility for creating rich **custom errors**.
Complete with: 
- Hierarchical error classes 
- Advanced context tracking
- Inheritance and diagnostic capabilities
- Performance optimizations
- Circular reference protection

Its a fuzzy sort of idea, that by having a form of *contextual-based error support* we can **craft better consequences** when an `error` is eventually *thrown* in our near perfect code-bases.  

## 🔍 Overview

This library aims to provide an elegant solution for creating simple to sophisticated `errors`  in TypeScript applications. It looked to solve some of the common problem of with the passage of contextual information to our `errors` while maintaining the important type safety along with proper inheritance and their relationships.

Unlike standard JavaScript `class Error`'s or basic custom error extensions (for which there are many, and all great sources of inspiration), this wee library seeks to enable us with the following:

- **Error hierarchies** that maintain proper inheritance relationships
- **Rich contextual data** with strong TypeScript typing
- **Parent-child error relationships** for comprehensive error chains
- **Context inheritance** from parent errors to child errors
- **Advanced error analysis tools** for debugging and logging
- **Performance optimizations** for high-frequency error creation

## ✨ Features

- 🧙‍♂️ **Type-Safe Contextual Data** - Associate strongly-typed contextual `causes` with errors
- 🔄 **Hierarchical Error Classes** - Build complex error taxonomies with proper inheritance
- 👪 **Parent-Child Relationships** - Create and traverse parent-child error chains
- 🧬 **Inheritance Tracking** - Maintain complete inheritance hierarchies
- 🔍 **Error Inspection** - Utilities for exploring error contexts and hierarchies
- 📝 **Customizable Serialization** - Enhanced `.toString()` and `.toJSON()` for better logging
- 🔁 **Circular Reference Protection** - Safe traversal of complex error hierarchies
- ⚡ **Performance Optimizations** - Fast error creation for high-frequency scenarios (~40% faster)
- 💥 **Collision Detection** - Configurable strategies for handling property name collisions
- 🏦 **Registry Management** - Access to all registered error classes for global management
- 💻 **Developer-Friendly API** - A very simple yet powerful interface that us developers deserve
- 🆓 **Dependency Free** - Yes, its completely devoid of any external dependencies
- 💚 **Runtime & Environment** friendly, it can be run literally anywhere; In the browser, on the server, perhaps in your little IOT, heck even in your cup of tea!

## 📦 Installation

```bash
npm install @fuzzy-street/errors
# or
yarn add @fuzzy-street/errors
# or
pnpm add @fuzzy-street/errors
```

## 🚀 Quick Start

```typescript
import { createCustomError , checkInstance } from '@fuzzy-street/errors';

// Create a basic error class
const ApiError = createCustomError<{
  statusCode: number;
  endpoint: string;
}>("ApiError", ["statusCode", "endpoint"]);

// Create a derived error class
const NetworkError = createCustomError<{
  retryCount: number;
}, typeof ApiError>(
  "NetworkError", 
  ["retryCount"], 
  ApiError
);

// Throw with complete context
try {
  throw new NetworkError({
    message: "Failed to connect to API",
    cause: {
      statusCode: 503,
      endpoint: "/api/users",
      retryCount: 3
    }
  });
} catch (error) {
  if (checkInstance(error, NetworkError)) {
    // Direct property access with full type safety
    console.log(`Status code: ${error.statusCode}`);
    console.log(`Retries attempted: ${error.retryCount}`);
    
    // View the error hierarchy
    console.log(error.toString());
  }
}
```

## 📚 Usage Guide

### Creating Basic Error Classes

```typescript
// Define an error with typed context
const ConfigError = createCustomError<{
  configFile: string;
  missingKey: string;
}>("ConfigError", ["configFile", "missingKey"]);

// Create an instance
const error = new ConfigError({
  message: "Missing required configuration key",
  cause: {
    configFile: "/etc/app/config.json",
    missingKey: "API_SECRET"
  },
  captureStack: true // Capture stack trace
});
```

### Building Error Hierarchies

```typescript
// Base application error
const AppError = createCustomError<{
  appName: string;
  version: string;
}>("AppError", ["appName", "version"]);

// File system error extends AppError
const FileSystemError = createCustomError<{
  path: string;
  operation: "read" | "write" | "delete";
}, typeof AppError>(
  "FileSystemError",
  ["path", "operation"],
  AppError
);

// Permission error extends FileSystemError
const PermissionError = createCustomError<{
  requiredPermission: string;
  currentUser: string;
}, typeof FileSystemError>(
  "PermissionError",
  ["requiredPermission", "currentUser"],
  FileSystemError
);

// Usage: complete context inheritance
throw new PermissionError({
  message: "Cannot write to file: permission denied",
  cause: {
    // PermissionError context
    requiredPermission: "WRITE",
    currentUser: "guest",
    
    // FileSystemError context
    path: "/var/data/users.json",
    operation: "write",
    
    // AppError context
    appName: "MyApp",
    version: "1.2.3"
  }
});
```

### Error Handling with Type-Safe Context Access

```typescript
try {
  // Code that might throw PermissionError
} catch (error) {
  // Type-safe instance checking with proper TypeScript inference
  if (checkInstance(error, PermissionError)) {
    // Direct access to all properties with full type safety
    console.log(`User '${error.currentUser}' lacks '${error.requiredPermission}' permission`);
    console.log(`Operation '${error.operation}' failed on '${error.path}'`);
    console.log(`App: ${error.appName} v${error.version}`);
    
    // Alternatively, use getContext
    const fullContext = PermissionError.getContext(error);
    console.log(`Complete context:`, fullContext);
    
    // Get only PermissionError context (not parent context)
    const permContext = PermissionError.getContext(error, { 
      includeParentContext: false 
    });
  }
}
```

### Analyzing Error Hierarchies

```typescript
try {
  // Code that might throw errors
} catch (error) {
  if (error instanceof AppError) {
    // Get the full error hierarchy with context
    const hierarchy = AppError.getErrorHierarchy(error);
    console.log(JSON.stringify(hierarchy, null, 2));
    
    // Follow the parent chain (with circular reference protection)
    const parentChain = AppError.followParentChain(error);
    console.log(`Error chain depth: ${parentChain.length}`);
    
    // Log the complete error with context
    console.log(error.toString());
  }
}
```

### Handling Errors with Parent References

```typescript
try {
  try {
    throw new DatabaseError({
      message: "Database connection failed",
      cause: {
        dbName: "users",
        connectionString: "postgres://localhost:5432/users"
      }
    });
  } catch (dbError) {
    // Create a new error with the database error as the parent
    throw new ApiError({
      message: "Failed to fetch user data",
      cause: dbError, // Pass error as cause to establish parent relationship
      captureStack: true
    });
  }
} catch (error) {
  if (checkInstance(error, ApiError)) {
    console.log(error.toString());
    
    // Access parent error
    if (checkInstance(error, DatabaseError)) {
      // Direct property access
      console.log(`Failed to connect to: ${error.parent.dbName}`);
      
      // Or use context getter
      const dbContext = DatabaseError.getContext(error.parent);
      console.log(`Connection string: ${dbContext.connectionString}`);
    }
  }
}
```

### High-Performance Error Creation

```typescript
// For performance-critical paths, use createFast (40% faster)
function logApiError(statusCode, endpoint) {
  // Fast error creation without stack traces or extra processing
  const error = ApiError.createFast("API request failed", {
    statusCode,
    endpoint
  });
  
  errorLogger.log(error);
}
```

### Accessing Error Registry

```typescript
import { getErrorClass, listErrorClasses, clearErrorRegistry } from '@fuzzy-street/errors';

// Get all registered error classes
const allErrorClasses = listErrorClasses();
console.log("Available error types:", allErrorClasses);

// Retrieve a specific error class by name
const ApiError = getErrorClass("ApiError");
if (ApiError) {
  const error = new ApiError({
    message: "API call failed",
    cause: { 
      statusCode: 500, 
      endpoint: "/api/users" 
    }
  });
}

// For testing: clear the registry
clearErrorRegistry();
```

## 📐 API Reference

### `createCustomError<Context, ParentError>(name, contextKeys, parentError?)`

Creates a new custom error class with typed context.

**Parameters:**
- `name`: `string` - Name for the error class
- `contextKeys`: `(keyof Context)[]` - Register the top-level Keys to determine the exact context for each error class.  
- `parentError?`: `CustomErrorClass<any>` - Optional parent error class which to inherit context from

**Returns:** `CustomErrorClass<Context & ParentContext>`

### `CustomErrorClass` Constructor Options

```typescript
{
  message: string;                     // Error message
  cause?: Context | Error | string;    // Context object, parent error, or cause message
  captureStack?: boolean;              // Whether to capture stack trace (default: true)
  enumerableProperties?: boolean | string[]; // Make properties enumerable (default: false)
  collisionStrategy?: 'override' | 'preserve' | 'error'; // How to handle property collisions
  maxParentChainLength?: number;       // Max depth for parent chain traversal
}
```

### `CustomErrorClass` Static Methods

These methods are provided to help provide better debugging and diagnostic support to us, when we are consuming `CustomErrorClasses` in the wild.

#### `.getContext(error, options?)`

Retrieves the context associated with an error. Do bear in-mind that the **context** is the *contextual* information that was passed to each error `cause`. This would always be avaible to you on the presence of each *`createdCustomError`* 

**Parameters:**
- `error`: `unknown` - The error to examine
- `options?.includeParentContext?`: `boolean` - Whether to include parent context (default: true)

**Returns:** `Context | undefined`

#### `.getErrorHierarchy(error)`

Gets the full error hierarchy information including contexts.

**Parameters:**
- `error`: `unknown` - The error to analyze

**Returns:** `ErrorHierarchyItem[]`

#### `.followParentChain(error, options?)`

Follows and returns the entire chain of parent errors.

**Parameters:**
- `error`: `Error & { parent?: Error }` - The starting error
- `options?.maxDepth?`: `number` - Maximum depth to traverse (default: 100)

**Returns:** `Error[]`

#### `.getInstances()`

Returns the complete inheritance chain of error classes.

**Returns:** `CustomErrorClass<any>[]`

#### `.createFast(message, context?)`

Creates an error instance with minimal overhead for extremely high-performance scenarios and workloads.

**Parameters:**
- `message`: `string` - Error message
- `context?`: `Partial<Context>` - Optional context object

**Returns:** `Error & Context`

### `checkInstance<T>(error, instance)`

Type-safe instance checking with proper TypeScript inference.

**Parameters:**
- `error`: `unknown` - The error to check
- `instance`: `CustomErrorClass<T>` - The error class to check against

**Returns:** `error is (Error & T)` - Type guard assertion

### `getErrorClass(name)`

Retrieves a registered error class by name.

**Parameters:**
- `name`: `string` - The name of the error class

**Returns:** `CustomErrorClass<any> | undefined`

### `listErrorClasses()`

Lists all registered error class names.

**Returns:** `string[]`

### `clearErrorRegistry()`

Clears all registered error classes (useful for testing).

### `Error` Instance Properties

- `.name`: `string` - The name of the error
- `.message`: `string` - The error message
- `.parent?`: `Error` - Reference to the parent error, if any
- `.inheritanceChain?`: `CustomErrorClass<any>[]` - Array of parent error classes
- `[contextKeys]` - Direct access to all context properties with full type safety

## 🔄 Error Inheritance vs. Parent Relationships

This library supports two distinct concepts that are often confused:

1. **Class Inheritance** - The `createCustomError` function allows creating error classes that inherit from other error classes, establishing an *is-a* relationship.

2. **Parent-Child Relationship** - Instances of errors can have a parent-child relationship, where one error caused another, establishing a *caused-by* relationship.

Example:
```typescript
// Class inheritance (NetworkError is-a ApiError)
const NetworkError = createCustomError<{}, typeof ApiError>(
  "NetworkError", [], ApiError
);

// Parent-child relationship (apiError caused-by networkError)
const networkError = new NetworkError({...});
const apiError = new ApiError({
  message: "API call failed",
  cause: networkError // networkError is the parent of apiError
});
```

## 🌟 Advanced Usage

### Handling Context Property Collisions

```typescript
// Define error with collision detection
const UserError = createCustomError<{
  name: string; // This would collide with Error.name
}>("UserError", ["name"]);

// This will throw an error about property collision
try {
  new UserError({
    message: "User error",
    cause: { name: "John" },
    collisionStrategy: 'error' // Will throw if collision detected
  });
} catch (e) {
  console.log(e.message); // "Context property 'name' conflicts with a standard Error property"
}

// Using override strategy (default)
const error = new UserError({
  message: "User error",
  cause: { name: "John" },
  collisionStrategy: 'override' // Will override the built-in property
});
```

### Dynamic Error Creation

```typescript
function createDomainErrors(domain: string) {
  const BaseDomainError = createCustomError<{
    domain: string;
    correlationId: string;
  }>(`${domain}Error`, ["domain", "correlationId"]);
  
  const ValidationError = createCustomError<{
    field: string;
    value: unknown;
  }, typeof BaseDomainError>(
    `${domain}ValidationError`,
    ["field", "value"],
    BaseDomainError
  );
  
  return {
    BaseDomainError,
    ValidationError
  };
}

// Create domain-specific errors
const { BaseDomainError, ValidationError } = createDomainErrors("User");
const { ValidationError: ProductValidationError } = createDomainErrors("Product");

// Usage
throw new ValidationError({
  message: "Invalid user data",
  cause: {
    domain: "User",
    correlationId: "abc-123",
    field: "email",
    value: "not-an-email"
  }
});
```

### Error Factory Functions

```typescript
function createApiError(endpoint: string, statusCode: number, details: string) {
  return new ApiError({
    message: `API Error: ${details}`,
    cause: {
      endpoint,
      statusCode,
      timestamp: new Date().toISOString()
    }
  });
}

// For high-frequency scenarios, use createFast
function createApiErrorFast(endpoint: string, statusCode: number) {
  return ApiError.createFast(`API Error (${statusCode})`, {
    endpoint,
    statusCode,
    timestamp: new Date().toISOString()
  });
}

// Usage
throw createApiError("/users", 404, "User not found");
```

### Circular Reference Protection

```typescript
// Create error types
const ServiceError = createCustomError<{ service: string }>(
  "ServiceError", ["service"]
);
const DependencyError = createCustomError<{ dependency: string }>(
  "DependencyError", ["dependency"]
);

// Create circular reference (normally happens in complex systems)
const service1Error = new ServiceError({
  message: "Service 1 failed",
  cause: { service: "service1" }
});

const service2Error = new ServiceError({
  message: "Service 2 failed",
  cause: { service: "service2" }
});

// Create circular reference
service1Error.parent = service2Error;
service2Error.parent = service1Error;

// Safe traversal without infinite recursion
const chain = ServiceError.followParentChain(service1Error);
console.log(`Chain length: ${chain.length}`); // Will be 2, not infinite

// Same protection in hierarchy analysis
const hierarchy = ServiceError.getErrorHierarchy(service1Error);
console.log(`Hierarchy items: ${hierarchy.length}`); // Also stops at circular reference
```

## 🧪 Running the Examples

We have code that includes comprehensive [examples](src/examples.ts) that demonstrate the full range of capabilities for this wee this library. Clone the repo, run them locally to see the error hierarchies in action:

```bash
# From the root of the project
pnpm run examples
```

## 🤝 Contributing

Your **Contributions are always welcome**. Please feel free to submit a Pull Request or even an Issue, its entirely up to you.

Remember we all stand on the shoulders of giants, 

💚

## 📜 License

MIT
# Custom Errors

A *very* powerful, fully **type-safe**, *dependency free* utility for creating rich **custom errors**.
Complete with: 
- Hierarchical error classes 
- Advanced context tracking, 
- Inheritance and diagnostic capabilities.

Its a fuzzy idea that by having a form of contextual-based error support we can craft better consequences when an error is eventually *thrown* in our near perfect code-bases.  

## 🔍 Overview

This library aims to provide an elegant solution for creating simple to sophisticated `errors`  in TypeScript applications. It looked to solve some of the common problem of with the passage of contextual information to our `errors` while maintaining the important type safety along with proper inheritance and their relationships.

Unlike standard JavaScript `class Error`'s or basic custom error extensions (for which there are many, and all great sources of inspiration), this wee library seeks to enable us with the following:

- **Error hierarchies** that maintain proper inheritance relationships
- **Rich contextual data** with strong TypeScript typing
- **Parent-child error relationships** for comprehensive error chains
- **Context inheritance** from parent errors to child errors
- **Advanced error analysis tools** for debugging and logging

## ✨ Features

- 🧙‍♂️ **Type-Safe Contextual Data** - Associate strongly-typed contextual `causes` with errors
- 🔄 **Hierarchical Error Classes** - Build complex error taxonomies with proper inheritance
- 👪 **Parent-Child Relationships** - Create and traverse parent-child error chains
- 🧬 **Inheritance Tracking** - Maintain complete inheritance hierarchies
- 🔍 **Error Inspection** - Utilities for exploring error contexts and hierarchies
- 📝 **Customizable Serialization** - Enhanced `.toString()` for better serialization and logging.
- 💻 **Developer-Friendly API** - A very simple yet powerful interface that us developers deserve.
- 💚 **Runtime & Environment** friendly, it can be run literally anywhere; In the browser, on the server, perhaps in your little IOT, heck even have it in your cup of tea!

## 📦 Installation

```bash
npm install @fuzzy/errors
# or
yarn add @fuzzy/errors
# or
pnpm add @fuzzy/errors
```

## 🚀 Quick Start

```typescript
import { createCustomError } from '@fuzzy/errors';

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
  if (error instanceof NetworkError) {
    // Access the complete error context
    const context = NetworkError.getContext(error);
    console.log(`Status code: ${context.statusCode}`);
    console.log(`Retries attempted: ${context.retryCount}`);
    
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

### Error Handling with Context Extraction

```typescript
try {
  // Code that might throw PermissionError
} catch (error) {
  if (error instanceof PermissionError) {
    // Get only PermissionError context
    const permContext = PermissionError.getContext(error, { 
      includeParentContext: false 
    });
    console.log(`User '${permContext.currentUser}' lacks '${permContext.requiredPermission}' permission`);
    
    // Get FileSystemError context
    const fsContext = FileSystemError.getContext(error, { 
      includeParentContext: false 
    });
    console.log(`Operation '${fsContext.operation}' failed on '${fsContext.path}'`);
    
    // Get all context (merged from all error levels)
    const fullContext = PermissionError.getContext(error);
    console.log(`App: ${fullContext.appName} v${fullContext.version}`);
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
    
    // Follow the parent chain
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
  if (error instanceof ApiError) {
    console.log(error.toString());
    
    // Access parent error
    if (error.parent instanceof DatabaseError) {
      const dbContext = DatabaseError.getContext(error.parent);
      console.log(`Failed to connect to: ${dbContext.dbName}`);
    }
  }
}
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
  captureStack?: boolean;              // Whether to capture stack trace (default: false)
  inherits?: ParentError;              // Alternative parent error class
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

#### `.followParentChain(error)`

Follows and returns the entire chain of parent errors.

**Parameters:**
- `error`: `Error & { parent?: Error }` - The starting error

**Returns:** `Error[]`

#### `.getInstances()`

Returns the complete inheritance chain of error classes.

**Returns:** `CustomErrorClass<any>[]`

### `Error` Instance Properties

- `.name`: `string` - The name of the error
- `.message`: `string` - The error message
- `.parent?`: `Error` - Reference to the parent error, if any
- `.inheritanceChain?`: `CustomErrorClass<any>[]` - Array of parent error classes

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

// Usage
throw createApiError("/users", 404, "User not found");
```

## 🧪 Running the Examples

The code includes comprehensive examples that demonstrate the capabilities of this library. Run them to see the error hierarchies in action:

```bash
# From the root of the project
npm run examples
# or
yarn examples
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

MIT
/**
 * # CustomError
 *
 * A TypeScript library for creating custom error classes with enhanced features such as:
 *
 * Features:
 * - Generate Custom error classes
 * - Simplified API for creating custom errors
 * - Type-safe error context with TypeScript
 * - Inheritance hierarchies with context propagation
 * - Parent-child error relationships
 * - Custom serialization and formatting
 * - Performance optimizations
 * - Circular reference detection
 * - Property enumeration control
 * - Collision strategy for context properties
 * - Fast error creation for high-performance scenarios
 *
 * ## Usage
 *
 * ```ts
 * import { createCustomError, checkInstance } from '@fuzzy-street/errors';
 *
 * // Create a custom error class
 * const ApiError = createCustomError<{
 *  statusCode: number;
 *  endpoint: string;
 * }>(
 * "ApiError",
 * ["statusCode", "endpoint"]
 * );
 * ```
 *
 * @see {@link createCustomError}
 * @see {@link checkInstance}
 * @author aFuzzyBear
 * @license MIT
 *
 */

/**
 * Type for extracting context from a CustomErrorClass
 */
type ErrorContext<T> = T extends CustomErrorClass<infer Context> ? Context : Record<string, never>;

/**
 * Collision strategy for handling context property name collisions
 */
type CollisionStrategy = "override" | "preserve" | "error";

/**
 * Options for creating or configuring an error instance
 */
type ErrorOptions<OwnContext, ParentError extends CustomErrorClass<any> | undefined = undefined> = {
  message: string;
  captureStack?: boolean;
  overridePrototype?: ParentError;
  enumerableProperties?: boolean | string[];
  collisionStrategy?: CollisionStrategy;
  maxParentChainLength?: number;
  parent?: Error;
} & (
  | { cause: OwnContext } // Context object
  | { cause: string } // Cause message
  | { cause?: undefined } // No cause
);

/**
 * Represents a custom error class with enhanced features
 */
type CustomErrorClass<T> = {
  new (
    options: ErrorOptions<T, any>,
  ): Error &
    T & {
      inheritanceChain?: CustomErrorClass<any>[];
      parent?: Error & Partial<T>; // Parent error with potential context
      context: T; // Expose context directly on the error
      toJSON(): any; // Add toJSON method
    };

  /**
   * Retrieves the context data from an error instance
   * @param error The error to get context from
   * @param options Options for context retrieval
   */
  getContext(error: unknown, options?: { includeParentContext?: boolean }): T | undefined;

  /**
   * Get full error hierarchy with contexts
   * @param error The error to get hierarchy for
   */
  getErrorHierarchy(error: unknown): ErrorHierarchyItem[];

  /**
   * Follows the chain of parents and returns them as an array
   * @param error The error to get parent chain for
   */
  followParentChain(error: Error): Error[];

  /**
   * Returns the full inheritance chain of error classes
   */
  getInstances(): CustomErrorClass<any>[];

  /**
   * Creates a simplified error with minimal overhead for high-performance scenarios
   * @param message Error message
   * @param context Optional context object
   */
  createFast(message: string, context?: Partial<T>): Error & T;

  prototype: Error;

  /**
   * Name of the error class
   */
  readonly name: string;
};

/**
 * Represents a detailed error hierarchy item
 */
interface ErrorHierarchyItem {
  name: string;
  message: string;
  context?: Record<string, unknown>;
  parent?: string;
  inheritanceChain?: string[];
}

// WeakMap to store full context
const errorContexts = new WeakMap<Error, any>();

// Store context keys per error class
const errorClassKeys = new Map<string, string[]>();

// Global registry to track all created custom error classes
const customErrorRegistry = new Map<string, CustomErrorClass<any>>();

/**
 * Default options for error creation
 */
const DEFAULT_OPTIONS = {
  captureStack: true,
  enumerableProperties: false,
  collisionStrategy: "override" as CollisionStrategy,
  maxParentChainLength: 100,
};

/**
 * Type-safe instance checker for custom errors
 * This function provides proper TypeScript type inference when checking error instances
 *
 * @param error The error to check
 * @param instance The custom error class to check against
 * @returns Type guard assertion that the error is of type Error & T
 *
 * @example
 * if (checkInstance(error, ApiError)) {
 *   // TypeScript now knows these properties exist
 *   console.log(error.statusCode);
 *   console.log(error.endpoint);
 * }
 */
export function checkInstance<T>(
  error: unknown,
  instance: CustomErrorClass<T>,
): error is Error & T {
  return error instanceof instance;
}

/**
 * Creates a custom error class with enhanced hierarchical error tracking
 *
 * @param name Name of the error class
 * @param contextKeys Array of context property keys
 * @param parentError Optional parent error class to inherit from
 * @returns A new custom error class with typed context
 *
 * @example
 * const ApiError = createCustomError<{
 *   statusCode: number;
 *   endpoint: string;
 * }>("ApiError", ["statusCode", "endpoint"]);
 *
 * const error = new ApiError({
 *   message: "API request failed",
 *   cause: { statusCode: 404, endpoint: "/api/users" }
 * });
 */
export function createCustomError<
  OwnContext extends Record<string, unknown> = {},
  ParentError extends CustomErrorClass<any> | undefined = undefined,
>(
  name: string,
  contextKeys: (keyof OwnContext)[],
  parentError?: ParentError,
): CustomErrorClass<
  OwnContext & (ParentError extends CustomErrorClass<any> ? ErrorContext<ParentError> : {})
> {
  // Determine the parent error class
  const ParentErrorClass = parentError ?? Error;

  // Store the context keys for this class
  errorClassKeys.set(name, contextKeys as string[]);

  class CustomError extends ParentErrorClass {
    readonly name: string = name;
    inheritanceChain?: CustomErrorClass<any>[];
    parent?: Error;
    message!: string;
    stack: any;
    _contextCached?: boolean;

    constructor(options: ErrorOptions<OwnContext, ParentError>) {
      // Apply default options
      const finalOptions = {
        ...DEFAULT_OPTIONS,
        ...options,
      };

      // Call parent constructor with just the message
      super(finalOptions?.message || "Unknown error");

      if (finalOptions?.message) {
        // Explicitly set the message property
        Object.defineProperty(this, "message", {
          value: finalOptions.message,
          enumerable: false,
          writable: true,
          configurable: true,
        });
      }

      // Now process the options after super() is called
      if (finalOptions) {
        const {
          message,
          cause,
          captureStack,
          parent,
          overridePrototype,
          enumerableProperties,
          collisionStrategy,
          maxParentChainLength,
        } = finalOptions;

        // Determine which parent to use
        const effectiveParent = overridePrototype || parentError;
        let mergedContext: Record<string, unknown> = {};
        let parentInstance: Error | undefined;

        // Handle parent error if provided
        if (parent) {
          parentInstance = parent;

          // Extract context from parent if available
          const parentContext = errorContexts.get(parent);
          if (parentContext) {
            mergedContext = { ...parentContext };
          }
        }
        // Handle various cause types
        // if (cause) {
        //   if (cause instanceof Error) {
        //     // If cause is an error, use it as the parent
        //     parentInstance = cause;

        //     // Extract context from error if available
        //     const causeContext = errorContexts.get(cause);
        //     if (causeContext) {
        //       mergedContext = { ...causeContext };
        //     }
        //   } else if (typeof cause === "string") {
        //     // If cause is a string, create a base error
        //     parentInstance = new Error(cause);
        //   } else if (typeof cause === "object") {
        //     // If cause is an object, use it as context
        //     mergedContext = { ...cause };

        //     // Create parent errors to maintain the error chain
        //     if (effectiveParent &&
        //       effectiveParent !== (Error as unknown as CustomErrorClass<any>) &&
        //       typeof effectiveParent.getInstances === 'function') {
        //       try {
        //         // Create a parent error instance
        //         const parentKeys =
        //           errorClassKeys.get(effectiveParent.name) || [];
        //         const parentContext: Record<string, unknown> = {};

        //         // Extract only the keys relevant to the parent
        //         for (const key of parentKeys) {
        //           if (key in mergedContext) {
        //             parentContext[key as string] = mergedContext[key as string];
        //           }
        //         }

        //         // Add keys from any ancestor classes
        //         const ancestorClasses = effectiveParent.getInstances();
        //         for (const ancestorClass of ancestorClasses) {
        //           const ancestorKeys =
        //             errorClassKeys.get(ancestorClass.name) || [];
        //           for (const key of ancestorKeys) {
        //             if (key in mergedContext && !(key in parentContext)) {
        //               parentContext[key as string] =
        //                 mergedContext[key as string];
        //             }
        //           }
        //         }

        //         parentInstance = new effectiveParent({
        //           message: message || `${effectiveParent.name} Error`,
        //           cause: parentContext,
        //           captureStack, // Pass captureStack to parent
        //           collisionStrategy,
        //         });
        //       } catch (e) {
        //         console.warn(
        //           `Failed to create ${effectiveParent?.name} instance:`,
        //           e,
        //         );
        //       }
        //     }
        //   }
        // }
        if (cause) {
          if (typeof cause === "string") {
            // If cause is a string, create a base error
            if (!parentInstance) {
              parentInstance = new Error(cause);
            }
          } else if (typeof cause === "object") {
            // If cause is an object, use it as context
            mergedContext = { ...cause };

            // Create parent errors to maintain the error chain
            if (
              !parentInstance &&
              effectiveParent &&
              effectiveParent !== (Error as unknown as CustomErrorClass<any>) &&
              typeof effectiveParent.getInstances === "function"
            ) {
              try {
                // Create a parent error instance
                const parentKeys = errorClassKeys.get(effectiveParent.name) || [];
                const parentContext: Record<string, unknown> = {};

                // Extract only the keys relevant to the parent
                for (const key of parentKeys) {
                  if (key in mergedContext) {
                    parentContext[key as string] = mergedContext[key as string];
                  }
                }

                // Add keys from any ancestor classes
                const ancestorClasses = effectiveParent.getInstances();
                for (const ancestorClass of ancestorClasses) {
                  const ancestorKeys = errorClassKeys.get(ancestorClass.name) || [];
                  for (const key of ancestorKeys) {
                    if (key in mergedContext && !(key in parentContext)) {
                      parentContext[key as string] = mergedContext[key as string];
                    }
                  }
                }

                parentInstance = new effectiveParent({
                  message: message || `${effectiveParent.name} Error`,
                  cause: parentContext,
                  captureStack, // Pass captureStack to parent
                  collisionStrategy,
                });
              } catch (e) {
                console.warn(`Failed to create ${effectiveParent?.name} instance:`, e);
              }
            }
          }
        }

        // Set name properties
        Object.defineProperty(this, "name", {
          value: name,
          enumerable: false,
          configurable: true,
        });

        // Assign parent
        if (parentInstance) {
          // Check for circular references
          if (this === parentInstance || this.isInParentChain(parentInstance)) {
            console.warn(`Circular reference detected when setting parent of ${name}`);
          } else {
            Object.defineProperty(this, "parent", {
              value: parentInstance,
              enumerable: true,
              writable: true,
              configurable: true,
            });
          }
        }

        // Build inheritance chain based on effective parent
        this.inheritanceChain =
          effectiveParent &&
          effectiveParent !== (Error as unknown as CustomErrorClass<any>) &&
          typeof effectiveParent.getInstances === "function"
            ? [...(effectiveParent.getInstances?.() || []), effectiveParent]
            : [];

        // Handle context collisions
        if (collisionStrategy === "error") {
          this.checkContextCollisions(mergedContext);
        }

        // Store the full context
        if (Object.keys(mergedContext).length > 0) {
          errorContexts.set(this, { ...mergedContext });

          // Assign all context properties to the error instance
          Object.assign(this, mergedContext);
        }

        // Handle stack trace
        if (captureStack && typeof Error?.captureStackTrace === "function") {
          Error.captureStackTrace(this, CustomError);
        } else if (captureStack) {
          // Fallback for environments without captureStackTrace
          this.stack = new Error().stack;
        }

        // Handle enumerable properties
        if (enumerableProperties) {
          this.makePropertiesEnumerable(enumerableProperties);
        }

        // Store the maxParentChainLength in the error instance for later use
        if (maxParentChainLength) {
          Object.defineProperty(this, "maxParentChainLength", {
            value: maxParentChainLength,
            enumerable: false,
            configurable: true,
          });
        }
      }
    }

    /**
     * Checks if an error is in the parent chain to detect circular references
     */
    private isInParentChain(potentialParent: Error): boolean {
      let current: any = this.parent;
      const seen = new WeakSet<Error>();

      while (current) {
        if (seen.has(current)) {
          return true; // Circular reference already exists
        }

        if (current === potentialParent) {
          return true;
        }

        seen.add(current);
        current = current.parent;
      }

      return false;
    }

    /**
     * Checks for context property name collisions and throws an error if found
     */
    private checkContextCollisions(context: Record<string, unknown>): void {
      // Get parent context keys
      const parentKeys: string[] = [];

      // First, get parent context keys from inheritance chain
      if (this.inheritanceChain) {
        for (const parentClass of this.inheritanceChain) {
          const classKeys = errorClassKeys.get(parentClass.name) || [];
          parentKeys.push(...classKeys);
        }
      }

      // Check for collisions with parent context keys
      for (const key in context) {
        if (parentKeys.includes(key)) {
          throw new Error(
            `Context property '${key}' conflicts with an existing property in parent context`,
          );
        }

        // Also check for collisions with standard Error properties
        if (["name", "message", "stack", "toString", "constructor"].includes(key)) {
          throw new Error(`Context property '${key}' conflicts with a standard Error property`);
        }
      }
    }

    /**
     * Makes selected properties enumerable
     */
    private makePropertiesEnumerable(enumerableProps: boolean | string[]): void {
      const propsToMakeEnumerable =
        typeof enumerableProps === "boolean" ? ["name", "message", "stack"] : enumerableProps;

      for (const prop of propsToMakeEnumerable) {
        if (Object.prototype.hasOwnProperty.call(this, prop)) {
          Object.defineProperty(this, prop, {
            enumerable: true,
            configurable: true,
          });
        }
      }
    }

    // Removed compatibility mode method as it's not needed

    /**
     * Custom toString method to include context and inheritance
     */
    toString(): string {
      const baseString = `${this.name}: ${this.message}`;
      const context = errorContexts.get(this);
      const inheritanceInfo =
        this.inheritanceChain && this.inheritanceChain.length > 0
          ? `\nInheritance Chain: ${this.inheritanceChain.map((e) => e.name).join(" > ")}`
          : "";
      const parentInfo = this.parent ? `\nParent: ${this.parent.name}: ${this.parent.message}` : "";

      return context
        ? `${baseString}\nCause: ${JSON.stringify(context, null, 2)}${inheritanceInfo}${parentInfo}`
        : baseString;
    }

    /**
     * Custom toJSON method for proper serialization with JSON.stringify
     */
    toJSON(): any {
      const context = errorContexts.get(this);

      // Create a base object with standard error properties
      const result: Record<string, any> = {
        name: this.name,
        message: this.message,
      };

      // Add stack if available
      if (this.stack) {
        result.stack = this.stack;
      }

      // Add context if available
      if (context) {
        result.cause = { ...context };
      }

      // Add parent info if available
      if (this.parent) {
        result.parent = {
          name: this.parent.name,
          message: this.parent.message,
        };

        // Add parent context if available
        const parentContext = this.parent instanceof Error && errorContexts.get(this.parent);
        if (parentContext) {
          result.parent.cause = { ...parentContext };
        }
      }

      // Add inheritance chain if available
      if (this.inheritanceChain && this.inheritanceChain.length > 0) {
        result.inheritanceChain = this.inheritanceChain.map((e) => e.name);
      }

      return result;
    }
  }

  // Ensure name is correctly set on the constructor
  Object.defineProperty(CustomError, "name", { value: name });

  // Add static methods
  Object.defineProperties(CustomError, {
    /**
     * Retrieves the context data from an error instance
     */
    getContext: {
      value: (
        error: unknown,
        options?: { includeParentContext?: boolean },
      ):
        | (OwnContext &
            (ParentError extends CustomErrorClass<any> ? ErrorContext<ParentError> : {}))
        | undefined => {
        if (!(error instanceof Error)) return undefined;

        const fullContext = errorContexts.get(error);
        if (!fullContext) return undefined;

        if (options?.includeParentContext !== false) {
          // Return the full context
          return fullContext;
        }

        // If we only want this class's context, filter for the specified keys
        const result: Record<string, unknown> = {};
        const keys = errorClassKeys.get(name);
        if (keys) {
          for (const key of keys) {
            if (key in fullContext) {
              result[key] = fullContext[key];
            }
          }
        }

        return Object.keys(result).length > 0 ? (result as any) : undefined;
      },
      enumerable: false,
      configurable: true,
    },

    /**
     * Get full error hierarchy with contexts
     */
    getErrorHierarchy: {
      value: (error: unknown): ErrorHierarchyItem[] => {
        if (!(error instanceof Error)) return [];

        const hierarchy: ErrorHierarchyItem[] = [];
        const seen = new WeakSet<Error>();
        let currentError:
          | (Error & {
              inheritanceChain?: CustomErrorClass<any>[];
              parent?: Error;
            })
          | undefined = error;

        while (currentError) {
          // Check for circular references
          if (seen.has(currentError)) {
            console.warn("Circular reference detected in error hierarchy");
            break;
          }
          seen.add(currentError);

          const hierarchyItem: ErrorHierarchyItem = {
            name: currentError.name,
            message: currentError.message,
            context: errorContexts.get(currentError),
            inheritanceChain: currentError.inheritanceChain
              ? currentError.inheritanceChain.map((e) => e.name)
              : undefined,
          };

          // Add parent if it exists
          if (currentError.parent) {
            hierarchyItem.parent = `${currentError.parent.name}: ${currentError.parent.message}`;
          }

          hierarchy.push(hierarchyItem);

          // Move to the next error in the chain
          currentError = currentError.parent as
            | (Error & {
                inheritanceChain?: CustomErrorClass<any>[];
                parent?: Error;
              })
            | undefined;
        }

        return hierarchy;
      },
      enumerable: false,
      configurable: true,
    },

    /**
     * Follows the chain of parents and returns them as an array
     */
    followParentChain: {
      value: (error: Error & { parent?: Error }, maxDepth = 100): Error[] => {
        const chain = [error];
        let current = error.parent;
        const seen = new WeakSet<Error>([error]);
        let depth = 0;

        while (current && depth < maxDepth) {
          if (seen.has(current)) {
            console.warn("Circular reference detected in error chain");
            break;
          }
          seen.add(current);
          chain.push(current);
          current = (current as any).parent;
          depth++;
        }

        if (depth >= maxDepth && current) {
          console.warn(`Maximum parent chain depth (${maxDepth}) reached`);
        }

        return chain;
      },
      enumerable: false,
      configurable: true,
    },

    /**
     * Returns the inheritance chain of error classes
     */
    getInstances: {
      value: (): CustomErrorClass<any>[] => {
        if (!parentError || parentError === (Error as unknown as ParentError)) {
          // If no parent, return empty array
          return [];
        }

        // If parent exists, get its instances and add parent
        const parentChain =
          typeof parentError.getInstances === "function" ? parentError.getInstances?.() || [] : [];
        return [...parentChain, parentError];
      },
      enumerable: false,
      configurable: true,
    },

    /**
     * Creates a simplified error with minimal overhead for high-performance scenarios
     */
    createFast: {
      value: (message: string, context?: Partial<OwnContext>): Error & OwnContext => {
        const error = new CustomError({
          message,
          //@ts-expect-error - context is not strictly typed
          cause: context || {},
          captureStack: false,
          enumerableProperties: false,
          collisionStrategy: "override",
        });
        if (context) {
          Object.assign(error, context);
        }

        // @ts-expect-error - We are creating a new instance of CustomError
        return error;
      },
      enumerable: false,
      configurable: true,
    },
  });

  // Store the custom error class in registry with proper name
  customErrorRegistry.set(name, CustomError as any);

  return CustomError as unknown as CustomErrorClass<
    OwnContext & (ParentError extends CustomErrorClass<any> ? ErrorContext<ParentError> : {})
  >;
}

/**
 * Get a registered error class by name
 *
 * @param name The name of the error class to retrieve
 * @returns The custom error class or undefined if not found
 *
 * @example
 * ```ts
 * const ApiError = getErrorClass("ApiError");
 * if (ApiError) {
 *   const error = new ApiError({
 *     message: "API request failed",
 *     cause: { statusCode: 404, endpoint: "/api/users" }
 *   });
 *   console.log(error.toString());
 * }
 * ```
 */
export function getErrorClass(name: string): CustomErrorClass<any> | undefined {
  return customErrorRegistry.get(name);
}

/**
 * List all registered error class names
 *
 * @returns An array of registered error class names
 *
 * @example
 * ```ts
 * const errorClasses = listErrorClasses();
 * console.log("Registered error classes:", errorClasses);
 * ```
 *
 */
export function listErrorClasses(): string[] {
  return Array.from(customErrorRegistry.keys());
}

/**
 * Clear all registered error classes (useful for testing)
 *
 * @example
 * ```ts
 * clearErrorRegistry();
 * const errorClasses = listErrorClasses();
 * console.log("Registered error classes after clearing:", errorClasses);
 * ```
 */
export function clearErrorRegistry(): void {
  customErrorRegistry.clear();
  errorClassKeys.clear();
}

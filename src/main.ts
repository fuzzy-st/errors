
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
 * @see {@link isError}
 * @author aFuzzyBear
 * @license MIT
 *
 */

/**
 * Type for extracting context from a CustomErrorClass
 */
export type ErrorContext<T> = T extends CustomErrorClass<infer Context> ? Context : Record<string, never>;

/**
 * Collision strategy for handling context property name collisions
 */
export type CollisionStrategy = "override" | "preserve" | "error";

/**
 * Options for creating or configuring an error instance
 */
export type CustomErrorOptions<OwnContext, ParentError extends CustomErrorClass<any> | undefined = undefined> = {
  message: string;
  captureStack?: boolean;
  overridePrototype?: ParentError;
  enumerableProperties?: boolean | string[];
  collisionStrategy?: CollisionStrategy;
  maxParentChainLength?: number;
  parent?: Error;
} & (
  | { cause: OwnContext }
  | { cause: string }
  | { cause?: undefined }
  );

/**
 * Represents a custom error class with enhanced features
 */
export type CustomErrorClass<T> = {
  new(
    options: CustomErrorOptions<T, any>,
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
  getErrorHierarchy(error: unknown): CustomErrorHierarchyItem[];
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
  readonly name: string;
};

/**
 * Represents a detailed error hierarchy item
 */
export interface CustomErrorHierarchyItem {
  name: string;
  message: string;
  context?: Record<string, unknown>;
  parent?: string;
  inheritanceChain?: string[];
}

// WeakMap for context storage - allows GC to clean up when error is collected
const errorContexts = new WeakMap<Error, Record<string, unknown>>();

// Store context keys per error class (lightweight metadata)
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
 */
export function isError<T>(
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
  // Determine the parent error class for prototype chain
  const ParentErrorClass = parentError ?? Error;

  // Store context keys for this class (used by getContext with includeParentContext: false)
  errorClassKeys.set(name, contextKeys as string[]);


  class CustomError extends ParentErrorClass {
    readonly name: string = name;
    inheritanceChain?: CustomErrorClass<any>[];
    parent?: Error;
    declare message: string;
    declare stack: string;
    private _materializedParents?: Error[];

    constructor(options: CustomErrorOptions<OwnContext, ParentError>) {
      // Call parent constructor with message
      super(options?.message || "Unknown error");

      // Apply defaults
      const finalOptions = { ...DEFAULT_OPTIONS, ...options };
      const {
        message,
        cause,
        captureStack,
        parent,
        collisionStrategy,
        enumerableProperties,
        maxParentChainLength
      } = finalOptions;

      // Build merged context from cause and inherited class contexts
      const mergedContext = this.buildMergedContext(cause, parentError);

      // Handle collision detection if requested
      if (collisionStrategy === "error") {
        this.checkContextCollisions(mergedContext, parentError);
      }
      // Assign context properties if any
      if (Object.keys(mergedContext).length > 0) {
        // Store in WeakMap for fast getContext() and GC-friendly behavior
        errorContexts.set(this, mergedContext);

        // Also assign to instance for fast property access
        Object.assign(this, mergedContext);
      }

      // Build inheritance chain (class hierarchy, not instances)
      // This tracks the CLASS relationships, not error causality
      this.inheritanceChain = this.buildInheritanceChain(parentError);

      // Handle parent instance
      // Priority: explicit parent > string cause creates parent > no parent
      let parentToSet: Error | undefined = parent;

      // If cause is a string and no explicit parent, create Error instance
      if (typeof cause === "string" && !parentToSet) {
        parentToSet = new Error(cause);
      }

      // Set parent instance ONLY if explicitly provided or created from string
      // This represents error CAUSALITY (A was caused by B)
      // NOT inheritance (A inherits context keys from B)
      if (parentToSet) {
        this.validateParentChain(parentToSet, maxParentChainLength);
        this.parent = parentToSet;
      }

      // Consolidated property definitions 
      const propertyDescriptors: PropertyDescriptorMap = {
        name: {
          value: name,
          enumerable: false,
          configurable: true
        },
        message: {
          value: message,
          enumerable: false,
          writable: true,
          configurable: true
        },
      };

      // Conditionally add parent descriptor
      if (parent) {
        propertyDescriptors.parent = {
          value: parent,
          enumerable: true,
          writable: true,
          configurable: true,
        };
      }

      // single Object.defineProperties call
      // More efficient than multiple defineProperty calls as was in original
      Object.defineProperties(this, propertyDescriptors);

      // Capture stack trace if requested
      // Only called when captureStack=true (default but overridable)
      if (captureStack) {
        if (typeof Error.captureStackTrace === "function") {
          Error.captureStackTrace(this, CustomError);
        } else {
          // Fallback for non-V8 environments
          this.stack = new Error().stack || "";
        }
      }

      // Handle enumerable properties
      if (enumerableProperties) {
        this.makePropertiesEnumerable(enumerableProperties);
      }
    }

    /**
     * Build merged context from cause and parent class contexts
     * 
     * STRATEGY:
     * 1. If cause is a string, no context to merge
     * 2. If cause is an object, treat as context
     * 3. Include all context keys from parent classes (inheritance)
     * 4. Do NOT create parent instances - just merge keys
     */
    private buildMergedContext(
      cause: OwnContext | string | undefined,
      parentErrorClass?: ParentError
    ): Record<string, unknown> {
      // Handle string cause (no context)
      if (typeof cause === "string" || !cause) {
        return {};
      }

      // Start with own context
      const mergedContext: Record<string, unknown> = {};

      // Collect all context keys from inheritance hierarchy
      const allKeys = new Set<string>();

      // Add own keys
      for (const key of contextKeys) {
        allKeys.add(key as string);
      }

      // Add parent class keys if inheritance exists
      if (parentErrorClass &&
        parentErrorClass !== (Error as unknown as CustomErrorClass<any>)) {
        const inheritedKeys = this.getInheritedContextKeys(parentErrorClass);
        for (const key of inheritedKeys) {
          allKeys.add(key);
        }
      }

      // Merge only the keys that exist in cause
      for (const key of allKeys) {
        if (key in cause) {
          mergedContext[key] = (cause as any)[key];
        }
      }

      return mergedContext;
    }

    /**
     * Get all context keys from parent class hierarchy
     */
    private getInheritedContextKeys(parentErrorClass: CustomErrorClass<any>): string[] {
      const keys: string[] = [];

      // Get parent's own keys
      const parentKeys = errorClassKeys.get(parentErrorClass.name);
      if (parentKeys) {
        keys.push(...parentKeys);
      }

      // Get ancestor keys via getInstances()
      if (typeof parentErrorClass.getInstances === "function") {
        const ancestors = parentErrorClass.getInstances();
        for (const ancestor of ancestors) {
          const ancestorKeys = errorClassKeys.get(ancestor.name);
          if (ancestorKeys) {
            keys.push(...ancestorKeys);
          }
        }
      }

      return keys;
    }

    /**
     * Build inheritance chain from parent class
     * Returns array of error CLASSES, not instances
     */
    private buildInheritanceChain(
      parentErrorClass?: ParentError
    ): CustomErrorClass<any>[] {
      if (!parentErrorClass ||
        parentErrorClass === (Error as unknown as ParentError)) {
        return [];
      }

      const chain: CustomErrorClass<any>[] = [];

      if (typeof parentErrorClass.getInstances === "function") {
        chain.push(...(parentErrorClass.getInstances() || []));
      }

      chain.push(parentErrorClass);

      return chain;
    }

    /**
     * Lazily materialize parent instances from inheritance chain
     * Only called when `followParentChain()` or `getErrorHierarchy()` is invoked
     * Caches result to avoid repeated materialization
     */
    private materializeParentChain(): Error[] {
      // Return cached result if already materialized
      if (this._materializedParents) {
        return this._materializedParents;
      }

      // No inheritance chain = just return self
      if (!this.inheritanceChain || this.inheritanceChain.length === 0) {
        this._materializedParents = [this];
        return this._materializedParents;
      }

      const chain: Error[] = [this];
      const fullContext = errorContexts.get(this);

      // Walk backwards through inheritance chain (most specific to least specific)
      // e.g., QueryError -> DatabaseError -> AppError
      let previousInstance: any = this;

      for (let i = this.inheritanceChain.length - 1; i >= 0; i--) {
        const ParentClass = this.inheritanceChain[i];
        const parentKeys = errorClassKeys.get(ParentClass.name) || [];

        // Extract context keys relevant to this parent level
        const parentContext: Record<string, unknown> = {};
        if (fullContext) {
          for (const key of parentKeys) {
            if (key in fullContext) {
              parentContext[key] = fullContext[key];
            }
          }
        }

        // Create synthetic parent instance
        const parentInstance = new ParentClass({
          message: `${ParentClass.name} (inherited)`,
          cause: Object.keys(parentContext).length > 0 ? parentContext : undefined,
          captureStack: false, // Don't waste time on synthetic stack traces
        });

        // Link previous instance's parent to this new instance
        Object.defineProperty(previousInstance, 'parent', {
          value: parentInstance,
          enumerable: true,
          writable: true,
          configurable: true,
        });

        chain.push(parentInstance);
        previousInstance = parentInstance;
      }

      // Cache the materialized chain
      this._materializedParents = chain;
      return chain;
    }

    /**
     * Validate parent chain for circular references and depth
     */
    private validateParentChain(parent: Error, maxDepth: number): void {
      // Check for direct circular reference
      if (this === parent) {
        throw new Error(
          `Cannot set error as its own parent: ${name}`
        );
      }

      // Check for circular reference in chain
      let current: any = parent;
      const seen = new WeakSet<Error>([this]);
      let depth = 0;

      while (current && depth < maxDepth) {
        if (seen.has(current)) {
          throw new Error(
            `Circular reference detected in parent chain for ${name}`
          );
        }
        seen.add(current);
        current = current.parent;
        depth++;
      }

      if (depth >= maxDepth && current) {
        throw new Error(
          `Parent chain exceeds maximum depth of ${maxDepth} for ${name}`
        );
      }
    }

    /**
     * Check for context property name collisions
     */
    private checkContextCollisions(
      context: Record<string, unknown>,
      parentErrorClass?: ParentError
    ): void {
      // Standard Error properties that cannot be overridden
      const reservedProps = new Set([
        "name", "message", "stack", "toString", "toJSON",
        "constructor", "prototype"
      ]);

      for (const key in context) {
        if (reservedProps.has(key)) {
          throw new Error(
            `Context property '${key}' conflicts with reserved Error property`
          );
        }
      }

      // Check collisions with parent context keys only if explicitly requested
      if (parentErrorClass) {
        const parentKeys = new Set(this.getInheritedContextKeys(parentErrorClass));
        for (const key in context) {
          if (parentKeys.has(key) && contextKeys.includes(key as any)) {
            // Only error if this class is trying to redefine a parent key
            throw new Error(
              `Context property '${key}' conflicts with parent context key`
            );
          }
        }
      }
    }

    /**
     * Make selected properties enumerable
     */
    private makePropertiesEnumerable(enumerableProps: boolean | string[]): void {
      const propsToMakeEnumerable =
        typeof enumerableProps === "boolean"
          ? ["name", "message", "stack"]
          : enumerableProps;

      for (const prop of propsToMakeEnumerable) {
        if (Object.prototype.hasOwnProperty.call(this, prop)) {
          Object.defineProperty(this, prop, {
            enumerable: true,
            configurable: true,
          });
        }
      }
    }

    /**
     * Custom toString method
     * Includes context and inheritance information
     */
    toString(): string {
      const baseString = `${this.name}: ${this.message}`;

      // Get context from instance properties
      const context = this.getOwnContext();
      const contextStr = Object.keys(context).length > 0
        ? `\nContext: ${JSON.stringify(context, null, 2)}`
        : "";

      const inheritanceStr =
        this.inheritanceChain && this.inheritanceChain.length > 0
          ? `\nInheritance: ${this.inheritanceChain.map((e) => e.name).join(" > ")}`
          : "";

      const parentStr = this.parent
        ? `\nCaused by: ${this.parent.name}: ${this.parent.message}`
        : "";

      return `${baseString}${contextStr}${inheritanceStr}${parentStr}`;
    }

    /**
     * Get context properties for this instance
     * Uses WeakMap for O(1) lookup instead of key iteration
     */
    private getOwnContext(): Record<string, unknown> {
      // Fast path: get full context from WeakMap
      const fullContext = errorContexts.get(this);
      if (!fullContext) return {};

      // Return full context or filter to own keys
      return fullContext;
    }

    /**
     * Custom toJSON method for JSON.stringify
     */
    toJSON(): any {
      const result: Record<string, any> = {
        name: this.name,
        message: this.message,
      };

      // Add stack if available
      if (this.stack) {
        result.stack = this.stack;
      }

      // Add context as 'cause' for backwards compatibility
      const context = this.getOwnContext();
      if (Object.keys(context).length > 0) {
        result.cause = context;
      }

      // Add parent info
      if (this.parent) {
        result.parent = {
          name: this.parent.name,
          message: this.parent.message,
        };

        // Add parent context if it has getOwnContext method
        if (typeof (this.parent as any).getOwnContext === "function") {
          const parentContext = (this.parent as any).getOwnContext();
          if (Object.keys(parentContext).length > 0) {
            result.parent.cause = parentContext;
          }
        }
      }

      // Add inheritance chain
      if (this.inheritanceChain && this.inheritanceChain.length > 0) {
        result.inheritanceChain = this.inheritanceChain.map((e) => e.name);
      }

      return result;
    }
  }

  // Set constructor name
  Object.defineProperty(CustomError, "name", { value: name });

  // Add static methods
  Object.defineProperties(CustomError, {
    /**
     * Get context from error instance
     * 
     * IMPLEMENTATION:
     * Uses WeakMap for O(1) lookup (fast path)
     * Only filters keys if includeParentContext: false
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

        // Fast path: get full context from WeakMap
        const fullContext = errorContexts.get(error);
        if (!fullContext) return undefined;

        // FAST PATH: If including parent context or no filtering needed, return immediately
        // This avoids all the filtering logic overhead
        if (options?.includeParentContext !== false) {
          return fullContext as any;
        }

        // SLOW PATH: Filter to only this class's keys
        // This path is only taken when explicitly requested
        const ownKeys = errorClassKeys.get(name);
        if (!ownKeys || ownKeys.length === 0) {
          return undefined;
        }

        // Build filtered context with only own keys
        const filtered: Record<string, unknown> = {};
        for (const key of ownKeys) {
          if (key in fullContext) {
            filtered[key] = fullContext[key];
          }
        }

        return Object.keys(filtered).length > 0 ? (filtered as any) : undefined;
      },
      enumerable: false,
      configurable: true,
    },

    /**
     * Get full error hierarchy with contexts
     */
    getErrorHierarchy: {
      value: (error: unknown): CustomErrorHierarchyItem[] => {
        if (!(error instanceof Error)) return [];

        const hierarchy: CustomErrorHierarchyItem[] = [];
        const seen = new WeakSet<Error>();
        let currentError: any = error;

        while (currentError) {
          if (seen.has(currentError)) {
            console.warn("Circular reference detected in error hierarchy");
            break;
          }
          seen.add(currentError);

          // Get context for this error
          const context =
            typeof currentError.getOwnContext === "function"
              ? currentError.getOwnContext()
              : undefined;

          const hierarchyItem: CustomErrorHierarchyItem = {
            name: currentError.name,
            message: currentError.message,
            context,
            inheritanceChain: currentError.inheritanceChain
              ? currentError.inheritanceChain.map((e: any) => e.name)
              : undefined,
          };

          if (currentError.parent) {
            hierarchyItem.parent = `${currentError.parent.name}: ${currentError.parent.message}`;
          }

          hierarchy.push(hierarchyItem);
          currentError = currentError.parent;
        }

        return hierarchy;
      },
      enumerable: false,
      configurable: true,
    },

    /**
     * Follow the parent chain
     * 
     * For custom errors with inheritance chains, this will lazily materialize
     * parent instances on first call, then use the cached chain
     * 
     * OPTIMIZATION: Check for inheritance chain first before calling `materializeParentChain`
     * This avoids function call overhead for errors without inheritance
     */
    followParentChain: {
      value: (error: Error & { parent?: Error }, maxDepth = 100): Error[] => {
        // FAST PATH: Check if this error has an inheritance chain to materialize
        // This is faster than checking for the method existence
        const hasInheritance = (error as any).inheritanceChain?.length > 0;

        if (hasInheritance && typeof (error as any).materializeParentChain === 'function') {
          // Custom error with inheritance - use lazy materialization
          const materializedChain = (error as any).materializeParentChain();

          // After materializing inheritance chain, follow any explicit parent links
          // from the last item in the materialized chain
          let lastInChain = materializedChain[materializedChain.length - 1];
          let current = lastInChain.parent;
          const seen = new WeakSet<Error>(materializedChain);
          let depth = materializedChain.length;

          while (current && depth < maxDepth) {
            if (seen.has(current)) {
              console.warn("Circular reference detected in parent chain");
              break;
            }
            seen.add(current);
            materializedChain.push(current);
            current = (current as any).parent;
            depth++;
          }

          if (depth >= maxDepth && current) {
            console.warn(`Maximum parent chain depth (${maxDepth}) reached`);
          }

          return materializedChain;
        }

        // FAST PATH: No inheritance - simple parent chain traversal
        const chain = [error];
        let current = error.parent;
        const seen = new WeakSet<Error>([error]);
        let depth = 0;

        while (current && depth < maxDepth) {
          if (seen.has(current)) {
            console.warn("Circular reference detected in parent chain");
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
     * Get inheritance chain of error classes
     */
    getInstances: {
      value: (): CustomErrorClass<any>[] => {
        if (!parentError || parentError === (Error as unknown as ParentError)) {
          return [];
        }

        const parentChain =
          typeof parentError.getInstances === "function"
            ? parentError.getInstances() || []
            : [];

        return [...parentChain, parentError];
      },
      enumerable: false,
      configurable: true,
    },

    /**
     * Create fast error with minimal overhead
     * 
     * PERFORMANCE OPTIMIZATIONS:
     * - No stack capture
     * - No enumerable properties
     * - Direct context assignment
     * - Skip validation checks
     */
    createFast: {
      value: (message: string, context?: Partial<OwnContext>): Error & OwnContext => {
        const error = new CustomError({
          message,
          cause: (context || {}) as OwnContext,
          captureStack: false,
          enumerableProperties: false,
          collisionStrategy: "override",
        });

        return error as unknown as Error & OwnContext;
      },
      enumerable: false,
      configurable: true,
    },
  });

  // Register in global registry
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
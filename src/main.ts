/**
 * Enhanced Custom Error Handling with Simplified API and Parent Relationship
 */
type ErrorContext<T> = T extends CustomErrorClass<infer Context>
  ? Context
  : Record<string, never>;

type ErrorOptions<
  OwnContext,
  ParentError extends CustomErrorClass<any> | undefined = undefined,
> = {
  message: string;
  cause?: OwnContext | Error | string;
  captureStack?: boolean;
  inherits?: ParentError;
};

type CustomErrorClass<T> = {
  new (
    options: ErrorOptions<T, any>,
  ): Error &
    T & {
      inheritanceChain?: CustomErrorClass<any>[];
      parent?: Error;
    };

  getContext(
    error: unknown,
    options?: { includeParentContext?: boolean },
  ): T | undefined;

  getErrorHierarchy(error: unknown): ErrorHierarchyItem[];

  followParentChain(error: Error): Error[];

  /**
   * Returns the full inheritance chain of error classes
   */
  getInstances(): CustomErrorClass<any>[];

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
 * Creates a custom error class with enhanced hierarchical error tracking
 */
// export function createCustomError<
//   OwnContext extends Record<string, unknown> = {},
//   ParentError extends CustomErrorClass<any> | undefined = undefined,
// >(
//   name: string,
//   contextKeys: (keyof OwnContext)[],
//   parentError?: ParentError,
// ): CustomErrorClass<
//   OwnContext &
//   (ParentError extends CustomErrorClass<any>
//     ? ErrorContext<ParentError>
//     : {})
// > {
//   // Determine the parent error class
//   const ParentErrorClass = parentError ?? Error;

//   // Store the context keys for this class
//   errorClassKeys.set(name, contextKeys as string[]);

//   class CustomError extends ParentErrorClass {
//     readonly name: string = name;
//     inheritanceChain?: CustomErrorClass<any>[];
//     parent?: Error;

//     // constructor(
//     //   options: ErrorOptions<OwnContext, ParentError>,
//     // ) {
//     //   // Extract message and context/cause
//     //   const { message, cause, captureStack, inherits } = options;

//     //   // Determine which parent to use - either from constructor options or class definition
//     //   const effectiveParent = inherits || parentError;
//     //   let mergedContext: Record<string, unknown> = {};
//     //   let parentInstance: Error | undefined;

//     //   // Handle various cause types
//     //   if (cause) {
//     //     if (cause instanceof Error) {
//     //       // If cause is an error, use it as the parent
//     //       parentInstance = cause;

//     //       // Extract context from error if available
//     //       const causeContext = errorContexts.get(cause);
//     //       if (causeContext) {
//     //         mergedContext = { ...causeContext };
//     //       }
//     //     } else if (typeof cause === 'string') {
//     //       // If cause is a string, create a base error
//     //       parentInstance = new Error(cause);
//     //     } else {
//     //       // If cause is an object, use it as context
//     //       mergedContext = { ...cause };

//     //       // Create parent errors to maintain the error chain
//     //       if (effectiveParent && effectiveParent !== Error) {
//     //         try {
//     //           // Create a parent error instance
//     //           const parentKeys = errorClassKeys.get(effectiveParent.name) || [];
//     //           const parentContext: Record<string, unknown> = {};

//     //           // Extract only the keys relevant to the parent
//     //           for (const key of parentKeys) {
//     //             if (key in mergedContext) {
//     //               parentContext[key as string] = mergedContext[key as string];
//     //             }
//     //           }

//     //           // Add keys from any ancestor classes
//     //           const ancestorClasses = effectiveParent.getInstances();
//     //           for (const ancestorClass of ancestorClasses) {
//     //             const ancestorKeys = errorClassKeys.get(ancestorClass.name) || [];
//     //             for (const key of ancestorKeys) {
//     //               if (key in mergedContext && !(key in parentContext)) {
//     //                 parentContext[key as string] = mergedContext[key as string];
//     //               }
//     //             }
//     //           }

//     //           parentInstance = new effectiveParent({
//     //             message: `${effectiveParent.name} Error`,
//     //             cause: parentContext,
//     //             captureStack,
//     //           });
//     //         } catch (e) {
//     //           console.warn(`Failed to create ${effectiveParent?.name} instance:`, e);
//     //         }
//     //       }
//     //     }
//     //   }

//     //   // Call parent constructor with appropriate arguments
//     //   super(message);

//     //   // Set name properties
//     //   Object.defineProperty(this, "name", {
//     //     value: name,
//     //     enumerable: false,
//     //     configurable: true,
//     //   });

//     //   // Assign parent instead of cause
//     //   if (parentInstance) {
//     //     Object.defineProperty(this, 'parent', {
//     //       value: parentInstance,
//     //       enumerable: true,
//     //       writable: true,
//     //       configurable: true
//     //     });
//     //   }

//     //   // Build inheritance chain based on effective parent
//     //   this.inheritanceChain = effectiveParent && effectiveParent !== Error
//     //     ? [...(effectiveParent.getInstances?.() || []), effectiveParent]
//     //     : [];

//     //   // Handle context data - filter for keys specific to this class
//     //   const thisContext: Record<string, unknown> = {};
//     //   for (const key of contextKeys as string[]) {
//     //     if (key in mergedContext) {
//     //       thisContext[key] = mergedContext[key];
//     //     }
//     //   }

//     //   // Store the full context
//     //   if (Object.keys(mergedContext).length > 0) {
//     //     errorContexts.set(this, { ...mergedContext });

//     //     // Assign all context properties to the error instance for backwards compatibility
//     //     Object.assign(this, mergedContext);
//     //   }

//     //   // Handle stack trace
//     //   if (captureStack) {
//     //     Error.captureStackTrace(this, CustomError);
//     //   }
//     // }

//     constructor(
//         options: ErrorOptions<OwnContext, ParentError> | string = { message: "Unknown error" }
//       ) {
//         // For string parameter, convert to options format
//         if (typeof options === 'string') {
//           super(options);
//           this.message = options;
//         } else {
//           // Extract data from options
//           const { message, cause, captureStack, inherits } = options;

//           // Just call super with the message
//           super(message);

//           // Handle the parent/cause relationship
//           if (cause && typeof cause === 'object' && !(cause instanceof Error)) {
//             // Store context
//             errorContexts.set(this, { ...cause });
//             Object.assign(this, cause);

//             // Create parent error if needed
//             if (effectiveParent && effectiveParent !== Error) {
//               try {
//                 const parentInstance = new effectiveParent(
//                   `${effectiveParent.name} Error`,
//                   { cause }
//                 );
//                 this.parent = parentInstance;
//               } catch (e) {
//                 // Ignore errors creating parent
//               }
//             }
//           } else if (cause instanceof Error) {
//             this.parent = cause;
//           }

//           // Build inheritance chain
//           this.inheritanceChain = effectiveParent && effectiveParent !== Error
//             ? [...(effectiveParent.getInstances?.() || []), effectiveParent]
//             : [];

//           // Handle stack trace
//           if (captureStack) {
//             Error.captureStackTrace(this, CustomError);
//           }
//         }
//       }

//     /**
//      * Custom toString method to include context and inheritance
//      */
//     toString(): string {
//       const baseString = `${this.name}: ${this.message}`;
//       const context = errorContexts.get(this);
//       const inheritanceInfo = this.inheritanceChain && this.inheritanceChain.length > 0
//         ? `\nInheritance Chain: ${this.inheritanceChain.map(e => e.name).join(' > ')}`
//         : '';
//       const parentInfo = this.parent
//         ? `\nParent: ${this.parent.name}: ${this.parent.message}`
//         : '';

//       return context
//         ? `${baseString}\nContext: ${JSON.stringify(context, null, 2)}${inheritanceInfo}${parentInfo}`
//         : baseString;
//     }
//   }

//   // Ensure name is correctly set on the constructor
//   Object.defineProperty(CustomError, "name", { value: name });

//   // Add static methods
//   Object.defineProperties(CustomError, {
//     /**
//      * Retrieves the context data from an error instance
//      */
//     getContext: {
//       value: (
//         error: unknown,
//         options?: { includeParentContext?: boolean },
//       ):
//         | (OwnContext &
//             (ParentError extends CustomErrorClass<any>
//               ? ErrorContext<ParentError>
//               : {}))
//         | undefined => {
//         if (!(error instanceof Error)) return undefined;

//         const fullContext = errorContexts.get(error);
//         if (!fullContext) return undefined;

//         if (options?.includeParentContext !== false) {
//           // Return the full context
//           return fullContext;
//         }

//         // If we only want this class's context, filter for the specified keys
//         const result: Record<string, unknown> = {};
//         const keys = errorClassKeys.get(name);
//         if (keys) {
//           for (const key of keys) {
//             if (key in fullContext) {
//               result[key] = fullContext[key];
//             }
//           }
//         }

//         return Object.keys(result).length > 0 ? result as any : undefined;
//       },
//       enumerable: false,
//       configurable: true,
//     },

//     /**
//      * Get full error hierarchy with contexts
//      */
//     getErrorHierarchy: {
//       value: (error: unknown): ErrorHierarchyItem[] => {
//         if (!(error instanceof Error)) return [];

//         const hierarchy: ErrorHierarchyItem[] = [];
//         let currentError: (Error & {
//           inheritanceChain?: CustomErrorClass<any>[];
//           parent?: Error;
//         }) | undefined = error;

//         while (currentError) {
//           const hierarchyItem: ErrorHierarchyItem = {
//             name: currentError.name,
//             message: currentError.message,
//             context: errorContexts.get(currentError),
//             inheritanceChain: currentError.inheritanceChain
//               ? currentError.inheritanceChain.map(e => e.name)
//               : undefined
//           };

//           // Add parent if it exists
//           if (currentError.parent) {
//             hierarchyItem.parent = `${currentError.parent.name}: ${currentError.parent.message}`;
//           }

//           hierarchy.push(hierarchyItem);

//           // Move to the next error in the chain
//           currentError = currentError.parent as (Error & {
//             inheritanceChain?: CustomErrorClass<any>[];
//             parent?: Error;
//           }) | undefined;
//         }

//         return hierarchy;
//       },
//       enumerable: false,
//       configurable: true,
//     },

//     /**
//      * Follows the chain of parents and returns them as an array
//      */
//     followParentChain: {
//       value: (error: Error & { parent?: Error }): Error[] => {
//         const chain = [error];
//         let current = error.parent;
//         while (current) {
//           chain.push(current);
//           current = (current as any).parent;
//         }
//         return chain;
//       },
//       enumerable: false,
//       configurable: true,
//     },

//     /**
//      * Returns the inheritance chain of error classes
//      */
//     getInstances: {
//       value: (): CustomErrorClass<any>[] => {
//         if (!parentError || parentError === Error) {
//           // If no parent, return empty array
//           return [];
//         }

//         // If parent exists, get its instances and add parent
//         const parentChain = parentError.getInstances?.() || [];
//         return [...parentChain, parentError];
//       },
//       enumerable: false,
//       configurable: true,
//     },
//   });

//   // Store the custom error class in registry with proper name
//   customErrorRegistry.set(name, CustomError as any);

//   return CustomError as unknown as CustomErrorClass<
//     OwnContext &
//     (ParentError extends CustomErrorClass<any>
//       ? ErrorContext<ParentError>
//       : {})
//   >;
// }

export function createCustomError<
  OwnContext extends Record<string, unknown> = {},
  ParentError extends CustomErrorClass<any> | undefined = undefined,
>(
  name: string,
  contextKeys: (keyof OwnContext)[],
  parentError?: ParentError,
): CustomErrorClass<
  OwnContext &
    (ParentError extends CustomErrorClass<any> ? ErrorContext<ParentError> : {})
> {
  // Determine the parent error class
  const ParentErrorClass = parentError ?? Error;

  // Store the context keys for this class
  errorClassKeys.set(name, contextKeys as string[]);

  class CustomError extends ParentErrorClass {
    readonly name: string = name;
    inheritanceChain?: CustomErrorClass<any>[];
    parent?: Error;
    message: any;

    constructor(options: ErrorOptions<OwnContext, ParentError>) {
      // Call parent constructor with just the message
      // This simple approach avoids the type error
      super(options?.message || "Unknown error");

      if (options?.message) {
        // Explicitly set the message property
        Object.defineProperty(this, "message", {
          value: options.message,
          enumerable: false,
          writable: true,
          configurable: true,
        });
      }
      // Now process the options after super() is called
      if (options) {
        const { message, cause, captureStack, inherits } = options;

        // Determine which parent to use
        const effectiveParent = inherits || parentError;
        let mergedContext: Record<string, unknown> = {};
        let parentInstance: Error | undefined;

        // Handle various cause types
        if (cause) {
          if (cause instanceof Error) {
            // If cause is an error, use it as the parent
            parentInstance = cause;

            // Extract context from error if available
            const causeContext = errorContexts.get(cause);
            if (causeContext) {
              mergedContext = { ...causeContext };
            }
          } else if (typeof cause === "string") {
            // If cause is a string, create a base error
            parentInstance = new Error(cause);
          } else if (typeof cause === "object") {
            // If cause is an object, use it as context
            mergedContext = { ...cause };

            // Create parent errors to maintain the error chain
            if (effectiveParent && effectiveParent !== (Error as unknown as CustomErrorClass<any>)) {
              try {
                // Create a parent error instance
                const parentKeys =
                  errorClassKeys.get(effectiveParent.name) || [];
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
                  const ancestorKeys =
                    errorClassKeys.get(ancestorClass.name) || [];
                  for (const key of ancestorKeys) {
                    if (key in mergedContext && !(key in parentContext)) {
                      parentContext[key as string] =
                        mergedContext[key as string];
                    }
                  }
                }

                parentInstance = new effectiveParent({
                  message: message || `${effectiveParent.name} Error`,
                  cause: parentContext,
                });
              } catch (e) {
                console.warn(
                  `Failed to create ${effectiveParent?.name} instance:`,
                  e,
                );
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
          Object.defineProperty(this, "parent", {
            value: parentInstance,
            enumerable: true,
            writable: true,
            configurable: true,
          });
        }

        // Build inheritance chain based on effective parent
        this.inheritanceChain =
          effectiveParent && effectiveParent !== (Error as unknown as CustomErrorClass<any>)
            ? [...(effectiveParent.getInstances?.() || []), effectiveParent]
            : [];

        // Store the full context
        if (Object.keys(mergedContext).length > 0) {
          errorContexts.set(this, { ...mergedContext });

          // Assign all context properties to the error instance
          Object.assign(this, mergedContext);
        }

        // Handle stack trace
        if (captureStack) {
          Error.captureStackTrace(this, CustomError);
        }
      }
    }

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
      const parentInfo = this.parent
        ? `\nParent: ${this.parent.name}: ${this.parent.message}`
        : "";

      return context
        ? `${baseString}\nContext: ${JSON.stringify(context, null, 2)}${inheritanceInfo}${parentInfo}`
        : baseString;
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
            (ParentError extends CustomErrorClass<any>
              ? ErrorContext<ParentError>
              : {}))
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
        let currentError:
          | (Error & {
              inheritanceChain?: CustomErrorClass<any>[];
              parent?: Error;
            })
          | undefined = error;

        while (currentError) {
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
      value: (error: Error & { parent?: Error }): Error[] => {
        const chain = [error];
        let current = error.parent;
        while (current) {
          chain.push(current);
          current = (current as any).parent;
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
        if (!parentError || parentError === Error) {
          // If no parent, return empty array
          return [];
        }

        // If parent exists, get its instances and add parent
        const parentChain = parentError.getInstances?.() || [];
        return [...parentChain, parentError];
      },
      enumerable: false,
      configurable: true,
    },
  });

  // Store the custom error class in registry with proper name
  customErrorRegistry.set(name, CustomError as any);

  return CustomError as unknown as CustomErrorClass<
    OwnContext &
      (ParentError extends CustomErrorClass<any>
        ? ErrorContext<ParentError>
        : {})
  >;
}

// // Example usage with the new API
// const PrimaryError = createCustomError<{
//   basic: string;
//   a?: {
//     b: number;
//     c: {
//       d: {
//         e: {
//           f: {
//             g: string;
//           };
//         };
//       };
//     };
//   };
// }>("BasicError", ["a", "basic"]);

// const SecondaryError = createCustomError<
//   { middle: string },
//   typeof PrimaryError
// >("MiddleError", ["middle"], PrimaryError);

// const FinalError = createCustomError<{ final: string }, typeof SecondaryError>(
//   "FinalError",
//   ["final"],
//   SecondaryError,
// );

// // Example usage
// console.time("error-creation-time");
// console.log("Creating errors...");
// try {
//   // Creating a chain of errors
//   throw new FinalError({
//     message: "🛑 Final Error being called 🛑",
//     cause: {
//       final: "Final Remark",
//       basic: "Basic Remark",
//       middle: "Middle Remark",
//       a: {
//         b: 42,
//         c: {
//           d: {
//             e: {
//               f: {
//                 g: "Nested context",
//               },
//             },
//           },
//         },
//       },
//     },
//     captureStack: true,
//   });
// } catch (error) {
//   if (error instanceof FinalError) {
//     console.log("Final Error:", error);
//     const chain = FinalError.followParentChain(error);
//     console.log("Chain of Errors:", chain);
//     const hierarchy = FinalError.getErrorHierarchy(error);
//     console.log("Full Error Hierarchy:", JSON.stringify(hierarchy, null, 2));

//     console.log("\nSpecific Contexts:");
//     console.log("Final Error Context:", FinalError.getContext(error));
//     console.log(
//       "Middle Error Context:",
//       SecondaryError.getContext(error, { includeParentContext: false }),
//     );
//     console.log(
//       "Basic Error Context:",
//       PrimaryError.getContext(error, { includeParentContext: false }),
//     );
//   }
// }
// console.log("Error Creation Time");
// console.timeEnd("error-creation-time");

// // throw new FinalError({
// //     message: "🛑 Final Error being called 🛑",
// //     cause: {
// //       final: "Final Remark",
// //       middle: "Middle Remark",
// //       basic: "Basic Remark",
// //       a: {
// //         b: 42,
// //         c: {
// //           d: {
// //             e: {
// //               f: {
// //                 g: "Nested context"
// //               }
// //             }
// //           }
// //         }
// //       }
// //     },
// //     captureStack: true,
// //   });

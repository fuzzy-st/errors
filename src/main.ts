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
			context: T; // Expose context directly on the error
			toJSON(): any; // Add toJSON method
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
 */
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
		message!: string;
		stack: any;

		constructor(options: ErrorOptions<OwnContext, ParentError>) {
			// Call parent constructor with just the message
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
						if (
							effectiveParent &&
							effectiveParent !== (Error as unknown as CustomErrorClass<any>)
						) {
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
					effectiveParent &&
					effectiveParent !== (Error as unknown as CustomErrorClass<any>)
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
				result.context = { ...context };
			}

			// Add parent info if available
			if (this.parent) {
				result.parent = {
					name: this.parent.name,
					message: this.parent.message,
				};

				// Add parent context if available
				const parentContext =
					this.parent instanceof Error && errorContexts.get(this.parent);
				if (parentContext) {
					result.parent.context = { ...parentContext };
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
				if (!parentError || parentError === (Error as unknown as ParentError)) {
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

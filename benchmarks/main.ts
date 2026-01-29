/**
 * Comprehensive Benchmark Suite for @fuzzy-street/errors
 * Using @fuzzy-street/benchmarks
 * 
 * Run with: tsx benchmarks.ts
 * For HTML report: tsx benchmarks.ts --report
 */

import {
  runBenchmark,
  compareBenchmarks,
  runAdaptiveBenchmark,
  runMonitoredBenchmark,
  generateReport,
  saveReport,
  ReportFormat,
  type BenchmarkResult,
} from '@fuzzy-street/benchmarks';
import { createCustomError } from '../src/main';
import os from 'node:os';

// ============================================================================
// Test Data Setup
// ============================================================================

const SimpleError = createCustomError<{
  code: number;
  message: string;
}>('SimpleError', ['code', 'message']);

const BaseError = createCustomError<{
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
}>('BaseError', ['timestamp', 'severity']);

const DerivedError = createCustomError<
  {
    operation: string;
    userId: string;
  },
  typeof BaseError
>('DerivedError', ['operation', 'userId'], BaseError);

const L1Error = createCustomError<{ app: string }>('L1Error', ['app']);
const L2Error = createCustomError<{ module: string }, typeof L1Error>(
  'L2Error',
  ['module'],
  L1Error
);
const L3Error = createCustomError<{ function: string }, typeof L2Error>(
  'L3Error',
  ['function'],
  L2Error
);

const DeepContextError = createCustomError<{
  config: {
    server: {
      host: string;
      port: number;
      ssl: { enabled: boolean; cert?: string };
    };
    database: {
      connection: {
        host: string;
        pool: { min: number; max: number };
      };
    };
  };
}>('DeepContextError', ['config']);

// Pre-create error instances for access benchmarks
const simpleErrInstance = new SimpleError({
  message: 'Test',
  cause: { code: 500, message: 'Error' },
});

const derivedErrInstance = new DerivedError({
  message: 'Test',
  cause: {
    operation: 'read',
    userId: 'user123',
    timestamp: new Date().toISOString(),
    severity: 'high',
  },
});

const deepErrInstance = new DeepContextError({
  message: 'Test',
  cause: {
    config: {
      server: {
        host: 'localhost',
        port: 8080,
        ssl: { enabled: true, cert: '/cert' },
      },
      database: {
        connection: {
          host: 'db.example.com',
          pool: { min: 2, max: 10 },
        },
      },
    },
  },
});

// Error chain for traversal benchmarks
const grandparent = new SimpleError({
  message: 'Root cause',
  cause: { code: 500, message: 'Database error' },
});

const parent = new DerivedError({
  message: 'Mid-level error',
  cause: {
    operation: 'query',
    userId: 'user123',
    timestamp: new Date().toISOString(),
    severity: 'high',
  },
  parent: grandparent,
});

const child = new L3Error({
  message: 'High-level error',
  cause: {
    function: 'getData',
    module: 'api',
    app: 'web',
  },
  parent: parent,
});

// ============================================================================
// Benchmark Suite 1: Error Creation Performance
// ============================================================================

async function benchmarkErrorCreation() {
  console.log('\n=== Error Creation Benchmarks ===\n');

  const benchmarks = [
    {
      name: 'Native Error',
      fn: () => new Error('Test error'),
    },
    {
      name: 'Simple Custom Error',
      fn: () =>
        new SimpleError({
          message: 'Test error',
          cause: { code: 500, message: 'Internal Server Error' },
        }),
    },
    {
      name: 'Custom Error + Stack Capture',
      fn: () =>
        new SimpleError({
          message: 'Test error',
          cause: { code: 500, message: 'Internal Server Error' },
          captureStack: true,
        }),
    },
    {
      name: 'Two-Level Inheritance',
      fn: () =>
        new DerivedError({
          message: 'Test error',
          cause: {
            operation: 'read',
            userId: 'user123',
            timestamp: new Date().toISOString(),
            severity: 'high',
          },
        }),
    },
    {
      name: 'Three-Level Inheritance',
      fn: () =>
        new L3Error({
          message: 'Test error',
          cause: {
            function: 'processData',
            module: 'payments',
            app: 'checkout',
          },
        }),
    },
    {
      name: 'Deep Nested Context',
      fn: () =>
        new DeepContextError({
          message: 'Test error',
          cause: {
            config: {
              server: {
                host: 'localhost',
                port: 8080,
                ssl: { enabled: true, cert: '/path/to/cert' },
              },
              database: {
                connection: {
                  host: 'db.example.com',
                  pool: { min: 2, max: 10 },
                },
              },
            },
          },
        }),
    },
  ];

  const results: Array<{ name: string; results: BenchmarkResult }> = [];

  for (const bench of benchmarks) {
    try {
      // Use regular benchmark for error creation - it's fast enough to not need adaptive
      const result = runBenchmark(bench.fn, {
        iterations: 100000,
        warmupRuns: 3,
        runs: 5,
        gcBetweenRuns: true,
      });

      results.push({ name: bench.name, results: result });

      console.log(`${bench.name}:`);
      console.log(
        `  Operations/sec: ${result.operationsPerSecond.toFixed(2).padStart(12)} ops/s`
      );
      console.log(
        `  Avg duration:   ${(result.duration / result.iterations).toFixed(6).padStart(12)} ms/op`
      );
      console.log(
        `  Memory/op:      ${((result.memoryDelta.heapUsed / 1024) / result.iterations).toFixed(2).padStart(12)} KB/op`
      );
    } catch (error) {
      console.error(`  ❌ Failed to benchmark ${bench.name}:`, error instanceof Error ? error.message : error);
    }
  }

  return results;
}

// ============================================================================
// Benchmark Suite 2: Context Access Performance
// ============================================================================

async function benchmarkContextAccess() {
  console.log('\n=== Context Access Benchmarks ===\n');

  const benchmarks = [
    {
      name: 'Direct Property - Simple',
      fn: () => {
        const code = simpleErrInstance.code;
        const msg = simpleErrInstance.message;
        return code;
      },
    },
    {
      name: 'getContext() - Simple',
      fn: () => {
        const ctx = SimpleError.getContext(simpleErrInstance);
        return ctx;
      },
    },
    {
      name: 'Direct Property - Inherited',
      fn: () => {
        const op = derivedErrInstance.operation;
        const sev = derivedErrInstance.severity;
        return op;
      },
    },
    {
      name: 'getContext() - Inherited (Full)',
      fn: () => {
        const ctx = DerivedError.getContext(derivedErrInstance);
        return ctx;
      },
    },
    {
      name: 'getContext() - Inherited (Own Only)',
      fn: () => {
        const ctx = DerivedError.getContext(derivedErrInstance, {
          includeParentContext: false,
        });
        return ctx;
      },
    },
    {
      name: 'Deep Nested Direct Access',
      fn: () => {
        const host = deepErrInstance.config.server.host;
        const port = deepErrInstance.config.server.port;
        const ssl = deepErrInstance.config.server.ssl.enabled;
        return host;
      },
    },
    {
      name: 'Deep Nested via getContext()',
      fn: () => {
        const ctx = DeepContextError.getContext(deepErrInstance);
        const host = ctx?.config.server.host;
        const port = ctx?.config.server.port;
        const ssl = ctx?.config.server.ssl.enabled;
        return host;
      },
    },
  ];

  const results: Array<{ name: string; results: BenchmarkResult }> = [];

  for (const bench of benchmarks) {
    if (!bench.fn) continue;
    try {
      // Use regular benchmark for super-fast operations
      // Adaptive benchmark struggles with sub-microsecond operations
      const result = runBenchmark(bench.fn, {
        iterations: 1000000,
        warmupRuns: 5,
        runs: 10,
        gcBetweenRuns: false, // Don't GC for microbenchmarks
      });

      results.push({ name: bench.name, results: result });

      console.log(`${bench.name}:`);
      console.log(
        `  Operations/sec: ${result.operationsPerSecond.toFixed(2).padStart(12)} ops/s`
      );
      console.log(
        `  Avg duration:   ${((result.duration / result.iterations) * 1000).toFixed(3).padStart(12)} μs/op`
      );
    } catch (error) {
      console.error(`  ❌ Failed to benchmark ${bench.name}:`, error instanceof Error ? error.message : error);
    }
  }

  return results;
}

// ============================================================================
// Benchmark Suite 3: Error Chain Operations
// ============================================================================

async function benchmarkChainOperations() {
  console.log('\n=== Error Chain Operations Benchmarks ===\n');

  const benchmarks = [
    {
      name: 'followParentChain - No Parents',
      fn: () => SimpleError.followParentChain(grandparent),
    },
    {
      name: 'followParentChain - 1 Parent',
      fn: () => DerivedError.followParentChain(parent),
    },
    {
      name: 'followParentChain - 2 Parents',
      fn: () => L3Error.followParentChain(child),
    },
    {
      name: 'getErrorHierarchy - No Parents',
      fn: () => SimpleError.getErrorHierarchy(grandparent),
    },
    {
      name: 'getErrorHierarchy - 1 Parent',
      fn: () => DerivedError.getErrorHierarchy(parent),
    },
    {
      name: 'getErrorHierarchy - 2 Parents',
      fn: () => L3Error.getErrorHierarchy(child),
    },
  ];

  const results: Array<{ name: string; results: BenchmarkResult }> = [];

  for (const bench of benchmarks) {
    try {
      const result = runBenchmark(bench.fn, {
        iterations: 100000,
        warmupRuns: 3,
        runs: 5,
        gcBetweenRuns: false,
      });

      results.push({ name: bench.name, results: result });

      console.log(`${bench.name}:`);
      console.log(
        `  Operations/sec: ${result.operationsPerSecond.toFixed(2).padStart(12)} ops/s`
      );
      console.log(
        `  Avg duration:   ${((result.duration / result.iterations) * 1000).toFixed(3).padStart(12)} μs/op`
      );
    } catch (error) {
      console.error(`  ❌ Failed to benchmark ${bench.name}:`, error instanceof Error ? error.message : error);
    }
  }

  return results;
}

// ============================================================================
// Benchmark Suite 4: Serialization Performance
// ============================================================================

async function benchmarkSerialization() {
  console.log('\n=== Serialization Benchmarks ===\n');

  const nativeErr = new Error('Native error');

  const simpleErr = new SimpleError({
    message: 'Simple error',
    cause: { code: 500, message: 'Error' },
  });

  const complexErr = new L3Error({
    message: 'Complex error',
    cause: {
      function: 'getData',
      module: 'api',
      app: 'web',
    },
    parent: new DerivedError({
      message: 'Parent error',
      cause: {
        operation: 'query',
        userId: 'user123',
        timestamp: new Date().toISOString(),
        severity: 'high',
      },
    }),
    captureStack: true,
  });

  const benchmarks = [
    {
      name: 'Native Error - toString',
      fn: () => nativeErr.toString(),
    },
    {
      name: 'Custom Error - toString',
      fn: () => simpleErr.toString(),
    },
    {
      name: 'Complex Error - toString',
      fn: () => complexErr.toString(),
    },
    {
      name: 'Native Error - JSON.stringify',
      fn: () => JSON.stringify(nativeErr),
    },
    {
      name: 'Custom Error - JSON.stringify',
      fn: () => JSON.stringify(simpleErr),
    },
    {
      name: 'Complex Error - JSON.stringify',
      fn: () => JSON.stringify(complexErr),
    },
  ];

  const results: Array<{ name: string; results: BenchmarkResult }> = [];

  for (const bench of benchmarks) {
    try {
      const result = runBenchmark(bench.fn, {
        iterations: 50000,
        warmupRuns: 3,
        runs: 5,
        gcBetweenRuns: false,
      });

      results.push({ name: bench.name, results: result });

      console.log(`${bench.name}:`);
      console.log(
        `  Operations/sec: ${result.operationsPerSecond.toFixed(2).padStart(12)} ops/s`
      );
      console.log(
        `  Avg duration:   ${((result.duration / result.iterations) * 1000).toFixed(3).padStart(12)} μs/op`
      );
    } catch (error) {
      console.error(`  ❌ Failed to benchmark ${bench.name}:`, error instanceof Error ? error.message : error);
    }
  }

  return results;
}

// ============================================================================
// Key Comparisons: What Developers Care About
// ============================================================================
class HandwrittenApiError extends Error {
  statusCode: number;
  endpoint: string;

  constructor(message: string, statusCode: number, endpoint: string) {
    super(message);
    this.name = 'HandwrittenApiError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    Error.captureStackTrace?.(this, HandwrittenApiError);
  }
}
async function runKeyComparisons() {
  console.log('\n=== Key Performance Comparisons ===\n');

  // 1. Custom vs Native Error Creation
  console.log('1. Error Creation: Custom vs Native');
  const createComparison = compareBenchmarks(
    {
      name: 'Native Error',
      fn: () => new Error('Test', { cause: { code: 500, message: 'Error' } }),
    },
    {
      name: 'Custom Error',
      fn: () =>
        new SimpleError({
          message: 'Test',
          cause: { code: 500, message: 'Error' },
        }),
    },
    { iterations: 100000 }
  );

  console.log(
    `  ${createComparison.comparison.fasterName} is ${createComparison.comparison.percentFaster.toFixed(2)}% faster`
  );
  console.log(
    `  Overhead: ${((1 / createComparison.comparison.opsRatio - 1) * 100).toFixed(2)}%\n`
  );
  console.log('2. Error Creation: Custom vs Native Custom with Handwritten Class');
  const handWrittenComparison = compareBenchmarks(
    {
      name: 'Native Error',
      fn: () => new Error('Test', { cause: { code: 500, message: 'Error' } }),
    },
    {
      name: 'Custom Error',
      fn: () =>
        new SimpleError({
          message: 'Test',
          cause: { code: 500, message: 'Error' },
        }),
    },
    { iterations: 100000 }
  );

  console.log(
    `  ${handWrittenComparison.comparison.fasterName} is ${handWrittenComparison.comparison.percentFaster.toFixed(2)}% faster`
  );
  console.log(
    `  Overhead: ${((1 / handWrittenComparison.comparison.opsRatio - 1) * 100).toFixed(2)}%\n`
  );

  // 2. Direct Property Access vs getContext()
  console.log('3. Context Access: Direct Property vs getContext()');
  const accessComparison = compareBenchmarks(
    {
      name: 'Direct Property',
      fn: () => simpleErrInstance.code,
    },
    {
      name: 'getContext()',
      fn: () => SimpleError.getContext(simpleErrInstance),
    },
    { iterations: 1000000 }
  );

  console.log(
    `  ${accessComparison.comparison.fasterName} is ${accessComparison.comparison.percentFaster.toFixed(2)}% faster`
  );
  console.log(
    `  Recommendation: ${accessComparison.comparison.fasterName === 'Direct Property' ? 'Use direct property access for hot paths' : 'Both methods perform similarly'}\n`
  );

  // 3. Simple vs Deep Context
  console.log('4. Error Creation: Simple vs Deep Context');
  const contextComparison = compareBenchmarks(
    {
      name: 'Simple Context',
      fn: () =>
        new SimpleError({
          message: 'Test',
          cause: { code: 500, message: 'Error' },
        }),
    },
    {
      name: 'Deep Context',
      fn: () =>
        new DeepContextError({
          message: 'Test',
          cause: {
            config: {
              server: {
                host: 'localhost',
                port: 8080,
                ssl: { enabled: true, cert: '/cert' },
              },
              database: {
                connection: {
                  host: 'db.example.com',
                  pool: { min: 2, max: 10 },
                },
              },
            },
          },
        }),
    },
    { iterations: 100000 }
  );

  console.log(
    `  ${contextComparison.comparison.fasterName} is ${contextComparison.comparison.percentFaster.toFixed(2)}% faster`
  );
  console.log(
    `  Context size impact: ${contextComparison.comparison.percentFaster < 20 ? 'Minimal' : 'Moderate'}\n`
  );
}

// ============================================================================
// Hardware-Monitored Benchmark: Real-World Error Scenario
// ============================================================================

async function runMonitoredErrorScenario() {
  console.log('\n=== Hardware-Monitored Real-World Scenario ===\n');
  console.log('Simulating high-frequency error creation under load...\n');

  const result = await runMonitoredBenchmark(
    () => {
      // Simulate realistic error handling scenario
      const errors: any[] = [];
      for (let i = 0; i < 1000; i++) {
        try {
          if (Math.random() > 0.5) {
            throw new DerivedError({
              message: `Operation failed: ${i}`,
              cause: {
                operation: 'process',
                userId: `user${i}`,
                timestamp: new Date().toISOString(),
                severity: 'high',
              },
            });
          }
        } catch (e) {
          errors.push(e);
        }
      }
      return errors.length;
    },
    {
      iterations: 100,
      monitorCpu: true,
      monitorMemory: true,
      samplingInterval: 50,
      detectThermalThrottling: true,
    }
  );

  console.log('Performance:');
  console.log(
    `  Operations/sec: ${result.operationsPerSecond.toFixed(2)} ops/s`
  );
  console.log(`  Duration:       ${result.duration.toFixed(2)} ms`);

  console.log('\nHardware Impact:');
  console.log(
    `  CPU Utilization: ${result.hardwareMetrics.summary.cpuUtilization.avg.toFixed(2)}% avg, ${result.hardwareMetrics.summary.cpuUtilization.max.toFixed(2)}% peak`
  );
  console.log(
    `  Memory Usage:    ${result.hardwareMetrics.summary.memoryUtilization.avg.toFixed(2)}% avg, ${result.hardwareMetrics.summary.memoryUtilization.max.toFixed(2)}% peak`
  );

  if (result.hardwareMetrics.summary.thermalThrottling) {
    console.log('\n  ⚠️  Warning: Thermal throttling detected during test');
  }

  console.log(
    `\n  Memory Delta:    ${(result.memoryDelta.heapUsed / (1024 * 1024)).toFixed(2)} MB heap used`
  );
}

// ============================================================================
// Memory Profiling
// ============================================================================

function profileMemoryUsage() {
  console.log('\n=== Memory Usage Analysis ===\n');

  const iterations = 10000;

  // Native Error baseline
  const nativeBefore = process.memoryUsage().heapUsed;
  const nativeErrors: Error[] = [];
  for (let i = 0; i < iterations; i++) {
    nativeErrors.push(new Error('Test error'));
  }
  const nativeAfter = process.memoryUsage().heapUsed;
  const nativePerError = (nativeAfter - nativeBefore) / iterations;

  if (global.gc) global.gc();

  // Simple custom error
  const simpleBefore = process.memoryUsage().heapUsed;
  const simpleErrors: any[] = [];
  for (let i = 0; i < iterations; i++) {
    simpleErrors.push(
      new SimpleError({
        message: 'Test error',
        cause: { code: 500, message: 'Error' },
      })
    );
  }
  const simpleAfter = process.memoryUsage().heapUsed;
  const simplePerError = (simpleAfter - simpleBefore) / iterations;

  if (global.gc) global.gc();

  // Complex error with inheritance
  const complexBefore = process.memoryUsage().heapUsed;
  const complexErrors: any[] = [];
  for (let i = 0; i < iterations; i++) {
    complexErrors.push(
      new L3Error({
        message: 'Test error',
        cause: { function: 'getData', module: 'api', app: 'web' },
        captureStack: true,
      })
    );
  }
  const complexAfter = process.memoryUsage().heapUsed;
  const complexPerError = (complexAfter - complexBefore) / iterations;

  console.log('Per-Error Memory Footprint:');
  console.log(`  Native Error:         ${nativePerError.toFixed(2).padStart(10)} bytes`);
  console.log(
    `  Simple Custom Error:  ${simplePerError.toFixed(2).padStart(10)} bytes (+${((simplePerError / nativePerError - 1) * 100).toFixed(1)}%)`
  );
  console.log(
    `  Complex Custom Error: ${complexPerError.toFixed(2).padStart(10)} bytes (+${((complexPerError / nativePerError - 1) * 100).toFixed(1)}%)`
  );

  console.log('\nAbsolute Overhead:');
  console.log(`  Simple: +${(simplePerError - nativePerError).toFixed(2)} bytes`);
  console.log(`  Complex: +${(complexPerError - nativePerError).toFixed(2)} bytes`);
}

// ============================================================================
// Report Generation
// ============================================================================

async function generateBenchmarkReport(allResults: {
  creation: Array<{ name: string; results: BenchmarkResult }>;
  access: Array<{ name: string; results: BenchmarkResult }>;
  chain: Array<{ name: string; results: BenchmarkResult }>;
  serialization: Array<{ name: string; results: BenchmarkResult }>;
}) {
  const report = generateReport(
    [
      ...allResults.creation,
      ...allResults.access,
      ...allResults.chain,
      ...allResults.serialization,
    ],
    {
      format: ReportFormat.HTML,
      title: '@fuzzy-street/errors Performance Analysis-v2',
      includeSystemInfo: true,
    }
  );

  saveReport(report, {
    format: ReportFormat.HTML,
    outputPath: './benchmark-reports/errors-performance-v2',
  });

  console.log('\n✅ HTML report saved to: ./benchmark-reports/errors-performance-v2.html');

  // Also save JSON for programmatic analysis
  const jsonReport = generateReport(
    [
      ...allResults.creation,
      ...allResults.access,
      ...allResults.chain,
      ...allResults.serialization,
    ],
    {
      format: ReportFormat.JSON,
      title: '@fuzzy-street/errors Performance Analysis-v2',
      includeSystemInfo: true,
    }
  );

  saveReport(jsonReport, {
    format: ReportFormat.JSON,
    outputPath: './benchmark-reports/errors-performance-v2',
  });

  console.log('✅ JSON data saved to: ./benchmark-reports/errors-performance-v2.json');
}

// ============================================================================
// Main Runner
// ============================================================================

async function main() {
  const generateReportFlag = process.argv.includes('--report');

  console.log('🔬 @fuzzy-street/errors Benchmark Suite');
  console.log('Using @fuzzy-street/benchmarks\n');

  console.log('System Information:');
  console.log(`  Node.js:  ${process.version}`);
  console.log(`  Platform: ${process.platform} ${process.arch}`);
  console.log(`  CPUs:     ${os.cpus().length}x ${os.cpus()[0].model}`);
  console.log(`  Memory:   ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);

  const allResults = {
    creation: await benchmarkErrorCreation(),
    access: await benchmarkContextAccess(),
    chain: await benchmarkChainOperations(),
    serialization: await benchmarkSerialization(),
  };

  await runKeyComparisons();
  await runMonitoredErrorScenario();
  profileMemoryUsage();

  if (generateReportFlag) {
    await generateBenchmarkReport(allResults);
  }

  console.log('\n✅ Benchmark suite completed\n');
}

main().catch(console.error);
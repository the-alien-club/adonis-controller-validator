/**
 * AdonisJS Controller Validator
 *
 * Static analysis tool for validating AdonisJS controller patterns.
 *
 * @example
 * ```typescript
 * import { runValidation, DEFAULT_CONFIG } from '@anthropic/adonis-controller-validator'
 *
 * const result = runValidation('./my-project', DEFAULT_CONFIG)
 * console.log(result.violations)
 * ```
 */

export * from "./types.js";

// Phase 2: Route parser
export { groupRoutesByController, parseRoutes } from "./parsers/route-parser.js";

// Phase 3: Controller analyzer
export { analyzeController } from "./parsers/controller-analyzer.js";

// Phase 4: Validation rules
export { validateMethod } from "./validators/index.js";
export { runValidation, type RunResult } from "./runner.js";

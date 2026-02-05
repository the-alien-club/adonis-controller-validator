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

// These exports will be implemented in subsequent phases:
// export { analyzeController } from "./parsers/controller-analyzer.js"
// export { validateMethod } from "./validators/index.js"
// export { runValidation } from "./runner.js"

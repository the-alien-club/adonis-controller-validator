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

export * from "./types.js"

// These exports will be implemented in subsequent phases:
// export { parseRoutes } from "./parsers/route-parser.js"
// export { analyzeController } from "./parsers/controller-analyzer.js"
// export { validateMethod } from "./validators/index.js"
// export { runValidation } from "./runner.js"

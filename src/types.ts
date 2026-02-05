/**
 * Core type definitions for AdonisJS Controller Validator
 *
 * This file will be fully implemented in Phase 1.
 * See ai_docs/plan/implementation-plan.md for details.
 */

/**
 * Represents a route extracted from routes.ts
 */
export interface RouteDefinition {
    /** HTTP method (get, post, patch, put, delete, any) */
    method: HttpMethod
    /** Route path (e.g., "/datasets/:dataset_id") */
    path: string
    /** Controller name (e.g., "DatasetsController") */
    controller: string
    /** Method name (e.g., "show") */
    handler: string
    /** Line number in routes.ts */
    line: number
    /** Whether route has path parameters */
    hasPathParams: boolean
    /** Extracted path parameter names */
    pathParams: string[]
}

export type HttpMethod = "get" | "post" | "patch" | "put" | "delete" | "any"

/**
 * Represents a controller method analysis result
 */
export interface MethodAnalysis {
    /** Controller class name */
    controller: string
    /** Method name */
    method: string
    /** File path */
    filePath: string
    /** Line number */
    line: number
    /** Whether method uses request parameter */
    usesRequest: boolean
    /** Whether method uses params */
    usesParams: boolean
    /** Whether validateUsing is called */
    hasValidateUsing: boolean
    /** All return statements in the method */
    returnStatements: ReturnStatement[]
}

export interface ReturnStatement {
    /** Line number */
    line: number
    /** Type of return */
    type: "successResponse" | "errorResponse" | "other"
    /** Whether successResponse has generic type */
    hasGenericType?: boolean
    /** Whether errorResponse uses AppErrors */
    usesAppErrors?: boolean
    /** Raw text for debugging */
    text: string
}

/**
 * Validation result for a single method
 */
export interface ValidationResult {
    controller: string
    method: string
    filePath: string
    line: number
    violations: Violation[]
    passed: boolean
}

export interface Violation {
    rule: "validate-using" | "success-response-typed" | "error-response-app-errors"
    message: string
    line: number
    severity: "error" | "warning"
}

/**
 * Configuration file schema
 */
export interface ValidatorConfig {
    /** Path to routes file (default: "start/routes.ts") */
    routesFile: string
    /** Path to controllers directory (default: "app/controllers") */
    controllersDir: string
    /** Methods to skip validation (format: "ControllerName.methodName") */
    whitelist: string[]
    /** Whether to fail on any violation */
    strictMode: boolean
    /** Exit with error code on violations */
    failOnError: boolean
    /** Custom AppErrors import path */
    appErrorsPath: string
}

export const DEFAULT_CONFIG: ValidatorConfig = {
    routesFile: "start/routes.ts",
    controllersDir: "app/controllers",
    whitelist: [],
    strictMode: true,
    failOnError: true,
    appErrorsPath: "#lib/errors",
}

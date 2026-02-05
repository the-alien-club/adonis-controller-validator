# AdonisJS Controller Validator - Implementation Plan

## Overview

Build a standalone npm package that validates AdonisJS controller patterns using TypeScript AST analysis (ts-morph). The tool ensures all controller methods follow three critical patterns:
1. **Validation**: Use `request.validateUsing(validator)` for request handling
2. **Success responses**: Use `this.successResponse<Type>(data)` with generic type
3. **Error responses**: Use `this.errorResponse(AppErrors.X, ...)` with AppErrors constants

## Current State Analysis

- **Target**: AdonisJS backend at `DataStreaming/web-app/packages/backend/`
- **Routes**: ~150 routes defined imperatively in `start/routes.ts`
- **Controllers**: 24 controllers extending `BaseController`
- **No existing tooling**: No AST-based validation exists

### Key Discoveries:
- Routes use array notation: `router.get(path, [Controller, "method"])`
- Controllers lazy-loaded: `const Controller = () => import("#controllers/...")`
- All controllers extend `BaseController` with `successResponse<T>()` and `errorResponse()`
- VineJS validators compiled with `vine.compile()`

## Desired End State

A working npm package that:
1. Parses `routes.ts` to extract all route-to-controller mappings
2. Analyzes each controller method for pattern compliance
3. Reports violations with file:line references
4. Supports configuration via `adonis-validator.config.json`
5. Integrates with CI/CD via exit codes

**Verification Command**:
```bash
cd web-app/packages/backend
npx adonis-validator
# Should output: "All 150 controller methods pass validation" or list violations
```

## What We're NOT Doing

- Auto-fixing violations (future enhancement)
- Runtime validation (this is static analysis only)
- Validating validator schemas themselves
- Checking authorization patterns (bouncer usage)
- Integration with VSCode/IDE

## Implementation Approach

**5 Phases**, each self-contained and handoff-ready:

1. **Phase 1**: Project scaffolding and core types
2. **Phase 2**: Route parser (parse routes.ts)
3. **Phase 3**: Controller analyzer (analyze methods with ts-morph)
4. **Phase 4**: Validation rules implementation
5. **Phase 5**: CLI, configuration, and integration

Each phase produces working code with tests, documented in `ai_docs/implement/`.

---

## Phase 1: Project Scaffolding

### Overview
Set up the npm package structure with TypeScript, testing framework, and core type definitions.

### Changes Required:

#### 1. Package Configuration

**File**: `package.json`
```json
{
  "name": "@anthropic/adonis-controller-validator",
  "version": "0.1.0",
  "description": "Static analysis tool for AdonisJS controller pattern validation",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "adonis-validator": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "biome check .",
    "lint:fix": "biome check . --write",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["adonisjs", "validator", "static-analysis", "typescript"],
  "author": "Alien Intelligence",
  "license": "MIT",
  "dependencies": {
    "ts-morph": "^24.0.0",
    "commander": "^12.0.0",
    "chalk": "^5.3.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "files": [
    "dist",
    "README.md"
  ]
}
```

**File**: `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**File**: `biome.json`
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 4,
    "lineWidth": 120
  }
}
```

#### 2. Core Types

**File**: `src/types.ts`
```typescript
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
    /** Methods to skip validation */
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
```

**File**: `src/index.ts`
```typescript
export * from "./types.js"
export { parseRoutes } from "./parsers/route-parser.js"
export { analyzeController } from "./parsers/controller-analyzer.js"
export { validateMethod } from "./validators/index.js"
export { runValidation } from "./runner.js"
```

#### 3. Initial Test Fixtures

**File**: `tests/fixtures/valid-controller.ts`
```typescript
// Fixture: A controller that passes all validations
import { HttpContext } from "@adonisjs/core/http"
import BaseController from "./base_controller"
import { AppErrors } from "./errors"
import { userValidator } from "./validators"

type User = { id: number; name: string }

export default class ValidController extends BaseController {
    async index({ request }: HttpContext) {
        const { page } = await request.validateUsing(userValidator)
        const users: User[] = []
        return this.successResponse<User[]>(users)
    }

    async show({ params }: HttpContext) {
        if (!params.id) {
            return this.errorResponse(AppErrors.NOT_FOUND)
        }
        const user: User = { id: 1, name: "Test" }
        return this.successResponse<User>(user)
    }
}
```

**File**: `tests/fixtures/invalid-controller.ts`
```typescript
// Fixture: A controller with various violations
import { HttpContext } from "@adonisjs/core/http"
import BaseController from "./base_controller"

export default class InvalidController extends BaseController {
    // Violation: Missing validateUsing
    async store({ request }: HttpContext) {
        const data = request.body()  // BAD: no validator
        return this.successResponse(data)  // BAD: no generic type
    }

    // Violation: Inline error object
    async destroy({ params }: HttpContext) {
        if (!params.id) {
            return this.errorResponse({ status: 400, message: "Bad" })  // BAD: not AppErrors
        }
        return this.successResponse<void>(undefined)
    }
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm install` completes without errors
- [x] `npm run build` compiles TypeScript successfully
- [x] `npm run lint` passes with no errors
- [x] `npm run test` runs (even with no tests yet)
- [x] Type definitions export correctly

#### Manual Verification:
- [ ] Project structure matches specification
- [ ] All config files are valid JSON/TypeScript
- [ ] Fixtures represent real patterns from target codebase

### Handoff Document Location:
`ai_docs/implement/phase-1-scaffolding.md`

---

## Phase 2: Route Parser

### Overview
Parse `routes.ts` to extract all route definitions with their controller and method mappings.

### Changes Required:

#### 1. Route Parser Implementation

**File**: `src/parsers/route-parser.ts`
```typescript
import { Project, SyntaxKind, CallExpression, ArrayLiteralExpression } from "ts-morph"
import type { RouteDefinition, HttpMethod } from "../types.js"

const HTTP_METHODS = ["get", "post", "patch", "put", "delete", "any"] as const

/**
 * Parse routes.ts and extract all route definitions
 */
export function parseRoutes(projectPath: string, routesFile: string): RouteDefinition[] {
    const project = new Project({
        tsConfigFilePath: `${projectPath}/tsconfig.json`,
    })

    const sourceFile = project.addSourceFileAtPath(`${projectPath}/${routesFile}`)
    const routes: RouteDefinition[] = []

    // Find all call expressions
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)

    for (const call of callExpressions) {
        const route = parseRouteCall(call)
        if (route) {
            routes.push(route)
        }
    }

    return routes
}

function parseRouteCall(call: CallExpression): RouteDefinition | null {
    const expression = call.getExpression()
    const expressionText = expression.getText()

    // Match router.get, router.post, etc.
    const methodMatch = expressionText.match(/router\.(get|post|patch|put|delete|any)$/)
    if (!methodMatch) return null

    const httpMethod = methodMatch[1] as HttpMethod
    const args = call.getArguments()

    if (args.length < 2) return null

    // First arg is path
    const pathArg = args[0]
    const path = pathArg.getText().replace(/['"]/g, "")

    // Second arg should be [Controller, "method"]
    const handlerArg = args[1]
    if (!handlerArg.isKind(SyntaxKind.ArrayLiteralExpression)) {
        // Inline handler, skip
        return null
    }

    const arrayElements = (handlerArg as ArrayLiteralExpression).getElements()
    if (arrayElements.length !== 2) return null

    const controllerName = arrayElements[0].getText()
    const methodName = arrayElements[1].getText().replace(/['"]/g, "")

    // Extract path parameters
    const pathParams = extractPathParams(path)

    return {
        method: httpMethod,
        path,
        controller: controllerName,
        handler: methodName,
        line: call.getStartLineNumber(),
        hasPathParams: pathParams.length > 0,
        pathParams,
    }
}

function extractPathParams(path: string): string[] {
    const matches = path.match(/:([a-zA-Z_]+)/g) || []
    return matches.map(m => m.substring(1))
}

/**
 * Group routes by controller for easier processing
 */
export function groupRoutesByController(routes: RouteDefinition[]): Map<string, RouteDefinition[]> {
    const grouped = new Map<string, RouteDefinition[]>()

    for (const route of routes) {
        const existing = grouped.get(route.controller) || []
        existing.push(route)
        grouped.set(route.controller, existing)
    }

    return grouped
}
```

#### 2. Tests for Route Parser

**File**: `tests/route-parser.test.ts`
```typescript
import { describe, it, expect } from "vitest"
import { parseRoutes, groupRoutesByController } from "../src/parsers/route-parser"

describe("parseRoutes", () => {
    it("should parse simple routes", () => {
        // Test with fixture or mock
    })

    it("should extract path parameters", () => {
        // Test parameter extraction
    })

    it("should skip inline handlers", () => {
        // Test that arrow functions are skipped
    })

    it("should handle all HTTP methods", () => {
        // Test get, post, patch, put, delete, any
    })
})

describe("groupRoutesByController", () => {
    it("should group routes by controller name", () => {
        // Test grouping logic
    })
})
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` compiles successfully
- [x] `npm run test` - route-parser tests pass (7/7 passing)
- [ ] Parser correctly extracts routes from target `start/routes.ts`
- [ ] All 150+ routes extracted with correct controller/method mapping

#### Manual Verification:
- [ ] Run parser against target codebase: `npx ts-node src/parsers/route-parser.ts`
- [ ] Verify output matches expected routes
- [ ] Check edge cases: nested groups, multiple params, wildcard routes

### Handoff Document Location:
`ai_docs/implement/phase-2-route-parser.md`

---

## Phase 3: Controller Analyzer

### Overview
Analyze controller methods using ts-morph to extract information needed for validation.

### Changes Required:

#### 1. Controller Analyzer Implementation

**File**: `src/parsers/controller-analyzer.ts`
```typescript
import { Project, SyntaxKind, MethodDeclaration, ClassDeclaration } from "ts-morph"
import type { MethodAnalysis, ReturnStatement } from "../types.js"

/**
 * Analyze a controller class and extract method information
 */
export function analyzeController(
    projectPath: string,
    controllerPath: string
): Map<string, MethodAnalysis> {
    const project = new Project({
        tsConfigFilePath: `${projectPath}/tsconfig.json`,
    })

    const sourceFile = project.addSourceFileAtPath(controllerPath)
    const results = new Map<string, MethodAnalysis>()

    // Find the default export class
    const classDecl = sourceFile.getClasses().find(c => c.isDefaultExport())
    if (!classDecl) return results

    const className = classDecl.getName() || "UnknownController"

    // Analyze each method
    for (const method of classDecl.getMethods()) {
        const analysis = analyzeMethod(method, className, controllerPath)
        results.set(method.getName(), analysis)
    }

    return results
}

function analyzeMethod(
    method: MethodDeclaration,
    className: string,
    filePath: string
): MethodAnalysis {
    const methodName = method.getName()

    // Check if method uses request or params
    const usesRequest = checkUsesRequest(method)
    const usesParams = checkUsesParams(method)

    // Check for validateUsing call
    const hasValidateUsing = checkHasValidateUsing(method)

    // Analyze return statements
    const returnStatements = analyzeReturnStatements(method)

    return {
        controller: className,
        method: methodName,
        filePath,
        line: method.getStartLineNumber(),
        usesRequest,
        usesParams,
        hasValidateUsing,
        returnStatements,
    }
}

function checkUsesRequest(method: MethodDeclaration): boolean {
    // Check if 'request' is in the destructured HttpContext parameter
    const params = method.getParameters()
    if (params.length === 0) return false

    const firstParam = params[0]
    const paramText = firstParam.getText()

    // Check for { request } or { request, ... } pattern
    return /\brequest\b/.test(paramText)
}

function checkUsesParams(method: MethodDeclaration): boolean {
    const params = method.getParameters()
    if (params.length === 0) return false

    const firstParam = params[0]
    const paramText = firstParam.getText()

    return /\bparams\b/.test(paramText)
}

function checkHasValidateUsing(method: MethodDeclaration): boolean {
    const callExpressions = method.getDescendantsOfKind(SyntaxKind.CallExpression)

    return callExpressions.some(call => {
        const text = call.getExpression().getText()
        return text.includes("validateUsing")
    })
}

function analyzeReturnStatements(method: MethodDeclaration): ReturnStatement[] {
    const returnStatements: ReturnStatement[] = []
    const returns = method.getDescendantsOfKind(SyntaxKind.ReturnStatement)

    for (const ret of returns) {
        const expression = ret.getExpression()
        if (!expression) continue

        const text = expression.getText()
        const line = ret.getStartLineNumber()

        if (text.includes("this.successResponse")) {
            returnStatements.push({
                line,
                type: "successResponse",
                hasGenericType: checkHasGenericType(text),
                text,
            })
        } else if (text.includes("this.errorResponse")) {
            returnStatements.push({
                line,
                type: "errorResponse",
                usesAppErrors: checkUsesAppErrors(text),
                text,
            })
        } else {
            returnStatements.push({
                line,
                type: "other",
                text,
            })
        }
    }

    return returnStatements
}

function checkHasGenericType(text: string): boolean {
    // Check for successResponse<Type> pattern
    return /successResponse\s*<[^>]+>/.test(text)
}

function checkUsesAppErrors(text: string): boolean {
    // Check for AppErrors.SOMETHING pattern
    return /AppErrors\.\w+/.test(text)
}
```

#### 2. Tests for Controller Analyzer

**File**: `tests/controller-analyzer.test.ts`
```typescript
import { describe, it, expect } from "vitest"
import { analyzeController } from "../src/parsers/controller-analyzer"

describe("analyzeController", () => {
    it("should detect request usage", () => {
        // Test with valid-controller fixture
    })

    it("should detect validateUsing calls", () => {
        // Test presence detection
    })

    it("should analyze return statements", () => {
        // Test return type detection
    })

    it("should detect generic type on successResponse", () => {
        // Test generic detection
    })

    it("should detect AppErrors usage", () => {
        // Test AppErrors detection
    })
})
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` compiles successfully
- [ ] `npm run test` - controller-analyzer tests pass
- [ ] Analyzer correctly parses target controllers
- [ ] All method properties extracted correctly

#### Manual Verification:
- [ ] Run analyzer on `collections_controller.ts` and verify output
- [ ] Check detection of all patterns (validateUsing, successResponse<T>, errorResponse)
- [ ] Verify line numbers are accurate

### Handoff Document Location:
`ai_docs/implement/phase-3-controller-analyzer.md`

---

## Phase 4: Validation Rules

### Overview
Implement the three validation rules that check controller methods for pattern compliance.

### Changes Required:

#### 1. Validation Rules

**File**: `src/validators/validate-using-checker.ts`
```typescript
import type { MethodAnalysis, Violation } from "../types.js"

/**
 * Check if method should have validateUsing and if it does
 */
export function checkValidateUsing(analysis: MethodAnalysis): Violation | null {
    // If method uses request, it should call validateUsing
    if (analysis.usesRequest && !analysis.hasValidateUsing) {
        return {
            rule: "validate-using",
            message: `Method uses 'request' but does not call 'request.validateUsing()'. All request data must be validated.`,
            line: analysis.line,
            severity: "error",
        }
    }

    // If method uses params, it should also validate (for param validation)
    // This is configurable - some teams might not require this
    if (analysis.usesParams && !analysis.hasValidateUsing && !analysis.usesRequest) {
        return {
            rule: "validate-using",
            message: `Method uses 'params' but does not call 'request.validateUsing()'. Consider adding parameter validation.`,
            line: analysis.line,
            severity: "warning",
        }
    }

    return null
}
```

**File**: `src/validators/success-response-checker.ts`
```typescript
import type { MethodAnalysis, Violation } from "../types.js"

/**
 * Check if all successResponse calls have generic type parameters
 */
export function checkSuccessResponse(analysis: MethodAnalysis): Violation[] {
    const violations: Violation[] = []

    for (const ret of analysis.returnStatements) {
        if (ret.type === "successResponse" && !ret.hasGenericType) {
            violations.push({
                rule: "success-response-typed",
                message: `successResponse() missing generic type parameter. Use successResponse<Type>(data) for type safety.`,
                line: ret.line,
                severity: "error",
            })
        }
    }

    return violations
}
```

**File**: `src/validators/error-response-checker.ts`
```typescript
import type { MethodAnalysis, Violation } from "../types.js"

/**
 * Check if all errorResponse calls use AppErrors constants
 */
export function checkErrorResponse(analysis: MethodAnalysis): Violation[] {
    const violations: Violation[] = []

    for (const ret of analysis.returnStatements) {
        if (ret.type === "errorResponse" && !ret.usesAppErrors) {
            violations.push({
                rule: "error-response-app-errors",
                message: `errorResponse() must use AppErrors constants. Found: ${ret.text.substring(0, 50)}...`,
                line: ret.line,
                severity: "error",
            })
        }
    }

    return violations
}
```

**File**: `src/validators/index.ts`
```typescript
import type { MethodAnalysis, ValidationResult } from "../types.js"
import { checkValidateUsing } from "./validate-using-checker.js"
import { checkSuccessResponse } from "./success-response-checker.js"
import { checkErrorResponse } from "./error-response-checker.js"

/**
 * Run all validation checks on a method
 */
export function validateMethod(analysis: MethodAnalysis): ValidationResult {
    const violations = []

    // Check validateUsing
    const validateUsingViolation = checkValidateUsing(analysis)
    if (validateUsingViolation) {
        violations.push(validateUsingViolation)
    }

    // Check successResponse typing
    violations.push(...checkSuccessResponse(analysis))

    // Check errorResponse AppErrors usage
    violations.push(...checkErrorResponse(analysis))

    return {
        controller: analysis.controller,
        method: analysis.method,
        filePath: analysis.filePath,
        line: analysis.line,
        violations,
        passed: violations.length === 0,
    }
}
```

#### 2. Validation Runner

**File**: `src/runner.ts`
```typescript
import { parseRoutes, groupRoutesByController } from "./parsers/route-parser.js"
import { analyzeController } from "./parsers/controller-analyzer.js"
import { validateMethod } from "./validators/index.js"
import type { ValidatorConfig, ValidationResult, RouteDefinition } from "./types.js"
import * as path from "path"
import * as fs from "fs"

export interface RunResult {
    totalMethods: number
    passedMethods: number
    failedMethods: number
    results: ValidationResult[]
    violations: ValidationResult[]
}

/**
 * Run validation on an entire project
 */
export function runValidation(projectPath: string, config: ValidatorConfig): RunResult {
    // Parse routes
    const routes = parseRoutes(projectPath, config.routesFile)
    const routesByController = groupRoutesByController(routes)

    const results: ValidationResult[] = []

    // Process each controller
    for (const [controllerName, controllerRoutes] of routesByController) {
        const controllerPath = resolveControllerPath(projectPath, config.controllersDir, controllerName)

        if (!fs.existsSync(controllerPath)) {
            console.warn(`Controller not found: ${controllerPath}`)
            continue
        }

        const methodAnalyses = analyzeController(projectPath, controllerPath)

        // Validate each route handler method
        for (const route of controllerRoutes) {
            const methodKey = `${controllerName}.${route.handler}`

            // Skip whitelisted methods
            if (config.whitelist.includes(methodKey)) {
                continue
            }

            const analysis = methodAnalyses.get(route.handler)
            if (!analysis) {
                console.warn(`Method not found: ${methodKey}`)
                continue
            }

            const result = validateMethod(analysis)
            results.push(result)
        }
    }

    const violations = results.filter(r => !r.passed)

    return {
        totalMethods: results.length,
        passedMethods: results.filter(r => r.passed).length,
        failedMethods: violations.length,
        results,
        violations,
    }
}

function resolveControllerPath(
    projectPath: string,
    controllersDir: string,
    controllerName: string
): string {
    // Convert PascalCase to snake_case
    const fileName = controllerName
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .toLowerCase()

    return path.join(projectPath, controllersDir, `${fileName}.ts`)
}
```

#### 3. Tests for Validators

**File**: `tests/validators.test.ts`
```typescript
import { describe, it, expect } from "vitest"
import { validateMethod } from "../src/validators"
import type { MethodAnalysis } from "../src/types"

describe("validateMethod", () => {
    it("should pass for valid method", () => {
        const analysis: MethodAnalysis = {
            controller: "TestController",
            method: "index",
            filePath: "test.ts",
            line: 10,
            usesRequest: true,
            usesParams: false,
            hasValidateUsing: true,
            returnStatements: [
                { line: 15, type: "successResponse", hasGenericType: true, text: "this.successResponse<User[]>(users)" }
            ]
        }

        const result = validateMethod(analysis)
        expect(result.passed).toBe(true)
        expect(result.violations).toHaveLength(0)
    })

    it("should fail for missing validateUsing", () => {
        const analysis: MethodAnalysis = {
            controller: "TestController",
            method: "store",
            filePath: "test.ts",
            line: 20,
            usesRequest: true,
            usesParams: false,
            hasValidateUsing: false,
            returnStatements: []
        }

        const result = validateMethod(analysis)
        expect(result.passed).toBe(false)
        expect(result.violations).toHaveLength(1)
        expect(result.violations[0].rule).toBe("validate-using")
    })

    it("should fail for untyped successResponse", () => {
        const analysis: MethodAnalysis = {
            controller: "TestController",
            method: "show",
            filePath: "test.ts",
            line: 30,
            usesRequest: false,
            usesParams: true,
            hasValidateUsing: false,
            returnStatements: [
                { line: 35, type: "successResponse", hasGenericType: false, text: "this.successResponse(data)" }
            ]
        }

        const result = validateMethod(analysis)
        expect(result.passed).toBe(false)
        expect(result.violations.some(v => v.rule === "success-response-typed")).toBe(true)
    })

    it("should fail for non-AppErrors errorResponse", () => {
        const analysis: MethodAnalysis = {
            controller: "TestController",
            method: "destroy",
            filePath: "test.ts",
            line: 40,
            usesRequest: false,
            usesParams: true,
            hasValidateUsing: false,
            returnStatements: [
                { line: 45, type: "errorResponse", usesAppErrors: false, text: "this.errorResponse({ status: 400 })" }
            ]
        }

        const result = validateMethod(analysis)
        expect(result.passed).toBe(false)
        expect(result.violations.some(v => v.rule === "error-response-app-errors")).toBe(true)
    })
})
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` compiles successfully
- [ ] `npm run test` - all validator tests pass
- [ ] Runner processes target codebase without errors
- [ ] Correct violations detected on invalid-controller fixture

#### Manual Verification:
- [ ] Run full validation on target codebase
- [ ] Verify violations are accurate (no false positives)
- [ ] Check violation messages are helpful

### Handoff Document Location:
`ai_docs/implement/phase-4-validation-rules.md`

---

## Phase 5: CLI and Integration

### Overview
Create the CLI interface with commander, add configuration file support, and prepare for npm publishing.

### Changes Required:

#### 1. CLI Implementation

**File**: `src/cli.ts`
```typescript
#!/usr/bin/env node

import { Command } from "commander"
import chalk from "chalk"
import * as fs from "fs"
import * as path from "path"
import { runValidation } from "./runner.js"
import { DEFAULT_CONFIG, type ValidatorConfig } from "./types.js"

const program = new Command()

program
    .name("adonis-validator")
    .description("Static analysis tool for AdonisJS controller pattern validation")
    .version("0.1.0")
    .option("-c, --config <path>", "Path to config file", "adonis-validator.config.json")
    .option("-p, --project <path>", "Path to project root", ".")
    .option("--routes <path>", "Path to routes file")
    .option("--controllers <path>", "Path to controllers directory")
    .option("--no-fail", "Don't exit with error code on violations")
    .option("--json", "Output results as JSON")
    .option("-v, --verbose", "Verbose output")
    .action(async (options) => {
        const projectPath = path.resolve(options.project)
        const config = loadConfig(projectPath, options)

        if (options.verbose) {
            console.log(chalk.blue("Configuration:"), config)
        }

        console.log(chalk.blue(`\nValidating AdonisJS controllers in ${projectPath}...\n`))

        const result = runValidation(projectPath, config)

        if (options.json) {
            console.log(JSON.stringify(result, null, 2))
        } else {
            printResults(result, options.verbose)
        }

        if (config.failOnError && result.failedMethods > 0) {
            process.exit(1)
        }
    })

function loadConfig(projectPath: string, options: any): ValidatorConfig {
    const configPath = path.join(projectPath, options.config)
    let fileConfig: Partial<ValidatorConfig> = {}

    if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, "utf-8")
        fileConfig = JSON.parse(content)
    }

    return {
        ...DEFAULT_CONFIG,
        ...fileConfig,
        ...(options.routes && { routesFile: options.routes }),
        ...(options.controllers && { controllersDir: options.controllers }),
        ...(options.fail === false && { failOnError: false }),
    }
}

function printResults(result: RunResult, verbose: boolean) {
    const { totalMethods, passedMethods, failedMethods, violations } = result

    // Print violations
    for (const v of violations) {
        console.log(chalk.red(`\n❌ ${v.controller}.${v.method}`))
        console.log(chalk.gray(`   ${v.filePath}:${v.line}`))

        for (const violation of v.violations) {
            const icon = violation.severity === "error" ? "🔴" : "🟡"
            console.log(`   ${icon} ${violation.message}`)
            if (verbose) {
                console.log(chalk.gray(`      Line ${violation.line}: ${violation.rule}`))
            }
        }
    }

    // Print summary
    console.log("\n" + "─".repeat(60))

    if (failedMethods === 0) {
        console.log(chalk.green(`\n✅ All ${totalMethods} controller methods pass validation!\n`))
    } else {
        console.log(chalk.red(`\n❌ ${failedMethods} of ${totalMethods} methods have violations\n`))
        console.log(chalk.green(`   ✅ Passed: ${passedMethods}`))
        console.log(chalk.red(`   ❌ Failed: ${failedMethods}`))
    }
}

program.parse()
```

#### 2. Configuration File Support

**File**: `src/config.ts`
```typescript
import * as fs from "fs"
import * as path from "path"
import { DEFAULT_CONFIG, type ValidatorConfig } from "./types.js"

export function loadConfigFile(configPath: string): ValidatorConfig {
    if (!fs.existsSync(configPath)) {
        return DEFAULT_CONFIG
    }

    const content = fs.readFileSync(configPath, "utf-8")
    const fileConfig = JSON.parse(content) as Partial<ValidatorConfig>

    return {
        ...DEFAULT_CONFIG,
        ...fileConfig,
    }
}

export function createDefaultConfig(projectPath: string): void {
    const configPath = path.join(projectPath, "adonis-validator.config.json")

    if (fs.existsSync(configPath)) {
        console.log("Config file already exists")
        return
    }

    const config = {
        routesFile: "start/routes.ts",
        controllersDir: "app/controllers",
        whitelist: ["ClusterProxyController.proxy"],
        strictMode: true,
        failOnError: true,
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    console.log(`Created ${configPath}`)
}
```

#### 3. README Documentation

**File**: `README.md`
```markdown
# AdonisJS Controller Validator

Static analysis tool for validating AdonisJS controller patterns.

## Installation

```bash
npm install -D @anthropic/adonis-controller-validator
```

## Usage

```bash
# Run validation
npx adonis-validator

# With custom project path
npx adonis-validator -p ./my-project

# Output as JSON
npx adonis-validator --json

# Don't fail on violations
npx adonis-validator --no-fail
```

## Configuration

Create `adonis-validator.config.json` in your project root:

```json
{
  "routesFile": "start/routes.ts",
  "controllersDir": "app/controllers",
  "whitelist": [
    "ClusterProxyController.proxy"
  ],
  "strictMode": true,
  "failOnError": true
}
```

## Validation Rules

### 1. validate-using (error)
All controller methods that use `request` must call `request.validateUsing()`.

### 2. success-response-typed (error)
All `successResponse()` calls must have a generic type parameter:
```typescript
// ❌ Bad
return this.successResponse(data)

// ✅ Good
return this.successResponse<User[]>(data)
```

### 3. error-response-app-errors (error)
All `errorResponse()` calls must use AppErrors constants:
```typescript
// ❌ Bad
return this.errorResponse({ status: 400, message: "Bad" })

// ✅ Good
return this.errorResponse(AppErrors.BAD_REQUEST)
```

## Integration with CI

```yaml
# GitHub Actions
- name: Validate controller patterns
  run: npx adonis-validator
```

## License

MIT
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` compiles successfully
- [ ] `npm run test` - all tests pass
- [ ] CLI runs: `npx ts-node src/cli.ts --help`
- [ ] CLI validates target codebase successfully
- [ ] JSON output is valid
- [ ] Exit code 1 on violations, 0 on success

#### Manual Verification:
- [ ] Install package locally in target project
- [ ] Run `npx adonis-validator` and verify output
- [ ] Test config file override works
- [ ] Test whitelist functionality
- [ ] README is clear and complete

### Handoff Document Location:
`ai_docs/implement/phase-5-cli-integration.md`

---

## Testing Strategy

### Unit Tests:
- Route parser: Test route extraction from sample routes.ts
- Controller analyzer: Test method analysis with fixtures
- Validators: Test each rule with valid/invalid inputs
- Config loader: Test file loading and merging

### Integration Tests:
- Full validation run on test fixtures
- Full validation run on target codebase (snapshot)

### Manual Testing Steps:
1. Run `npx adonis-validator` in target project
2. Verify all violations are legitimate
3. Add whitelist entry and verify it's skipped
4. Test --json output format
5. Test exit codes (0 for pass, 1 for fail)

## Performance Considerations

- ts-morph project creation is slow; consider caching
- Parse only needed files, not entire project
- For large codebases, consider parallel processing

## References

- Target codebase: `DataStreaming/web-app/packages/backend/`
- ts-morph documentation: https://ts-morph.com/
- AdonisJS validators: https://docs.adonisjs.com/guides/validation
- Research document: `ai_docs/research/codebase-analysis.md`

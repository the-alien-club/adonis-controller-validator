# Research: AdonisJS Controller Pattern Validation

**Date**: 2026-02-05
**Researcher**: Claude Code
**Repository**: adonis-controller-validator

## Research Question

How can we automate validation of AdonisJS controller patterns to ensure:
1. All route handlers use `request.validateUsing(validator)` for request validation
2. All success returns use `this.successResponse<Type>(data)` with proper generic typing
3. All error returns use `this.errorResponse(AppErrors.X, ...)` with AppErrors constants

## Summary

The target codebase (DataStreaming web-app/packages/backend) uses AdonisJS with a consistent controller pattern. Routes are defined imperatively in `start/routes.ts`, and all controllers extend a `BaseController` that provides standardized response methods. We can use **ts-morph** to parse and analyze the TypeScript AST to validate these patterns statically.

## Detailed Findings

### 1. Route Definition Pattern

**File**: `web-app/packages/backend/start/routes.ts`

Routes are defined using array notation:
```typescript
router.get("/datasets", [DatasetsController, "index"])
router.post("/datasets", [DatasetsController, "store"])
router.patch("/datasets/:dataset_id", [DatasetsController, "update"])
router.delete("/datasets/:dataset_id", [DatasetsController, "destroy"])
```

**Key observations:**
- Controller imports use lazy-loading: `const DatasetsController = () => import("#controllers/datasets_controller")`
- HTTP methods: `get`, `post`, `patch`, `put`, `delete`, `any`
- Route parameters use `:param_name` syntax
- ~150 routes across 24 controllers
- Inline handlers exist for redirects: `router.get("/", async ({ response }) => response.redirect("/status"))`

### 2. Controller Base Class

**File**: `web-app/packages/backend/app/controllers/templates/base_controller.ts`

```typescript
@inject()
export default class BaseController {
    constructor(protected ctx: HttpContext) {}

    protected async successResponse<T>(data?: any): Promise<SuccessfulRequest<T>>
    protected async successResponse<T>(data: any, meta: any): Promise<SuccessfulRequest<T> & { meta: IndexedRequestMeta }>

    protected async errorResponse(error: ErrorObj, data: unknown | null = null, message?: string)
}
```

**Response patterns:**
- `successResponse<T>()` - Generic type parameter required for type safety
- `errorResponse()` - Takes ErrorObj from AppErrors constants

### 3. Controller Method Pattern

**File**: `web-app/packages/backend/app/controllers/collections_controller.ts` (example)

```typescript
async index({ auth, request }: HttpContext) {
    const { select } = await request.validateUsing(collectionsIndexingValidator)

    // ... business logic ...

    return this.successResponse<FormattedCollection[]>(formattedCollections)
}

async show({ bouncer, params }: HttpContext) {
    if (!isValidIntId(params.collection_id)) {
        return this.errorResponse(AppErrors.INVALID_ID_FORMAT, undefined, "...")
    }

    // ... business logic ...

    return this.successResponse<FormattedCollection>(collection)
}
```

### 4. Validator Pattern

**File**: `web-app/packages/backend/app/validators/collection_validator.ts`

```typescript
import vine from "@vinejs/vine"

export const collectionsIndexingValidator = vine.compile(
    vine.object({
        select: vine.enum(CollectionIndexingSelect).optional(),
    }),
)
```

### 5. AppErrors Constants

**File**: `web-app/packages/backend/lib/errors.ts`

```typescript
export const AppErrors = {
    ...BaseErrors,
    DATASET_NOT_FOUND: {
        status: 404,
        name: "DATASET_NOT_FOUND",
        message: "This dataset could not be found.",
        data: null,
    },
    // ... 100+ error definitions
}
```

## Patterns to Validate

### Pattern 1: request.validateUsing() Required

**Rule**: Every controller method that is a route handler should call `request.validateUsing()`.

**Exceptions**:
- Methods that don't use `request` parameter at all
- Methods that only use `params` for simple ID lookups (debatable)
- Whitelisted methods (e.g., `ClusterProxyController.proxy`)

**Detection Strategy**:
1. Parse routes.ts to get all [Controller, "method"] mappings
2. For each controller method, check if `request.validateUsing()` is called
3. Flag violations

### Pattern 2: successResponse Must Have Generic Type

**Rule**: `this.successResponse<Type>(data)` must include a generic type parameter.

**Anti-pattern**:
```typescript
return this.successResponse(data)  // Missing <Type>
```

**Correct**:
```typescript
return this.successResponse<FormattedCollection[]>(data)
```

**Detection Strategy**:
1. Find all `this.successResponse` call expressions
2. Check if type arguments are provided
3. Flag calls without type arguments

### Pattern 3: errorResponse Must Use AppErrors

**Rule**: `this.errorResponse()` first argument must be `AppErrors.SOMETHING`.

**Anti-pattern**:
```typescript
return this.errorResponse({ status: 400, message: "Bad" })  // Inline error object
```

**Correct**:
```typescript
return this.errorResponse(AppErrors.BAD_REQUEST)
```

**Detection Strategy**:
1. Find all `this.errorResponse` call expressions
2. Check if first argument is a property access on `AppErrors`
3. Flag calls with other argument types

## Technical Approach: ts-morph

**Why ts-morph?**
- Full TypeScript AST access
- Type information available
- Easy navigation between files
- Well-documented API

**Key ts-morph APIs needed:**
```typescript
import { Project, SyntaxKind } from "ts-morph"

// Create project
const project = new Project({ tsConfigFilePath: "tsconfig.json" })

// Get source file
const routesFile = project.getSourceFileOrThrow("start/routes.ts")

// Find call expressions
const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)

// Check method calls
call.getExpression().getText()  // "router.get"
call.getArguments()  // [path, [Controller, "method"]]

// Find class methods
const classDecl = sourceFile.getClassOrThrow("DatasetsController")
const method = classDecl.getMethodOrThrow("index")

// Check for specific calls within method
method.getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter(call => call.getText().includes("validateUsing"))
```

## Edge Cases to Handle

1. **Inline route handlers** - Skip validation for arrow functions in routes
2. **Proxy controllers** - Whitelist methods that intentionally forward raw body
3. **Health check endpoints** - May not need validation
4. **Admin routes** - Same rules apply
5. **Nested method calls** - Track all return paths
6. **Conditional returns** - All branches should use proper patterns

## Files to Create

```
src/
├── index.ts              # Programmatic API entry
├── cli.ts                # CLI with commander
├── types.ts              # TypeScript interfaces
├── config.ts             # Configuration schema
├── parsers/
│   ├── route-parser.ts   # Parse routes.ts
│   └── controller-analyzer.ts  # Analyze controller methods
└── validators/
    ├── validate-using-checker.ts
    ├── success-response-checker.ts
    └── error-response-checker.ts
```

## References

- Target codebase: `DataStreaming/web-app/packages/backend/`
- Routes file: `start/routes.ts`
- Controllers: `app/controllers/`
- Validators: `app/validators/`
- Base controller: `app/controllers/templates/base_controller.ts`
- Error constants: `lib/errors.ts`

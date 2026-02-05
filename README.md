# AdonisJS Controller Validator

Static analysis tool for validating AdonisJS controller patterns using TypeScript AST analysis.

## Status

✅ **Production Ready** - All phases complete. See `ai_docs/plan/implementation-plan.md` for implementation details.

## Overview

This tool validates that AdonisJS controller methods follow three critical patterns:

1. **Validation**: All methods must use `request.validateUsing(validator)` for request handling
2. **Success responses**: Must use `this.successResponse<Type>(data)` with generic type
3. **Error responses**: Must use `this.errorResponse(AppErrors.X, ...)` with AppErrors constants

## Installation

```bash
npm install -D @alien/adonis-controller-validator
```

## Usage

### As Standalone CLI

```bash
# Run validation
npx adonis-validator

# With custom project path
npx adonis-validator -p ./my-project

# Output as JSON
npx adonis-validator --json

# Verbose output
npx adonis-validator -v
```

### As AdonisJS Ace Command

**Option 1: Auto-configure (Recommended)**

Run the configure command to automatically register:

```bash
node ace configure @alien/adonis-controller-validator
```

This will:
- Auto-register the command in `adonisrc.ts`
- Create default `adonis-validator.config.json`
- Display setup instructions

**Option 2: Manual registration**

Alternatively, manually register in your `adonisrc.ts`:

```typescript
{
  commands: [
    // ... other commands
    () => import('@alien/adonis-controller-validator/commands')
  ]
}
```

**Run the command:**

```bash
node ace validate:controllers
node ace validate:controllers --verbose
node ace validate:controllers --json
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
  "failOnError": true,
  "appErrorsPath": "#lib/errors"
}
```

### Configuration Options

- **routesFile**: Path to routes file (default: `"start/routes.ts"`)
- **controllersDir**: Path to controllers directory (default: `"app/controllers"`)
- **whitelist**: Array of method names to skip (format: `"ControllerName.methodName"`)
- **strictMode**: Whether to enforce all rules strictly (default: `true`)
- **failOnError**: Exit with error code on violations (default: `true`)
- **appErrorsPath**: Import path for AppErrors (default: `"#lib/errors"`)

## Validation Rules

### 1. validate-using (error)
All controller methods that use `request` must call `request.validateUsing()`.

```typescript
// ❌ Bad
async store({ request }: HttpContext) {
    const data = request.body()
    return this.successResponse(data)
}

// ✅ Good
async store({ request }: HttpContext) {
    const data = await request.validateUsing(storeValidator)
    return this.successResponse<User>(data)
}
```

### 2. success-response-typed (error)
All `successResponse()` calls must have a generic type parameter.

```typescript
// ❌ Bad
return this.successResponse(data)

// ✅ Good
return this.successResponse<User[]>(data)
```

### 3. error-response-app-errors (error)
All `errorResponse()` calls must use AppErrors constants.

```typescript
// ❌ Bad
return this.errorResponse({ status: 400, message: "Bad" })

// ✅ Good
return this.errorResponse(AppErrors.BAD_REQUEST)
```

## Integration with CI

### GitHub Actions

```yaml
- name: Validate controller patterns
  run: npx adonis-validator
```

### GitLab CI

```yaml
validate-patterns:
  script:
    - npm install -D @alien/adonis-controller-validator
    - npx adonis-validator
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm run test

# Lint
npm run lint
```

## Documentation

- [Implementation Plan](ai_docs/plan/implementation-plan.md)
- [Codebase Research](ai_docs/research/codebase-analysis.md)

## License

MIT

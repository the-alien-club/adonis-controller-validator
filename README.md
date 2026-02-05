# AdonisJS Controller Validator

Static analysis tool for validating AdonisJS controller patterns using TypeScript AST analysis.

## Status

🚧 **In Development** - See `ai_docs/plan/implementation-plan.md` for the roadmap.

## Overview

This tool validates that AdonisJS controller methods follow three critical patterns:

1. **Validation**: All methods must use `request.validateUsing(validator)` for request handling
2. **Success responses**: Must use `this.successResponse<Type>(data)` with generic type
3. **Error responses**: Must use `this.errorResponse(AppErrors.X, ...)` with AppErrors constants

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

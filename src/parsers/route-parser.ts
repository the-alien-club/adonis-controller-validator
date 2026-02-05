import { type ArrayLiteralExpression, type CallExpression, Project, SyntaxKind } from "ts-morph";
import type { HttpMethod, RouteDefinition } from "../types.js";

const HTTP_METHODS = ["get", "post", "patch", "put", "delete", "any"] as const;

/**
 * Parse routes.ts and extract all route definitions
 */
export function parseRoutes(projectPath: string, routesFile: string): RouteDefinition[] {
    const project = new Project({
        tsConfigFilePath: `${projectPath}/tsconfig.json`,
    });

    const sourceFile = project.addSourceFileAtPath(`${projectPath}/${routesFile}`);
    const routes: RouteDefinition[] = [];

    // Find all call expressions
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of callExpressions) {
        const route = parseRouteCall(call);
        if (route) {
            routes.push(route);
        }
    }

    return routes;
}

function parseRouteCall(call: CallExpression): RouteDefinition | null {
    const expression = call.getExpression();
    const expressionText = expression.getText();

    // Match router.get, router.post, etc.
    const methodMatch = expressionText.match(/router\.(get|post|patch|put|delete|any)$/);
    if (!methodMatch) return null;

    const httpMethod = methodMatch[1] as HttpMethod;
    const args = call.getArguments();

    if (args.length < 2) return null;

    // First arg is path
    const pathArg = args[0];
    const path = pathArg.getText().replace(/['"]/g, "");

    // Second arg should be [Controller, "method"]
    const handlerArg = args[1];
    if (!handlerArg.isKind(SyntaxKind.ArrayLiteralExpression)) {
        // Inline handler, skip
        return null;
    }

    const arrayElements = (handlerArg as ArrayLiteralExpression).getElements();
    if (arrayElements.length !== 2) return null;

    const controllerName = arrayElements[0].getText();
    const methodName = arrayElements[1].getText().replace(/['"]/g, "");

    // Extract path parameters
    const pathParams = extractPathParams(path);

    return {
        method: httpMethod,
        path,
        controller: controllerName,
        handler: methodName,
        line: call.getStartLineNumber(),
        hasPathParams: pathParams.length > 0,
        pathParams,
    };
}

function extractPathParams(path: string): string[] {
    const matches = path.match(/:([a-zA-Z_]+)/g) || [];
    return matches.map((m) => m.substring(1));
}

/**
 * Group routes by controller for easier processing
 */
export function groupRoutesByController(routes: RouteDefinition[]): Map<string, RouteDefinition[]> {
    const grouped = new Map<string, RouteDefinition[]>();

    for (const route of routes) {
        const existing = grouped.get(route.controller) || [];
        existing.push(route);
        grouped.set(route.controller, existing);
    }

    return grouped;
}

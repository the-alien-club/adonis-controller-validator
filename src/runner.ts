import * as fs from "node:fs";
import * as path from "node:path";
import { analyzeController } from "./parsers/controller-analyzer.js";
import { groupRoutesByController, parseRoutes } from "./parsers/route-parser.js";
import type { ValidationResult, ValidatorConfig } from "./types.js";
import { validateMethod } from "./validators/index.js";

export interface RunResult {
    totalMethods: number;
    passedMethods: number;
    failedMethods: number;
    results: ValidationResult[];
    violations: ValidationResult[];
}

/**
 * Run validation on an entire project
 */
export function runValidation(projectPath: string, config: ValidatorConfig): RunResult {
    // Parse routes
    const routes = parseRoutes(projectPath, config.routesFile);
    const routesByController = groupRoutesByController(routes);

    const results: ValidationResult[] = [];

    // Process each controller
    for (const [controllerName, controllerRoutes] of routesByController) {
        const controllerPath = resolveControllerPath(projectPath, config.controllersDir, controllerName);

        if (!fs.existsSync(controllerPath)) {
            console.warn(`Controller not found: ${controllerPath}`);
            continue;
        }

        const methodAnalyses = analyzeController(projectPath, controllerPath);

        // Validate each route handler method
        for (const route of controllerRoutes) {
            const methodKey = `${controllerName}.${route.handler}`;

            // Skip whitelisted methods
            if (config.whitelist.includes(methodKey)) {
                continue;
            }

            const analysis = methodAnalyses.get(route.handler);
            if (!analysis) {
                console.warn(`Method not found: ${methodKey}`);
                continue;
            }

            const result = validateMethod(analysis);
            results.push(result);
        }
    }

    const violations = results.filter((r) => !r.passed);

    return {
        totalMethods: results.length,
        passedMethods: results.filter((r) => r.passed).length,
        failedMethods: violations.length,
        results,
        violations,
    };
}

function resolveControllerPath(projectPath: string, controllersDir: string, controllerName: string): string {
    // Convert PascalCase to snake_case
    const fileName = controllerName.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();

    return path.join(projectPath, controllersDir, `${fileName}.ts`);
}

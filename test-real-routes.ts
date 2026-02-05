#!/usr/bin/env node
/**
 * Test script to validate route parser against the real backend codebase
 */
import { groupRoutesByController, parseRoutes } from "./src/parsers/route-parser.js";

const projectPath = "../../web-app/packages/backend";
const routesFile = "start/routes.ts";

console.log("🔍 Parsing routes from:", `${projectPath}/${routesFile}`);
console.log("");

try {
    const routes = parseRoutes(projectPath, routesFile);

    console.log(`✅ Successfully parsed ${routes.length} routes`);
    console.log("");

    // Group by controller
    const grouped = groupRoutesByController(routes);
    console.log(`📊 Routes grouped into ${grouped.size} controllers:`);
    console.log("");

    // Show summary by controller
    for (const [controller, controllerRoutes] of grouped) {
        console.log(`  ${controller}: ${controllerRoutes.length} routes`);
    }

    console.log("");
    console.log("📋 Sample routes:");
    console.log("");

    // Show first 10 routes as examples
    routes.slice(0, 10).forEach((route, i) => {
        const params = route.hasPathParams ? ` (params: ${route.pathParams.join(", ")})` : "";
        console.log(`  ${i + 1}. [${route.method.toUpperCase().padEnd(6)}] ${route.path}${params}`);
        console.log(`     → ${route.controller}.${route.handler} (line ${route.line})`);
    });

    if (routes.length > 10) {
        console.log(`  ... and ${routes.length - 10} more routes`);
    }

    console.log("");
    console.log("✅ Route parser successfully validated against real codebase!");
} catch (error) {
    console.error("❌ Error parsing routes:");
    console.error(error);
    process.exit(1);
}

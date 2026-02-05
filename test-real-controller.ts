#!/usr/bin/env node
/**
 * Test script to validate controller analyzer against real backend controllers
 */
import { analyzeController } from "./src/parsers/controller-analyzer.js";

// Adjust path based on where script is run from
const baseDir = process.cwd().includes("sandbox/adonis-controller-validator")
    ? "../.."
    : ".";
const projectPath = `${baseDir}/web-app/packages/backend`;
const controllerPath = `${baseDir}/web-app/packages/backend/app/controllers/collections_controller.ts`;

console.log("🔍 Analyzing controller:", controllerPath);
console.log("");

try {
    const analyses = analyzeController(projectPath, controllerPath);

    console.log(`✅ Successfully analyzed controller with ${analyses.size} methods`);
    console.log("");

    // Show analysis for each method
    for (const [methodName, analysis] of analyses) {
        console.log(`📊 Method: ${analysis.controller}.${methodName} (line ${analysis.line})`);
        console.log(`   Uses request: ${analysis.usesRequest}`);
        console.log(`   Uses params: ${analysis.usesParams}`);
        console.log(`   Has validateUsing: ${analysis.hasValidateUsing}`);
        console.log(`   Return statements: ${analysis.returnStatements.length}`);

        for (const ret of analysis.returnStatements) {
            const typeInfo =
                ret.type === "successResponse"
                    ? ` (generic: ${ret.hasGenericType})`
                    : ret.type === "errorResponse"
                      ? ` (AppErrors: ${ret.usesAppErrors})`
                      : "";
            console.log(`     - Line ${ret.line}: ${ret.type}${typeInfo}`);
        }

        console.log("");
    }

    console.log("✅ Controller analyzer successfully validated against real codebase!");
} catch (error) {
    console.error("❌ Error analyzing controller:");
    console.error(error);
    process.exit(1);
}

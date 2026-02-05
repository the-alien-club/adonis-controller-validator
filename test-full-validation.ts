#!/usr/bin/env node
/**
 * Test script to run full validation against the real backend codebase
 */
import { DEFAULT_CONFIG, runValidation } from "./src/index.js";

// Adjust path based on where script is run from
const baseDir = process.cwd().includes("sandbox/adonis-controller-validator") ? "../.." : ".";
const projectPath = `${baseDir}/web-app/packages/backend`;

console.log("🔍 Running full validation on:", projectPath);
console.log("");

try {
    const result = runValidation(projectPath, DEFAULT_CONFIG);

    console.log("📊 Validation Results:");
    console.log(`   Total methods: ${result.totalMethods}`);
    console.log(`   ✅ Passed: ${result.passedMethods}`);
    console.log(`   ❌ Failed: ${result.failedMethods}`);
    console.log("");

    if (result.violations.length > 0) {
        console.log("❌ Violations found:");
        console.log("");

        // Group violations by type
        const byRule = new Map<string, typeof result.violations>();
        for (const v of result.violations) {
            for (const violation of v.violations) {
                const existing = byRule.get(violation.rule) || [];
                existing.push(v);
                byRule.set(violation.rule, existing);
            }
        }

        // Show summary by rule type
        for (const [rule, violations] of byRule) {
            console.log(`  ${rule}: ${violations.length} violations`);
        }
        console.log("");

        // Show first 10 violations in detail
        console.log("📋 First 10 violations:");
        console.log("");

        result.violations.slice(0, 10).forEach((v, i) => {
            console.log(`  ${i + 1}. ${v.controller}.${v.method} (${v.filePath}:${v.line})`);
            for (const violation of v.violations) {
                const icon = violation.severity === "error" ? "🔴" : "🟡";
                console.log(`     ${icon} ${violation.rule}: ${violation.message}`);
            }
            console.log("");
        });

        if (result.violations.length > 10) {
            console.log(`  ... and ${result.violations.length - 10} more violations`);
            console.log("");
        }
    } else {
        console.log("✅ All methods pass validation!");
    }

    console.log("✅ Full validation successfully completed!");
} catch (error) {
    console.error("❌ Error running validation:");
    console.error(error);
    process.exit(1);
}

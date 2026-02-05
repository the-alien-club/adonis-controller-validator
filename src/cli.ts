#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import { runValidation } from "./runner.js";
import type { RunResult } from "./runner.js";
import { DEFAULT_CONFIG, type ValidatorConfig } from "./types.js";

const program = new Command();

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
        const projectPath = path.resolve(options.project);
        const config = loadConfig(projectPath, options);

        if (options.verbose) {
            console.log(chalk.blue("Configuration:"), config);
        }

        console.log(chalk.blue(`\nValidating AdonisJS controllers in ${projectPath}...\n`));

        const result = runValidation(projectPath, config);

        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
        } else {
            printResults(result, options.verbose);
        }

        if (config.failOnError && result.failedMethods > 0) {
            process.exit(1);
        }
    });

interface CliOptions {
    config: string;
    project: string;
    routes?: string;
    controllers?: string;
    fail: boolean;
    json: boolean;
    verbose: boolean;
}

function loadConfig(projectPath: string, options: CliOptions): ValidatorConfig {
    const configPath = path.join(projectPath, options.config);
    let fileConfig: Partial<ValidatorConfig> = {};

    if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, "utf-8");
        fileConfig = JSON.parse(content);
    }

    return {
        ...DEFAULT_CONFIG,
        ...fileConfig,
        ...(options.routes && { routesFile: options.routes }),
        ...(options.controllers && { controllersDir: options.controllers }),
        ...(options.fail === false && { failOnError: false }),
    };
}

function printResults(result: RunResult, verbose: boolean) {
    const { totalMethods, passedMethods, failedMethods, violations } = result;

    // Print violations
    for (const v of violations) {
        console.log(chalk.red(`\n❌ ${v.controller}.${v.method}`));
        console.log(chalk.gray(`   ${v.filePath}:${v.line}`));

        for (const violation of v.violations) {
            const icon = violation.severity === "error" ? "🔴" : "🟡";
            console.log(`   ${icon} ${violation.message}`);
            if (verbose) {
                console.log(chalk.gray(`      Line ${violation.line}: ${violation.rule}`));
            }
        }
    }

    // Print summary
    console.log(`\n${"─".repeat(60)}`);

    if (failedMethods === 0) {
        console.log(chalk.green(`\n✅ All ${totalMethods} controller methods pass validation!\n`));
    } else {
        console.log(chalk.red(`\n❌ ${failedMethods} of ${totalMethods} methods have violations\n`));
        console.log(chalk.green(`   ✅ Passed: ${passedMethods}`));
        console.log(chalk.red(`   ❌ Failed: ${failedMethods}`));
    }
}

program.parse();

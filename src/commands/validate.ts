import * as fs from "node:fs";
import * as path from "node:path";
import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";
import { type RunResult, runValidation } from "../runner.js";
import { DEFAULT_CONFIG, type ValidatorConfig } from "../types.js";

export default class ValidateControllers extends BaseCommand {
    static commandName = "validate:controllers";
    static description = "Validate AdonisJS controller patterns for security and consistency";

    static options: CommandOptions = {
        startApp: false,
        allowUnknownFlags: false,
        staysAlive: false,
    };

    /**
     * Path to config file
     */
    declare configPath?: string;

    /**
     * Verbose output
     */
    declare verbose: boolean;

    /**
     * JSON output
     */
    declare json: boolean;

    /**
     * Don't fail on violations
     */
    declare noFail: boolean;

    /**
     * Prepare command execution
     */
    async prepare() {
        this.configPath = this.parsed.flags.config as string | undefined;
        this.verbose = this.parsed.flags.verbose as boolean;
        this.json = this.parsed.flags.json as boolean;
        this.noFail = this.parsed.flags["no-fail"] as boolean;
    }

    /**
     * Execute the validation command
     */
    async run() {
        const projectPath = this.app.appRoot.toString();
        const config = this.loadConfig(projectPath);

        if (this.verbose) {
            this.logger.info("Configuration:");
            console.log(config);
        }

        this.logger.info(`Validating AdonisJS controllers in ${projectPath}...`);
        console.log("");

        try {
            const result = runValidation(projectPath, config);

            if (this.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                this.printResults(result);
            }

            if (config.failOnError && !this.noFail && result.failedMethods > 0) {
                this.exitCode = 1;
            }
        } catch (error) {
            this.logger.error("Validation failed:");
            this.logger.error(error instanceof Error ? error.message : String(error));
            this.exitCode = 1;
        }
    }

    /**
     * Load configuration from file or use defaults
     */
    private loadConfig(projectPath: string): ValidatorConfig {
        const configPath = this.configPath || path.join(projectPath, "adonis-validator.config.json");
        let fileConfig: Partial<ValidatorConfig> = {};

        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, "utf-8");
            fileConfig = JSON.parse(content);
            if (this.verbose) {
                this.logger.info(`Loaded config from: ${configPath}`);
            }
        }

        return {
            ...DEFAULT_CONFIG,
            ...fileConfig,
        };
    }

    /**
     * Print formatted results
     */
    private printResults(result: RunResult) {
        const { totalMethods, passedMethods, failedMethods, violations } = result;

        // Print violations
        for (const v of violations) {
            this.logger.error(`${v.controller}.${v.method}`);
            console.log(this.colors.gray(`   ${v.filePath}:${v.line}`));

            for (const violation of v.violations) {
                const icon = violation.severity === "error" ? "🔴" : "🟡";
                console.log(`   ${icon} ${violation.message}`);
                if (this.verbose) {
                    console.log(this.colors.gray(`      Line ${violation.line}: ${violation.rule}`));
                }
            }
            console.log("");
        }

        // Print summary
        console.log("─".repeat(60));
        console.log("");

        if (failedMethods === 0) {
            this.logger.success(`All ${totalMethods} controller methods pass validation!`);
        } else {
            this.logger.error(`${failedMethods} of ${totalMethods} methods have violations`);
            console.log(this.colors.green(`   ✅ Passed: ${passedMethods}`));
            console.log(this.colors.red(`   ❌ Failed: ${failedMethods}`));
        }
        console.log("");
    }
}

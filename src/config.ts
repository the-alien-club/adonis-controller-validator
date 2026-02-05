import * as fs from "node:fs";
import * as path from "node:path";
import { DEFAULT_CONFIG, type ValidatorConfig } from "./types.js";

export function loadConfigFile(configPath: string): ValidatorConfig {
    if (!fs.existsSync(configPath)) {
        return DEFAULT_CONFIG;
    }

    const content = fs.readFileSync(configPath, "utf-8");
    const fileConfig = JSON.parse(content) as Partial<ValidatorConfig>;

    return {
        ...DEFAULT_CONFIG,
        ...fileConfig,
    };
}

export function createDefaultConfig(projectPath: string): void {
    const configPath = path.join(projectPath, "adonis-validator.config.json");

    if (fs.existsSync(configPath)) {
        console.log("Config file already exists");
        return;
    }

    const config = {
        routesFile: "start/routes.ts",
        controllersDir: "app/controllers",
        whitelist: ["ClusterProxyController.proxy"],
        strictMode: true,
        failOnError: true,
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`Created ${configPath}`);
}

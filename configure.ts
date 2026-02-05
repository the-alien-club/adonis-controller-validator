import type ConfigureCommand from "@adonisjs/core/commands/configure";

/**
 * Configure hook for the AdonisJS Controller Validator package
 *
 * This function is called when users run:
 *   node ace configure @alias3/adonis-controller-validator
 *
 * It automatically registers the validate:controllers command in adonisrc.ts
 */
export async function configure(command: ConfigureCommand) {
    const codemods = await command.createCodemods();

    /**
     * Register the validate:controllers command
     */
    // biome-ignore lint/suspicious/noExplicitAny: RcFileTransformer type not exported from @adonisjs/core
    await codemods.updateRcFile((transformer: any) => {
        transformer.addCommand("@alias3/adonis-controller-validator/commands");
    });

    /**
     * Create default configuration file
     */
    await codemods.makeUsingStub("config/adonis-validator.config.json", "config.stub", {});

    /**
     * Display success message and next steps
     */
    command.logger.success("Configured @alias3/adonis-controller-validator");
    command.logger.info("");
    command.logger.info("Next steps:");
    command.logger.info("1. Review config: adonis-validator.config.json");
    command.logger.info("2. Run: node ace validate:controllers");
    command.logger.info("3. Fix violations in your controllers");
}

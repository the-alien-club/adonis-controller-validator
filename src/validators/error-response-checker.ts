import type { MethodAnalysis, Violation } from "../types.js";

/**
 * Check if all errorResponse calls use AppErrors constants
 */
export function checkErrorResponse(analysis: MethodAnalysis): Violation[] {
    const violations: Violation[] = [];

    for (const ret of analysis.returnStatements) {
        if (ret.type === "errorResponse" && !ret.usesAppErrors) {
            violations.push({
                rule: "error-response-app-errors",
                message: `errorResponse() must use AppErrors constants. Found: ${ret.text.substring(0, 50)}...`,
                line: ret.line,
                severity: "error",
            });
        }
    }

    return violations;
}

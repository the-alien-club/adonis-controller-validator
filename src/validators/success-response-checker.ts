import type { MethodAnalysis, Violation } from "../types.js";

/**
 * Check if all successResponse calls have generic type parameters
 */
export function checkSuccessResponse(analysis: MethodAnalysis): Violation[] {
    const violations: Violation[] = [];

    for (const ret of analysis.returnStatements) {
        if (ret.type === "successResponse" && !ret.hasGenericType) {
            violations.push({
                rule: "success-response-typed",
                message:
                    "successResponse() missing generic type parameter. Use successResponse<Type>(data) for type safety.",
                line: ret.line,
                severity: "error",
            });
        }
    }

    return violations;
}

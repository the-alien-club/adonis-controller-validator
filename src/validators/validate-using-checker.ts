import type { MethodAnalysis, Violation } from "../types.js";

/**
 * Check if method should have validateUsing and if it does
 */
export function checkValidateUsing(analysis: MethodAnalysis): Violation | null {
    // If method uses request, it should call validateUsing
    if (analysis.usesRequest && !analysis.hasValidateUsing) {
        return {
            rule: "validate-using",
            message:
                "Method uses 'request' but does not call 'request.validateUsing()'. All request data must be validated.",
            line: analysis.line,
            severity: "error",
        };
    }

    // If method uses params, it should also validate (for param validation)
    // This is configurable - some teams might not require this
    if (analysis.usesParams && !analysis.hasValidateUsing && !analysis.usesRequest) {
        return {
            rule: "validate-using",
            message:
                "Method uses 'params' but does not call 'request.validateUsing()'. Consider adding parameter validation.",
            line: analysis.line,
            severity: "warning",
        };
    }

    return null;
}

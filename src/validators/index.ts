import type { MethodAnalysis, ValidationResult } from "../types.js";
import { checkErrorResponse } from "./error-response-checker.js";
import { checkSuccessResponse } from "./success-response-checker.js";
import { checkValidateUsing } from "./validate-using-checker.js";

/**
 * Run all validation checks on a method
 */
export function validateMethod(analysis: MethodAnalysis): ValidationResult {
    const violations = [];

    // Check validateUsing
    const validateUsingViolation = checkValidateUsing(analysis);
    if (validateUsingViolation) {
        violations.push(validateUsingViolation);
    }

    // Check successResponse typing
    violations.push(...checkSuccessResponse(analysis));

    // Check errorResponse AppErrors usage
    violations.push(...checkErrorResponse(analysis));

    return {
        controller: analysis.controller,
        method: analysis.method,
        filePath: analysis.filePath,
        line: analysis.line,
        violations,
        passed: violations.length === 0,
    };
}

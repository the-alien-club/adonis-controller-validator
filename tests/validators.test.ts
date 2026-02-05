import { describe, expect, it } from "vitest";
import type { MethodAnalysis } from "../src/types.js";
import { validateMethod } from "../src/validators/index.js";

describe("validateMethod", () => {
    it("should pass for valid method with request and validateUsing", () => {
        const analysis: MethodAnalysis = {
            controller: "TestController",
            method: "index",
            filePath: "test.ts",
            line: 10,
            usesRequest: true,
            usesParams: false,
            hasValidateUsing: true,
            returnStatements: [
                {
                    line: 15,
                    type: "successResponse",
                    hasGenericType: true,
                    text: "this.successResponse<User[]>(users)",
                },
            ],
        };

        const result = validateMethod(analysis);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
    });

    it("should pass for valid method with params and AppErrors", () => {
        const analysis: MethodAnalysis = {
            controller: "TestController",
            method: "show",
            filePath: "test.ts",
            line: 20,
            usesRequest: false,
            usesParams: true,
            hasValidateUsing: false,
            returnStatements: [
                {
                    line: 23,
                    type: "errorResponse",
                    usesAppErrors: true,
                    text: "this.errorResponse(AppErrors.NOT_FOUND)",
                },
                {
                    line: 25,
                    type: "successResponse",
                    hasGenericType: true,
                    text: "this.successResponse<User>(user)",
                },
            ],
        };

        const result = validateMethod(analysis);
        // Should have 1 warning for params without validateUsing
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].severity).toBe("warning");
    });

    it("should fail for missing validateUsing", () => {
        const analysis: MethodAnalysis = {
            controller: "TestController",
            method: "store",
            filePath: "test.ts",
            line: 20,
            usesRequest: true,
            usesParams: false,
            hasValidateUsing: false,
            returnStatements: [],
        };

        const result = validateMethod(analysis);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe("validate-using");
        expect(result.violations[0].severity).toBe("error");
    });

    it("should fail for untyped successResponse", () => {
        const analysis: MethodAnalysis = {
            controller: "TestController",
            method: "show",
            filePath: "test.ts",
            line: 30,
            usesRequest: false,
            usesParams: true,
            hasValidateUsing: false,
            returnStatements: [
                {
                    line: 35,
                    type: "successResponse",
                    hasGenericType: false,
                    text: "this.successResponse(data)",
                },
            ],
        };

        const result = validateMethod(analysis);
        expect(result.passed).toBe(false);
        // Should have both warning for params and error for untyped successResponse
        expect(result.violations.length).toBeGreaterThanOrEqual(1);
        expect(result.violations.some((v) => v.rule === "success-response-typed")).toBe(true);
    });

    it("should fail for non-AppErrors errorResponse", () => {
        const analysis: MethodAnalysis = {
            controller: "TestController",
            method: "destroy",
            filePath: "test.ts",
            line: 40,
            usesRequest: false,
            usesParams: true,
            hasValidateUsing: false,
            returnStatements: [
                {
                    line: 45,
                    type: "errorResponse",
                    usesAppErrors: false,
                    text: "this.errorResponse({ status: 400 })",
                },
            ],
        };

        const result = validateMethod(analysis);
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.rule === "error-response-app-errors")).toBe(true);
    });

    it("should detect multiple violations in one method", () => {
        const analysis: MethodAnalysis = {
            controller: "TestController",
            method: "create",
            filePath: "test.ts",
            line: 50,
            usesRequest: true,
            usesParams: false,
            hasValidateUsing: false,
            returnStatements: [
                {
                    line: 55,
                    type: "errorResponse",
                    usesAppErrors: false,
                    text: "this.errorResponse({ status: 422, message: 'Error' })",
                },
                {
                    line: 58,
                    type: "successResponse",
                    hasGenericType: false,
                    text: "this.successResponse(data)",
                },
            ],
        };

        const result = validateMethod(analysis);
        expect(result.passed).toBe(false);
        // Should have 3 violations: missing validateUsing, untyped success, inline error
        expect(result.violations).toHaveLength(3);
        expect(result.violations.some((v) => v.rule === "validate-using")).toBe(true);
        expect(result.violations.some((v) => v.rule === "success-response-typed")).toBe(true);
        expect(result.violations.some((v) => v.rule === "error-response-app-errors")).toBe(true);
    });

    it("should handle methods with no return statements", () => {
        const analysis: MethodAnalysis = {
            controller: "TestController",
            method: "processAsync",
            filePath: "test.ts",
            line: 60,
            usesRequest: true,
            usesParams: false,
            hasValidateUsing: true,
            returnStatements: [],
        };

        const result = validateMethod(analysis);
        // No violations for missing return - that's a TypeScript error, not our concern
        expect(result.passed).toBe(true);
    });

    it("should handle mixed return types (successResponse + other)", () => {
        const analysis: MethodAnalysis = {
            controller: "TestController",
            method: "conditionalReturn",
            filePath: "test.ts",
            line: 70,
            usesRequest: false,
            usesParams: true,
            hasValidateUsing: false,
            returnStatements: [
                {
                    line: 73,
                    type: "successResponse",
                    hasGenericType: true,
                    text: "this.successResponse<User>(user)",
                },
                {
                    line: 75,
                    type: "other",
                    text: "{ id: 1, name: 'Test' }",
                },
            ],
        };

        const result = validateMethod(analysis);
        // Should have warning for params without validation
        // The "other" return is detected but not specifically validated here
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].severity).toBe("warning");
    });
});

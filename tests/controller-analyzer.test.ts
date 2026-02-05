import { describe, expect, it } from "vitest";
import { analyzeController } from "../src/parsers/controller-analyzer.js";
import type { MethodAnalysis } from "../src/types.js";

describe("analyzeController", () => {
    it("should detect request usage in valid controller", () => {
        const analyses = analyzeController(".", "tests/fixtures/valid-controller.ts");

        const indexMethod = analyses.get("index");
        expect(indexMethod).toBeDefined();
        expect(indexMethod?.usesRequest).toBe(true);
        expect(indexMethod?.usesParams).toBe(false);
    });

    it("should detect params usage in valid controller", () => {
        const analyses = analyzeController(".", "tests/fixtures/valid-controller.ts");

        const showMethod = analyses.get("show");
        expect(showMethod).toBeDefined();
        expect(showMethod?.usesParams).toBe(true);
        expect(showMethod?.usesRequest).toBe(false);
    });

    it("should detect validateUsing calls", () => {
        const analyses = analyzeController(".", "tests/fixtures/valid-controller.ts");

        const indexMethod = analyses.get("index");
        expect(indexMethod?.hasValidateUsing).toBe(true);

        const showMethod = analyses.get("show");
        expect(showMethod?.hasValidateUsing).toBe(false); // show method doesn't use request
    });

    it("should analyze return statements with generic types", () => {
        const analyses = analyzeController(".", "tests/fixtures/valid-controller.ts");

        const indexMethod = analyses.get("index");
        expect(indexMethod?.returnStatements).toHaveLength(1);
        expect(indexMethod?.returnStatements[0].type).toBe("successResponse");
        expect(indexMethod?.returnStatements[0].hasGenericType).toBe(true);
    });

    it("should detect AppErrors usage in errorResponse", () => {
        const analyses = analyzeController(".", "tests/fixtures/valid-controller.ts");

        const showMethod = analyses.get("show");
        expect(showMethod?.returnStatements).toHaveLength(2); // One error, one success

        const errorReturn = showMethod?.returnStatements.find((r) => r.type === "errorResponse");
        expect(errorReturn).toBeDefined();
        expect(errorReturn?.usesAppErrors).toBe(true);
    });

    it("should detect missing validateUsing in invalid controller", () => {
        const analyses = analyzeController(".", "tests/fixtures/invalid-controller.ts");

        const storeMethod = analyses.get("store");
        expect(storeMethod?.usesRequest).toBe(true);
        expect(storeMethod?.hasValidateUsing).toBe(false); // VIOLATION
    });

    it("should detect untyped successResponse in invalid controller", () => {
        const analyses = analyzeController(".", "tests/fixtures/invalid-controller.ts");

        const storeMethod = analyses.get("store");
        const successReturn = storeMethod?.returnStatements.find((r) => r.type === "successResponse");
        expect(successReturn?.hasGenericType).toBe(false); // VIOLATION
    });

    it("should detect inline error objects instead of AppErrors", () => {
        const analyses = analyzeController(".", "tests/fixtures/invalid-controller.ts");

        const destroyMethod = analyses.get("destroy");
        const errorReturn = destroyMethod?.returnStatements.find((r) => r.type === "errorResponse");
        expect(errorReturn?.usesAppErrors).toBe(false); // VIOLATION
    });

    it("should detect methods with both request and params", () => {
        const analyses = analyzeController(".", "tests/fixtures/invalid-controller.ts");

        const updateMethod = analyses.get("update");
        expect(updateMethod?.usesRequest).toBe(true);
        expect(updateMethod?.usesParams).toBe(true);
    });

    it("should detect non-standard return statements", () => {
        const analyses = analyzeController(".", "tests/fixtures/invalid-controller.ts");

        const getRawMethod = analyses.get("getRaw");
        expect(getRawMethod?.returnStatements).toHaveLength(1);
        expect(getRawMethod?.returnStatements[0].type).toBe("other"); // Raw object return
    });

    it("should handle methods with no return statement", () => {
        const analyses = analyzeController(".", "tests/fixtures/invalid-controller.ts");

        const processAsyncMethod = analyses.get("processAsync");
        expect(processAsyncMethod?.returnStatements).toHaveLength(0); // No return
    });

    it("should analyze all methods in a controller", () => {
        const analyses = analyzeController(".", "tests/fixtures/invalid-controller.ts");

        // Invalid controller has 14 methods
        expect(analyses.size).toBeGreaterThanOrEqual(14);
    });
});

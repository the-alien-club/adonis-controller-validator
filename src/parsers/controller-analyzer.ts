import { type ClassDeclaration, type MethodDeclaration, Project, SyntaxKind } from "ts-morph";
import type { MethodAnalysis, ReturnStatement } from "../types.js";

/**
 * Analyze a controller class and extract method information
 */
export function analyzeController(projectPath: string, controllerPath: string): Map<string, MethodAnalysis> {
    const project = new Project({
        tsConfigFilePath: `${projectPath}/tsconfig.json`,
    });

    const sourceFile = project.addSourceFileAtPath(controllerPath);
    const results = new Map<string, MethodAnalysis>();

    // Find the default export class
    const classDecl = sourceFile.getClasses().find((c) => c.isDefaultExport());
    if (!classDecl) return results;

    const className = classDecl.getName() || "UnknownController";

    // Analyze each method
    for (const method of classDecl.getMethods()) {
        const analysis = analyzeMethod(method, className, controllerPath);
        results.set(method.getName(), analysis);
    }

    return results;
}

function analyzeMethod(method: MethodDeclaration, className: string, filePath: string): MethodAnalysis {
    const methodName = method.getName();

    // Check if method uses request or params
    const usesRequest = checkUsesRequest(method);
    const usesParams = checkUsesParams(method);

    // Check for validateUsing call
    const hasValidateUsing = checkHasValidateUsing(method);

    // Analyze return statements
    const returnStatements = analyzeReturnStatements(method);

    return {
        controller: className,
        method: methodName,
        filePath,
        line: method.getStartLineNumber(),
        usesRequest,
        usesParams,
        hasValidateUsing,
        returnStatements,
    };
}

function checkUsesRequest(method: MethodDeclaration): boolean {
    // Check if 'request' is in the destructured HttpContext parameter
    const params = method.getParameters();
    if (params.length === 0) return false;

    const firstParam = params[0];
    const paramText = firstParam.getText();

    // Check for { request } or { request, ... } pattern
    return /\brequest\b/.test(paramText);
}

function checkUsesParams(method: MethodDeclaration): boolean {
    const params = method.getParameters();
    if (params.length === 0) return false;

    const firstParam = params[0];
    const paramText = firstParam.getText();

    return /\bparams\b/.test(paramText);
}

function checkHasValidateUsing(method: MethodDeclaration): boolean {
    const callExpressions = method.getDescendantsOfKind(SyntaxKind.CallExpression);

    return callExpressions.some((call) => {
        const text = call.getExpression().getText();
        return text.includes("validateUsing");
    });
}

function analyzeReturnStatements(method: MethodDeclaration): ReturnStatement[] {
    const returnStatements: ReturnStatement[] = [];
    const returns = method.getDescendantsOfKind(SyntaxKind.ReturnStatement);

    for (const ret of returns) {
        const expression = ret.getExpression();
        if (!expression) continue;

        const text = expression.getText();
        const line = ret.getStartLineNumber();

        if (text.includes("this.successResponse")) {
            returnStatements.push({
                line,
                type: "successResponse",
                hasGenericType: checkHasGenericType(text),
                text,
            });
        } else if (text.includes("this.errorResponse")) {
            returnStatements.push({
                line,
                type: "errorResponse",
                usesAppErrors: checkUsesAppErrors(text),
                text,
            });
        } else {
            returnStatements.push({
                line,
                type: "other",
                text,
            });
        }
    }

    return returnStatements;
}

function checkHasGenericType(text: string): boolean {
    // Check for successResponse<Type> pattern
    return /successResponse\s*<[^>]+>/.test(text);
}

function checkUsesAppErrors(text: string): boolean {
    // Check for AppErrors.SOMETHING pattern
    return /AppErrors\.\w+/.test(text);
}

// Fixture: A controller with various violations
import type { HttpContext } from "@adonisjs/core/http";
import BaseController from "./base_controller";

type User = { id: number; name: string };

export default class InvalidController extends BaseController {
    // VIOLATION 1: Missing validateUsing + untyped successResponse
    async store({ request }: HttpContext) {
        const data = request.body(); // BAD: no validator
        return this.successResponse(data); // BAD: no generic type
    }

    // VIOLATION 2: Missing validateUsing (using request.only instead)
    async update({ request, params }: HttpContext) {
        const data = request.only(["name", "email"]); // BAD: no validator
        return this.successResponse<User>({ id: 1, name: "Test" });
    }

    // VIOLATION 3: Untyped successResponse (even though validation is correct)
    async index({ request }: HttpContext) {
        const { page } = await request.validateUsing(someValidator);
        const users: User[] = [];
        return this.successResponse(users); // BAD: no generic type
    }

    // VIOLATION 4: errorResponse with inline object instead of AppErrors
    async destroy({ params }: HttpContext) {
        if (!params.id) {
            return this.errorResponse({ status: 400, message: "Bad" }); // BAD: not AppErrors
        }
        return this.successResponse<void>(undefined);
    }

    // VIOLATION 5: errorResponse with inline object (different pattern)
    async show({ params }: HttpContext) {
        if (!params.id) {
            return this.errorResponse({ code: "NOT_FOUND", status: 404 }); // BAD: not AppErrors
        }
        return this.successResponse<User>({ id: 1, name: "Test" });
    }

    // VIOLATION 6: Multiple issues - missing validateUsing + untyped success + inline error
    async create({ request }: HttpContext) {
        const data = request.all(); // BAD: no validator

        if (!data.name) {
            return this.errorResponse({ status: 422, message: "Name required" }); // BAD: not AppErrors
        }

        return this.successResponse({ id: 1, name: data.name }); // BAD: no generic type
    }

    // VIOLATION 7: Using params without validation (warning level)
    async findBySlug({ params }: HttpContext) {
        // Uses params but no validateUsing - should be warning
        const user = { id: 1, name: params.slug };
        return this.successResponse<User>(user);
    }

    // VIOLATION 8: Untyped successResponse with complex return
    async list({ request }: HttpContext) {
        const validated = await request.validateUsing(someValidator);
        const result = {
            data: [],
            meta: { page: 1, total: 0 },
        };
        return this.successResponse(result); // BAD: no generic type
    }

    // VIOLATION 9: Missing successResponse - returns raw object
    async getRaw({ params }: HttpContext) {
        const user = { id: 1, name: "Test" };
        return user; // BAD: should use this.successResponse<User>(user)
    }

    // VIOLATION 10: Missing errorResponse - returns raw response
    async checkAuth({ request }: HttpContext) {
        const token = request.header("authorization");
        if (!token) {
            return { error: "Unauthorized", status: 401 }; // BAD: should use this.errorResponse(AppErrors.UNAUTHORIZED)
        }
        return this.successResponse<{ valid: boolean }>({ valid: true });
    }

    // VIOLATION 11: Missing successResponse - returns response.json()
    async getJson({ response }: HttpContext) {
        const data = { message: "Hello" };
        return response.json(data); // BAD: should use this.successResponse<>()
    }

    // VIOLATION 12: Missing errorResponse - throws raw error instead of using errorResponse
    async validateData({ request }: HttpContext) {
        const data = request.all(); // BAD: missing validateUsing
        if (!data.email) {
            throw new Error("Email required"); // BAD: should use this.errorResponse(AppErrors.VALIDATION_ERROR)
        }
        return this.successResponse({ message: "Valid" }); // BAD: missing generic type
    }

    // VIOLATION 13: Missing successResponse - returns void/nothing
    async processAsync({ request }: HttpContext) {
        const data = await request.validateUsing(someValidator);
        // Process data...
        // BAD: no return statement, should return this.successResponse<void>(undefined)
    }

    // VIOLATION 14: Mixed return types - sometimes successResponse, sometimes raw
    async conditionalReturn({ params }: HttpContext) {
        if (params.format === "json") {
            return this.successResponse<User>({ id: 1, name: "Test" }); // GOOD
        }
        return { id: 1, name: "Test" }; // BAD: inconsistent, should use successResponse
    }
}

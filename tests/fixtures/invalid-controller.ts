// Fixture: A controller with various violations
import type { HttpContext } from "@adonisjs/core/http";
import BaseController from "./base_controller";

export default class InvalidController extends BaseController {
    // Violation: Missing validateUsing
    async store({ request }: HttpContext) {
        const data = request.body(); // BAD: no validator
        return this.successResponse(data); // BAD: no generic type
    }

    // Violation: Inline error object
    async destroy({ params }: HttpContext) {
        if (!params.id) {
            return this.errorResponse({ status: 400, message: "Bad" }); // BAD: not AppErrors
        }
        return this.successResponse<void>(undefined);
    }
}

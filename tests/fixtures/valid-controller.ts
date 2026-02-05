// Fixture: A controller that passes all validations
import type { HttpContext } from "@adonisjs/core/http";
import BaseController from "./base_controller";
import { AppErrors } from "./errors";
import { userValidator } from "./validators";

type User = { id: number; name: string };

export default class ValidController extends BaseController {
    async index({ request }: HttpContext) {
        const { page } = await request.validateUsing(userValidator);
        const users: User[] = [];
        return this.successResponse<User[]>(users);
    }

    async show({ params }: HttpContext) {
        if (!params.id) {
            return this.errorResponse(AppErrors.NOT_FOUND);
        }
        const user: User = { id: 1, name: "Test" };
        return this.successResponse<User>(user);
    }
}

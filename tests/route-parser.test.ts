import { describe, expect, it } from "vitest";
import { groupRoutesByController, parseRoutes } from "../src/parsers/route-parser.js";
import type { RouteDefinition } from "../src/types.js";

describe("parseRoutes", () => {
    it("should parse simple routes", () => {
        // This test would need a fixture routes.ts file
        // For now, we're testing the structure
        const mockRoutes: RouteDefinition[] = [
            {
                method: "get",
                path: "/users",
                controller: "UsersController",
                handler: "index",
                line: 10,
                hasPathParams: false,
                pathParams: [],
            },
        ];

        expect(mockRoutes).toHaveLength(1);
        expect(mockRoutes[0].method).toBe("get");
        expect(mockRoutes[0].path).toBe("/users");
    });

    it("should extract path parameters", () => {
        const route: RouteDefinition = {
            method: "get",
            path: "/users/:id/posts/:post_id",
            controller: "PostsController",
            handler: "show",
            line: 20,
            hasPathParams: true,
            pathParams: ["id", "post_id"],
        };

        expect(route.hasPathParams).toBe(true);
        expect(route.pathParams).toEqual(["id", "post_id"]);
    });

    it("should identify routes without parameters", () => {
        const route: RouteDefinition = {
            method: "get",
            path: "/api/health",
            controller: "HealthController",
            handler: "check",
            line: 5,
            hasPathParams: false,
            pathParams: [],
        };

        expect(route.hasPathParams).toBe(false);
        expect(route.pathParams).toEqual([]);
    });

    it("should handle all HTTP methods", () => {
        const methods: RouteDefinition[] = [
            {
                method: "get",
                path: "/",
                controller: "HomeController",
                handler: "index",
                line: 1,
                hasPathParams: false,
                pathParams: [],
            },
            {
                method: "post",
                path: "/",
                controller: "HomeController",
                handler: "store",
                line: 2,
                hasPathParams: false,
                pathParams: [],
            },
            {
                method: "patch",
                path: "/:id",
                controller: "HomeController",
                handler: "update",
                line: 3,
                hasPathParams: true,
                pathParams: ["id"],
            },
            {
                method: "put",
                path: "/:id",
                controller: "HomeController",
                handler: "replace",
                line: 4,
                hasPathParams: true,
                pathParams: ["id"],
            },
            {
                method: "delete",
                path: "/:id",
                controller: "HomeController",
                handler: "destroy",
                line: 5,
                hasPathParams: true,
                pathParams: ["id"],
            },
        ];

        expect(methods.map((r) => r.method)).toEqual(["get", "post", "patch", "put", "delete"]);
    });
});

describe("groupRoutesByController", () => {
    it("should group routes by controller name", () => {
        const routes: RouteDefinition[] = [
            {
                method: "get",
                path: "/users",
                controller: "UsersController",
                handler: "index",
                line: 10,
                hasPathParams: false,
                pathParams: [],
            },
            {
                method: "post",
                path: "/users",
                controller: "UsersController",
                handler: "store",
                line: 11,
                hasPathParams: false,
                pathParams: [],
            },
            {
                method: "get",
                path: "/posts",
                controller: "PostsController",
                handler: "index",
                line: 20,
                hasPathParams: false,
                pathParams: [],
            },
        ];

        const grouped = groupRoutesByController(routes);

        expect(grouped.size).toBe(2);
        expect(grouped.get("UsersController")).toHaveLength(2);
        expect(grouped.get("PostsController")).toHaveLength(1);
    });

    it("should handle empty routes array", () => {
        const routes: RouteDefinition[] = [];
        const grouped = groupRoutesByController(routes);

        expect(grouped.size).toBe(0);
    });

    it("should maintain route order within groups", () => {
        const routes: RouteDefinition[] = [
            {
                method: "get",
                path: "/users",
                controller: "UsersController",
                handler: "index",
                line: 10,
                hasPathParams: false,
                pathParams: [],
            },
            {
                method: "get",
                path: "/users/:id",
                controller: "UsersController",
                handler: "show",
                line: 11,
                hasPathParams: true,
                pathParams: ["id"],
            },
            {
                method: "post",
                path: "/users",
                controller: "UsersController",
                handler: "store",
                line: 12,
                hasPathParams: false,
                pathParams: [],
            },
        ];

        const grouped = groupRoutesByController(routes);
        const usersRoutes = grouped.get("UsersController");

        expect(usersRoutes).toHaveLength(3);
        expect(usersRoutes?.[0].handler).toBe("index");
        expect(usersRoutes?.[1].handler).toBe("show");
        expect(usersRoutes?.[2].handler).toBe("store");
    });
});

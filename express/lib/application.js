/**
 * BSD 2-Clause License
 *
 * Copyright (c) 2025, Qiu Yixiang
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// dependencies
import http from "http";
import { match } from "path-to-regexp";

// built-in middlewares
import requestDefaultMiddleware from "./request.js";
import responseDefaultMiddleware from "./response.js";

// used for route matching in hash
const METHODS = {
    GET: "GET",
    POST: "POST",
    PATCH: "PATCH",
    PUT: "PUT",
    DELETE: "DELETE",
};

/**
 * @typedef {Object} Application
 * @property {Map<string, Array<Function>>} __routes
 * @property {Server} __server
 */

class _Application {
    constructor() {
        this.__server = http.createServer(this.#_serverHandler);
        this.__routes = new Map();
    }

    /**
     * @param {string} url the url to be sanitized
     * @param {string} method one of the methods in METHODS
     * @returns {string} a sanitized url
     *
     * @usage: / -> //GET
     *         /api/v1 -> /api/v1/GET
     *         /api/v1/users?id=1 -> /api/v1/users/GET
     */
    #_sanitizeUrl = (url, method) => {
        const removedLeadingSlash = url.split("/").slice(1);

        const lastParam = removedLeadingSlash[removedLeadingSlash.length - 1];
        if (lastParam.includes("?")) {
            removedLeadingSlash.pop();
            removedLeadingSlash.push(lastParam.split("?")[0]);
        }

        const fullUrl = removedLeadingSlash.join("/");
        return `/${fullUrl}/${method.toUpperCase()}`;
    };

    /**
     * @param {string} sanitizedUrl the sanitized url to be matched
     * @returns {Object|null} the matched route and its params, or null if no match is found
     */
    #_matchUrl = (sanitizedUrl) => {
        for (const path of this.__routes.keys()) {
            const routeRegex = match(path, {
                decode: decodeURIComponent,
            });
            const matchResult = routeRegex(sanitizedUrl);

            if (matchResult) {
                return path;
            }
        }

        return null;
    };

    #_invokeMiddlewares = async (request, response, middlewares) => {
        if (middlewares.length === 0) {
            return;
        }
        const [currentMiddleware, ...restMiddlewares] = middlewares;
        const next = async () => {
            await this.#_invokeMiddlewares(request, response, restMiddlewares);
        };
        return currentMiddleware(request, response, next);
    };

    #_serverHandler = async (request, response) => {
        const sanitizedUrl = this.#_sanitizeUrl(request.url, request.method);
        const matchedRoute = this.#_matchUrl(sanitizedUrl);

        if (matchedRoute) {
            const path = matchedRoute;
            const userMiddlewares = this.__routes.get(path) || [];
            const middlewares = [
                requestDefaultMiddleware(this.__routes),
                responseDefaultMiddleware,
                ...userMiddlewares,
            ];

            await this.#_invokeMiddlewares(request, response, middlewares);
        } else {
            response.statusCode = 404;
            response.end("Not Found");
        }
    };

    get = (path, ...handlers) => {
        const currentHandlers =
            this.__routes.get(`${path}/${METHODS.GET}`) || [];
        this.__routes.set(`${path}/${METHODS.GET}`, [
            ...currentHandlers,
            ...handlers,
        ]);
    };

    post = (path, ...handlers) => {
        const currentHandlers =
            this.__routes.get(`${path}/${METHODS.POST}`) || [];
        this.__routes.set(`${path}/${METHODS.POST}`, [
            ...currentHandlers,
            ...handlers,
        ]);
    };

    patch = (path, ...handlers) => {
        const currentHandlers =
            this.__routes.get(`${path}/${METHODS.PATCH}`) || [];
        this.__routes.set(`${path}/${METHODS.PATCH}`, [
            ...currentHandlers,
            ...handlers,
        ]);
    };

    put = (path, ...handlers) => {
        const currentHandlers =
            this.__routes.get(`${path}/${METHODS.PUT}`) || [];
        this.__routes.set(`${path}/${METHODS.PUT}`, [
            ...currentHandlers,
            ...handlers,
        ]);
    };

    delete = (path, ...handlers) => {
        const currentHandlers =
            this.__routes.get(`${path}/${METHODS.DELETE}`) || [];
        this.__routes.set(`${path}/${METHODS.DELETE}`, [
            ...currentHandlers,
            ...handlers,
        ]);
    };

    listen = (port, callback) => {
        this.__server.listen(port, callback);
    };
}

export default _Application;

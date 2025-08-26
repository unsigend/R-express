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

import { match } from "path-to-regexp";

const Request = {
    getQuery: (request) => {
        const url = request.url.split("?")[1];
        if (!url) {
            return Object.create(null);
        }
        const queryList = url.split("&");
        const query = Object.create(null);
        for (const queryItem of queryList) {
            const [key, value = ""] = queryItem.split("=");
            query[decodeURIComponent(key)] = decodeURIComponent(value);
        }
        return query;
    },

    getParams: (request, routes) => {
        const removedLeadingSlash = request.url.split("/").slice(1);

        const lastParam = removedLeadingSlash[removedLeadingSlash.length - 1];
        if (lastParam.includes("?")) {
            removedLeadingSlash.pop();
            removedLeadingSlash.push(lastParam.split("?")[0]);
        }

        const fullUrl = `/${removedLeadingSlash.join(
            "/"
        )}/${request.method.toUpperCase()}`;

        for (const path of routes.keys()) {
            const routeRegex = match(path, {
                decode: decodeURIComponent,
            });
            const matchResult = routeRegex(fullUrl);

            if (matchResult) {
                return Object.assign(Object.create(null), matchResult.params);
            }
        }
        return Object.create(null);
    },
};

const requestDefaultMiddleware = (routes) => {
    const middleware = (request, response, next) => {
        request.query = Request.getQuery(request);
        request.params = Request.getParams(request, routes);
        next();
    };
    return middleware;
};

export default requestDefaultMiddleware;

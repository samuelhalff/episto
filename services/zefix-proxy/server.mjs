/* global fetch, URL, AbortSignal, process, Buffer, console */

import { createServer } from "node:http";

const bind = process.env.ZEFIX_PROXY_BIND ?? "0.0.0.0";
const port = Number.parseInt(process.env.ZEFIX_PROXY_PORT ?? "8081", 10);
const upstreamBaseUrl = process.env.ZEFIX_BASE_URL ?? "https://www.zefix.admin.ch";
const companySearchPath =
  process.env.ZEFIX_COMPANY_SEARCH_PATH ?? "/ZefixPublicREST/api/v1/company/search";
const companySearchMethod = (process.env.ZEFIX_COMPANY_SEARCH_METHOD ?? "POST").toUpperCase();
const companyUidPath = process.env.ZEFIX_COMPANY_UID_PATH ?? "/ZefixPublicREST/api/v1/company/uid/";
const companyEhraidPath = process.env.ZEFIX_COMPANY_EHRAID_PATH ?? "/ZefixPublicREST/api/v1/company/ehraid/";
const companyChidPath = process.env.ZEFIX_COMPANY_CHID_PATH ?? "/ZefixPublicREST/api/v1/company/chid/";
const username = process.env.ZEFIX_USERNAME;
const password = process.env.ZEFIX_PASSWORD;
const requestTimeoutMs = Number.parseInt(process.env.ZEFIX_PROXY_TIMEOUT_MS ?? "10000", 10);

if (!username || !password) {
  throw new Error("ZEFIX_USERNAME and ZEFIX_PASSWORD are required");
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function authHeader() {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function proxyCompanySearch(request, response) {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const upstreamUrl = new URL(companySearchPath, upstreamBaseUrl);
  const searchPayload = Object.fromEntries(requestUrl.searchParams.entries());

  if (!searchPayload.name) {
    return json(response, 400, {
      error: {
        code: "ZEFIX_NAME_REQUIRED",
        message: "Query parameter 'name' is required.",
      },
    });
  }

  try {
    const requestInit = {
      method: companySearchMethod,
      headers: {
        accept: "application/json",
        authorization: authHeader(),
      },
      signal: AbortSignal.timeout(requestTimeoutMs),
    };

    if (companySearchMethod === "GET") {
      for (const [key, value] of Object.entries(searchPayload)) {
        upstreamUrl.searchParams.append(key, value);
      }
    } else {
      requestInit.headers["content-type"] = "application/json";
      requestInit.body = JSON.stringify(searchPayload);
    }

    const upstreamResponse = await fetch(upstreamUrl, {
      ...requestInit,
    });

    const responseText = await upstreamResponse.text();
    response.writeHead(upstreamResponse.status, {
      "content-type":
        upstreamResponse.headers.get("content-type") ?? "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(responseText);
  } catch (error) {
    return json(response, 502, {
      error: {
        code: "ZEFIX_PROXY_UPSTREAM_FAILED",
        message: error instanceof Error ? error.message : "Unknown upstream error",
      },
    });
  }
}

async function proxyCompanyDetails(request, response) {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const uid = requestUrl.searchParams.get("uid");
  const ehraid = requestUrl.searchParams.get("ehraid");
  const chid = requestUrl.searchParams.get("chid");

  const identifier =
    uid ? { path: companyUidPath, value: uid } :
    ehraid ? { path: companyEhraidPath, value: ehraid } :
    chid ? { path: companyChidPath, value: chid } :
    null;

  if (!identifier) {
    return json(response, 400, {
      error: {
        code: "ZEFIX_COMPANY_IDENTIFIER_REQUIRED",
        message: "Query parameter 'uid', 'ehraid', or 'chid' is required.",
      },
    });
  }

  const upstreamUrl = new URL(`${identifier.path}${encodeURIComponent(identifier.value)}`, upstreamBaseUrl);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: authHeader(),
      },
      signal: AbortSignal.timeout(requestTimeoutMs),
    });

    const responseText = await upstreamResponse.text();
    response.writeHead(upstreamResponse.status, {
      "content-type":
        upstreamResponse.headers.get("content-type") ?? "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(responseText);
  } catch (error) {
    return json(response, 502, {
      error: {
        code: "ZEFIX_PROXY_UPSTREAM_FAILED",
        message: error instanceof Error ? error.message : "Unknown upstream error",
      },
    });
  }
}

const server = createServer(async (request, response) => {
  if (!request.url || !request.method) {
    return json(response, 400, {
      error: {
        code: "ZEFIX_PROXY_BAD_REQUEST",
        message: "Missing request URL or method.",
      },
    });
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    return json(response, 200, {
      ok: true,
      upstreamBaseUrl,
      companySearchPath,
      companySearchMethod,
      companyUidPath,
      companyEhraidPath,
      companyChidPath,
    });
  }

  if (request.method === "GET" && requestUrl.pathname === "/company-search") {
    return proxyCompanySearch(request, response);
  }

  if (request.method === "GET" && requestUrl.pathname === "/company-details") {
    return proxyCompanyDetails(request, response);
  }

  return json(response, 404, {
    error: {
      code: "ZEFIX_PROXY_NOT_FOUND",
      message: "Route not found.",
    },
  });
});

server.listen(port, bind, () => {
  console.log(`zefix-proxy listening on http://${bind}:${port}`);
});

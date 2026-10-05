const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const loadEnv = () => {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return {};

  return fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return env;

      const separator = trimmed.indexOf("=");
      if (separator === -1) return env;

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      env[key] = value.replace(/^["']|["']$/g, "");
      return env;
    }, {});
};

const env = { ...loadEnv(), ...process.env };

const bitrixConfig = {
  webhookBaseUrl: env.BITRIX_WEBHOOK_BASE_URL || "",
  dealCategoryId: Number(env.BITRIX_DEAL_CATEGORY_ID || 0),
  dealStageId: env.BITRIX_DEAL_STAGE_ID || "NEW",
  currency: env.BITRIX_CURRENCY || "RUB",
  sourceId: env.BITRIX_SOURCE_ID || "WEB",
};

const sendJson = (response, statusCode, data) => {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
};

const readJsonBody = (request) =>
  new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Слишком большой запрос"));
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Некорректный JSON"));
      }
    });
  });

const callBitrix = async (method, payload) => {
  if (!/^https?:\/\//i.test(bitrixConfig.webhookBaseUrl)) {
    throw new Error(
      "В .env нужен полный URL вебхука Bitrix24: https://ваш-домен.bitrix24.ru/rest/USER_ID/WEBHOOK_KEY/"
    );
  }

  const baseUrl = bitrixConfig.webhookBaseUrl.endsWith("/")
    ? bitrixConfig.webhookBaseUrl
    : `${bitrixConfig.webhookBaseUrl}/`;

  const response = await fetch(`${baseUrl}${method}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Bitrix24 не принял заявку");
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  return data.result;
};

const createBitrixDeal = async ({ name, phone, email, calculation, total }) => {
  if (!bitrixConfig.webhookBaseUrl) {
    throw new Error("В .env не указан BITRIX_WEBHOOK_BASE_URL");
  }

  const contactId = await callBitrix("crm.contact.add", {
    fields: {
      NAME: name,
      PHONE: [{ VALUE: phone, VALUE_TYPE: "WORK" }],
      EMAIL: [{ VALUE: email, VALUE_TYPE: "WORK" }],
      SOURCE_ID: bitrixConfig.sourceId,
    },
  });

  const dealId = await callBitrix("crm.deal.add", {
    fields: {
      TITLE: `Обратный вызов: ${name}`,
      CONTACT_ID: contactId,
      COMMENTS: `Заявка с сайта Северная пилорама\n\n${calculation || "Расчет не приложен."}`,
      OPPORTUNITY: Math.round(Number(total) || 0),
      CURRENCY_ID: bitrixConfig.currency,
      SOURCE_ID: bitrixConfig.sourceId,
      CATEGORY_ID: bitrixConfig.dealCategoryId,
      STAGE_ID: bitrixConfig.dealStageId,
    },
  });

  return { dealId, contactId };
};

const handleCallback = async (request, response) => {
  try {
    const body = await readJsonBody(request);
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();

    if (!name || !phone || !email) {
      sendJson(response, 400, { ok: false, error: "Заполните имя, телефон и почту" });
      return;
    }

    const result = await createBitrixDeal({
      name,
      phone,
      email,
      calculation: String(body.calculation || ""),
      total: body.total,
    });

    sendJson(response, 200, { ok: true, ...result });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error.message });
  }
};

const serveStatic = (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const normalizedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(root, normalizedPath));

  if (!filePath.startsWith(root) || path.basename(filePath) === ".env") {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  });
};

const server = http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/callback") {
    handleCallback(request, response);
    return;
  }

  if (request.method === "GET") {
    serveStatic(request, response);
    return;
  }

  response.writeHead(405);
  response.end("Method not allowed");
});

server.listen(port, () => {
  console.log(`Сайт запущен: http://localhost:${port}`);
});

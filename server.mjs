import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 5173);
const feishuBaseUrl = "https://open.feishu.cn/open-apis";
const tenantTokenState = {
  token: "",
  expiresAt: 0,
};

loadEnvFile();

let vite;
if (!isProduction) {
  const { createServer: createViteServer } = await import("vite");
  vite = await createViteServer({
    root: rootDir,
    server: { middlewareMode: true },
    appType: "spa",
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/api/reservations" && req.method === "POST") {
      await handleReservationCreate(req, res);
      return;
    }

    if (url.pathname === "/api/health" && req.method === "GET") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (vite) {
      vite.middlewares(req, res, (error) => {
        if (error) {
          vite.ssrFixStacktrace(error);
          sendJson(res, 500, { error: "开发服务器异常" });
        }
      });
      return;
    }

    await serveStaticAsset(url.pathname, res);
  } catch (error) {
    console.error("[server] request failed", error);
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    const message = statusCode >= 500 ? "服务暂时不可用，请稍后再试" : error.message;
    sendJson(res, statusCode, { error: message });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server ready on http://localhost:${port}`);
});

async function handleReservationCreate(req, res) {
  const payload = await readJsonBody(req);
  const reservation = normalizeReservation(payload);
  const fields = buildReservationFields(reservation);
  const appToken = requiredEnv("FEISHU_BITABLE_APP_TOKEN");
  const tableId = requiredEnv("FEISHU_RESERVATIONS_TABLE_ID");
  const record = await createBitableRecord(appToken, tableId, fields);

  sendJson(res, 201, {
    ok: true,
    recordId: record.record_id,
  });
}

function normalizeReservation(payload) {
  const data = payload && typeof payload === "object" ? payload : {};
  const reservation = {
    time: toCleanString(data.time),
    wechatName: toCleanString(data.wechatName),
    wechatId: toCleanString(data.wechatId),
    storeName: toCleanString(data.storeName),
    isEmployed: data.isEmployed === "是" ? "是" : data.isEmployed === "否" ? "否" : "",
    note: toCleanString(data.note),
  };

  const missing = [];
  if (!reservation.time) missing.push("时间");
  if (!reservation.wechatName) missing.push("微信昵称");
  if (!reservation.wechatId) missing.push("微信号");
  if (!reservation.storeName) missing.push("入店昵称");
  if (!reservation.isEmployed) missing.push("是否已入职");

  if (missing.length > 0) {
    const error = new Error(`缺少必填项：${missing.join("、")}`);
    error.statusCode = 400;
    throw error;
  }

  return reservation;
}

function buildReservationFields(reservation) {
  return {
    "时间": parseDateToTimestamp(reservation.time),
    "微信昵称": reservation.wechatName,
    "微信号": reservation.wechatId,
    "入店昵称": reservation.storeName,
    "是否已入职": reservation.isEmployed,
    "备注（文字）": reservation.note,
  };
}

function parseDateToTimestamp(value) {
  const normalized = value.trim().replaceAll("/", "-");
  const dateOnlyMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    const error = new Error("时间格式无效，请使用 YYYY/MM/DD");
    error.statusCode = 400;
    throw error;
  }

  return date.getTime();
}

async function createBitableRecord(appToken, tableId, fields) {
  const token = await getTenantAccessToken();
  const data = await feishuRequest(
    `/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ fields }),
    },
  );

  return data.record;
}

async function getTenantAccessToken() {
  const now = Date.now();
  if (tenantTokenState.token && tenantTokenState.expiresAt - now > 5 * 60 * 1000) {
    return tenantTokenState.token;
  }

  const data = await feishuRequest("/auth/v3/tenant_access_token/internal/", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: requiredEnv("FEISHU_APP_ID"),
      app_secret: requiredEnv("FEISHU_APP_SECRET"),
    }),
  }, { returnRoot: true, skipAuthErrorRedaction: true });

  tenantTokenState.token = data.tenant_access_token;
  tenantTokenState.expiresAt = now + Math.max(0, Number(data.expire || 0) - 300) * 1000;
  return tenantTokenState.token;
}

async function feishuRequest(path, init, options = {}) {
  const response = await fetch(`${feishuBaseUrl}${path}`, init);
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.code !== 0) {
    const message = typeof body.msg === "string" && body.msg ? body.msg : "Feishu API request failed";
    const error = new Error(message);
    error.statusCode = response.status >= 400 && response.status < 500 ? 502 : 503;
    error.feishuCode = body.code;
    if (!options.skipAuthErrorRedaction) {
      console.error("[feishu] request failed", {
        path,
        status: response.status,
        code: body.code,
        msg: body.msg,
        logId: body.error?.log_id,
      });
    }
    throw error;
  }

  return options.returnRoot ? body : body.data || {};
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) {
      const error = new Error("提交内容过大");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("提交格式无效");
    error.statusCode = 400;
    throw error;
  }
}

async function serveStaticAsset(pathname, res) {
  const distDir = join(rootDir, "dist");
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(distDir, safePath);

  if (!existsSync(filePath)) {
    filePath = join(distDir, "index.html");
  }

  res.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
  createReadStream(filePath).pipe(res);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function toCleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`服务端缺少环境变量：${name}`);
    error.statusCode = 500;
    throw error;
  }
  return value;
}

function contentTypeFor(filePath) {
  const types = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon",
  };
  return types[extname(filePath)] || "application/octet-stream";
}

function loadEnvFile() {
  const envPath = join(rootDir, ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (!key || process.env[key]) continue;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const modelFallback = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }
  return JSON.parse(body || "{}");
}

async function handleCoach(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    sendJson(res, 501, { error: "OPENAI_API_KEY is not set" });
    return;
  }

  try {
    const { prompt, model } = await readJson(req);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || modelFallback,
        input: [
          {
            role: "system",
            content:
              "你是一位女性減脂陪跑AI教練。你的核心任務是幫使用者建立 adherence 長期執行能力。請依照啟發、動力、意圖、紀律、習慣、熱情六階段心理模型回應。狀態好時推進計畫，狀態差時啟動最低標準模式，失誤時提醒下一餐回正軌。避免羞辱、恐嚇與極端節食，回覆要自然、務實、溫柔、有界線。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      sendJson(res, response.status, { error: await response.text() });
      return;
    }

    const data = await response.json();
    const reply =
      data.output_text ||
      data.output
        ?.flatMap((item) => item.content || [])
        ?.map((content) => content.text)
        ?.filter(Boolean)
        ?.join("\n") ||
      "";

    sendJson(res, 200, { reply });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(root, requestedPath));
  const relativePath = path.relative(root, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
    });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/coach") {
    handleCoach(req, res);
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(port, () => {
  console.log(`AI減脂陪跑助手：http://localhost:${port}`);
});

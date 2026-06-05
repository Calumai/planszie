const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "";
const isOpenRouter = apiKey.startsWith("sk-or-") || Boolean(process.env.OPENROUTER_API_KEY);
const modelFallback =
  process.env.OPENAI_MODEL || process.env.OPENROUTER_MODEL || (isOpenRouter ? "openai/gpt-4.1-mini" : "gpt-4.1-mini");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
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

function buildCoachRequest(prompt, model) {
  const systemPrompt =
    "你是減脂陪跑 AI 教練。以長期可持續執行為核心，回答要專業、溫和、務實，不羞辱、不恐嚇、不鼓勵極端節食。";
  const selectedModel =
    isOpenRouter && model && !model.includes("/") ? `openai/${model}` : model || modelFallback;

  if (isOpenRouter) {
    return {
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      body: {
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      },
      headers: {
        "HTTP-Referer": "https://calumai.github.io/planszie/",
        "X-Title": "AI Fat Loss Companion",
      },
    };
  }

  return {
    endpoint: "https://api.openai.com/v1/responses",
    body: {
      model: selectedModel,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    },
    headers: {},
  };
}

async function handleCoach(req, res) {
  if (!apiKey) {
    sendJson(res, 501, { error: "OPENROUTER_API_KEY or OPENAI_API_KEY is not set" });
    return;
  }

  try {
    const { prompt, model } = await readJson(req);
    const coachRequest = buildCoachRequest(prompt, model);
    const response = await fetch(coachRequest.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...coachRequest.headers,
      },
      body: JSON.stringify(coachRequest.body),
    });

    if (!response.ok) {
      sendJson(res, response.status, { error: await response.text() });
      return;
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
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
  console.log(`AI fat loss companion running at http://localhost:${port}`);
});

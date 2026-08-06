import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the management game shell and metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>蛊界：逆命 · 月兰蛊坊经营模拟<\/title>/);
  assert.match(html, /十二旬内经营月兰田、派遣人员、炼蛊交易并左右三方势力/);
  assert.match(html, /正在展开经营账册/);
  assert.match(html, /og:image/);
});

test("keeps the twelve-turn management systems and responsive UI in source", async () => {
  const [page, css, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /const PRICE_CURVE/);
  assert.match(page, /const EVENTS/);
  assert.match(page, /const settleTurn/);
  assert.match(page, /三阶段精炼/);
  assert.match(page, /localStorage\.setItem\("gu-workshop-management-v1"/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.management-grid/);
  assert.match(layout, /images: \[\{ url: "\/og\.png"/);
});

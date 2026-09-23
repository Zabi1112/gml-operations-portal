const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createContractRouter } = require("../src/routes/contract.routes");
test("HTTP authorization isolates contract management from public signing", async t => {
  const app = express(); app.use(express.json());
  const calls = [];
  const service = Object.fromEntries(["publicGet", "respond", "list", "create", "detail", "cancel"].map(name => [name, async () => { calls.push(name); return { ok: true }; }]));
  const authenticate = (req, res, next) => { if (!req.headers["x-test-role"]) return res.sendStatus(401); req.user = { role: req.headers["x-test-role"], id: 7 }; next(); };
  app.use("/contracts", createContractRouter(service, authenticate));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = "http://127.0.0.1:" + server.address().port;
  for (const [path, method] of [["/contracts", "GET"], ["/contracts", "POST"], ["/contracts/1", "GET"], ["/contracts/1/cancel", "POST"]]) {
    assert.equal((await fetch(url + path, { method })).status, 401);
    assert.equal((await fetch(url + path, { method, headers: { "x-test-role": "VIEWER" } })).status, 403);
  }
  assert.deepEqual(calls, []);
  for (const role of ["ADMIN", "MANAGER", "EDITOR"]) assert.equal((await fetch(url + "/contracts", { headers: { "x-test-role": role } })).status, 200);
  const publicRead = await fetch(url + "/contracts/public/" + "a".repeat(64));
  assert.equal(publicRead.status, 200); assert.equal(publicRead.headers.get("cache-control"), "no-store");
  assert.equal((await fetch(url + "/contracts/public/" + "a".repeat(64) + "/respond", { method: "POST" })).status, 200);
  assert.ok(calls.includes("publicGet")); assert.ok(calls.includes("respond"));
});

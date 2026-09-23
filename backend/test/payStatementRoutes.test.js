const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createPayStatementRouter } = require("../src/routes/payStatement.routes");
test("HTTP authorization protects every pay-statement endpoint", async t => {
  const app = express(); app.use(express.json());
  const calls = [];
  const service = Object.fromEntries(["preview", "list", "save", "detail"].map(name => [name, async () => { calls.push(name); return { ok: true }; }]));
  const authenticate = (req, res, next) => { if (!req.headers["x-test-role"]) return res.sendStatus(401); req.user = { role: req.headers["x-test-role"], id: 7 }; next(); };
  app.use("/pay-statements", createPayStatementRouter(service, authenticate));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = "http://127.0.0.1:" + server.address().port;
  for (const [path, method] of [["/pay-statements", "GET"], ["/pay-statements", "POST"], ["/pay-statements/preview", "POST"], ["/pay-statements/1", "GET"], ["/pay-statements/1", "PATCH"]]) {
    assert.equal((await fetch(url + path, { method })).status, 401);
    assert.equal((await fetch(url + path, { method, headers: { "x-test-role": "VIEWER" } })).status, 403);
  }
  assert.deepEqual(calls, []);
  for (const role of ["ADMIN", "MANAGER", "EDITOR"]) assert.equal((await fetch(url + "/pay-statements", { headers: { "x-test-role": role } })).status, 200);
  assert.equal(calls.length, 3);
});

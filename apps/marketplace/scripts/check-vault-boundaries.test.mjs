import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const checker = fileURLToPath(
  new URL("./check-vault-boundaries.mjs", import.meta.url),
);

function runFixture(files, rootSymlink) {
  const directory = mkdtempSync(path.join(tmpdir(), "vault-boundary-test-"));
  const external = rootSymlink
    ? mkdtempSync(path.join(tmpdir(), "vault-boundary-external-"))
    : null;
  try {
    for (const [name, content] of Object.entries(files)) {
      const target = path.join(directory, name);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
    if (external) {
      writeFileSync(
        path.join(external, "fixture.txt"),
        "outside the scan root",
      );
      symlinkSync(external, path.join(directory, rootSymlink), "dir");
    }
    const result = spawnSync(process.execPath, [checker, "--root", directory], {
      encoding: "utf8",
      timeout: 15_000,
    });
    assert.equal(result.error, undefined);
    return {
      status: result.status,
      output: `${result.stdout}${result.stderr}`,
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
    if (external) rmSync(external, { recursive: true, force: true });
  }
}

function rejected(files, rule, filename) {
  const result = runFixture(files);
  assert.equal(result.status, 1, result.output);
  assert.ok(result.output.includes(rule), result.output);
  assert.ok(result.output.includes(filename), result.output);
  return result;
}

test("allows type-only imports, re-exports and import types from private modules", () => {
  const result = runFixture({
    "src/client.tsx": `"use client"; import type { Row } from "@/lib/vault-store"; import { type Report } from "./bridge"; export type { Row } from "@/lib/vault-store"; export { type Report } from "./bridge"; type Lazy = import("@/lib/rights-check").Report;`,
    "src/bridge.ts": `export type { Report } from "./lib/rights-check";`,
    "src/lib/vault-store.ts": `import fs from "node:fs"; export type Row = { id: string };`,
    "src/lib/rights-check.ts": `export type Report = { ok: boolean };`,
  });
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /限定/);
});

test("rejects source/public scan root symlinks before following their targets", () => {
  for (const folder of ["public", "src"]) {
    const result = runFixture({}, folder);
    assert.equal(result.status, 1, result.output);
    assert.ok(
      result.output.includes(
        `${folder === "public" ? "public" : "source"}-symlink: ${folder}`,
      ),
      result.output,
    );
    assert.ok(
      !result.output.includes("fixture.txt"),
      "Do not follow or report files outside a symlinked scan root.",
    );
  }
});

test("rejects a direct runtime alias import of private server data", () => {
  rejected(
    {
      "src/client.tsx": `"use client"; import { getStore } from "@/lib/vault-store";`,
      "src/lib/vault-store.ts": `export const getStore = () => null;`,
    },
    "client-server-boundary",
    "src/lib/vault-store.ts",
  );
});

test("does not mistake a mixed import or empty side-effect import for a type-only import", () => {
  for (const statement of [
    `import { type Row, getStore } from "@/lib/vault-store";`,
    `import {} from "@/lib/vault-store";`,
    `import "@/lib/vault-store";`,
  ]) {
    rejected(
      {
        "src/client.ts": `"use client"; ${statement}`,
        "src/lib/vault-store.ts": `export type Row = {}; export const getStore = () => null;`,
      },
      "client-server-boundary",
      "src/lib/vault-store.ts",
    );
  }
});

test("follows relative imports and runtime re-exports through an intermediate module", () => {
  rejected(
    {
      "src/client.ts": `'use client'; import { value } from "./shared/barrel.js";`,
      "src/shared/barrel.ts": `export { value } from "../lib/vault-auth";`,
      "src/lib/vault-auth.ts": `export const value = 1;`,
    },
    "client-server-boundary",
    "src/lib/vault-auth.ts",
  );
});

test("rejects a private module loaded through dynamic import", () => {
  rejected(
    {
      "src/client.ts": `"use client"; export const later = () => import("@/lib/rights-check");`,
      "src/lib/rights-check.ts": `export const check = () => true;`,
    },
    "client-server-boundary",
    "src/lib/rights-check.ts",
  );
});

test("rejects Node runtime access through require in a reachable helper", () => {
  rejected(
    {
      "src/client.ts": `"use client"; import "./helper";`,
      "src/helper.ts": `const fs = require("node:fs");`,
    },
    "client-node-builtin",
    "src/helper.ts",
  );
});

test("rejects computed dynamic imports that cannot be checked statically", () => {
  rejected(
    {
      "src/client.ts": `"use client"; const name = "./helper"; export const later = () => import(name);`,
    },
    "client-unresolved-dynamic-import",
    "src/client.ts",
  );
});

test("allows server-only imports outside the client dependency graph and external packages", () => {
  const result = runFixture({
    "src/client.ts": `"use client"; import { useState } from "react"; import type { Row } from "./server";`,
    "src/server.ts": `import { readFileSync } from "node:fs"; export type Row = {};`,
  });
  assert.equal(result.status, 0, result.output);
});

test("rejects private database and environment files beneath public", () => {
  for (const name of [
    "public/data/vault.sqlite",
    "public/backups/vault.db-wal",
    "public/.env.local",
    "public/server.key",
    "public/.aws/credentials",
  ]) {
    rejected({ [name]: "fixture data" }, "public-private-file", name);
  }
});

test("rejects a high-confidence secret candidate without printing the matched value", () => {
  const candidates = [
    "-----BEGIN PRIVATE KEY-----",
    `ghp_${"A".repeat(36)}`,
    `github_pat_${"A".repeat(75)}`,
    `AKIA${"A".repeat(16)}`,
    `sk-proj-${"A".repeat(64)}`,
  ];
  for (const candidate of candidates) {
    const result = rejected(
      { "src/config.ts": `export const value = "${candidate}";` },
      "secret-candidate",
      "src/config.ts",
    );
    assert.ok(
      !result.output.includes(candidate),
      "The diagnostic must not expose a secret candidate.",
    );
  }
});

test("scans public asset text for secret candidates as well as source files", () => {
  const candidate = `ghp_${"Z".repeat(36)}`;
  const result = rejected(
    { "public/app-config.json": JSON.stringify({ key: candidate }) },
    "secret-candidate",
    "public/app-config.json",
  );
  assert.ok(!result.output.includes(candidate));
});

test("does not flag short placeholders and ordinary public assets", () => {
  const result = runFixture({
    "src/config.ts": `export const key = "sk-placeholder";`,
    "public/manual.txt": "教材の説明です。",
    "public/logo.svg": "<svg></svg>",
  });
  assert.equal(result.status, 0, result.output);
});

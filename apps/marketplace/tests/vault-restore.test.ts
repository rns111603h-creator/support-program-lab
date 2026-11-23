import { afterEach, beforeEach, expect, it } from "vitest";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { VaultStore } from "../src/lib/vault-store";

let root: string;
let backup: string;
let target: string;
const password = "synthetic-restore-password";
const script = path.resolve("scripts/restore-vault.mjs");

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "spl-restore-test-"));
  backup = path.join(root, "backup.sqlite");
  target = path.join(root, "restored");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function restore(source = backup, destination = target, confirm = true) {
  return spawnSync(
    process.execPath,
    [
      script,
      "--backup",
      source,
      "--target-dir",
      destination,
      ...(confirm ? ["--confirm-app-stopped"] : []),
    ],
    { encoding: "utf8" },
  );
}

async function fixture() {
  const source = path.join(root, "source");
  const store = new VaultStore(source);
  const alice = await store.createUser({ username: "alice", password });
  const bob = await store.createUser({ username: "bob", password });
  const team = store.createVault(alice.id, "架空の復元チーム");
  store.close();
  const db = new DatabaseSync(path.join(source, "vault.sqlite"));
  db.prepare("INSERT INTO members VALUES (?, ?, 'member')").run(
    team.id,
    bob.id,
  );
  db.prepare(
    "INSERT INTO invitations (token_hash, vault_id, expires_at, used_at) VALUES (?, ?, ?, NULL)",
  ).run("synthetic-invitation-hash", team.id, Date.now() + 86_400_000);
  db.close();
  const reopened = new VaultStore(source);
  const session = reopened.createSession(alice.id);
  const material = reopened.createMaterial(alice.id, team.id, {
    title: "復元して残す教材",
    files: [
      {
        name: "synthetic.txt",
        mimeType: "text/plain",
        data: new TextEncoder().encode("架空の復元用添付"),
      },
    ],
  });
  const share = reopened.createShare(alice.id, material.id, {
    acknowledged: true,
    expectedVersion: material.version,
  });
  reopened.close();
  copyFileSync(path.join(source, "vault.sqlite"), backup);
  return { alice, bob, team, session, material, share };
}

it("restores a separate private copy, invalidates access and preserves accounts, owners and files", async () => {
  const { alice, bob, team, session, material, share } = await fixture();
  const before = readFileSync(backup);
  const result = restore();
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("再ログインと所属確認");
  expect(readFileSync(backup)).toEqual(before);
  expect(statSync(target).mode & 0o777).toBe(0o700);
  expect(statSync(path.join(target, "vault.sqlite")).mode & 0o777).toBe(0o600);
  const db = new DatabaseSync(path.join(target, "vault.sqlite"));
  for (const table of ["sessions", "shares", "invitations"])
    expect(db.prepare(`SELECT count(*) AS n FROM ${table}`).get()?.n).toBe(0);
  db.close();
  const restored = new VaultStore(target);
  try {
    expect(restored.getSession(session)).toBeNull();
    expect(restored.getSharedMaterial(share.token)).toBeNull();
    expect(restored.listMembers(alice.id, team.id)).toHaveLength(1);
    expect(() => restored.getMaterial(bob.id, material.id)).toThrow();
    expect(restored.listVaults(bob.id)).toHaveLength(1);
    expect(restored.getMaterial(alice.id, material.id).title).toBe(
      material.title,
    );
    expect(
      restored.getFile(alice.id, material.id, material.files[0].id).data,
    ).toEqual(new TextEncoder().encode("架空の復元用添付"));
    expect(
      (await restored.authenticateUser({ username: "alice", password })).id,
    ).toBe(alice.id);
  } finally {
    restored.close();
  }
});

it("refuses an existing destination without changing its contents", async () => {
  await fixture();
  mkdirSync(target);
  writeFileSync(path.join(target, "keep.txt"), "keep");
  const result = restore();
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("復元先は存在しない");
  expect(readFileSync(path.join(target, "keep.txt"), "utf8")).toBe("keep");
});

it("requires an explicit stopped-app acknowledgement and an absolute destination", async () => {
  await fixture();
  expect(restore(backup, target, false).stderr).toContain(
    "--confirm-app-stopped",
  );
  expect(restore(backup, "relative-target").stderr).toContain("絶対パス");
  expect(existsSync(target)).toBe(false);
});

it("refuses public, Git worktree and symlink destinations", async () => {
  await fixture();
  const publicDir = path.join(root, "public");
  const worktree = path.join(root, "repo");
  const linked = path.join(root, "linked");
  mkdirSync(publicDir);
  mkdirSync(worktree);
  mkdirSync(path.join(worktree, ".git"));
  writeFileSync(path.join(worktree, ".git", "HEAD"), "ref: refs/heads/test\n");
  symlinkSync(root, linked);
  for (const destination of [
    path.join(publicDir, "data"),
    path.join(worktree, "data"),
    path.join(linked, "data"),
  ]) {
    const result = restore(backup, destination);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("専用の非公開保存先");
    expect(existsSync(destination)).toBe(false);
  }
});

it("refuses symlink backups and uncheckpointed sidecars", async () => {
  await fixture();
  const linked = path.join(root, "linked.sqlite");
  symlinkSync(backup, linked);
  expect(restore(linked).stderr).toContain("通常ファイル");
  const linkedDirectory = path.join(root, "linked-source");
  symlinkSync(root, linkedDirectory);
  expect(restore(path.join(linkedDirectory, "backup.sqlite")).stderr).toContain(
    "通常ファイル",
  );
  writeFileSync(`${backup}-wal`, "synthetic pending journal");
  expect(restore().stderr).toContain("ジャーナル");
  expect(existsSync(target)).toBe(false);
});

it("refuses backups placed in a public directory", async () => {
  await fixture();
  const publicDir = path.join(root, "public");
  mkdirSync(publicDir);
  const publicBackup = path.join(publicDir, "backup.sqlite");
  copyFileSync(backup, publicBackup);
  const result = restore(publicBackup);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("専用の非公開保存先");
  expect(existsSync(target)).toBe(false);
});

it("rejects corrupt or unrelated databases and removes its failed destination", async () => {
  writeFileSync(backup, "synthetic non-database");
  expect(restore().stderr).toContain("復元できません");
  expect(existsSync(target)).toBe(false);
  rmSync(backup);
  const unrelated = new DatabaseSync(backup);
  unrelated.exec("CREATE TABLE other (value TEXT)");
  unrelated.close();
  expect(restore().stderr).toContain("保管庫のDB構造");
  expect(existsSync(target)).toBe(false);
});

it("rejects unexpected triggers and invalid ownership before producing a usable copy", async () => {
  const { team } = await fixture();
  let db = new DatabaseSync(backup);
  db.exec(
    "CREATE TRIGGER preserve_access BEFORE DELETE ON sessions BEGIN SELECT RAISE(IGNORE); END",
  );
  db.close();
  expect(restore().stderr).toContain("保管庫のDB構造");
  expect(existsSync(target)).toBe(false);
  db = new DatabaseSync(backup);
  db.exec("DROP TRIGGER preserve_access");
  db.prepare("DELETE FROM members WHERE vault_id = ? AND role = 'owner'").run(
    team.id,
  );
  db.close();
  expect(restore().stderr).toContain("所有者");
  expect(existsSync(target)).toBe(false);
});

it("rejects unexpected foreign keys that could remove attachments during access invalidation", async () => {
  await fixture();
  const db = new DatabaseSync(backup);
  db.exec(`PRAGMA foreign_keys = OFF;
    UPDATE sessions SET token_hash = 'synthetic.txt';
    CREATE TABLE files_copy (
      id TEXT PRIMARY KEY, material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
      name TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
      mime_type TEXT NOT NULL, size INTEGER NOT NULL, data BLOB NOT NULL
    );
    INSERT INTO files_copy SELECT * FROM files;
    DROP TABLE files;
    ALTER TABLE files_copy RENAME TO files;
  `);
  db.close();
  const before = readFileSync(backup);
  const result = restore();
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("保管庫のDB構造");
  expect(existsSync(target)).toBe(false);
  expect(readFileSync(backup)).toEqual(before);
});

it("checks user-defined schema names starting with sqlite plus another character", async () => {
  await fixture();
  const db = new DatabaseSync(backup);
  db.exec(
    "CREATE TRIGGER sqliteXkeep_sessions BEFORE DELETE ON sessions BEGIN SELECT RAISE(IGNORE); END",
  );
  db.close();
  const result = restore();
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("保管庫のDB構造");
  expect(existsSync(target)).toBe(false);
});

it("rejects reordered columns that are incompatible with application inserts", async () => {
  await fixture();
  const db = new DatabaseSync(backup);
  db.exec(`PRAGMA foreign_keys = OFF;
    CREATE TABLE users_copy (username TEXT UNIQUE NOT NULL, id TEXT PRIMARY KEY, salt TEXT NOT NULL, password_hash TEXT NOT NULL);
    INSERT INTO users_copy SELECT username, id, salt, password_hash FROM users;
    DROP TABLE users;
    ALTER TABLE users_copy RENAME TO users;
  `);
  db.close();
  const result = restore();
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("保管庫のDB構造");
  expect(existsSync(target)).toBe(false);
});

import {
  chmodSync,
  constants,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";

const protectedSegments = new Set(["public", ".git", ".next", "node_modules"]);
const schema = {
  users: ["id", "username", "salt", "password_hash"],
  sessions: ["token_hash", "user_id", "expires_at"],
  auth_attempts: ["username", "failures", "window_start"],
  vaults: ["id", "name", "kind"],
  members: ["vault_id", "user_id", "role"],
  invitations: ["token_hash", "vault_id", "expires_at", "used_at"],
  materials: [
    "id",
    "vault_id",
    "title",
    "description",
    "body",
    "tags",
    "source_url",
    "rights_basis",
    "version",
    "created_at",
    "updated_at",
    "rights_report",
  ],
  files: ["id", "material_id", "name", "mime_type", "size", "data"],
  shares: [
    "id",
    "token_hash",
    "material_id",
    "version",
    "expires_at",
    "created_at",
    "revoked",
  ],
};
const foreignKeys = {
  sessions: ["user_id:users:id:CASCADE"],
  members: ["user_id:users:id:CASCADE", "vault_id:vaults:id:CASCADE"],
  invitations: ["vault_id:vaults:id:CASCADE"],
  materials: ["vault_id:vaults:id:CASCADE"],
  files: ["material_id:materials:id:CASCADE"],
  shares: ["material_id:materials:id:CASCADE"],
};

function fail(message) {
  throw new Error(message);
}

function ancestors(filename) {
  const result = [];
  for (let current = filename; ; current = path.dirname(current)) {
    result.push(current);
    if (current === path.dirname(current)) return result;
  }
}

function entryExists(filename) {
  try {
    lstatSync(filename);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function isGitWorktree(directory) {
  const marker = path.join(directory, ".git");
  // Some managed workspaces reserve empty .git mount points even outside repos.
  return (
    entryExists(marker) &&
    (!lstatSync(marker).isDirectory() || existsSync(path.join(marker, "HEAD")))
  );
}

function validatePaths(backup, target) {
  if (!path.isAbsolute(backup) || !path.isAbsolute(target))
    fail("バックアップと復元先は絶対パスで指定してください。");
  if (!existsSync(backup) || !lstatSync(backup).isFile())
    fail("バックアップにはリンクではない通常ファイルを指定してください。");
  if (backup.split(path.sep).some((part) => protectedSegments.has(part)))
    fail("バックアップも専用の非公開保存先から指定してください。");
  if (ancestors(backup).some((item) => lstatSync(item).isSymbolicLink()))
    fail("バックアップにはリンクではない通常ファイルを指定してください。");
  for (const suffix of ["-wal", "-shm", "-journal"])
    if (existsSync(`${backup}${suffix}`))
      fail("ジャーナルのない停止済みDBのバックアップを指定してください。");
  if (entryExists(target))
    fail("復元先は存在しない新規ディレクトリを指定してください。");
  const parent = path.dirname(target);
  if (!existsSync(parent))
    fail("復元先の親ディレクトリを先に用意してください。");
  if (
    target.split(path.sep).some((part) => protectedSegments.has(part)) ||
    ancestors(parent).some(
      (item) => lstatSync(item).isSymbolicLink() || isGitWorktree(item),
    )
  )
    fail(
      "Git作業ツリー・リンク・公開領域以外の専用の非公開保存先を指定してください。",
    );
  if (!lstatSync(parent).isDirectory())
    fail("復元先の親ディレクトリを先に用意してください。");
}

function validateDatabase(db) {
  const entries = db
    .prepare(
      "SELECT type, name FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*'",
    )
    .all();
  const tables = entries
    .filter((entry) => entry.type === "table")
    .map((entry) => entry.name)
    .sort();
  if (
    entries.some((entry) => !["table", "index"].includes(entry.type)) ||
    JSON.stringify(tables) !== JSON.stringify(Object.keys(schema).sort())
  )
    fail("対応する保管庫のDB構造ではありません。");
  for (const [table, required] of Object.entries(schema)) {
    const columns = db
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((row) => row.name);
    const allowed =
      table === "invitations" ? [...required, "recipient_user_id"] : required;
    if (
      JSON.stringify(columns) !== JSON.stringify(required) &&
      JSON.stringify(columns) !== JSON.stringify(allowed)
    )
      fail("対応する保管庫のDB構造ではありません。");
    const expected = [...(foreignKeys[table] ?? [])];
    if (table === "invitations" && columns.includes("recipient_user_id"))
      expected.push("recipient_user_id:users:id:CASCADE");
    const actual = db.prepare(`PRAGMA foreign_key_list(${table})`).all();
    if (
      actual.some(
        (row) =>
          row.on_update !== "NO ACTION" ||
          row.seq !== 0 ||
          row.match !== "NONE",
      ) ||
      JSON.stringify(
        actual
          .map((row) => `${row.from}:${row.table}:${row.to}:${row.on_delete}`)
          .sort(),
      ) !== JSON.stringify(expected.sort())
    )
      fail("対応する保管庫のDB構造ではありません。");
  }
  if (
    db
      .prepare("PRAGMA quick_check")
      .all()
      .some((row) => row.quick_check !== "ok") ||
    db.prepare("PRAGMA foreign_key_check").all().length
  )
    fail("DBの整合性を確認できません。復元できません。");
  if (
    db
      .prepare(
        `SELECT v.id FROM vaults v LEFT JOIN members m ON m.vault_id = v.id AND m.role = 'owner'
    GROUP BY v.id HAVING COUNT(m.user_id) != 1`,
      )
      .all().length
  )
    fail("各保管庫の所有者を確認できません。復元できません。");
  if (
    db
      .prepare("SELECT 1 FROM vaults WHERE kind NOT IN ('personal', 'team')")
      .get() ||
    db
      .prepare("SELECT 1 FROM members WHERE role NOT IN ('owner', 'member')")
      .get()
  )
    fail("保管庫のDB構造に未対応の権限が含まれています。");
  if (
    db
      .prepare(
        "SELECT 1 FROM members m JOIN vaults v ON v.id = m.vault_id WHERE v.kind = 'personal' AND m.role != 'owner'",
      )
      .get()
  )
    fail("個人保管庫の所有者以外の所属が含まれています。");
}

function preservedContent(db) {
  const hash = createHash("sha256");
  for (const table of [
    "users",
    "auth_attempts",
    "vaults",
    "materials",
    "files",
    "members",
  ]) {
    hash.update(table);
    const where = table === "members" ? " WHERE role = 'owner'" : "";
    for (const row of db
      .prepare(`SELECT * FROM ${table}${where} ORDER BY rowid`)
      .iterate()) {
      for (const value of Object.values(row)) {
        const bytes =
          value instanceof Uint8Array
            ? value
            : Buffer.from(JSON.stringify(value));
        hash.update(`${typeof value}:${bytes.length}:`);
        hash.update(bytes);
      }
      hash.update(";");
    }
  }
  return hash.digest("hex");
}

let created = false;
let target;
let db;
try {
  const { values } = parseArgs({
    options: {
      backup: { type: "string" },
      "target-dir": { type: "string" },
      "confirm-app-stopped": { type: "boolean" },
    },
    strict: true,
  });
  if (!values.backup || !values["target-dir"] || !values["confirm-app-stopped"])
    fail(
      "使用方法: node scripts/restore-vault.mjs --backup /private/backup.sqlite --target-dir /private/new-directory --confirm-app-stopped",
    );
  const backup = path.normalize(values.backup);
  target = path.normalize(values["target-dir"]);
  validatePaths(backup, target);
  mkdirSync(target, { mode: 0o700 });
  created = true;
  chmodSync(target, 0o700);
  const filename = path.join(target, "vault.sqlite");
  copyFileSync(backup, filename, constants.COPYFILE_EXCL);
  chmodSync(filename, 0o600);
  db = new DatabaseSync(filename, { enableDefensive: true });
  db.exec(
    "PRAGMA trusted_schema = OFF; PRAGMA foreign_keys = ON; PRAGMA journal_mode = DELETE;",
  );
  validateDatabase(db);
  const preserved = preservedContent(db);
  db.exec(`BEGIN IMMEDIATE;
    DELETE FROM sessions;
    DELETE FROM shares;
    DELETE FROM invitations;
    DELETE FROM members WHERE role = 'member' AND vault_id IN (SELECT id FROM vaults WHERE kind = 'team');
  `);
  validateDatabase(db);
  if (
    preservedContent(db) !== preserved ||
    ["sessions", "shares", "invitations"].some((table) =>
      db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get(),
    ) ||
    db.prepare("SELECT 1 FROM members WHERE role = 'member' LIMIT 1").get()
  )
    fail("教材の保持とアクセス失効を確認できません。");
  db.exec("COMMIT;");
  db.close();
  db = undefined;
  console.log(
    "別保存先への復元が完了しました。再ログインと所属確認が必要です。共有・招待は再発行してください。起動前に所有者とバックアップ時点のパスワードを確認してください。",
  );
} catch (error) {
  if (db) db.close();
  if (created) rmSync(target, { recursive: true, force: true });
  console.error(`復元できません: ${error.message}`);
  process.exitCode = 1;
}

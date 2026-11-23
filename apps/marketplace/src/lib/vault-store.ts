import { chmodSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { checkRights, type RightsReport } from "./rights-check";

const DAY = 86_400_000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 10 * 1024 * 1024;
const SESSION_DURATION = 7 * DAY;
const AUTH_WINDOW = 15 * 60_000;

export class VaultError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "VaultError";
  }
}

export type User = { id: string; username: string };
export type Vault = {
  id: string;
  name: string;
  kind: "personal" | "team";
  role: "owner" | "member";
};
export type Member = {
  userId: string;
  username: string;
  role: "owner" | "member";
};
export type FileMeta = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
};
export type FileInput = { name: string; mimeType: string; data: Uint8Array };
export type StoredFile = FileMeta & { data: Uint8Array };
export type MaterialInput = {
  title: string;
  description?: string;
  body?: string;
  tags?: string[];
  sourceUrl?: string;
  rightsBasis?: string;
  files?: FileInput[];
};
export type Material = {
  id: string;
  vaultId: string;
  title: string;
  description: string;
  body: string;
  tags: string[];
  sourceUrl: string;
  rightsBasis: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  files: FileMeta[];
  rightsReport: RightsReport;
};
export type Share = {
  id: string;
  expiresAt: number;
  createdAt: number;
  revoked: boolean;
  active: boolean;
};

type Row = Record<string, string | number | bigint | null | Uint8Array>;
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");
const normalizeUsername = (username: string) => username.trim().toLowerCase();
const userFromRow = (row: Row): User => ({
  id: String(row.id),
  username: String(row.username),
});
const invalidAccess = () =>
  new VaultError(
    "教材または保管庫が見つからないか、アクセス権がありません。",
    404,
  );

async function derivePassword(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

function checkedDays(days = 7) {
  if (!Number.isInteger(days) || days < 1 || days > 30) {
    throw new VaultError("有効期限は1〜30日で指定してください。");
  }
  return days;
}

function text(
  value: string | undefined,
  name: string,
  max: number,
  required = false,
) {
  if (value !== undefined && typeof value !== "string")
    throw new VaultError(`${name}の形式が正しくありません。`);
  const normalized = (value ?? "").trim();
  if (normalized.length > max || (required && !normalized)) {
    throw new VaultError(
      `${name}は${required ? "1〜" : ""}${max}文字以内で入力してください。`,
    );
  }
  return normalized;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".txt": "text/plain",
  ".md": "text/markdown",
};

function normalizeFiles(files: FileInput[]): FileInput[] {
  if (!Array.isArray(files) || files.length > 10)
    throw new VaultError("添付ファイルは10点までです。");
  let total = 0;
  return files.map((file) => {
    const name = text(file.name, "ファイル名", 180, true);
    if (/[\\/\x00-\x1f\x7f]/.test(name))
      throw new VaultError("ファイル名に使用できない文字があります。");
    const extension = path.extname(name).toLowerCase();
    const mimeType = MIME_BY_EXTENSION[extension];
    if (!mimeType)
      throw new VaultError(
        "添付できる形式はPDF・PPTX・DOCX・PNG・JPEG・TXT・MDです。",
      );
    if (
      !(file.data instanceof Uint8Array) ||
      file.data.byteLength === 0 ||
      file.data.byteLength > MAX_FILE_SIZE
    ) {
      throw new VaultError(
        "ファイルは空でない10MB以下のものを指定してください。",
      );
    }
    const data = Buffer.from(file.data);
    total += data.byteLength;
    if (total > MAX_TOTAL_SIZE)
      throw new VaultError("添付の合計サイズは10MB以下にしてください。");
    const validSignature =
      extension === ".pdf"
        ? data.subarray(0, 5).toString() === "%PDF-"
        : extension === ".png"
          ? data
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : [".jpg", ".jpeg"].includes(extension)
            ? data[0] === 255 && data[1] === 216 && data[2] === 255
            : [".docx", ".pptx"].includes(extension)
              ? data[0] === 80 &&
                data[1] === 75 &&
                data[2] === 3 &&
                data[3] === 4
              : !data.includes(0);
    if (!validSignature)
      throw new VaultError("ファイルの内容と拡張子が一致しません。");
    return { name, mimeType, data };
  });
}

function normalizeMaterial(
  input: MaterialInput,
  existingFiles: FileInput[] = [],
) {
  const title = text(input.title, "タイトル", 200, true);
  const description = text(input.description, "概要", 5000);
  const body = text(input.body, "本文", 200_000);
  const sourceUrl = text(input.sourceUrl, "出典URL", 2000);
  if (sourceUrl) {
    try {
      if (!["http:", "https:"].includes(new URL(sourceUrl).protocol))
        throw new Error();
    } catch {
      throw new VaultError("出典URLはhttpまたはhttpsのURLを入力してください。");
    }
  }
  const rightsBasis = text(input.rightsBasis, "権利の確認メモ", 2000);
  if (
    input.tags !== undefined &&
    (!Array.isArray(input.tags) || input.tags.length > 10)
  )
    throw new VaultError("タグは10個までです。");
  const tags = [
    ...new Set((input.tags ?? []).map((tag) => text(tag, "タグ", 40, true))),
  ];
  const files = normalizeFiles(input.files ?? existingFiles);
  const rightsReport = checkRights({
    title,
    description,
    body,
    sourceUrl,
    rightsBasis,
    files,
  });
  return {
    title,
    description,
    body,
    sourceUrl,
    rightsBasis,
    tags,
    files,
    rightsReport,
  };
}

/** A single-process Node server store. The database must live on a persistent, private volume. */
export class VaultStore {
  private readonly db: DatabaseSync;

  constructor(
    directory = process.env.VAULT_DATA_DIR ||
      path.join(process.cwd(), ".vault-data"),
  ) {
    // Runtime private data belongs to its persistent volume, never a build bundle.
    const resolved = path.resolve(/* turbopackIgnore: true */ directory);
    if (
      resolved.split(path.sep).includes("public") ||
      resolved === path.parse(resolved).root
    ) {
      throw new VaultError(
        "保管庫の保存先にはpublic配下以外の専用ディレクトリを指定してください。",
        500,
      );
    }
    mkdirSync(resolved, { recursive: true, mode: 0o700 });
    chmodSync(resolved, 0o700);
    const filename = path.join(resolved, "vault.sqlite");
    this.db = new DatabaseSync(filename);
    chmodSync(filename, 0o600);
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = DELETE;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS auth_attempts (
        username TEXT PRIMARY KEY, failures INTEGER NOT NULL, window_start INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS vaults (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('personal', 'team'))
      );
      CREATE TABLE IF NOT EXISTS members (
        vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('owner','member')), PRIMARY KEY(vault_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS invitations (
        token_hash TEXT PRIMARY KEY, vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL, used_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY, vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
        title TEXT NOT NULL, description TEXT NOT NULL, body TEXT NOT NULL, tags TEXT NOT NULL,
        source_url TEXT NOT NULL, rights_basis TEXT NOT NULL, version INTEGER NOT NULL,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, rights_report TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY, material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
        name TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER NOT NULL, data BLOB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL,
        material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
        version INTEGER NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS material_vault_idx ON materials(vault_id);
      CREATE INDEX IF NOT EXISTS file_material_idx ON files(material_id);
      CREATE INDEX IF NOT EXISTS share_material_idx ON shares(material_id);
    `);
  }

  close() {
    this.db.close();
  }

  private transaction<T>(callback: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = callback();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  private requireUser(userId: string) {
    const row = this.db
      .prepare("SELECT id, username FROM users WHERE id = ?")
      .get(userId) as Row | undefined;
    if (!row) throw new VaultError("ログインしてください。", 401);
    return userFromRow(row);
  }

  private requireMembership(
    userId: string,
    vaultId: string,
    ownerOnly = false,
  ): Vault {
    const row = this.db
      .prepare(
        `SELECT v.id, v.name, v.kind, m.role FROM vaults v
      JOIN members m ON m.vault_id = v.id WHERE v.id = ? AND m.user_id = ?`,
      )
      .get(vaultId, userId) as Row | undefined;
    if (!row || (ownerOnly && row.role !== "owner")) throw invalidAccess();
    return {
      id: String(row.id),
      name: String(row.name),
      kind: row.kind as Vault["kind"],
      role: row.role as Vault["role"],
    };
  }

  async createUser(input: {
    username: string;
    password: string;
  }): Promise<User> {
    const username = normalizeUsername(input.username);
    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) {
      throw new VaultError(
        "ユーザーIDは英数字で始まる3〜40文字の英数字・ピリオド・ハイフン・アンダースコアを使ってください。",
      );
    }
    if (
      typeof input.password !== "string" ||
      input.password.length < 12 ||
      input.password.length > 128
    ) {
      throw new VaultError("パスワードは12〜128文字で設定してください。");
    }
    const salt = randomBytes(16).toString("hex");
    const passwordHash = (await derivePassword(input.password, salt)).toString(
      "hex",
    );
    return this.transaction(() => {
      if (
        this.db.prepare("SELECT id FROM users WHERE username = ?").get(username)
      )
        throw new VaultError("このユーザーIDは使用できません。");
      const user = { id: randomUUID(), username };
      this.db
        .prepare("INSERT INTO users VALUES (?, ?, ?, ?)")
        .run(user.id, username, salt, passwordHash);
      const vaultId = randomUUID();
      this.db
        .prepare("INSERT INTO vaults VALUES (?, ?, 'personal')")
        .run(vaultId, "個人の保管庫");
      this.db
        .prepare("INSERT INTO members VALUES (?, ?, 'owner')")
        .run(vaultId, user.id);
      return user;
    });
  }

  async authenticateUser(input: {
    username: string;
    password: string;
  }): Promise<User> {
    const username = normalizeUsername(input.username);
    if (
      username.length > 40 ||
      typeof input.password !== "string" ||
      input.password.length > 128
    ) {
      throw new VaultError(
        "ユーザーIDまたはパスワードを確認してください。",
        401,
      );
    }
    const now = Date.now();
    this.transaction(() => {
      this.db
        .prepare("DELETE FROM auth_attempts WHERE window_start <= ?")
        .run(now - AUTH_WINDOW);
      const attempt = this.db
        .prepare("SELECT failures FROM auth_attempts WHERE username = ?")
        .get(username) as Row | undefined;
      if (attempt && Number(attempt.failures) >= 5)
        throw new VaultError(
          "試行回数が多いため、15分ほど待ってから再度お試しください。",
          429,
        );
      // Reserve the attempt before awaiting scrypt, so concurrent requests cannot bypass the limit.
      this.db
        .prepare(
          `INSERT INTO auth_attempts VALUES (?, 1, ?)
        ON CONFLICT(username) DO UPDATE SET failures = failures + 1`,
        )
        .run(username, now);
    });
    const row = this.db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as Row | undefined;
    const computed = await derivePassword(
      input.password,
      row ? String(row.salt) : "nonexistent-account-salt",
    );
    const expected = row
      ? Buffer.from(String(row.password_hash), "hex")
      : Buffer.alloc(64);
    if (!row || !timingSafeEqual(computed, expected))
      throw new VaultError(
        "ユーザーIDまたはパスワードを確認してください。",
        401,
      );
    this.db
      .prepare("DELETE FROM auth_attempts WHERE username = ?")
      .run(username);
    return userFromRow(row);
  }

  createSession(userId: string): string {
    this.requireUser(userId);
    const now = Date.now();
    this.db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
    const raw = token();
    this.db
      .prepare("INSERT INTO sessions VALUES (?, ?, ?)")
      .run(digest(raw), userId, now + SESSION_DURATION);
    return raw;
  }

  getSession(raw: string): User | null {
    if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
    const row = this.db
      .prepare(
        `SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
      )
      .get(digest(raw), Date.now()) as Row | undefined;
    return row ? userFromRow(row) : null;
  }

  revokeSession(raw: string) {
    this.db
      .prepare("DELETE FROM sessions WHERE token_hash = ?")
      .run(digest(raw));
  }

  listVaults(userId: string): Vault[] {
    this.requireUser(userId);
    return (
      this.db
        .prepare(
          `SELECT v.id, v.name, v.kind, m.role FROM vaults v
      JOIN members m ON m.vault_id = v.id WHERE m.user_id = ? ORDER BY v.kind, v.name`,
        )
        .all(userId) as Row[]
    ).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      kind: row.kind as Vault["kind"],
      role: row.role as Vault["role"],
    }));
  }

  createVault(userId: string, name: string): Vault {
    this.requireUser(userId);
    const vault: Vault = {
      id: randomUUID(),
      name: text(name, "保管庫名", 100, true),
      kind: "team",
      role: "owner",
    };
    this.transaction(() => {
      this.db
        .prepare("INSERT INTO vaults VALUES (?, ?, 'team')")
        .run(vault.id, vault.name);
      this.db
        .prepare("INSERT INTO members VALUES (?, ?, 'owner')")
        .run(vault.id, userId);
    });
    return vault;
  }

  listMembers(userId: string, vaultId: string): Member[] {
    this.requireMembership(userId, vaultId);
    return (
      this.db
        .prepare(
          `SELECT m.user_id, u.username, m.role FROM members m JOIN users u ON u.id = m.user_id
      WHERE m.vault_id = ? ORDER BY m.role DESC, u.username`,
        )
        .all(vaultId) as Row[]
    ).map((row) => ({
      userId: String(row.user_id),
      username: String(row.username),
      role: row.role as Member["role"],
    }));
  }

  createInvite(userId: string, vaultId: string, expiresInDays = 7) {
    const vault = this.requireMembership(userId, vaultId, true);
    if (vault.kind !== "team")
      throw new VaultError("個人の保管庫にはメンバーを招待できません。");
    const raw = token();
    const expiresAt = Date.now() + checkedDays(expiresInDays) * DAY;
    this.db
      .prepare("INSERT INTO invitations VALUES (?, ?, ?, NULL)")
      .run(digest(raw), vaultId, expiresAt);
    return { token: raw, expiresAt };
  }

  acceptInvite(userId: string, raw: string): Vault {
    this.requireUser(userId);
    if (!/^[A-Za-z0-9_-]{43}$/.test(raw))
      throw new VaultError("招待リンクが無効か、有効期限が切れています。", 404);
    return this.transaction(() => {
      const row = this.db
        .prepare(
          "SELECT * FROM invitations WHERE token_hash = ? AND expires_at > ? AND used_at IS NULL",
        )
        .get(digest(raw), Date.now()) as Row | undefined;
      if (!row)
        throw new VaultError(
          "招待リンクが無効か、有効期限が切れています。",
          404,
        );
      this.db
        .prepare("INSERT OR IGNORE INTO members VALUES (?, ?, 'member')")
        .run(String(row.vault_id), userId);
      this.db
        .prepare("UPDATE invitations SET used_at = ? WHERE token_hash = ?")
        .run(Date.now(), digest(raw));
      return this.requireMembership(userId, String(row.vault_id));
    });
  }

  removeMember(userId: string, vaultId: string, memberId: string) {
    const actor = this.requireMembership(userId, vaultId);
    if (actor.role !== "owner" && userId !== memberId) throw invalidAccess();
    const member = this.db
      .prepare("SELECT role FROM members WHERE vault_id = ? AND user_id = ?")
      .get(vaultId, memberId) as Row | undefined;
    if (!member) throw invalidAccess();
    if (member.role === "owner")
      throw new VaultError("保管庫の所有者は削除できません。");
    this.transaction(() => {
      this.db
        .prepare("DELETE FROM members WHERE vault_id = ? AND user_id = ?")
        .run(vaultId, memberId);
      this.db
        .prepare(
          "DELETE FROM invitations WHERE vault_id = ? AND used_at IS NULL",
        )
        .run(vaultId);
      // Link access must not silently survive a change in team membership.
      this.db
        .prepare(
          "UPDATE shares SET revoked = 1 WHERE material_id IN (SELECT id FROM materials WHERE vault_id = ?)",
        )
        .run(vaultId);
    });
  }

  private materialFromRow(row: Row): Material {
    const files = (
      this.db
        .prepare(
          "SELECT id, name, mime_type, size FROM files WHERE material_id = ? ORDER BY rowid",
        )
        .all(String(row.id)) as Row[]
    ).map((file) => ({
      id: String(file.id),
      name: String(file.name),
      mimeType: String(file.mime_type),
      size: Number(file.size),
    }));
    return {
      id: String(row.id),
      vaultId: String(row.vault_id),
      title: String(row.title),
      description: String(row.description),
      body: String(row.body),
      tags: JSON.parse(String(row.tags)),
      sourceUrl: String(row.source_url),
      rightsBasis: String(row.rights_basis),
      version: Number(row.version),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      files,
      rightsReport: JSON.parse(String(row.rights_report)),
    };
  }

  listMaterials(userId: string, vaultId: string): Material[] {
    this.requireMembership(userId, vaultId);
    return (
      this.db
        .prepare(
          "SELECT * FROM materials WHERE vault_id = ? ORDER BY updated_at DESC, id",
        )
        .all(vaultId) as Row[]
    ).map((row) => this.materialFromRow(row));
  }

  getMaterial(userId: string, materialId: string): Material {
    const row = this.db
      .prepare("SELECT * FROM materials WHERE id = ?")
      .get(materialId) as Row | undefined;
    if (!row) throw invalidAccess();
    this.requireMembership(userId, String(row.vault_id));
    return this.materialFromRow(row);
  }

  private insertFiles(materialId: string, files: FileInput[]) {
    const insert = this.db.prepare(
      "INSERT INTO files VALUES (?, ?, ?, ?, ?, ?)",
    );
    for (const file of files)
      insert.run(
        randomUUID(),
        materialId,
        file.name,
        file.mimeType,
        file.data.byteLength,
        file.data,
      );
  }

  createMaterial(
    userId: string,
    vaultId: string,
    input: MaterialInput,
  ): Material {
    this.requireMembership(userId, vaultId);
    const normalized = normalizeMaterial(input);
    const id = randomUUID();
    const now = Date.now();
    this.transaction(() => {
      this.requireMembership(userId, vaultId);
      this.db
        .prepare(
          "INSERT INTO materials VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)",
        )
        .run(
          id,
          vaultId,
          normalized.title,
          normalized.description,
          normalized.body,
          JSON.stringify(normalized.tags),
          normalized.sourceUrl,
          normalized.rightsBasis,
          now,
          now,
          JSON.stringify(normalized.rightsReport),
        );
      this.insertFiles(id, normalized.files);
    });
    return this.getMaterial(userId, id);
  }

  updateMaterial(
    userId: string,
    materialId: string,
    input: MaterialInput & { expectedVersion: number },
  ): Material {
    const existing = this.getMaterial(userId, materialId);
    if (input.expectedVersion !== existing.version)
      throw new VaultError(
        "教材が更新されています。画面を再読み込みして、最新の内容を確認してから編集してください。",
        409,
      );
    const existingFiles =
      input.files === undefined
        ? (
            this.db
              .prepare(
                "SELECT name, mime_type, data FROM files WHERE material_id = ? ORDER BY rowid",
              )
              .all(materialId) as Row[]
          ).map((row) => ({
            name: String(row.name),
            mimeType: String(row.mime_type),
            data: row.data as Uint8Array,
          }))
        : [];
    const normalized = normalizeMaterial(input, existingFiles);
    this.transaction(() => {
      this.getMaterial(userId, materialId);
      const updated = this.db
        .prepare(
          `UPDATE materials SET title = ?, description = ?, body = ?, tags = ?, source_url = ?, rights_basis = ?,
        version = version + 1, updated_at = ?, rights_report = ? WHERE id = ? AND version = ?`,
        )
        .run(
          normalized.title,
          normalized.description,
          normalized.body,
          JSON.stringify(normalized.tags),
          normalized.sourceUrl,
          normalized.rightsBasis,
          Date.now(),
          JSON.stringify(normalized.rightsReport),
          materialId,
          input.expectedVersion,
        );
      if (!updated.changes)
        throw new VaultError(
          "教材が更新されています。画面を再読み込みして、最新の内容を確認してから編集してください。",
          409,
        );
      if (input.files !== undefined) {
        this.db
          .prepare("DELETE FROM files WHERE material_id = ?")
          .run(materialId);
        this.insertFiles(materialId, normalized.files);
      }
      this.db
        .prepare("UPDATE shares SET revoked = 1 WHERE material_id = ?")
        .run(materialId);
    });
    return this.getMaterial(userId, materialId);
  }

  deleteMaterial(userId: string, materialId: string) {
    this.transaction(() => {
      this.getMaterial(userId, materialId);
      this.db.prepare("DELETE FROM materials WHERE id = ?").run(materialId);
    });
  }

  private fileFromRow(row: Row): StoredFile {
    return {
      id: String(row.id),
      name: String(row.name),
      mimeType: String(row.mime_type),
      size: Number(row.size),
      data: row.data as Uint8Array,
    };
  }

  getFile(userId: string, materialId: string, fileId: string): StoredFile {
    this.getMaterial(userId, materialId);
    const row = this.db
      .prepare("SELECT * FROM files WHERE id = ? AND material_id = ?")
      .get(fileId, materialId) as Row | undefined;
    if (!row) throw invalidAccess();
    return this.fileFromRow(row);
  }

  createShare(
    userId: string,
    materialId: string,
    options: {
      expiresInDays?: number;
      acknowledged: boolean;
      expectedVersion: number;
    },
  ) {
    return this.transaction(() => {
      const material = this.getMaterial(userId, materialId);
      if (options.acknowledged !== true)
        throw new VaultError(
          "共有前に、素材の権利と注意事項を確認してください。",
        );
      if (options.expectedVersion !== material.version)
        throw new VaultError(
          "教材が更新されています。画面を再読み込みして、最新の内容と注意事項を確認してください。",
          409,
        );
      const raw = token();
      const now = Date.now();
      const expiresAt = now + checkedDays(options.expiresInDays) * DAY;
      this.db
        .prepare("INSERT INTO shares VALUES (?, ?, ?, ?, ?, ?, 0)")
        .run(
          randomUUID(),
          digest(raw),
          materialId,
          material.version,
          expiresAt,
          now,
        );
      return { token: raw, expiresAt };
    });
  }

  listShares(userId: string, materialId: string): Share[] {
    this.getMaterial(userId, materialId);
    const now = Date.now();
    return (
      this.db
        .prepare(
          "SELECT id, expires_at, created_at, revoked FROM shares WHERE material_id = ? ORDER BY created_at DESC",
        )
        .all(materialId) as Row[]
    ).map((row) => ({
      id: String(row.id),
      expiresAt: Number(row.expires_at),
      createdAt: Number(row.created_at),
      revoked: Boolean(row.revoked),
      active: !row.revoked && Number(row.expires_at) > now,
    }));
  }

  revokeShare(userId: string, materialId: string, shareId: string) {
    this.getMaterial(userId, materialId);
    const result = this.db
      .prepare("UPDATE shares SET revoked = 1 WHERE id = ? AND material_id = ?")
      .run(shareId, materialId);
    if (!result.changes) throw invalidAccess();
  }

  getSharedMaterial(raw: string): Material | null {
    if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
    const row = this.db
      .prepare(
        `SELECT m.* FROM shares s JOIN materials m ON m.id = s.material_id
      WHERE s.token_hash = ? AND s.revoked = 0 AND s.expires_at > ? AND s.version = m.version`,
      )
      .get(digest(raw), Date.now()) as Row | undefined;
    return row ? this.materialFromRow(row) : null;
  }

  getSharedFile(raw: string, fileId: string): StoredFile | null {
    const material = this.getSharedMaterial(raw);
    if (!material) return null;
    const row = this.db
      .prepare("SELECT * FROM files WHERE id = ? AND material_id = ?")
      .get(fileId, material.id) as Row | undefined;
    return row ? this.fileFromRow(row) : null;
  }
}

let singleton: VaultStore | undefined;
export function getVaultStore(): VaultStore {
  singleton ??= new VaultStore();
  return singleton;
}

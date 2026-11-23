import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { VaultError, VaultStore, type User } from "../src/lib/vault-store";

const password = "test-only-password-123";
const file = {
  name: "架空ワーク.txt",
  mimeType: "text/plain",
  data: new TextEncoder().encode("架空の練習教材です。"),
};

describe("private vault persistence and authorization", () => {
  let directory: string;
  let store: VaultStore;
  let alice: User;
  let bob: User;

  beforeEach(async () => {
    directory = mkdtempSync(path.join(tmpdir(), "spl-vault-test-"));
    store = new VaultStore(directory);
    alice = await store.createUser({ username: "Alice", password });
    bob = await store.createUser({ username: "bob", password });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("hashes credentials and tokens, restricts file permissions and persists after reopening", async () => {
    expect(alice.username).toBe("alice");
    expect(
      (await store.authenticateUser({ username: " ALICE ", password })).id,
    ).toBe(alice.id);
    await expect(
      store.createUser({ username: "alice", password }),
    ).rejects.toBeInstanceOf(VaultError);
    await expect(
      store.createUser({ username: "bad", password: "short" }),
    ).rejects.toThrow("12〜128");
    const session = store.createSession(alice.id);
    expect(store.getSession(session)?.id).toBe(alice.id);
    const disk = readFileSync(path.join(directory, "vault.sqlite"));
    expect(disk.includes(Buffer.from(password))).toBe(false);
    expect(disk.includes(Buffer.from(session))).toBe(false);
    expect(statSync(directory).mode & 0o777).toBe(0o700);
    expect(statSync(path.join(directory, "vault.sqlite")).mode & 0o777).toBe(
      0o600,
    );
    store.close();
    store = new VaultStore(directory);
    expect(store.getSession(session)?.id).toBe(alice.id);
    expect(store.listVaults(alice.id)).toHaveLength(1);
    store.revokeSession(session);
    expect(store.getSession(session)).toBeNull();
    expect(store.getSession("malformed")).toBeNull();
  });

  it("expires sessions and persists a login attempt limit across connections", async () => {
    const session = store.createSession(alice.id);
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 8 * 86_400_000);
    expect(store.getSession(session)).toBeNull();
    vi.restoreAllMocks();
    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(
        store.authenticateUser({
          username: "alice",
          password: "incorrect-password",
        }),
      ).rejects.toMatchObject({ status: 401 });
    }
    store.close();
    store = new VaultStore(directory);
    await expect(
      store.authenticateUser({ username: "alice", password }),
    ).rejects.toMatchObject({ status: 429 });
    vi.spyOn(Date, "now").mockReturnValue(now + 16 * 60_000);
    expect(
      (await store.authenticateUser({ username: "alice", password })).id,
    ).toBe(alice.id);
  });

  it("does not permit concurrent failed requests to bypass the login limit", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        store.authenticateUser({
          username: "alice",
          password: "incorrect-password",
        }),
      ),
    );
    expect(
      results.filter(
        (result) =>
          result.status === "rejected" && result.reason.status === 429,
      ),
    ).toHaveLength(3);
  });

  it("isolates personal vaults and enforces authorization for every material operation", () => {
    const personal = store.listVaults(alice.id)[0];
    const material = store.createMaterial(alice.id, personal.id, {
      title: "個人教材",
      body: "架空例",
      files: [file],
    });
    const denied = [
      () => store.listMaterials(bob.id, personal.id),
      () => store.getMaterial(bob.id, material.id),
      () => store.createMaterial(bob.id, personal.id, { title: "侵入" }),
      () =>
        store.updateMaterial(bob.id, material.id, {
          expectedVersion: 1,
          title: "侵入",
        }),
      () => store.deleteMaterial(bob.id, material.id, material.version),
      () => store.getFile(bob.id, material.id, material.files[0].id),
      () =>
        store.createShare(bob.id, material.id, {
          acknowledged: true,
          expectedVersion: 1,
        }),
      () => store.listShares(bob.id, material.id),
      () => store.listMembers(bob.id, personal.id),
      () => store.createInvite(alice.id, personal.id),
    ];
    for (const operation of denied) expect(operation).toThrow(VaultError);
    expect(
      store.getFile(alice.id, material.id, material.files[0].id).data,
    ).toEqual(file.data);
    const other = store.createMaterial(alice.id, personal.id, {
      title: "別教材",
    });
    expect(() =>
      store.getFile(alice.id, other.id, material.files[0].id),
    ).toThrow(VaultError);
  });

  it("uses expiring one-use invitations, prevents privilege escalation and removes access", () => {
    const team = store.createVault(alice.id, "架空のチーム");
    expect(() => store.listMaterials(bob.id, team.id)).toThrow(VaultError);
    const invitation = store.createInvite(alice.id, team.id);
    expect(
      readFileSync(path.join(directory, "vault.sqlite")).includes(
        Buffer.from(invitation.token),
      ),
    ).toBe(false);
    const joined = store.acceptInvite(bob.id, invitation.token);
    expect(joined.role).toBe("member");
    expect(() => store.acceptInvite(bob.id, invitation.token)).toThrow(
      VaultError,
    );
    expect(() => store.createInvite(bob.id, team.id)).toThrow(VaultError);
    expect(() => store.removeMember(bob.id, team.id, alice.id)).toThrow(
      VaultError,
    );
    expect(() => store.removeMember(alice.id, team.id, alice.id)).toThrow(
      VaultError,
    );
    const material = store.createMaterial(bob.id, team.id, {
      title: "共有の教材",
      files: [file],
    });
    expect(store.getMaterial(alice.id, material.id).title).toBe("共有の教材");
    const share = store.createShare(bob.id, material.id, {
      acknowledged: true,
      expectedVersion: 1,
    });
    const unusedInvitation = store.createInvite(alice.id, team.id);
    store.removeMember(alice.id, team.id, bob.id);
    expect(() => store.getMaterial(bob.id, material.id)).toThrow(VaultError);
    expect(store.getSharedMaterial(share.token)).toBeNull();
    expect(() => store.acceptInvite(bob.id, unusedInvitation.token)).toThrow(
      VaultError,
    );
    expect(store.listMembers(alice.id, team.id)).toHaveLength(1);
    const expiredInvite = store.createInvite(alice.id, team.id, 1);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 2 * 86_400_000);
    expect(() => store.acceptInvite(bob.id, expiredInvite.token)).toThrow(
      VaultError,
    );
  });

  it("permits voluntary leave while preventing another member's removal", async () => {
    const charlie = await store.createUser({ username: "charlie", password });
    const team = store.createVault(alice.id, "チーム");
    store.acceptInvite(bob.id, store.createInvite(alice.id, team.id).token);
    store.acceptInvite(charlie.id, store.createInvite(alice.id, team.id).token);
    expect(() => store.removeMember(bob.id, team.id, charlie.id)).toThrow(
      VaultError,
    );
    store.removeMember(bob.id, team.id, bob.id);
    expect(() => store.listMembers(bob.id, team.id)).toThrow(VaultError);
  });

  it("requires acknowledgement, limits shared files and revokes links on edit or explicit action", () => {
    const vault = store.listVaults(alice.id)[0];
    const material = store.createMaterial(alice.id, vault.id, {
      title: "教材",
      files: [file],
    });
    const unrelated = store.createMaterial(alice.id, vault.id, {
      title: "非共有",
      files: [file],
    });
    expect(() =>
      store.createShare(alice.id, material.id, {
        acknowledged: false,
        expectedVersion: 1,
      }),
    ).toThrow(VaultError);
    expect(() =>
      store.createShare(alice.id, material.id, {
        acknowledged: true,
        expectedVersion: 1,
        expiresInDays: 31,
      }),
    ).toThrow(VaultError);
    const share = store.createShare(alice.id, material.id, {
      acknowledged: true,
      expectedVersion: 1,
    });
    expect(store.getSharedMaterial(share.token)?.id).toBe(material.id);
    expect(
      store.getSharedFile(share.token, material.files[0].id)?.data,
    ).toEqual(file.data);
    expect(store.getSharedFile(share.token, unrelated.files[0].id)).toBeNull();
    expect(store.getSharedMaterial("arbitrary-token")).toBeNull();
    expect(() =>
      store.revokeShare(
        bob.id,
        material.id,
        store.listShares(alice.id, material.id)[0].id,
      ),
    ).toThrow(VaultError);
    store.updateMaterial(alice.id, material.id, {
      expectedVersion: 1,
      title: "変更",
    });
    expect(store.getSharedMaterial(share.token)).toBeNull();
    expect(store.getSharedFile(share.token, material.files[0].id)).toBeNull();
    expect(() =>
      store.createShare(alice.id, material.id, {
        acknowledged: true,
        expectedVersion: 1,
      }),
    ).toThrow(/更新されています/);
    const fresh = store.createShare(alice.id, material.id, {
      acknowledged: true,
      expectedVersion: 2,
    });
    const newest = store
      .listShares(alice.id, material.id)
      .find((grant) => !grant.revoked)!;
    store.revokeShare(alice.id, material.id, newest.id);
    expect(store.getSharedMaterial(fresh.token)).toBeNull();
  });

  it("expires shares and deletes attached files and grants together with materials", () => {
    const material = store.createMaterial(
      alice.id,
      store.listVaults(alice.id)[0].id,
      { title: "期限検証", files: [file] },
    );
    const share = store.createShare(alice.id, material.id, {
      acknowledged: true,
      expectedVersion: 1,
      expiresInDays: 1,
    });
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 2 * 86_400_000);
    expect(store.getSharedMaterial(share.token)).toBeNull();
    vi.restoreAllMocks();
    store.deleteMaterial(alice.id, material.id, material.version);
    expect(store.getSharedMaterial(share.token)).toBeNull();
    expect(store.getSharedFile(share.token, material.files[0].id)).toBeNull();
    const inspection = new DatabaseSync(path.join(directory, "vault.sqlite"));
    expect(
      inspection.prepare("SELECT count(*) AS count FROM files").get()?.count,
    ).toBe(0);
    expect(
      inspection.prepare("SELECT count(*) AS count FROM shares").get()?.count,
    ).toBe(0);
    inspection.close();
  });

  it("rejects stale team deletions without removing updated content, attachments or active shares", () => {
    const team = store.createVault(alice.id, "架空の共同編集チーム");
    store.acceptInvite(bob.id, store.createInvite(alice.id, team.id).token);
    const original = store.createMaterial(alice.id, team.id, {
      title: "削除画面を開いた時点の教材",
      files: [file],
    });
    const updated = store.updateMaterial(bob.id, original.id, {
      expectedVersion: original.version,
      title: "別メンバーが更新した教材",
      body: "削除画面を開いた後に追記された架空の内容です。",
    });
    const share = store.createShare(bob.id, updated.id, {
      expectedVersion: updated.version,
      acknowledged: true,
    });

    expect(() =>
      store.deleteMaterial(alice.id, original.id, original.version),
    ).toThrow(expect.objectContaining({ status: 409 }));
    expect(store.getMaterial(alice.id, original.id)).toMatchObject({
      title: updated.title,
      body: updated.body,
      version: updated.version,
      files: original.files,
    });
    expect(
      store.getFile(alice.id, original.id, original.files[0].id).data,
    ).toEqual(file.data);
    expect(store.getSharedMaterial(share.token)?.id).toBe(original.id);
    expect(
      store.getSharedFile(share.token, original.files[0].id)?.data,
    ).toEqual(file.data);

    store.deleteMaterial(alice.id, updated.id, updated.version);
    expect(() => store.getMaterial(alice.id, updated.id)).toThrow(VaultError);
    expect(store.getSharedMaterial(share.token)).toBeNull();
    expect(store.getSharedFile(share.token, original.files[0].id)).toBeNull();
  });

  it("requires an explicit deletion version even when called without TypeScript validation", () => {
    const material = store.createMaterial(
      alice.id,
      store.listVaults(alice.id)[0].id,
      { title: "版指定が必要な教材" },
    );
    expect(() =>
      Reflect.apply(store.deleteMaterial, store, [alice.id, material.id]),
    ).toThrow(expect.objectContaining({ status: 409 }));
    expect(store.getMaterial(alice.id, material.id).version).toBe(1);
  });

  it("retains attachments when omitted on edit and replaces them only when explicitly supplied", () => {
    const material = store.createMaterial(
      alice.id,
      store.listVaults(alice.id)[0].id,
      { title: "教材", files: [file] },
    );
    const updated = store.updateMaterial(alice.id, material.id, {
      expectedVersion: 1,
      title: "変更",
      tags: ["練習", "練習"],
    });
    expect(updated.version).toBe(2);
    expect(updated.tags).toEqual(["練習"]);
    expect(updated.files).toEqual(material.files);
    expect(() =>
      store.updateMaterial(alice.id, material.id, {
        expectedVersion: 1,
        title: "古い画面からの上書き",
      }),
    ).toThrow(/更新されています/);
    expect(store.getMaterial(alice.id, material.id).title).toBe("変更");
    expect(
      store.updateMaterial(alice.id, material.id, {
        expectedVersion: 2,
        title: "添付なし",
        files: [],
      }).files,
    ).toHaveLength(0);
  });

  it("validates URLs, extensions, signatures, file names and aggregate sizes before saving", () => {
    const vaultId = store.listVaults(alice.id)[0].id;
    expect(() =>
      store.createMaterial(alice.id, vaultId, {
        title: "教材",
        sourceUrl: "javascript:alert(1)",
      }),
    ).toThrow(VaultError);
    expect(() =>
      store.createMaterial(alice.id, vaultId, {
        title: "教材",
        files: [{ ...file, name: "../教材.txt" }],
      }),
    ).toThrow(VaultError);
    expect(() =>
      store.createMaterial(alice.id, vaultId, {
        title: "教材",
        files: [{ ...file, name: "x.html" }],
      }),
    ).toThrow(VaultError);
    expect(() =>
      store.createMaterial(alice.id, vaultId, {
        title: "教材",
        files: [{ ...file, name: "x.pdf" }],
      }),
    ).toThrow(VaultError);
    expect(() =>
      store.createMaterial(alice.id, vaultId, {
        title: "教材",
        files: Array.from({ length: 11 }, () => file),
      }),
    ).toThrow(VaultError);
    const oversized = {
      ...file,
      data: new Uint8Array(11 * 1024 * 1024).fill(65),
    };
    expect(() =>
      store.createMaterial(alice.id, vaultId, {
        title: "教材",
        files: [oversized],
      }),
    ).toThrow(VaultError);
    const medium = { ...file, data: new Uint8Array(6 * 1024 * 1024).fill(65) };
    expect(() =>
      store.createMaterial(alice.id, vaultId, {
        title: "教材",
        files: [medium, medium],
      }),
    ).toThrow(VaultError);
    expect(store.listMaterials(alice.id, vaultId)).toHaveLength(0);
    expect(
      () => new VaultStore(path.join(directory, "public", "data")),
    ).toThrow(VaultError);
  });
});

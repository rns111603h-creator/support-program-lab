import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { VaultStore, type User } from "../src/lib/vault-store";
import { canReadVaultPath } from "../src/lib/vault-access";

describe("private route access revalidation", () => {
  let directory: string;
  let store: VaultStore;
  let alice: User;
  let bob: User;

  beforeEach(async () => {
    directory = mkdtempSync(path.join(tmpdir(), "spl-access-test-"));
    store = new VaultStore(directory);
    alice = await store.createUser({
      username: "alice",
      password: "synthetic-test-password",
    });
    bob = await store.createUser({
      username: "bob",
      password: "synthetic-test-password",
    });
  });
  afterEach(() => {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("checks the current account for the index and personal vault", () => {
    const vault = store.listVaults(alice.id)[0];
    expect(canReadVaultPath(store, alice.id, "/vault")).toBe(true);
    expect(canReadVaultPath(store, "missing-user", "/vault")).toBe(false);
    expect(canReadVaultPath(store, alice.id, `/vault/${vault.id}`)).toBe(true);
    expect(canReadVaultPath(store, bob.id, `/vault/${vault.id}`)).toBe(false);
  });

  it("binds material and edit access to the matching vault", () => {
    const vault = store.listVaults(alice.id)[0];
    const team = store.createVault(alice.id, "架空チーム");
    const material = store.createMaterial(alice.id, vault.id, {
      title: "架空教材",
    });
    const route = `/vault/${vault.id}/materials/${material.id}`;
    expect(canReadVaultPath(store, alice.id, route)).toBe(true);
    expect(canReadVaultPath(store, alice.id, `${route}/edit`)).toBe(true);
    expect(canReadVaultPath(store, bob.id, route)).toBe(false);
    expect(
      canReadVaultPath(
        store,
        alice.id,
        `/vault/${team.id}/materials/${material.id}`,
      ),
    ).toBe(false);
    expect(
      canReadVaultPath(store, alice.id, `/vault/${vault.id}/materials/new`),
    ).toBe(true);
  });

  it("denies restored routes after team removal", () => {
    const team = store.createVault(alice.id, "架空チーム");
    store.acceptInvite(bob.id, store.createInvite(alice.id, team.id).token);
    const material = store.createMaterial(alice.id, team.id, {
      title: "架空教材",
    });
    const route = `/vault/${team.id}/materials/${material.id}`;
    expect(canReadVaultPath(store, bob.id, route)).toBe(true);
    store.removeMember(alice.id, team.id, bob.id);
    expect(canReadVaultPath(store, bob.id, route)).toBe(false);
  });

  it("rejects malformed and unrelated paths", () => {
    for (const route of [
      "",
      "/",
      "//elsewhere/vault",
      "/vault/../",
      "/vault?x=1",
      "/vault/%2f",
      "/api/vault/access",
      "/vault/" + "a".repeat(600),
    ]) {
      expect(canReadVaultPath(store, alice.id, route)).toBe(false);
    }
  });
});

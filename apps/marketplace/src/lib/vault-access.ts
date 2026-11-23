import type { VaultStore } from "./vault-store";

export function canReadVaultPath(
  store: VaultStore,
  userId: string,
  pathname: string,
): boolean {
  if (pathname.length > 512) return false;
  try {
    const vaults = store.listVaults(userId);
    if (pathname === "/vault" || pathname === "/vault/") return true;
    const route =
      /^\/vault\/([a-f0-9-]{36})(?:\/materials\/(new|[a-f0-9-]{36})(?:\/(edit))?)?\/?$/i.exec(
        pathname,
      );
    if (!route || !vaults.some((vault) => vault.id === route[1])) return false;
    if (!route[2]) return true;
    if (route[2] === "new") return !route[3];
    return store.getMaterial(userId, route[2]).vaultId === route[1];
  } catch {
    return false;
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVaultStore, VaultError } from "@/lib/vault-store";
import { requireUser, signIn, signOut } from "@/lib/vault-auth";
import type { ActionState } from "@/components/vault-forms";

const value = (data: FormData, key: string) => String(data.get(key) ?? "");
const fail = (error: unknown): ActionState => ({
  error:
    error instanceof VaultError
      ? error.message
      : "処理を完了できませんでした。時間をおいて、もう一度お試しください。",
});
function nextPath(data: FormData) {
  const path = value(data, "next");
  return /^\/(?:vault(?:\/|$)|invite\/)/.test(path) &&
    !/[\\\x00-\x20]/.test(path)
    ? path
    : "/vault";
}

export async function signupAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  if (value(data, "password") !== value(data, "passwordConfirmation"))
    return { error: "確認用パスワードが一致しません。" };
  try {
    const user = await getVaultStore().createUser({
      username: value(data, "username"),
      password: value(data, "password"),
    });
    await signIn(user.id);
  } catch (error) {
    return fail(error);
  }
  redirect(nextPath(data));
}

export async function loginAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const user = await getVaultStore().authenticateUser({
      username: value(data, "username"),
      password: value(data, "password"),
    });
    await signIn(user.id);
  } catch (error) {
    return fail(error);
  }
  redirect(nextPath(data));
}

export async function logoutAction() {
  await signOut();
  redirect("/login");
}

export async function createVaultAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  let id: string;
  try {
    id = getVaultStore().createVault(user.id, value(data, "name")).id;
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/vault");
  redirect(`/vault/${id}`);
}

export async function inviteAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  try {
    const result = getVaultStore().createInvite(
      user.id,
      value(data, "vaultId"),
      Number(value(data, "days")) || 7,
    );
    return {
      success: "チーム招待リンクを発行しました。このリンクは1回だけ使えます。",
      link: `/invite/${result.token}`,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function acceptInviteAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  let id: string;
  try {
    id = getVaultStore().acceptInvite(user.id, value(data, "token")).id;
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/vault");
  redirect(`/vault/${id}`);
}

export async function removeMemberAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  try {
    getVaultStore().removeMember(
      user.id,
      value(data, "vaultId"),
      value(data, "memberId"),
    );
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/vault/${value(data, "vaultId")}`);
  return { success: "メンバーを削除しました。" };
}

async function materialInput(userId: string, data: FormData, editing = false) {
  const files = data
    .getAll("files")
    .filter((file): file is File => file instanceof File && file.size > 0);
  if (
    files.length > 10 ||
    files.some((file) => file.size > 10 * 1024 * 1024) ||
    files.reduce((sum, file) => sum + file.size, 0) > 10 * 1024 * 1024
  )
    throw new VaultError(
      "添付は10点以内、1点・合計ともに10MB以下で選択してください。",
      400,
    );
  const removeIds = data.getAll("removeFileIds").map(String);
  const attachments = [];
  if (editing && (files.length > 0 || removeIds.length > 0)) {
    const store = getVaultStore();
    const existing = store.getMaterial(userId, value(data, "materialId"));
    for (const file of existing.files) {
      if (!removeIds.includes(file.id)) {
        const kept = store.getFile(userId, existing.id, file.id);
        attachments.push({
          name: kept.name,
          mimeType: kept.mimeType,
          data: kept.data,
        });
      }
    }
  }
  for (const file of files)
    attachments.push({
      name: file.name,
      mimeType: file.type,
      data: new Uint8Array(await file.arrayBuffer()),
    });
  return {
    title: value(data, "title"),
    description: value(data, "description"),
    body: value(data, "body"),
    expectedVersion: Number(value(data, "version")),
    tags: value(data, "tags")
      .split(/[,、]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    sourceUrl: value(data, "sourceUrl"),
    rightsBasis: value(data, "rightsBasis"),
    ...(!editing || files.length > 0 || removeIds.length > 0
      ? { files: attachments }
      : {}),
  };
}

export async function createMaterialAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  let id: string;
  const vaultId = value(data, "vaultId");
  try {
    id = getVaultStore().createMaterial(
      user.id,
      vaultId,
      await materialInput(user.id, data),
    ).id;
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/vault/${vaultId}`);
  redirect(`/vault/${vaultId}/materials/${id}`);
}

export async function updateMaterialAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  let vaultId: string;
  const materialId = value(data, "materialId");
  try {
    vaultId = getVaultStore().updateMaterial(
      user.id,
      materialId,
      await materialInput(user.id, data, true),
    ).vaultId;
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/vault/${vaultId}`);
  revalidatePath(`/vault/${vaultId}/materials/${materialId}`);
  redirect(`/vault/${vaultId}/materials/${materialId}`);
}

export async function deleteMaterialAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  let vaultId: string;
  try {
    const store = getVaultStore();
    vaultId = store.getMaterial(user.id, value(data, "materialId")).vaultId;
    store.deleteMaterial(
      user.id,
      value(data, "materialId"),
      Number(value(data, "version")),
    );
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/vault/${vaultId}`);
  redirect(`/vault/${vaultId}`);
}

export async function createShareAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  try {
    const store = getVaultStore();
    const materialId = value(data, "materialId");
    const share = store.createShare(user.id, materialId, {
      expiresInDays: Number(value(data, "days")) || 7,
      acknowledged: data.get("acknowledged") === "on",
      expectedVersion: Number(value(data, "version")),
    });
    const material = store.getMaterial(user.id, materialId);
    revalidatePath(`/vault/${material.vaultId}/materials/${materialId}`);
    return {
      success:
        "閲覧専用リンクを発行しました。有効期限内でも、いつでも無効にできます。",
      link: `/share/${share.token}`,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function revokeShareAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  try {
    const store = getVaultStore();
    const materialId = value(data, "materialId");
    store.revokeShare(user.id, materialId, value(data, "shareId"));
    const material = store.getMaterial(user.id, materialId);
    revalidatePath(`/vault/${material.vaultId}/materials/${materialId}`);
  } catch (error) {
    return fail(error);
  }
  return { success: "共有リンクを無効にしました。" };
}

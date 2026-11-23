import { getCurrentUser } from "@/lib/vault-auth";
import { getVaultStore } from "@/lib/vault-store";
import { downloadResponse, unavailableDownload } from "@/lib/vault-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ materialId: string; fileId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unavailableDownload(401);
  const { materialId, fileId } = await context.params;
  try {
    return downloadResponse(
      getVaultStore().getFile(user.id, materialId, fileId),
    );
  } catch {
    return unavailableDownload();
  }
}

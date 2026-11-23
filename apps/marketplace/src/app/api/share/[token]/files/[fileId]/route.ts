import { getVaultStore } from "@/lib/vault-store";
import { downloadResponse, unavailableDownload } from "@/lib/vault-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string; fileId: string }> },
) {
  const { token, fileId } = await context.params;
  try {
    const file = getVaultStore().getSharedFile(token, fileId);
    return file ? downloadResponse(file) : unavailableDownload();
  } catch {
    return unavailableDownload();
  }
}

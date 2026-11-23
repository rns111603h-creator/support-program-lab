import { getCurrentUser } from "@/lib/vault-auth";
import { getVaultStore } from "@/lib/vault-store";
import { canReadVaultPath } from "@/lib/vault-access";
import { privateDownloadHeaders } from "@/lib/vault-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return Response.json(
      { allowed: false },
      { status: 401, headers: privateDownloadHeaders },
    );
  const pathname = new URL(request.url).searchParams.get("path") || "";
  const allowed = canReadVaultPath(getVaultStore(), user.id, pathname);
  return Response.json(
    { userId: user.id, allowed },
    { status: allowed ? 200 : 403, headers: privateDownloadHeaders },
  );
}

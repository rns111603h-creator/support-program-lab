export const privateDownloadHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
};

export function downloadResponse(file: {
  name: string;
  mimeType: string;
  data: Uint8Array;
}) {
  const encodedName = encodeURIComponent(file.name).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return new Response(new Uint8Array(file.data), {
    headers: {
      ...privateDownloadHeaders,
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="download"; filename*=UTF-8''${encodedName}`,
      "Content-Length": String(file.data.byteLength),
    },
  });
}

export function unavailableDownload(status = 404) {
  return new Response(
    "ファイルを開けません。ログイン状態・権限・リンクの期限をご確認ください。",
    {
      status,
      headers: {
        ...privateDownloadHeaders,
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
}

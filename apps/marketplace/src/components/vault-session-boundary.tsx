"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

const AUTH_CHANNEL = "spl-vault-auth";
const AUTH_EVENT = "spl-vault-auth-event";

function announceAuthChange() {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.postMessage("changed");
    channel.close();
  }
  try {
    // Only an event nonce is stored. Account IDs and session tokens stay out of storage.
    localStorage.setItem(AUTH_EVENT, crypto.randomUUID());
  } catch {
    // History, focus and visibility revalidation also work when storage is disabled.
  }
}

export function VaultAuthSignal() {
  useEffect(() => {
    announceAuthChange();
  }, []);
  return null;
}

export function VaultSessionBoundary({
  expectedUserId,
  children,
}: {
  expectedUserId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const accessKey = `${expectedUserId}:${pathname}`;
  const content = useRef<HTMLDivElement>(null);
  const [verifiedKey, setVerifiedKey] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const verified = verifiedKey === accessKey;

  useEffect(() => {
    let active = true;
    let generation = 0;
    let controller: AbortController | undefined;

    const conceal = () => {
      // pagehide can freeze React updates. Hide the cached DOM before it can be restored.
      if (content.current) {
        content.current.hidden = true;
        content.current.inert = true;
      }
    };
    const verify = async () => {
      controller?.abort();
      controller = new AbortController();
      const attempt = ++generation;
      try {
        const response = await fetch(
          `/api/vault/access?path=${encodeURIComponent(pathname)}`,
          {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          },
        );
        if (!active || attempt !== generation) return;
        if (response.status === 401) {
          conceal();
          window.location.replace("/login");
          return;
        }
        if (response.status === 403) {
          conceal();
          window.location.replace("/vault");
          return;
        }
        if (!response.ok) throw new Error("access-unavailable");
        const result = (await response.json()) as {
          userId?: string;
          allowed?: boolean;
        };
        if (!active || attempt !== generation) return;
        if (result.userId !== expectedUserId || result.allowed !== true) {
          conceal();
          window.location.replace("/vault");
          return;
        }
        setError(false);
        setVerifiedKey(accessKey);
      } catch (failure) {
        if (
          !active ||
          attempt !== generation ||
          (failure instanceof DOMException && failure.name === "AbortError")
        )
          return;
        conceal();
        setVerifiedKey(null);
        setError(true);
      }
    };
    const invalidate = () => {
      conceal();
      setVerifiedKey(null);
      setError(false);
      void verify();
    };
    const hide = () => {
      conceal();
      setVerifiedKey(null);
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") hide();
      else invalidate();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === AUTH_EVENT) invalidate();
    };
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(AUTH_CHANNEL)
        : null;
    if (channel) channel.onmessage = invalidate;
    window.addEventListener("popstate", invalidate);
    window.addEventListener("pageshow", invalidate);
    window.addEventListener("pagehide", hide);
    window.addEventListener("focus", invalidate);
    window.addEventListener("storage", storage);
    document.addEventListener("visibilitychange", visibility);
    void verify();
    announceAuthChange();
    return () => {
      active = false;
      generation++;
      controller?.abort();
      channel?.close();
      conceal();
      window.removeEventListener("popstate", invalidate);
      window.removeEventListener("pageshow", invalidate);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("focus", invalidate);
      window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [accessKey, expectedUserId, pathname, retry]);

  return (
    <>
      {!verified && (
        <div className="mx-auto max-w-xl p-8 text-sm leading-7" role="status">
          {error ? (
            <>
              <p>
                権限を確認できないため、教材を隠しています。通信状態を確認して再試行してください。
              </p>
              <button
                className="mt-4 min-h-12 rounded-lg border px-4"
                onClick={() => setRetry((value) => value + 1)}
              >
                再試行
              </button>
            </>
          ) : (
            <p>教材を開く権限を確認しています…</p>
          )}
        </div>
      )}
      <div ref={content} hidden={!verified} inert={!verified}>
        {children}
      </div>
      <noscript>
        教材保管庫を利用するにはJavaScriptを有効にしてください。
      </noscript>
    </>
  );
}

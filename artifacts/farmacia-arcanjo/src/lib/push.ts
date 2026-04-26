const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

export async function registrarPushNotification(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") return false;

    const res = await fetch(`${API_BASE}/push/vapid-public-key`);
    const { key } = await res.json() as { key: string };
    if (!key) return false;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });

    await fetch(`${API_BASE}/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });

    return true;
  } catch (err) {
    console.warn("Push registration failed:", err);
    return false;
  }
}

export async function enviarPushAdmin(titulo: string, corpo: string, url?: string): Promise<{ enviadas: number; total: number; falhas: number }> {
  const res = await fetch(`${API_BASE}/push/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo, corpo, url }),
  });
  return res.json();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

import { Router } from "express";
import webpush from "web-push";

const router = Router();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:farmaciarcanjo@gmail.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

const assinaturas: webpush.PushSubscription[] = [];

router.get("/vapid-public-key", (_req, res) => {
  res.json({ key: VAPID_PUBLIC_KEY });
});

router.post("/subscribe", (req, res) => {
  const sub = req.body as webpush.PushSubscription;
  if (!sub || !sub.endpoint) {
    res.status(400).json({ error: "Assinatura inválida" });
    return;
  }
  const existe = assinaturas.find(s => s.endpoint === sub.endpoint);
  if (!existe) assinaturas.push(sub);
  res.json({ ok: true, total: assinaturas.length });
});

router.post("/send", async (req, res) => {
  const { titulo, corpo, url } = req.body as { titulo: string; corpo: string; url?: string };
  if (!titulo || !corpo) {
    res.status(400).json({ error: "Título e corpo são obrigatórios" });
    return;
  }
  const payload = JSON.stringify({ titulo, corpo, url: url || "/" });
  let enviadas = 0;
  const falhas: string[] = [];
  for (const sub of assinaturas) {
    try {
      await webpush.sendNotification(sub, payload);
      enviadas++;
    } catch (err: any) {
      falhas.push(sub.endpoint.slice(0, 40) + "...");
    }
  }
  res.json({ enviadas, falhas: falhas.length, total: assinaturas.length });
});

export default router;

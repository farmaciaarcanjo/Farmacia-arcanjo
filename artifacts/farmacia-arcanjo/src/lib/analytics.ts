import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export type TipoEvento = "visita" | "lara_mensagem" | "whatsapp_click" | "produto_adicionado";

export interface EventoAnalytics {
  tipo: TipoEvento;
  data: string;
  ts: number;
  produto?: string;
}

const LS_KEY = "farmacia_analytics_v1";

function hoje(): string {
  return new Date().toISOString().split("T")[0];
}

function carregarEventos(): EventoAnalytics[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}

function salvarEventos(eventos: EventoAnalytics[]) {
  const limite = 500;
  const cortado = eventos.slice(-limite);
  try { localStorage.setItem(LS_KEY, JSON.stringify(cortado)); } catch {}
}

async function enviarFirebase(evento: EventoAnalytics) {
  try {
    await addDoc(collection(db, "analytics"), {
      ...evento,
      createdAt: serverTimestamp(),
    });
  } catch {}
}

function registrar(tipo: TipoEvento, extra?: { produto?: string }) {
  const evento: EventoAnalytics = { tipo, data: hoje(), ts: Date.now(), ...extra };
  const eventos = carregarEventos();
  eventos.push(evento);
  salvarEventos(eventos);
  enviarFirebase(evento);
}

export function trackVisita() {
  const jaRegistrou = sessionStorage.getItem("fa_visita_registrada");
  if (jaRegistrou) return;
  sessionStorage.setItem("fa_visita_registrada", "1");
  registrar("visita");
}

export function trackLaraMensagem() {
  registrar("lara_mensagem");
}

export function trackWhatsAppClick(produto?: string) {
  registrar("whatsapp_click", produto ? { produto } : undefined);
}

export function trackProdutoAdicionado(produto: string) {
  registrar("produto_adicionado", { produto });
}

export function getEventos(): EventoAnalytics[] {
  return carregarEventos();
}

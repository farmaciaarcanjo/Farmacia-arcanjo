import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, collection, doc,
  addDoc, setDoc, getDocs, deleteDoc,
  onSnapshot, orderBy, query, serverTimestamp, limit, where,
  type Unsubscribe,
} from "firebase/firestore";
import type { Produto } from "../data/produtos";

const firebaseConfig = {
  apiKey:            "AIzaSyBojIfPxkkNnk-OYP80k6bGP6Fc_a4KJT4",
  authDomain:        "farmacia-arcanjo.firebaseapp.com",
  projectId:         "farmacia-arcanjo",
  storageBucket:     "farmacia-arcanjo.firebasestorage.app",
  messagingSenderId: "934974132501",
  appId:             "1:934974132501:web:d8248e9d6b76143874d91c",
  measurementId:     "G-XZZ7KT3W2N",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);

function produtoParaFirestore(p: Produto): Record<string, unknown> {
  return {
    id:            p.id,
    nome:          p.nome,
    preco:         p.preco,
    precoOriginal: p.precoOriginal ?? null,
    precoCusto:    p.precoCusto ?? null,
    categoria:     p.categoria,
    emoji:         p.emoji,
    desc:          p.desc ?? "",
    prescricao:    p.prescricao ?? false,
    usoControlado: p.usoControlado ?? false,
    estoque:       p.estoque ?? null,
    codigoBarras:    p.codigoBarras ?? null,
    codigoSisMoura:  p.codigoSisMoura ?? null,
    promocao:        p.promocao ?? null,
    updatedAt:     serverTimestamp(),
  };
}

function firestoreParaProduto(data: Record<string, unknown>): Produto {
  return {
    id:            Number(data.id),
    nome:          String(data.nome ?? ""),
    preco:         Number(data.preco ?? 0),
    precoOriginal: data.precoOriginal != null ? Number(data.precoOriginal) : undefined,
    precoCusto:    data.precoCusto != null ? Number(data.precoCusto) : undefined,
    categoria:     String(data.categoria ?? "Geral"),
    emoji:         String(data.emoji ?? "💊"),
    desc:          String(data.desc ?? ""),
    prescricao:    Boolean(data.prescricao),
    usoControlado: Boolean(data.usoControlado),
    estoque:       data.estoque != null ? Number(data.estoque) : undefined,
    codigoBarras:   data.codigoBarras   != null ? String(data.codigoBarras)   : undefined,
    codigoSisMoura: data.codigoSisMoura != null ? String(data.codigoSisMoura) : undefined,
    promocao:      (data.promocao as Produto["promocao"]) ?? undefined,
  };
}

export async function salvarProdutoFirebase(produto: Produto): Promise<boolean> {
  try {
    await setDoc(
      doc(db, "produtos", String(produto.id)),
      produtoParaFirestore(produto),
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error("[Firebase] Erro ao salvar produto:", err);
    return false;
  }
}

export async function buscarProdutosFirebase(): Promise<Produto[] | null> {
  try {
    const snap = await getDocs(collection(db, "produtos"));
    if (snap.empty) return null;
    return snap.docs.map(d => firestoreParaProduto(d.data() as Record<string, unknown>));
  } catch { return null; }
}

export async function deletarProdutoFirebase(id: number): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "produtos", String(id)));
    return true;
  } catch { return false; }
}

export function escutarProdutosFirebase(
  onData: (produtos: Produto[]) => void,
  onError?: () => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "produtos"),
    snap => {
      if (snap.empty) return;
      onData(snap.docs.map(d => firestoreParaProduto(d.data() as Record<string, unknown>)));
    },
    () => onError?.()
  );
}

export interface ItemPedidoFirebase {
  produto: string;
  quantidade: number;
  precoUnitario: number;
}

export async function registrarPedidoFirebase(dados: {
  cliente: string;
  itens: ItemPedidoFirebase[];
  total: number;
  pagamento: string;
}): Promise<string | null> {
  try {
    const ref = await addDoc(collection(db, "pedidos"), {
      ...dados,
      status: "whatsapp",
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch { return null; }
}

export async function registrarLogFirebase(entry: Record<string, unknown>): Promise<void> {
  try {
    await addDoc(collection(db, "admin_log"), { ...entry, createdAt: serverTimestamp() });
  } catch {}
}

export async function registrarAnalyticsFirebase(entry: Record<string, unknown>): Promise<void> {
  try {
    await addDoc(collection(db, "analytics"), { ...entry, createdAt: serverTimestamp() });
  } catch {}
}

export interface InteracaoLara {
  sessao: string;
  primeiraMensagem: string;
  ts: number;
}

export async function registrarInteracaoLara(dados: InteracaoLara): Promise<void> {
  try {
    await addDoc(collection(db, "interacoes_lara"), {
      ...dados,
      createdAt: serverTimestamp(),
    });
  } catch {}
}

export interface CliqueWhatsApp {
  tipo: "clique_whatsapp";
  ts: number;
  produtos: string[];
  url: string;
}

export async function registrarCliqueWhatsAppFirebase(dados: CliqueWhatsApp): Promise<void> {
  try {
    await addDoc(collection(db, "cliques_whatsapp"), {
      ...dados,
      createdAt: serverTimestamp(),
    });
  } catch {}
}

export async function buscarInteracoesLara(maxRegistros = 100): Promise<InteracaoLara[]> {
  try {
    const q = query(collection(db, "interacoes_lara"), orderBy("createdAt", "desc"), limit(maxRegistros));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as Record<string, unknown>;
      return {
        sessao: String(data.sessao ?? ""),
        primeiraMensagem: String(data.primeiraMensagem ?? ""),
        ts: Number(data.ts ?? 0),
      };
    });
  } catch { return []; }
}

export async function buscarCliquesWhatsApp(maxRegistros = 100): Promise<CliqueWhatsApp[]> {
  try {
    const q = query(collection(db, "cliques_whatsapp"), orderBy("createdAt", "desc"), limit(maxRegistros));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as Record<string, unknown>;
      return {
        tipo: "clique_whatsapp" as const,
        ts: Number(data.ts ?? 0),
        produtos: (data.produtos as string[]) ?? [],
        url: String(data.url ?? ""),
      };
    });
  } catch { return []; }
}

// ── Clientes com Dívida ────────────────────────────────────────────────────────
export async function salvarClienteDividaFirebase(cliente: Record<string, unknown>): Promise<void> {
  try {
    await setDoc(doc(db, "clientes_dividas", String(cliente.id)), {
      ...cliente,
      updatedAt: serverTimestamp(),
    });
  } catch {}
}

export async function buscarClientesDividaFirebase(): Promise<Record<string, unknown>[]> {
  try {
    const snap = await getDocs(collection(db, "clientes_dividas"));
    return snap.docs.map(d => d.data() as Record<string, unknown>);
  } catch { return []; }
}

export async function deletarClienteDividaFirebase(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "clientes_dividas", id));
  } catch {}
}

export function escutarClientesFirebase(
  onData: (clientes: Record<string, unknown>[]) => void
): () => void {
  return onSnapshot(
    collection(db, "clientes_dividas"),
    snap => {
      onData(snap.docs.map(d => d.data() as Record<string, unknown>));
    },
    () => {}
  );
}

// ── Lembretes de Clientes ─────────────────────────────────────────────────────
export async function salvarLembreteFirebase(lembrete: Record<string, unknown>): Promise<void> {
  try {
    await setDoc(doc(db, "lembretes_clientes", String(lembrete.id)), {
      ...lembrete,
      updatedAt: serverTimestamp(),
    });
  } catch {}
}

export async function buscarLembretesFirebase(): Promise<Record<string, unknown>[]> {
  try {
    const snap = await getDocs(collection(db, "lembretes_clientes"));
    return snap.docs.map(d => d.data() as Record<string, unknown>);
  } catch { return []; }
}

export async function deletarLembreteFirebase(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "lembretes_clientes", id));
  } catch {}
}

// ── Pedidos / Fechamento de Caixa ─────────────────────────────────────────────
export interface PedidoFirebase {
  id: string;
  data: string;
  cliente?: string;
  itens: Array<{ produtoId: string; nome: string; quantidade: number; precoUnitario: number }>;
  total: number;
  formaPagamento: string;
  status: "concluido" | "pendente" | "cancelado";
}

export async function salvarPedidoCaixaFirebase(pedido: PedidoFirebase): Promise<void> {
  try {
    await setDoc(doc(db, "pedidos_caixa", pedido.id), {
      ...pedido,
      createdAt: serverTimestamp(),
    });
  } catch {}
}

export async function buscarPedidosCaixaFirebase(): Promise<PedidoFirebase[]> {
  try {
    const q = query(collection(db, "pedidos_caixa"), orderBy("createdAt", "desc"), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as PedidoFirebase);
  } catch { return []; }
}

export { addDoc, collection, serverTimestamp, query, orderBy, getDocs, doc, setDoc, deleteDoc, where };

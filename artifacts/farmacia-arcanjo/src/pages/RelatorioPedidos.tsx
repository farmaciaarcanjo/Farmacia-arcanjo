// ============================================================
// COMPONENTE: RelatorioPedidos.tsx
// FARMÁCIA ARCANJO — Painel Admin
// ============================================================
// COMO USAR:
// 1. Copie este arquivo para sua pasta de componentes no Replit
// 2. No seu Admin.tsx importe e use:
//    import RelatorioPedidos from './RelatorioPedidos'
//    <RelatorioPedidos />
//
// Os pedidos são salvos automaticamente no localStorage.
// Para registrar um pedido novo, chame a função salvarPedido()
// exportada no final deste arquivo, de qualquer lugar do app.
// ============================================================

import { useState, useEffect, useMemo } from "react";
import { buscarPedidosCaixaFirebase, type PedidoFirebase } from "../lib/firebase";

// ── Tipos ────────────────────────────────────────────────────
interface ItemPedido {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
}

interface Pedido {
  id: string;
  data: string; // ISO string
  cliente?: string;
  itens: ItemPedido[];
  total: number;
  status: "concluido" | "pendente" | "cancelado";
}

type Periodo = "hoje" | "semana" | "mes" | "todos";

// ── Helpers de data ──────────────────────────────────────────
const inicio = (periodo: Periodo): Date => {
  const d = new Date();
  if (periodo === "hoje") { d.setHours(0, 0, 0, 0); return d; }
  if (periodo === "semana") { d.setDate(d.getDate() - 7); return d; }
  if (periodo === "mes") { d.setDate(d.getDate() - 30); return d; }
  return new Date(0);
};

const fmtData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

const fmtMoeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Persistência ─────────────────────────────────────────────
const CHAVE = "farmacia_arcanjo_pedidos";

export const carregarPedidos = (): Pedido[] => {
  try { return JSON.parse(localStorage.getItem(CHAVE) || "[]"); }
  catch { return []; }
};

export const salvarPedido = (pedido: Omit<Pedido, "id" | "data">) => {
  const pedidos = carregarPedidos();
  const novo: Pedido = { ...pedido, id: Date.now().toString(), data: new Date().toISOString() };
  localStorage.setItem(CHAVE, JSON.stringify([novo, ...pedidos]));
  return novo;
};

// ── Dados de demonstração ─────────────────────────────────────
const gerarDemoData = () => {
  const produtos = [
    { id: "1", nome: "Dipirona 500mg", preco: 8.9 },
    { id: "2", nome: "Losartana 50mg", preco: 12.5 },
    { id: "3", nome: "Nimesulida 100mg", preco: 6.75 },
    { id: "4", nome: "Amoxicilina 500mg", preco: 18.9 },
    { id: "5", nome: "Vitamina C 1g", preco: 22.0 },
    { id: "6", nome: "Omeprazol 20mg", preco: 9.5 },
  ];
  const clientes = ["Maria Silva", "João Santos", "Ana Oliveira", "Pedro Costa", ""];
  const pedidos: Pedido[] = [];
  for (let i = 0; i < 30; i++) {
    const data = new Date();
    data.setDate(data.getDate() - Math.floor(Math.random() * 30));
    const qtdItens = Math.floor(Math.random() * 3) + 1;
    const itens: ItemPedido[] = [];
    for (let j = 0; j < qtdItens; j++) {
      const p = produtos[Math.floor(Math.random() * produtos.length)];
      const qtd = Math.floor(Math.random() * 3) + 1;
      itens.push({ produtoId: p.id, nome: p.nome, quantidade: qtd, precoUnitario: p.preco });
    }
    const total = itens.reduce((s, it) => s + it.quantidade * it.precoUnitario, 0);
    pedidos.push({
      id: (1000 + i).toString(), data: data.toISOString(),
      cliente: clientes[Math.floor(Math.random() * clientes.length)],
      itens, total, status: Math.random() > 0.1 ? "concluido" : "pendente",
    });
  }
  return pedidos;
};

// ── Componente principal ─────────────────────────────────────
export default function RelatorioPedidos() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [abaSelecionada, setAbaSelecionada] = useState<"resumo" | "pedidos" | "produtos">("resumo");
  const [pedidoAberto, setPedidoAberto] = useState<string | null>(null);
  const [usandoDemo, setUsandoDemo] = useState(false);

  useEffect(() => {
    const salvos = carregarPedidos();
    if (salvos.length === 0) {
      setPedidos(gerarDemoData());
      setUsandoDemo(true);
    } else {
      setPedidos(salvos);
    }

    buscarPedidosCaixaFirebase().then((doFirebase: PedidoFirebase[]) => {
      if (doFirebase.length > 0) {
        const convertidos: Pedido[] = doFirebase.map(p => ({
          id: p.id,
          data: p.data,
          cliente: p.cliente,
          itens: p.itens.map(it => ({
            produtoId: it.produtoId,
            nome: it.nome,
            quantidade: it.quantidade,
            precoUnitario: it.precoUnitario,
          })),
          total: p.total,
          status: p.status,
        }));
        convertidos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        setPedidos(convertidos);
        localStorage.setItem(CHAVE, JSON.stringify(convertidos));
        setUsandoDemo(false);
      }
    });
  }, []);

  const pedidosFiltrados = useMemo(() => {
    const corte = inicio(periodo);
    return pedidos.filter(p => new Date(p.data) >= corte && p.status !== "cancelado");
  }, [pedidos, periodo]);

  const faturamento = useMemo(() => pedidosFiltrados.reduce((s, p) => s + p.total, 0), [pedidosFiltrados]);

  const ticketMedio = pedidosFiltrados.length > 0 ? faturamento / pedidosFiltrados.length : 0;

  const maisVendidos = useMemo(() => {
    const mapa: Record<string, { nome: string; quantidade: number; total: number }> = {};
    pedidosFiltrados.forEach(p =>
      p.itens.forEach(it => {
        if (!mapa[it.produtoId]) mapa[it.produtoId] = { nome: it.nome, quantidade: 0, total: 0 };
        mapa[it.produtoId].quantidade += it.quantidade;
        mapa[it.produtoId].total += it.quantidade * it.precoUnitario;
      })
    );
    return Object.values(mapa).sort((a, b) => b.quantidade - a.quantidade).slice(0, 8);
  }, [pedidosFiltrados]);

  const maxQtd = maisVendidos[0]?.quantidade || 1;

  // ── Estilos ──────────────────────────────────────────────
  const cor = { verde: "#16a34a", verdeClaro: "#22c55e", fundo: "#0f172a", card: "#1e293b", borda: "#334155", texto: "#f1f5f9", muted: "#94a3b8", amarelo: "#f59e0b", azul: "#3b82f6" };

  const s: Record<string, React.CSSProperties> = {
    wrap: { fontFamily: "'Segoe UI', sans-serif", background: cor.fundo, minHeight: "100vh", color: cor.texto, paddingBottom: 40 },
    header: { background: `linear-gradient(135deg, ${cor.verde}, #15803d)`, padding: "20px 20px 16px" },
    h1: { margin: 0, fontSize: 20, fontWeight: 700 },
    sub: { margin: "4px 0 0", fontSize: 13, color: "#bbf7d0" },
    demo: { background: "#78350f", color: "#fde68a", fontSize: 12, padding: "8px 16px", textAlign: "center" },
    periodos: { display: "flex", gap: 8, padding: "16px 16px 0", overflowX: "auto" },
    btnPeriodo: (ativo: boolean) => ({ background: ativo ? cor.verde : cor.card, color: ativo ? "#fff" : cor.muted, border: `1.5px solid ${ativo ? cor.verde : cor.borda}`, borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const }),
    cards: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "16px 16px 0" },
    cardM: { background: cor.card, borderRadius: 14, padding: 16, border: `1px solid ${cor.borda}` },
    cardLabel: { fontSize: 11, color: cor.muted, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6, fontWeight: 600 },
    cardValor: { fontSize: 22, fontWeight: 800, margin: 0 },
    abas: { display: "flex", borderBottom: `1px solid ${cor.borda}`, margin: "16px 16px 0" },
    aba: (ativo: boolean) => ({ flex: 1, padding: "12px 0", textAlign: "center" as const, fontSize: 13, fontWeight: 600, cursor: "pointer", color: ativo ? cor.verdeClaro : cor.muted, borderBottom: `2px solid ${ativo ? cor.verdeClaro : "transparent"}`, background: "none", border: "none", borderBottom2: ativo ? `2px solid ${cor.verdeClaro}` : "2px solid transparent" }),
    lista: { padding: "12px 16px" },
    itemPedido: { background: cor.card, borderRadius: 12, padding: "12px 14px", marginBottom: 10, border: `1px solid ${cor.borda}`, cursor: "pointer" },
    barraWrap: { background: "#0f172a", borderRadius: 6, height: 8, overflow: "hidden", marginTop: 6 },
    statusBadge: (s: string) => ({ display: "inline-block", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, background: s === "concluido" ? "#14532d" : "#78350f", color: s === "concluido" ? "#86efac" : "#fde68a" }),
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <p style={s.h1}>📊 Relatório de Pedidos</p>
        <p style={s.sub}>Farmácia Arcanjo — Painel Admin</p>
      </div>

      {usandoDemo && (
        <div style={s.demo}>
          ⚠️ Exibindo dados de demonstração. Os pedidos reais serão salvos automaticamente ao usar o app.
        </div>
      )}

      {/* Filtro de período */}
      <div style={s.periodos}>
        {(["hoje", "semana", "mes", "todos"] as Periodo[]).map(p => (
          <button key={p} style={s.btnPeriodo(periodo === p)} onClick={() => setPeriodo(p)}>
            {{ hoje: "Hoje", semana: "7 dias", mes: "30 dias", todos: "Tudo" }[p]}
          </button>
        ))}
      </div>

      {/* Cards de resumo */}
      <div style={s.cards}>
        <div style={{ ...s.cardM, gridColumn: "1 / -1", background: "linear-gradient(135deg,#14532d,#166534)" }}>
          <p style={s.cardLabel}>💰 Faturamento</p>
          <p style={{ ...s.cardValor, color: "#4ade80" }}>{fmtMoeda(faturamento)}</p>
        </div>
        <div style={s.cardM}>
          <p style={s.cardLabel}>🛒 Pedidos</p>
          <p style={{ ...s.cardValor, color: cor.azul }}>{pedidosFiltrados.length}</p>
        </div>
        <div style={s.cardM}>
          <p style={s.cardLabel}>🎯 Ticket Médio</p>
          <p style={{ ...s.cardValor, color: cor.amarelo }}>{fmtMoeda(ticketMedio)}</p>
        </div>
      </div>

      {/* Abas */}
      <div style={s.abas}>
        {(["resumo", "pedidos", "produtos"] as const).map(a => (
          <button key={a} style={s.aba(abaSelecionada === a)} onClick={() => setAbaSelecionada(a)}>
            {{ resumo: "📈 Resumo", pedidos: "🛒 Pedidos", produtos: "💊 Produtos" }[a]}
          </button>
        ))}
      </div>

      {/* ── ABA RESUMO ── */}
      {abaSelecionada === "resumo" && (
        <div style={s.lista}>
          <p style={{ color: cor.muted, fontSize: 13, marginBottom: 12 }}>Top produtos por quantidade vendida:</p>
          {maisVendidos.length === 0 && <p style={{ color: cor.muted, textAlign: "center" }}>Nenhum pedido no período.</p>}
          {maisVendidos.map((p, i) => (
            <div key={p.nome} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{i + 1}. {p.nome}</span>
                <span style={{ fontSize: 12, color: cor.verdeClaro, fontWeight: 700 }}>{p.quantidade} un.</span>
              </div>
              <div style={s.barraWrap}>
                <div style={{ height: "100%", width: `${(p.quantidade / maxQtd) * 100}%`, background: `linear-gradient(90deg, ${cor.verde}, ${cor.verdeClaro})`, borderRadius: 6, transition: "width 0.6s ease" }} />
              </div>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: cor.muted }}>{fmtMoeda(p.total)} em vendas</p>
            </div>
          ))}
        </div>
      )}

      {/* ── ABA PEDIDOS ── */}
      {abaSelecionada === "pedidos" && (
        <div style={s.lista}>
          {pedidosFiltrados.length === 0 && <p style={{ color: cor.muted, textAlign: "center" }}>Nenhum pedido no período.</p>}
          {pedidosFiltrados.map(p => (
            <div key={p.id} style={s.itemPedido} onClick={() => setPedidoAberto(pedidoAberto === p.id ? null : p.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
                    {p.cliente
                      ? <><span style={{ color: "#93c5fd" }}>👤 {p.cliente}</span></>
                      : <span style={{ color: cor.muted }}>Venda avulsa</span>}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 11, color: cor.muted }}>{fmtData(p.data)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: cor.verdeClaro }}>{fmtMoeda(p.total)}</p>
                  <span style={s.statusBadge(p.status)}>{p.status}</span>
                </div>
              </div>
              {pedidoAberto === p.id && (
                <div style={{ marginTop: 12, borderTop: `1px solid ${cor.borda}`, paddingTop: 10 }}>
                  {p.cliente && (
                    <div style={{ marginBottom: 8, padding: "6px 10px", background: "#1e3a5f", borderRadius: 6, fontSize: 12, color: "#93c5fd" }}>
                      👤 Cliente: <strong>{p.cliente}</strong>
                    </div>
                  )}
                  {p.itens.map((it, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: cor.muted, marginBottom: 4 }}>
                      <span>{it.nome} × {it.quantidade}</span>
                      <span>{fmtMoeda(it.quantidade * it.precoUnitario)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── ABA PRODUTOS ── */}
      {abaSelecionada === "produtos" && (
        <div style={s.lista}>
          {maisVendidos.length === 0 && <p style={{ color: cor.muted, textAlign: "center" }}>Nenhum dado no período.</p>}
          {maisVendidos.map((p, i) => (
            <div key={p.nome} style={{ ...s.itemPedido, cursor: "default", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: i < 3 ? cor.amarelo : cor.muted }}>#{i + 1}</span>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{p.nome}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: cor.muted }}>{p.quantidade} unidades vendidas</p>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: cor.verdeClaro }}>{fmtMoeda(p.total)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

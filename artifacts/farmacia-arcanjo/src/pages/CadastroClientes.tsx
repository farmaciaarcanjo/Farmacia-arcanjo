import { useState, useEffect, useMemo } from "react";
import { salvarClienteDividaFirebase } from "../lib/firebase";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface FiadoEntry {
  id: string;
  data: string;
  valor: number;
  descricao: string;
}

interface Divida {
  valorAtual: number;
  status: "em_dia" | "devendo" | "pago";
  historico: FiadoEntry[];
}

interface Compra {
  data: string;
  itens: string[];
  total: number;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  endereco: string;
  bairro: string;
  medicamentosContinuos: string[];
  historico: Compra[];
  dataCadastro: string;
  divida: Divida;
}

type Tela = "lista" | "form" | "detalhe";

// ── Persistência ──────────────────────────────────────────────────────────────
const CHAVE = "farmacia_arcanjo_clientes";

function dividaVazia(): Divida {
  return { valorAtual: 0, status: "em_dia", historico: [] };
}

function carregarClientes(): Cliente[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CHAVE) || "[]");
    return (raw as Cliente[]).map((c) => ({
      ...c,
      divida: c.divida ?? dividaVazia(),
    }));
  } catch { return []; }
}

function persistir(clientes: Cliente[]) {
  localStorage.setItem(CHAVE, JSON.stringify(clientes));
}

async function sincronizarFirebase(cliente: Cliente) {
  await salvarClienteDividaFirebase(cliente as unknown as Record<string, unknown>);
}

export const registrarCompraCliente = (telefone: string, compra: Compra) => {
  const clientes = carregarClientes();
  const idx = clientes.findIndex(c => c.telefone === telefone);
  if (idx >= 0) {
    clientes[idx].historico = [compra, ...clientes[idx].historico];
    persistir(clientes);
  }
};

// ── Form vazio ────────────────────────────────────────────────────────────────
function formVazio() {
  return { nome: "", telefone: "", endereco: "", bairro: "", medicamentosContinuos: [] as string[] };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTel = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
};
const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const fmtMoeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Componente ────────────────────────────────────────────────────────────────
export default function CadastroClientes() {
  const [tela, setTela] = useState<Tela>("lista");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(formVazio());
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [clienteAberto, setClienteAberto] = useState<Cliente | null>(null);
  const [novoMed, setNovoMed] = useState("");
  const [erro, setErro] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Modal fiado
  const [modalFiadoId, setModalFiadoId] = useState<string | null>(null);
  const [fiadoValor, setFiadoValor] = useState("");
  const [fiadoDesc, setFiadoDesc] = useState("");

  useEffect(() => { setClientes(carregarClientes()); }, []);

  const clientesFiltrados = useMemo(() => {
    if (!busca.trim()) return clientes;
    const q = busca.toLowerCase();
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      c.telefone.includes(q) ||
      c.bairro?.toLowerCase().includes(q) ||
      c.medicamentosContinuos.some(m => m.toLowerCase().includes(q))
    );
  }, [clientes, busca]);

  // ── Resumo ─────────────────────────────────────────────────────────────────
  const totalAberto = clientes.reduce((s, c) => s + (c.divida?.valorAtual ?? 0), 0);
  const totalDevendo = clientes.filter(c => c.divida?.status === "devendo").length;

  // ── Ações ──────────────────────────────────────────────────────────────────
  const salvarClientes = (atualizados: Cliente[]) => {
    setClientes(atualizados);
    persistir(atualizados);
  };

  const abrirNovo = () => { setForm(formVazio()); setEditandoId(null); setErro(""); setTela("form"); };

  const abrirEditar = (c: Cliente) => {
    setForm({ nome: c.nome, telefone: c.telefone, endereco: c.endereco, bairro: c.bairro, medicamentosContinuos: [...c.medicamentosContinuos] });
    setEditandoId(c.id); setErro(""); setTela("form");
  };

  const salvar = () => {
    if (!form.nome.trim()) { setErro("Nome é obrigatório."); return; }
    if (!form.telefone.trim()) { setErro("Telefone é obrigatório."); return; }
    setErro("");
    let atualizados: Cliente[];
    if (editandoId) {
      atualizados = clientes.map(c => c.id === editandoId ? { ...c, ...form } : c);
    } else {
      const novo: Cliente = {
        ...form,
        id: Date.now().toString(),
        historico: [],
        dataCadastro: new Date().toISOString(),
        divida: dividaVazia(),
      };
      atualizados = [novo, ...clientes];
      sincronizarFirebase(novo);
    }
    if (editandoId) {
      const cl = atualizados.find(c => c.id === editandoId);
      if (cl) sincronizarFirebase(cl);
    }
    salvarClientes(atualizados);
    setTela("lista");
  };

  const excluir = (id: string) => {
    salvarClientes(clientes.filter(c => c.id !== id));
    setConfirmDelete(null);
    if (tela === "detalhe") setTela("lista");
  };

  const adicionarMed = () => {
    if (!novoMed.trim()) return;
    setForm({ ...form, medicamentosContinuos: [...form.medicamentosContinuos, novoMed.trim()] });
    setNovoMed("");
  };

  const removerMed = (i: number) =>
    setForm({ ...form, medicamentosContinuos: form.medicamentosContinuos.filter((_, idx) => idx !== i) });

  // ── Fiado ──────────────────────────────────────────────────────────────────
  const abrirModalFiado = (id: string) => {
    setModalFiadoId(id); setFiadoValor(""); setFiadoDesc("");
  };

  const registrarFiado = () => {
    const valor = parseFloat(fiadoValor.replace(",", "."));
    if (!valor || valor <= 0) return;
    const atualizados = clientes.map(c => {
      if (c.id !== modalFiadoId) return c;
      const entry: FiadoEntry = {
        id: Date.now().toString(),
        data: new Date().toISOString(),
        valor,
        descricao: fiadoDesc.trim() || "Fiado registrado",
      };
      const novaDiv: Divida = {
        valorAtual: (c.divida?.valorAtual ?? 0) + valor,
        status: "devendo",
        historico: [entry, ...(c.divida?.historico ?? [])],
      };
      return { ...c, divida: novaDiv };
    });
    salvarClientes(atualizados);
    const cl = atualizados.find(c => c.id === modalFiadoId);
    if (cl) sincronizarFirebase(cl);
    setModalFiadoId(null);
  };

  const marcarPago = (id: string) => {
    const atualizados = clientes.map(c => {
      if (c.id !== id) return c;
      return { ...c, divida: { ...c.divida, valorAtual: 0, status: "pago" as const } };
    });
    salvarClientes(atualizados);
    const cl = atualizados.find(c => c.id === id);
    if (cl) sincronizarFirebase(cl);
  };

  const cobrarWhatsApp = (c: Cliente) => {
    const num = c.telefone.replace(/\D/g, "");
    const valor = fmtMoeda(c.divida?.valorAtual ?? 0);
    const msg = `Olá ${c.nome}! Passando para lembrar que você tem um valor pendente de ${valor} na Farmácia Arcanjo. Quando puder, pode passar aqui ou chamar no WhatsApp para combinarmos. Obrigado! 😊`;
    window.open(`https://wa.me/55${num}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // ── Badge ──────────────────────────────────────────────────────────────────
  function BadgeDivida({ d }: { d?: Divida }) {
    if (!d || d.status === "em_dia" || d.valorAtual === 0) return <span style={{ fontSize: 12, background: "#14532d", color: "#86efac", borderRadius: 20, padding: "3px 10px", fontWeight: 700 }}>🟢 Em dia</span>;
    if (d.status === "pago") return <span style={{ fontSize: 12, background: "#1e3a5f", color: "#93c5fd", borderRadius: 20, padding: "3px 10px", fontWeight: 700 }}>✅ Pago</span>;
    return <span style={{ fontSize: 12, background: "#450a0a", color: "#fca5a5", borderRadius: 20, padding: "3px 10px", fontWeight: 700 }}>🔴 Devendo {fmtMoeda(d.valorAtual)}</span>;
  }

  // ── Cores ──────────────────────────────────────────────────────────────────
  const c = { fundo: "#0f172a", card: "#1e293b", borda: "#334155", texto: "#f1f5f9", muted: "#94a3b8", amarelo: "#f59e0b", vermelho: "#dc2626", verde: "#16a34a" };

  const s: Record<string, React.CSSProperties> = {
    wrap: { fontFamily: "'Segoe UI', sans-serif", background: c.fundo, minHeight: "100vh", color: c.texto, paddingBottom: 80 },
    header: { background: "linear-gradient(135deg, #1565c0, #0d47a1)", padding: "20px 20px 16px" },
    h1: { margin: 0, fontSize: 20, fontWeight: 700 },
    sub: { margin: "4px 0 0", fontSize: 13, color: "#90caf9" },
    corpo: { padding: "16px" },
    input: { background: "#0f172a", border: `1.5px solid ${c.borda}`, borderRadius: 10, padding: "12px 14px", fontSize: 15, color: c.texto, width: "100%", boxSizing: "border-box" as const, marginBottom: 12 },
    label: { fontSize: 12, color: c.muted, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    btnAzul: { background: "linear-gradient(135deg, #1565c0, #0d47a1)", color: "#fff", border: "none", borderRadius: 12, padding: "13px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: 10 },
    btnCinza: { background: c.card, color: c.muted, border: `1px solid ${c.borda}`, borderRadius: 12, padding: "12px 20px", fontSize: 14, cursor: "pointer", width: "100%", marginBottom: 10 },
    card: { background: c.card, borderRadius: 14, padding: "14px 16px", marginBottom: 10, border: `1px solid ${c.borda}` },
    erro: { background: "#450a0a", border: `1px solid ${c.vermelho}`, color: "#fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 },
    fab: { position: "fixed" as const, bottom: 24, right: 24, background: "linear-gradient(135deg, #1565c0, #0d47a1)", color: "#fff", border: "none", borderRadius: 50, width: 56, height: 56, fontSize: 28, cursor: "pointer", boxShadow: "0 4px 20px rgba(21,101,192,0.5)", display: "flex", alignItems: "center", justifyContent: "center" },
    row: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    chip: { background: "#0f172a", border: `1px solid ${c.borda}`, borderRadius: 20, padding: "5px 12px", fontSize: 12, color: c.muted, display: "inline-flex", alignItems: "center", gap: 6, marginRight: 6, marginBottom: 6 },
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>

      {/* Modal Fiado */}
      {modalFiadoId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#1e293b", borderRadius: 20, padding: 24, width: "100%", maxWidth: 340, border: "1px solid #334155" }}>
            <p style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>💰 Registrar Fiado</p>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 6px", textTransform: "uppercase", fontWeight: 600 }}>Valor (R$)</p>
            <input
              type="number" step="0.01" placeholder="Ex: 25.50"
              value={fiadoValor} onChange={e => setFiadoValor(e.target.value)}
              style={{ ...s.input, marginBottom: 12 }}
            />
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 6px", textTransform: "uppercase", fontWeight: 600 }}>Descrição (opcional)</p>
            <input
              placeholder="Ex: Dipirona 500mg"
              value={fiadoDesc} onChange={e => setFiadoDesc(e.target.value)}
              style={{ ...s.input, marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={registrarFiado} style={{ flex: 1, background: "#c62828", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                ✅ Confirmar
              </button>
              <button onClick={() => setModalFiadoId(null)} style={{ flex: 1, background: "#334155", color: "#94a3b8", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={s.h1}>
              {tela === "lista" && "👥 Clientes"}
              {tela === "form" && (editandoId ? "✏️ Editar Cliente" : "➕ Novo Cliente")}
              {tela === "detalhe" && "👤 " + clienteAberto?.nome}
            </p>
            <p style={s.sub}>Farmácia Arcanjo</p>
          </div>
          {tela !== "lista" && (
            <button onClick={() => setTela("lista")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 20, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>
              ← Voltar
            </button>
          )}
        </div>
      </div>

      {/* ── LISTA ── */}
      {tela === "lista" && (
        <div style={s.corpo}>

          {/* Resumo */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            <div style={{ background: "#1e293b", borderRadius: 12, padding: "12px 8px", textAlign: "center", border: "1px solid #334155" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#90caf9" }}>{clientes.length}</div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>Clientes</div>
            </div>
            <div style={{ background: "#1e293b", borderRadius: 12, padding: "12px 8px", textAlign: "center", border: "1px solid #334155" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: totalAberto > 0 ? "#fca5a5" : "#86efac", lineHeight: 1.2 }}>{fmtMoeda(totalAberto)}</div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>Em Aberto</div>
            </div>
            <div style={{ background: "#1e293b", borderRadius: 12, padding: "12px 8px", textAlign: "center", border: "1px solid #334155" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: totalDevendo > 0 ? "#fca5a5" : "#86efac" }}>{totalDevendo}</div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>Devendo</div>
            </div>
          </div>

          <input
            style={{ ...s.input, marginBottom: 16 }}
            placeholder="🔍 Buscar por nome, telefone ou bairro..."
            value={busca} onChange={e => setBusca(e.target.value)}
          />

          <p style={{ color: c.muted, fontSize: 13, marginBottom: 12 }}>
            {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? "s" : ""}
          </p>

          {clientesFiltrados.length === 0 && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p style={{ fontSize: 40 }}>👥</p>
              <p style={{ color: c.muted }}>{busca ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}</p>
            </div>
          )}

          {clientesFiltrados.map(cl => (
            <div key={cl.id} style={{ ...s.card, borderColor: cl.divida?.status === "devendo" ? "#7f1d1d" : "#334155" }}>
              {/* Nome + Badge */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setClienteAberto(cl); setTela("detalhe"); }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{cl.nome}</p>
                  <p style={{ margin: "3px 0 6px", fontSize: 13, color: c.muted }}>{cl.telefone}</p>
                </div>
                <div>
                  <BadgeDivida d={cl.divida} />
                </div>
              </div>

              {/* Histórico fiado */}
              {cl.divida?.historico?.length > 0 && (
                <div style={{ marginBottom: 8, padding: "8px 10px", background: "#0f172a", borderRadius: 8 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Último fiado</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#f1f5f9" }}>
                    {cl.divida.historico[0].descricao} — {fmtMoeda(cl.divida.historico[0].valor)} em {fmtData(cl.divida.historico[0].data)}
                  </p>
                </div>
              )}

              {/* Botões de ação */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                <button
                  onClick={() => abrirModalFiado(cl.id)}
                  style={{ flex: 1, minWidth: 100, padding: "8px 6px", borderRadius: 8, border: "none", background: "#450a0a", color: "#fca5a5", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  💰 Reg. Fiado
                </button>
                <button
                  onClick={() => marcarPago(cl.id)}
                  style={{ flex: 1, minWidth: 100, padding: "8px 6px", borderRadius: 8, border: "none", background: "#14532d", color: "#86efac", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  ✅ Marcar Pago
                </button>
                <button
                  onClick={() => cobrarWhatsApp(cl)}
                  style={{ flex: 1, minWidth: 100, padding: "8px 6px", borderRadius: 8, border: "none", background: "#14532d", color: "#86efac", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  📲 Cobrar
                </button>
                <button onClick={() => abrirEditar(cl)} style={{ padding: "8px 10px", borderRadius: 8, border: "none", background: "#1e3a5f", color: "#93c5fd", fontSize: 14, cursor: "pointer" }}>✏️</button>
                <button onClick={() => setConfirmDelete(cl.id)} style={{ padding: "8px 10px", borderRadius: 8, border: "none", background: "#450a0a", color: "#fca5a5", fontSize: 14, cursor: "pointer" }}>🗑️</button>
              </div>

              {confirmDelete === cl.id && (
                <div style={{ marginTop: 12, background: "#450a0a", borderRadius: 10, padding: 12 }}>
                  <p style={{ color: "#fca5a5", fontSize: 13, margin: "0 0 10px" }}>Excluir {cl.nome}?</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => excluir(cl.id)} style={{ flex: 1, background: c.vermelho, color: "#fff", border: "none", borderRadius: 8, padding: "8px", fontSize: 13, cursor: "pointer" }}>Sim, excluir</button>
                    <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: c.card, color: c.muted, border: `1px solid ${c.borda}`, borderRadius: 8, padding: "8px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div style={{ height: 80 }} />
        </div>
      )}

      {/* ── FORMULÁRIO ── */}
      {tela === "form" && (
        <div style={s.corpo}>
          {erro && <div style={s.erro}>{erro}</div>}

          <label style={s.label}>Nome completo *</label>
          <input style={s.input} placeholder="Ex: Maria da Silva" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />

          <label style={s.label}>Telefone / WhatsApp *</label>
          <input style={s.input} placeholder="(88) 99999-9999" value={form.telefone}
            onChange={e => setForm({ ...form, telefone: fmtTel(e.target.value) })} />

          <label style={s.label}>Endereço</label>
          <input style={s.input} placeholder="Ex: Rua das Flores, 123" value={form.endereco}
            onChange={e => setForm({ ...form, endereco: e.target.value })} />

          <label style={s.label}>Bairro</label>
          <input style={s.input} placeholder="Ex: Centro" value={form.bairro}
            onChange={e => setForm({ ...form, bairro: e.target.value })} />

          <label style={s.label}>Medicamentos de uso contínuo</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input style={{ ...s.input, marginBottom: 0, flex: 1 }} placeholder="Ex: Losartana 50mg"
              value={novoMed} onChange={e => setNovoMed(e.target.value)}
              onKeyDown={e => e.key === "Enter" && adicionarMed()} />
            <button onClick={adicionarMed} style={{ background: "#1565c0", color: "#fff", border: "none", borderRadius: 10, padding: "0 16px", fontSize: 20, cursor: "pointer" }}>+</button>
          </div>
          <div style={{ marginBottom: 16 }}>
            {form.medicamentosContinuos.map((m, i) => (
              <span key={i} style={s.chip}>
                💊 {m}
                <button onClick={() => removerMed(i)} style={{ background: "none", border: "none", color: c.vermelho, cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>

          <button style={s.btnAzul} onClick={salvar}>
            {editandoId ? "💾 Salvar Alterações" : "➕ Cadastrar Cliente"}
          </button>
          <button style={s.btnCinza} onClick={() => setTela("lista")}>Cancelar</button>
        </div>
      )}

      {/* ── DETALHE ── */}
      {tela === "detalhe" && clienteAberto && (() => {
        const cl = clientes.find(c => c.id === clienteAberto.id) || clienteAberto;
        const totalGasto = cl.historico.reduce((s, h) => s + h.total, 0);
        return (
          <div style={s.corpo}>
            <div style={{ ...s.card, background: "linear-gradient(135deg, #0d47a1, #1565c0)", marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{cl.nome}</p>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#90caf9" }}>{cl.telefone}</p>
              {cl.endereco && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#bfdbfe" }}>📍 {cl.endereco}{cl.bairro ? `, ${cl.bairro}` : ""}</p>}
              <p style={{ margin: "8px 0 4px", fontSize: 11, color: "#93c5fd" }}>Cadastrado em {fmtData(cl.dataCadastro)}</p>
              <BadgeDivida d={cl.divida} />
            </div>

            {/* Ações fiado */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => abrirModalFiado(cl.id)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#450a0a", color: "#fca5a5", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>💰 Registrar Fiado</button>
              <button onClick={() => marcarPago(cl.id)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#14532d", color: "#86efac", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✅ Marcar Pago</button>
            </div>
            {cl.divida?.status === "devendo" && (
              <button onClick={() => cobrarWhatsApp(cl)} style={{ ...s.btnAzul, background: "linear-gradient(135deg, #128c7e, #25d366)", marginBottom: 12 }}>
                📲 Cobrar no WhatsApp ({fmtMoeda(cl.divida.valorAtual)})
              </button>
            )}

            <button onClick={() => abrirEditar(cl)} style={s.btnCinza}>✏️ Editar Cadastro</button>

            {/* Histórico fiado */}
            {(cl.divida?.historico?.length ?? 0) > 0 && (
              <div style={{ ...s.card, marginBottom: 16 }}>
                <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700 }}>💳 Histórico de Fiado</p>
                {cl.divida.historico.map((h) => (
                  <div key={h.id} style={{ borderTop: `1px solid ${c.borda}`, paddingTop: 8, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13 }}>{h.descricao}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: c.muted }}>{fmtData(h.data)}</p>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fca5a5" }}>+{fmtMoeda(h.valor)}</p>
                  </div>
                ))}
              </div>
            )}

            {cl.medicamentosContinuos.length > 0 && (
              <div style={{ ...s.card, marginBottom: 16 }}>
                <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700 }}>💊 Medicamentos Contínuos</p>
                {cl.medicamentosContinuos.map((m, i) => (
                  <span key={i} style={{ display: "inline-block", background: "#f59e0b22", color: "#f59e0b", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, marginRight: 4, marginBottom: 4 }}>💊 {m}</span>
                ))}
              </div>
            )}

            <div style={{ ...s.card, marginBottom: 16 }}>
              <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>📊 Histórico de Compras</p>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#90caf9", fontWeight: 700 }}>
                Total gasto: {fmtMoeda(totalGasto)}
              </p>
              {cl.historico.length === 0 && <p style={{ color: c.muted, fontSize: 13 }}>Nenhuma compra registrada ainda.</p>}
              {cl.historico.map((h, i) => (
                <div key={i} style={{ borderTop: `1px solid ${c.borda}`, paddingTop: 10, marginTop: 10 }}>
                  <div style={s.row}>
                    <p style={{ margin: 0, fontSize: 12, color: c.muted }}>{fmtData(h.data)}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#90caf9" }}>{fmtMoeda(h.total)}</p>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: c.muted }}>{h.itens.join(", ")}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* FAB */}
      {tela === "lista" && (
        <button style={s.fab} onClick={abrirNovo}>+</button>
      )}
    </div>
  );
}

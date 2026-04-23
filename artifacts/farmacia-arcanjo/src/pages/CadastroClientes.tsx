// ============================================================
// COMPONENTE: CadastroClientes.tsx
// FARMÁCIA ARCANJO — Painel Admin
// ============================================================
// COMO USAR:
// 1. Crie o arquivo CadastroClientes.tsx na pasta de componentes
// 2. Cole este código
// 3. No Admin.tsx importe:

// ============================================================

import { useState, useEffect, useMemo } from "react";

// ── Tipos ────────────────────────────────────────────────────
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
}

type Tela = "lista" | "form" | "detalhe";

// ── Persistência ─────────────────────────────────────────────
const CHAVE = "farmacia_arcanjo_clientes";

const carregarClientes = (): Cliente[] => {
  try { return JSON.parse(localStorage.getItem(CHAVE) || "[]"); }
  catch { return []; }
};

const persistir = (clientes: Cliente[]) => {
  localStorage.setItem(CHAVE, JSON.stringify(clientes));
};

export const registrarCompraCliente = (telefone: string, compra: Compra) => {
  const clientes = carregarClientes();
  const idx = clientes.findIndex(c => c.telefone === telefone);
  if (idx >= 0) {
    clientes[idx].historico = [compra, ...clientes[idx].historico];
    persistir(clientes);
  }
};

// ── Form vazio ───────────────────────────────────────────────
const formVazio = (): Omit<Cliente, "id" | "historico" | "dataCadastro"> => ({
  nome: "", telefone: "", endereco: "", bairro: "", medicamentosContinuos: [],
});

// ── Componente principal ─────────────────────────────────────
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

  useEffect(() => { setClientes(carregarClientes()); }, []);

  const clientesFiltrados = useMemo(() => {
    if (!busca.trim()) return clientes;
    const q = busca.toLowerCase();
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      c.telefone.includes(q) ||
      c.bairro.toLowerCase().includes(q) ||
      c.medicamentosContinuos.some(m => m.toLowerCase().includes(q))
    );
  }, [clientes, busca]);

  // ── Ações ────────────────────────────────────────────────
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
      const novo: Cliente = { ...form, id: Date.now().toString(), historico: [], dataCadastro: new Date().toISOString() };
      atualizados = [novo, ...clientes];
    }
    setClientes(atualizados);
    persistir(atualizados);
    setTela("lista");
  };

  const excluir = (id: string) => {
    const atualizados = clientes.filter(c => c.id !== id);
    setClientes(atualizados);
    persistir(atualizados);
    setConfirmDelete(null);
    if (tela === "detalhe") setTela("lista");
  };

  const adicionarMed = () => {
    if (!novoMed.trim()) return;
    setForm({ ...form, medicamentosContinuos: [...form.medicamentosContinuos, novoMed.trim()] });
    setNovoMed("");
  };

  const removerMed = (i: number) => {
    setForm({ ...form, medicamentosContinuos: form.medicamentosContinuos.filter((_, idx) => idx !== i) });
  };

  const abrirWhatsApp = (tel: string) => {
    const num = tel.replace(/\D/g, "");
    window.open(`https://wa.me/55${num}`, "_blank");
  };

  const fmtTel = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  };

  const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
  const fmtMoeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // ── Cores e estilos ───────────────────────────────────────
  const c = { verde: "#16a34a", verdeClaro: "#22c55e", fundo: "#0f172a", card: "#1e293b", borda: "#334155", texto: "#f1f5f9", muted: "#94a3b8", amarelo: "#f59e0b", vermelho: "#dc2626" };

  const s: Record<string, React.CSSProperties> = {
    wrap: { fontFamily: "'Segoe UI', sans-serif", background: c.fundo, minHeight: "100vh", color: c.texto, paddingBottom: 40 },
    header: { background: `linear-gradient(135deg, ${c.verde}, #15803d)`, padding: "20px 20px 16px" },
    h1: { margin: 0, fontSize: 20, fontWeight: 700 },
    sub: { margin: "4px 0 0", fontSize: 13, color: "#bbf7d0" },
    corpo: { padding: "16px" },
    input: { background: "#0f172a", border: `1.5px solid ${c.borda}`, borderRadius: 10, padding: "12px 14px", fontSize: 15, color: c.texto, width: "100%", boxSizing: "border-box" as const, marginBottom: 12 },
    label: { fontSize: 12, color: c.muted, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    btnVerde: { background: `linear-gradient(135deg, ${c.verde}, #15803d)`, color: "#fff", border: "none", borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: 10 },
    btnCinza: { background: c.card, color: c.muted, border: `1px solid ${c.borda}`, borderRadius: 12, padding: "12px 20px", fontSize: 14, cursor: "pointer", width: "100%", marginBottom: 10 },
    card: { background: c.card, borderRadius: 14, padding: "14px 16px", marginBottom: 10, border: `1px solid ${c.borda}` },
    badge: (cor: string) => ({ display: "inline-block", background: cor + "22", color: cor, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, marginRight: 4, marginBottom: 4 }),
    erro: { background: "#450a0a", border: `1px solid ${c.vermelho}`, color: "#fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 },
    fab: { position: "fixed" as const, bottom: 24, right: 24, background: `linear-gradient(135deg, ${c.verde}, #15803d)`, color: "#fff", border: "none", borderRadius: 50, width: 56, height: 56, fontSize: 28, cursor: "pointer", boxShadow: "0 4px 20px rgba(22,163,74,0.5)", display: "flex", alignItems: "center", justifyContent: "center" },
    row: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    chip: { background: "#0f172a", border: `1px solid ${c.borda}`, borderRadius: 20, padding: "5px 12px", fontSize: 12, color: c.muted, display: "inline-flex", alignItems: "center", gap: 6, marginRight: 6, marginBottom: 6 },
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={s.wrap}>
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
          <input style={{ ...s.input, marginBottom: 16 }} placeholder="🔍 Buscar por nome, telefone, bairro ou medicamento..." value={busca} onChange={e => setBusca(e.target.value)} />

          <p style={{ color: c.muted, fontSize: 13, marginBottom: 12 }}>
            {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? "s" : ""} {busca ? "encontrado" + (clientesFiltrados.length !== 1 ? "s" : "") : "cadastrado" + (clientesFiltrados.length !== 1 ? "s" : "")}
          </p>

          {clientesFiltrados.length === 0 && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p style={{ fontSize: 40 }}>👥</p>
              <p style={{ color: c.muted }}>{busca ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}</p>
            </div>
          )}

          {clientesFiltrados.map(cl => (
            <div key={cl.id} style={s.card}>
              <div style={s.row}>
                <div style={{ flex: 1 }} onClick={() => { setClienteAberto(cl); setTela("detalhe"); }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{cl.nome}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 13, color: c.muted }}>{cl.telefone}</p>
                  {cl.bairro && <p style={{ margin: "2px 0 0", fontSize: 12, color: c.muted }}>📍 {cl.bairro}</p>}
                  {cl.medicamentosContinuos.length > 0 && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: c.amarelo }}>
                      💊 {cl.medicamentosContinuos.slice(0, 2).join(", ")}{cl.medicamentosContinuos.length > 2 ? ` +${cl.medicamentosContinuos.length - 2}` : ""}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => abrirWhatsApp(cl.telefone)} style={{ background: "#14532d", border: "none", borderRadius: 10, padding: "8px 10px", fontSize: 18, cursor: "pointer" }}>📱</button>
                  <button onClick={() => abrirEditar(cl)} style={{ background: "#1e3a5f", border: "none", borderRadius: 10, padding: "8px 10px", fontSize: 18, cursor: "pointer" }}>✏️</button>
                  <button onClick={() => setConfirmDelete(cl.id)} style={{ background: "#450a0a", border: "none", borderRadius: 10, padding: "8px 10px", fontSize: 18, cursor: "pointer" }}>🗑️</button>
                </div>
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
            <button onClick={adicionarMed} style={{ background: c.verde, color: "#fff", border: "none", borderRadius: 10, padding: "0 16px", fontSize: 20, cursor: "pointer" }}>+</button>
          </div>
          <div style={{ marginBottom: 16 }}>
            {form.medicamentosContinuos.map((m, i) => (
              <span key={i} style={s.chip}>
                💊 {m}
                <button onClick={() => removerMed(i)} style={{ background: "none", border: "none", color: c.vermelho, cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>

          <button style={s.btnVerde} onClick={salvar}>
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
            <div style={{ ...s.card, background: "linear-gradient(135deg,#14532d,#166534)", marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{cl.nome}</p>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#bbf7d0" }}>{cl.telefone}</p>
              {cl.endereco && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#86efac" }}>📍 {cl.endereco}{cl.bairro ? `, ${cl.bairro}` : ""}</p>}
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "#86efac" }}>Cadastrado em {fmtData(cl.dataCadastro)}</p>
            </div>

            <button onClick={() => abrirWhatsApp(cl.telefone)} style={{ ...s.btnVerde, background: "#15803d" }}>
              📱 Abrir WhatsApp
            </button>
            <button onClick={() => abrirEditar(cl)} style={s.btnCinza}>✏️ Editar Cadastro</button>

            {cl.medicamentosContinuos.length > 0 && (
              <div style={{ ...s.card, marginBottom: 16 }}>
                <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700 }}>💊 Medicamentos Contínuos</p>
                {cl.medicamentosContinuos.map((m, i) => (
                  <span key={i} style={s.badge(c.amarelo)}>💊 {m}</span>
                ))}
              </div>
            )}

            <div style={{ ...s.card, marginBottom: 16 }}>
              <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>📊 Histórico de Compras</p>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: c.verdeClaro, fontWeight: 700 }}>
                Total gasto: {fmtMoeda(totalGasto)}
              </p>
              {cl.historico.length === 0 && <p style={{ color: c.muted, fontSize: 13 }}>Nenhuma compra registrada ainda.</p>}
              {cl.historico.map((h, i) => (
                <div key={i} style={{ borderTop: `1px solid ${c.borda}`, paddingTop: 10, marginTop: 10 }}>
                  <div style={s.row}>
                    <p style={{ margin: 0, fontSize: 12, color: c.muted }}>{fmtData(h.data)}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c.verdeClaro }}>{fmtMoeda(h.total)}</p>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: c.muted }}>{h.itens.join(", ")}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── FAB ── */}
      {tela === "lista" && (
        <button style={s.fab} onClick={abrirNovo}>+</button>
      )}
    </div>
  );
}

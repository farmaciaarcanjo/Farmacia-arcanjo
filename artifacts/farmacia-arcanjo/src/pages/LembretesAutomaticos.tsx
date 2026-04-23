// ============================================================
// COMPONENTE: LembretesAutomaticos.tsx
// FARMÁCIA ARCANJO — Painel Admin
// ============================================================
// COMO USAR:
// 1. Crie o arquivo LembretesAutomaticos.tsx na pasta de componentes
// 2. Cole este código
// 3. No Admin.tsx importe:
//    import LembretesAutomaticos from './LembretesAutomaticos'
//    <LembretesAutomaticos />
// ============================================================

import { useState, useEffect, useMemo } from "react";

// ── Tipos ────────────────────────────────────────────────────
interface LembreteCliente {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  medicamento: string;
  frequenciaDias: number; // a cada quantos dias
  proximoEnvio: string;   // ISO date
  ativo: boolean;
  ultimoEnvio?: string;
}

interface LembreteEstoque {
  id: string;
  produtoNome: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  ativo: boolean;
}

interface Notificacao {
  id: string;
  tipo: "cliente" | "estoque";
  mensagem: string;
  data: string;
  lida: boolean;
}

type Aba = "notificacoes" | "clientes" | "estoque";

// ── Persistência ─────────────────────────────────────────────
const CHAVE_LC = "farmacia_lembretes_clientes";
const CHAVE_LE = "farmacia_lembretes_estoque";
const CHAVE_NT = "farmacia_notificacoes";

const load = <T,>(chave: string): T[] => {
  try { return JSON.parse(localStorage.getItem(chave) || "[]"); }
  catch { return []; }
};
const save = <T,>(chave: string, data: T[]) => localStorage.setItem(chave, JSON.stringify(data));

// ── Helpers ───────────────────────────────────────────────────
const fmtData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

const diasAte = (iso: string) => {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const proximaData = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString();
};

const abrirWhatsApp = (telefone: string, mensagem: string) => {
  const num = telefone.replace(/\D/g, "");
  const txt = encodeURIComponent(mensagem);
  window.open(`https://wa.me/55${num}?text=${txt}`, "_blank");
};

// ── Dados demo ───────────────────────────────────────────────
const demoLembretesClientes = (): LembreteCliente[] => [
  { id: "lc1", clienteNome: "Maria Silva", clienteTelefone: "(88) 99111-1111", medicamento: "Losartana 50mg", frequenciaDias: 30, proximoEnvio: proximaData(2), ativo: true },
  { id: "lc2", clienteNome: "João Santos", clienteTelefone: "(88) 99222-2222", medicamento: "Metformina 850mg", frequenciaDias: 30, proximoEnvio: proximaData(0), ativo: true },
  { id: "lc3", clienteNome: "Ana Oliveira", clienteTelefone: "(88) 99333-3333", medicamento: "Atenolol 25mg", frequenciaDias: 30, proximoEnvio: proximaData(7), ativo: false },
];

const demoLembretesEstoque = (): LembreteEstoque[] => [
  { id: "le1", produtoNome: "Dipirona 500mg", estoqueAtual: 3, estoqueMinimo: 10, ativo: true },
  { id: "le2", produtoNome: "Amoxicilina 500mg", estoqueAtual: 5, estoqueMinimo: 8, ativo: true },
  { id: "le3", produtoNome: "Omeprazol 20mg", estoqueAtual: 12, estoqueMinimo: 10, ativo: true },
];

// ── Componente principal ─────────────────────────────────────
export default function LembretesAutomaticos() {
  const [aba, setAba] = useState<Aba>("notificacoes");
  const [lcsOriginal, setLcs] = useState<LembreteCliente[]>([]);
  const [les, setLes] = useState<LembreteEstoque[]>([]);
  const [notifs, setNotifs] = useState<Notificacao[]>([]);
  const [usandoDemo, setUsandoDemo] = useState(false);

  // form cliente
  const [showFormCliente, setShowFormCliente] = useState(false);
  const [fcNome, setFcNome] = useState("");
  const [fcTel, setFcTel] = useState("");
  const [fcMed, setFcMed] = useState("");
  const [fcDias, setFcDias] = useState("30");

  // form estoque
  const [showFormEstoque, setShowFormEstoque] = useState(false);
  const [feProd, setFeProd] = useState("");
  const [feAtual, setFeAtual] = useState("");
  const [feMin, setFeMin] = useState("10");

  useEffect(() => {
    let lc = load<LembreteCliente>(CHAVE_LC);
    let le = load<LembreteEstoque>(CHAVE_LE);
    const nt = load<Notificacao>(CHAVE_NT);
    let demo = false;
    if (lc.length === 0 && le.length === 0) {
      lc = demoLembretesClientes();
      le = demoLembretesEstoque();
      demo = true;
    }
    setLcs(lc);
    setLes(le);
    setNotifs(nt);
    setUsandoDemo(demo);
    gerarNotificacoes(lc, le, nt);
  }, []);

  const gerarNotificacoes = (lc: LembreteCliente[], le: LembreteEstoque[], ntExist: Notificacao[]) => {
    const novas: Notificacao[] = [...ntExist];
    const hoje = new Date().toDateString();

    lc.filter(l => l.ativo && diasAte(l.proximoEnvio) <= 1).forEach(l => {
      const jaExiste = novas.some(n => n.id === "lc-" + l.id + "-" + hoje);
      if (!jaExiste) {
        novas.unshift({ id: "lc-" + l.id + "-" + hoje, tipo: "cliente", mensagem: `💊 Lembrar ${l.clienteNome} de comprar ${l.medicamento}`, data: new Date().toISOString(), lida: false });
      }
    });

    le.filter(l => l.ativo && l.estoqueAtual <= l.estoqueMinimo).forEach(l => {
      const jaExiste = novas.some(n => n.id === "le-" + l.id + "-" + hoje);
      if (!jaExiste) {
        novas.unshift({ id: "le-" + l.id + "-" + hoje, tipo: "estoque", mensagem: `⚠️ Estoque baixo: ${l.produtoNome} (${l.estoqueAtual} un. restantes)`, data: new Date().toISOString(), lida: false });
      }
    });

    setNotifs(novas);
    save(CHAVE_NT, novas);
  };

  const naoLidas = useMemo(() => notifs.filter(n => !n.lida).length, [notifs]);

  const marcarLida = (id: string) => {
    const atualizadas = notifs.map(n => n.id === id ? { ...n, lida: true } : n);
    setNotifs(atualizadas);
    save(CHAVE_NT, atualizadas);
  };

  const marcarTodasLidas = () => {
    const atualizadas = notifs.map(n => ({ ...n, lida: true }));
    setNotifs(atualizadas);
    save(CHAVE_NT, atualizadas);
  };

  const enviarWhatsAppCliente = (l: LembreteCliente) => {
    const msg = `Olá, ${l.clienteNome}! 👋\n\nPassando aqui da *Farmácia Arcanjo* para lembrar que está na hora de renovar seu medicamento de uso contínuo:\n\n💊 *${l.medicamento}*\n\nEstamos aqui para te atender! 😊\n\n📍 Meruoca-CE\n📞 (88) 99337-5650`;
    abrirWhatsApp(l.clienteTelefone, msg);
    // Atualizar próximo envio
    const atualizados = lcsOriginal.map(lc => lc.id === l.id ? { ...lc, ultimoEnvio: new Date().toISOString(), proximoEnvio: proximaData(l.frequenciaDias) } : lc);
    setLcs(atualizados);
    if (!usandoDemo) save(CHAVE_LC, atualizados);
  };

  const toggleAtivoCliente = (id: string) => {
    const atualizados = lcsOriginal.map(l => l.id === id ? { ...l, ativo: !l.ativo } : l);
    setLcs(atualizados);
    if (!usandoDemo) save(CHAVE_LC, atualizados);
  };

  const toggleAtivoEstoque = (id: string) => {
    const atualizados = les.map(l => l.id === id ? { ...l, ativo: !l.ativo } : l);
    setLes(atualizados);
    if (!usandoDemo) save(CHAVE_LE, atualizados);
  };

  const salvarLembreteCliente = () => {
    if (!fcNome.trim() || !fcTel.trim() || !fcMed.trim()) return;
    const novo: LembreteCliente = { id: Date.now().toString(), clienteNome: fcNome, clienteTelefone: fcTel, medicamento: fcMed, frequenciaDias: parseInt(fcDias) || 30, proximoEnvio: proximaData(parseInt(fcDias) || 30), ativo: true };
    const atualizados = [novo, ...lcsOriginal];
    setLcs(atualizados);
    save(CHAVE_LC, atualizados);
    setUsandoDemo(false);
    setFcNome(""); setFcTel(""); setFcMed(""); setFcDias("30");
    setShowFormCliente(false);
  };

  const salvarLembreteEstoque = () => {
    if (!feProd.trim()) return;
    const novo: LembreteEstoque = { id: Date.now().toString(), produtoNome: feProd, estoqueAtual: parseInt(feAtual) || 0, estoqueMinimo: parseInt(feMin) || 10, ativo: true };
    const atualizados = [novo, ...les];
    setLes(atualizados);
    save(CHAVE_LE, atualizados);
    setUsandoDemo(false);
    setFeProd(""); setFeAtual(""); setFeMin("10");
    setShowFormEstoque(false);
  };

  // ── Estilos ──────────────────────────────────────────────
  const cor = { verde: "#16a34a", verdeClaro: "#22c55e", fundo: "#0f172a", card: "#1e293b", borda: "#334155", texto: "#f1f5f9", muted: "#94a3b8", amarelo: "#f59e0b", vermelho: "#dc2626", azul: "#3b82f6" };

  const s: Record<string, React.CSSProperties> = {
    wrap: { fontFamily: "'Segoe UI', sans-serif", background: cor.fundo, minHeight: "100vh", color: cor.texto, paddingBottom: 40 },
    header: { background: `linear-gradient(135deg, ${cor.verde}, #15803d)`, padding: "20px 20px 16px" },
    h1: { margin: 0, fontSize: 20, fontWeight: 700 },
    sub: { margin: "4px 0 0", fontSize: 13, color: "#bbf7d0" },
    corpo: { padding: 16 },
    abas: { display: "flex", borderBottom: `1px solid ${cor.borda}`, padding: "0 16px" },
    aba: (a: boolean) => ({ flex: 1, padding: "12px 0", textAlign: "center" as const, fontSize: 12, fontWeight: 600, cursor: "pointer", color: a ? cor.verdeClaro : cor.muted, background: "none", border: "none", borderBottom: `2px solid ${a ? cor.verdeClaro : "transparent"}` }),
    card: { background: cor.card, borderRadius: 14, padding: "14px 16px", marginBottom: 10, border: `1px solid ${cor.borda}` },
    input: { background: "#0f172a", border: `1.5px solid ${cor.borda}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: cor.texto, width: "100%", boxSizing: "border-box" as const, marginBottom: 10 },
    label: { fontSize: 11, color: cor.muted, fontWeight: 600, display: "block", marginBottom: 3, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    btnVerde: { background: `linear-gradient(135deg, ${cor.verde}, #15803d)`, color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" },
    btnWpp: { background: "#15803d", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
    toggle: (ativo: boolean) => ({ background: ativo ? cor.verde : cor.borda, border: "none", borderRadius: 20, padding: "5px 12px", fontSize: 11, color: "#fff", fontWeight: 700, cursor: "pointer" }),
    urgente: { borderLeft: `3px solid ${cor.vermelho}` },
    hoje: { borderLeft: `3px solid ${cor.amarelo}` },
    ok: { borderLeft: `3px solid ${cor.verde}` },
  };

  const urgenciaCard = (dias: number) => dias < 0 ? s.urgente : dias === 0 ? s.hoje : s.ok;
  const urgenciaCor = (dias: number) => dias < 0 ? cor.vermelho : dias === 0 ? cor.amarelo : cor.verdeClaro;
  const urgenciaLabel = (dias: number) => dias < 0 ? `Atrasado ${Math.abs(dias)}d` : dias === 0 ? "Hoje!" : `Em ${dias} dias`;

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <p style={s.h1}>⏰ Lembretes Automáticos</p>
        <p style={s.sub}>Farmácia Arcanjo — Painel Admin</p>
      </div>

      {usandoDemo && (
        <div style={{ background: "#78350f", color: "#fde68a", fontSize: 12, padding: "8px 16px", textAlign: "center" }}>
          ⚠️ Dados de demonstração. Adicione lembretes reais abaixo.
        </div>
      )}

      {/* Abas */}
      <div style={s.abas}>
        <button style={s.aba(aba === "notificacoes")} onClick={() => setAba("notificacoes")}>
          🔔 Alertas {naoLidas > 0 && <span style={{ background: cor.vermelho, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, marginLeft: 4 }}>{naoLidas}</span>}
        </button>
        <button style={s.aba(aba === "clientes")} onClick={() => setAba("clientes")}>💊 Clientes</button>
        <button style={s.aba(aba === "estoque")} onClick={() => setAba("estoque")}>📦 Estoque</button>
      </div>

      {/* ── ABA NOTIFICAÇÕES ── */}
      {aba === "notificacoes" && (
        <div style={s.corpo}>
          {naoLidas > 0 && (
            <button onClick={marcarTodasLidas} style={{ ...s.btnVerde, marginBottom: 12, background: cor.borda }}>
              ✅ Marcar todas como lidas
            </button>
          )}
          {notifs.length === 0 && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p style={{ fontSize: 40 }}>🔔</p>
              <p style={{ color: cor.muted }}>Nenhum alerta por enquanto.</p>
            </div>
          )}
          {notifs.map(n => (
            <div key={n.id} style={{ ...s.card, opacity: n.lida ? 0.5 : 1, borderLeft: `3px solid ${n.tipo === "estoque" ? cor.amarelo : cor.azul}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: n.lida ? 400 : 700, flex: 1 }}>{n.mensagem}</p>
                {!n.lida && (
                  <button onClick={() => marcarLida(n.id)} style={{ background: "none", border: "none", color: cor.muted, cursor: "pointer", fontSize: 18, padding: "0 0 0 8px" }}>✓</button>
                )}
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: cor.muted }}>{fmtData(n.data)}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── ABA CLIENTES ── */}
      {aba === "clientes" && (
        <div style={s.corpo}>
          <button style={{ ...s.btnVerde, marginBottom: 16 }} onClick={() => setShowFormCliente(!showFormCliente)}>
            {showFormCliente ? "✕ Fechar" : "➕ Novo Lembrete de Cliente"}
          </button>

          {showFormCliente && (
            <div style={{ ...s.card, border: `1px solid ${cor.verde}`, marginBottom: 16 }}>
              <p style={{ margin: "0 0 12px", fontWeight: 700 }}>Novo lembrete de medicamento</p>
              <label style={s.label}>Nome do cliente</label>
              <input style={s.input} placeholder="Ex: Maria Silva" value={fcNome} onChange={e => setFcNome(e.target.value)} />
              <label style={s.label}>Telefone WhatsApp</label>
              <input style={s.input} placeholder="(88) 99999-9999" value={fcTel} onChange={e => setFcTel(e.target.value)} />
              <label style={s.label}>Medicamento</label>
              <input style={s.input} placeholder="Ex: Losartana 50mg" value={fcMed} onChange={e => setFcMed(e.target.value)} />
              <label style={s.label}>Frequência (dias)</label>
              <input style={s.input} type="number" placeholder="30" value={fcDias} onChange={e => setFcDias(e.target.value)} />
              <button style={s.btnVerde} onClick={salvarLembreteCliente}>💾 Salvar</button>
            </div>
          )}

          {lcsOriginal.map(l => {
            const dias = diasAte(l.proximoEnvio);
            return (
              <div key={l.id} style={{ ...s.card, ...urgenciaCard(dias) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{l.clienteNome}</p>
                    <p style={{ margin: "2px 0", fontSize: 12, color: cor.muted }}>💊 {l.medicamento}</p>
                    <p style={{ margin: "2px 0", fontSize: 12, color: cor.muted }}>📞 {l.clienteTelefone}</p>
                  </div>
                  <button style={s.toggle(l.ativo)} onClick={() => toggleAtivoCliente(l.id)}>
                    {l.ativo ? "Ativo" : "Pausado"}
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: urgenciaCor(dias), fontWeight: 700 }}>
                      📅 {urgenciaLabel(dias)}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: cor.muted }}>A cada {l.frequenciaDias} dias</p>
                  </div>
                  <button style={s.btnWpp} onClick={() => enviarWhatsAppCliente(l)}>
                    📱 Enviar WhatsApp
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ABA ESTOQUE ── */}
      {aba === "estoque" && (
        <div style={s.corpo}>
          <button style={{ ...s.btnVerde, marginBottom: 16 }} onClick={() => setShowFormEstoque(!showFormEstoque)}>
            {showFormEstoque ? "✕ Fechar" : "➕ Novo Alerta de Estoque"}
          </button>

          {showFormEstoque && (
            <div style={{ ...s.card, border: `1px solid ${cor.verde}`, marginBottom: 16 }}>
              <p style={{ margin: "0 0 12px", fontWeight: 700 }}>Novo alerta de estoque baixo</p>
              <label style={s.label}>Produto</label>
              <input style={s.input} placeholder="Ex: Dipirona 500mg" value={feProd} onChange={e => setFeProd(e.target.value)} />
              <label style={s.label}>Estoque atual</label>
              <input style={s.input} type="number" placeholder="Ex: 5" value={feAtual} onChange={e => setFeAtual(e.target.value)} />
              <label style={s.label}>Estoque mínimo (alerta)</label>
              <input style={s.input} type="number" placeholder="Ex: 10" value={feMin} onChange={e => setFeMin(e.target.value)} />
              <button style={s.btnVerde} onClick={salvarLembreteEstoque}>💾 Salvar</button>
            </div>
          )}

          {les.map(l => {
            const critico = l.estoqueAtual <= l.estoqueMinimo;
            const pct = Math.min(100, (l.estoqueAtual / l.estoqueMinimo) * 100);
            return (
              <div key={l.id} style={{ ...s.card, borderLeft: `3px solid ${critico ? cor.vermelho : cor.verde}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{l.produtoNome}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: critico ? cor.vermelho : cor.verdeClaro, fontWeight: 700 }}>
                      {critico ? "⚠️" : "✅"} {l.estoqueAtual} un. {critico ? "— REPOR!" : "em estoque"}
                    </p>
                  </div>
                  <button style={s.toggle(l.ativo)} onClick={() => toggleAtivoEstoque(l.id)}>
                    {l.ativo ? "Ativo" : "Pausado"}
                  </button>
                </div>
                <div style={{ background: "#0f172a", borderRadius: 6, height: 6, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: critico ? cor.vermelho : cor.verde, borderRadius: 6, transition: "width 0.5s" }} />
                </div>
                <p style={{ margin: 0, fontSize: 11, color: cor.muted }}>Mínimo: {l.estoqueMinimo} un.</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import type { Produto } from "../data/produtos";

interface Props { produtos?: Produto[] }

const CHAVE_MIN = "farmacia_estoque_min";
const CHAVE_LC  = "farmacia_lembretes_clientes";
const CHAVE_NT  = "farmacia_notificacoes";

interface LembreteCliente {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  medicamento: string;
  frequenciaDias: number;
  proximoEnvio: string;
  ativo: boolean;
  ultimoEnvio?: string;
}

interface Notificacao {
  id: string;
  tipo: "cliente" | "estoque";
  mensagem: string;
  data: string;
  lida: boolean;
}

type Aba = "notificacoes" | "clientes" | "estoque";

const load = <T,>(chave: string): T[] => {
  try { return JSON.parse(localStorage.getItem(chave) || "[]"); }
  catch { return []; }
};
const save = <T,>(chave: string, data: T[]) =>
  localStorage.setItem(chave, JSON.stringify(data));

const loadObj = <T extends object>(chave: string): T => {
  try { return JSON.parse(localStorage.getItem(chave) || "{}") as T; }
  catch { return {} as T; }
};
const saveObj = (chave: string, obj: object) =>
  localStorage.setItem(chave, JSON.stringify(obj));

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
  window.open(`https://wa.me/55${num}?text=${encodeURIComponent(mensagem)}`, "_blank");
};

const demoClientes = (): LembreteCliente[] => [
  { id: "lc1", clienteNome: "Maria Silva", clienteTelefone: "(88) 99111-1111", medicamento: "Losartana 50mg", frequenciaDias: 30, proximoEnvio: proximaData(2), ativo: true },
  { id: "lc2", clienteNome: "João Santos", clienteTelefone: "(88) 99222-2222", medicamento: "Metformina 850mg", frequenciaDias: 30, proximoEnvio: proximaData(0), ativo: true },
];

export default function LembretesAutomaticos({ produtos = [] }: Props) {
  const [aba, setAba] = useState<Aba>("notificacoes");
  const [lcs, setLcs] = useState<LembreteCliente[]>([]);
  const [usandoDemo, setUsandoDemo] = useState(false);
  const [notifs, setNotifs] = useState<Notificacao[]>([]);
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const [editando, setEditando] = useState<Record<string, string>>({});

  const [showFormCliente, setShowFormCliente] = useState(false);
  const [fcNome, setFcNome] = useState("");
  const [fcTel, setFcTel]   = useState("");
  const [fcMed, setFcMed]   = useState("");
  const [fcDias, setFcDias] = useState("30");
  const [buscaEstoque, setBuscaEstoque] = useState("");

  useEffect(() => {
    let lc = load<LembreteCliente>(CHAVE_LC);
    const nt = load<Notificacao>(CHAVE_NT);
    const th = loadObj<Record<string, number>>(CHAVE_MIN);
    let demo = false;
    if (lc.length === 0) { lc = demoClientes(); demo = true; }
    setLcs(lc);
    setNotifs(nt);
    setThresholds(th);
    setUsandoDemo(demo);
  }, []);

  useEffect(() => {
    if (produtos.length === 0) return;
    gerarAlertasEstoque(thresholds);
  }, [produtos, thresholds]);

  function gerarAlertasEstoque(th: Record<string, number>) {
    const nt = load<Notificacao>(CHAVE_NT);
    const hoje = new Date().toDateString();
    let mudou = false;
    for (const p of produtos) {
      const min = th[p.id];
      if (!min || min <= 0) continue;
      const est = p.estoque ?? 0;
      if (est <= min) {
        const alertId = `le-${p.id}-${hoje}`;
        if (!nt.some(n => n.id === alertId)) {
          nt.unshift({
            id: alertId, tipo: "estoque",
            mensagem: `⚠️ Estoque baixo: ${p.nome} (${est} un. restantes — mínimo: ${min})`,
            data: new Date().toISOString(), lida: false,
          });
          mudou = true;
        }
      }
    }
    if (mudou) { setNotifs([...nt]); save(CHAVE_NT, nt); }
  }

  const naoLidas = useMemo(() => notifs.filter(n => !n.lida).length, [notifs]);

  const marcarLida = (id: string) => {
    const at = notifs.map(n => n.id === id ? { ...n, lida: true } : n);
    setNotifs(at); save(CHAVE_NT, at);
  };
  const marcarTodasLidas = () => {
    const at = notifs.map(n => ({ ...n, lida: true }));
    setNotifs(at); save(CHAVE_NT, at);
  };

  const enviarWhatsApp = (l: LembreteCliente) => {
    const msg = `Olá, ${l.clienteNome}! 👋\n\nPassando aqui da *Farmácia Arcanjo* para lembrar que está na hora de renovar seu medicamento de uso contínuo:\n\n💊 *${l.medicamento}*\n\nEstamos aqui para te atender! 😊\n\n📍 Meruoca-CE\n📞 (88) 99337-5650`;
    abrirWhatsApp(l.clienteTelefone, msg);
    const at = lcs.map(lc => lc.id === l.id ? { ...lc, ultimoEnvio: new Date().toISOString(), proximoEnvio: proximaData(l.frequenciaDias) } : lc);
    setLcs(at);
    if (!usandoDemo) save(CHAVE_LC, at);
  };

  const toggleCliente = (id: string) => {
    const at = lcs.map(l => l.id === id ? { ...l, ativo: !l.ativo } : l);
    setLcs(at); if (!usandoDemo) save(CHAVE_LC, at);
  };

  const salvarCliente = () => {
    if (!fcNome.trim() || !fcTel.trim() || !fcMed.trim()) return;
    const novo: LembreteCliente = {
      id: Date.now().toString(), clienteNome: fcNome, clienteTelefone: fcTel,
      medicamento: fcMed, frequenciaDias: parseInt(fcDias) || 30,
      proximoEnvio: proximaData(parseInt(fcDias) || 30), ativo: true,
    };
    const at = [novo, ...lcs];
    setLcs(at); save(CHAVE_LC, at); setUsandoDemo(false);
    setFcNome(""); setFcTel(""); setFcMed(""); setFcDias("30");
    setShowFormCliente(false);
  };

  const salvarThreshold = (produtoId: string, valor: string) => {
    const n = parseInt(valor) || 0;
    const novo = { ...thresholds, [produtoId]: n };
    setThresholds(novo); saveObj(CHAVE_MIN, novo);
    const novoEdit = { ...editando };
    delete novoEdit[produtoId];
    setEditando(novoEdit);
    gerarAlertasEstoque(novo);
  };

  const removerThreshold = (produtoId: string) => {
    const novo = { ...thresholds };
    delete novo[produtoId];
    setThresholds(novo); saveObj(CHAVE_MIN, novo);
  };

  const monitorados = produtos.filter(p => (thresholds[p.id] ?? 0) > 0);
  const qtdCritico  = monitorados.filter(p => (p.estoque ?? 0) <= thresholds[p.id]).length;

  const produtosBusca = buscaEstoque.trim().length >= 2
    ? produtos.filter(p =>
        p.nome.toLowerCase().includes(buscaEstoque.toLowerCase()) &&
        !(thresholds[p.id] > 0)
      )
    : [];

  const cor = {
    verde: "#16a34a", verdeClaro: "#22c55e", fundo: "#0f172a",
    card: "#1e293b", borda: "#334155", texto: "#f1f5f9",
    muted: "#94a3b8", amarelo: "#f59e0b", vermelho: "#dc2626", azul: "#3b82f6",
  };

  const s: Record<string, React.CSSProperties> = {
    wrap:   { fontFamily: "'Segoe UI', sans-serif", background: cor.fundo, minHeight: "100vh", color: cor.texto, paddingBottom: 40 },
    header: { background: "linear-gradient(135deg, #16a34a, #15803d)", padding: "20px 20px 16px" },
    h1:     { margin: 0, fontSize: 20, fontWeight: 700 },
    sub:    { margin: "4px 0 0", fontSize: 13, color: "#bbf7d0" },
    corpo:  { padding: 16 },
    abas:   { display: "flex", borderBottom: `1px solid ${cor.borda}`, padding: "0 16px" },
    card:   { background: cor.card, borderRadius: 14, padding: "14px 16px", marginBottom: 10, border: `1px solid ${cor.borda}` },
    input:  { background: "#0f172a", border: `1.5px solid ${cor.borda}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: cor.texto, width: "100%", boxSizing: "border-box" as const, marginBottom: 10 },
    inputSm: { background: "#0f172a", border: `1.5px solid ${cor.borda}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, color: cor.texto, width: 65, boxSizing: "border-box" as const, textAlign: "center" as const },
    label:  { fontSize: 11, color: cor.muted, fontWeight: 600, display: "block", marginBottom: 3, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    btnVerde: { background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" },
    btnWpp:   { background: "#15803d", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  };

  const abaStyle = (ativo: boolean): React.CSSProperties => ({
    flex: 1, padding: "12px 0", textAlign: "center", fontSize: 12, fontWeight: 600,
    cursor: "pointer", color: ativo ? cor.verdeClaro : cor.muted,
    background: "none", border: "none",
    borderBottom: `2px solid ${ativo ? cor.verdeClaro : "transparent"}`,
  });

  const toggle = (ativo: boolean): React.CSSProperties => ({
    background: ativo ? cor.verde : cor.borda, border: "none", borderRadius: 20,
    padding: "5px 12px", fontSize: 11, color: "#fff", fontWeight: 700, cursor: "pointer",
  });

  const urgCor   = (d: number) => d < 0 ? cor.vermelho : d === 0 ? cor.amarelo : cor.verdeClaro;
  const urgLabel = (d: number) => d < 0 ? `Atrasado ${Math.abs(d)}d` : d === 0 ? "Hoje!" : `Em ${d} dias`;
  const urgBorder = (d: number): React.CSSProperties => ({ borderLeft: `3px solid ${urgCor(d)}` });

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <p style={s.h1}>⏰ Lembretes Automáticos</p>
        <p style={s.sub}>Farmácia Arcanjo — Painel Admin</p>
      </div>

      {usandoDemo && (
        <div style={{ background: "#78350f", color: "#fde68a", fontSize: 12, padding: "8px 16px", textAlign: "center" }}>
          ⚠️ Clientes em demonstração. Adicione lembretes reais na aba Clientes.
        </div>
      )}

      <div style={s.abas}>
        <button style={abaStyle(aba === "notificacoes")} onClick={() => setAba("notificacoes")}>
          🔔 Alertas{naoLidas > 0 && <span style={{ background: cor.vermelho, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, marginLeft: 4 }}>{naoLidas}</span>}
        </button>
        <button style={abaStyle(aba === "clientes")} onClick={() => setAba("clientes")}>💊 Clientes</button>
        <button style={abaStyle(aba === "estoque")} onClick={() => setAba("estoque")}>
          📦 Estoque{qtdCritico > 0 && <span style={{ background: cor.vermelho, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, marginLeft: 4 }}>{qtdCritico}</span>}
        </button>
      </div>

      {/* ── ABA ALERTAS ── */}
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
              <p style={{ color: cor.muted, fontSize: 12 }}>Configure mínimos de estoque na aba 📦 Estoque</p>
            </div>
          )}
          {notifs.map(n => (
            <div key={n.id} style={{ ...s.card, opacity: n.lida ? 0.5 : 1, borderLeft: `3px solid ${n.tipo === "estoque" ? cor.amarelo : cor.azul}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: n.lida ? 400 : 700, flex: 1 }}>{n.mensagem}</p>
                {!n.lida && (
                  <button onClick={() => marcarLida(n.id)}
                    style={{ background: "none", border: "none", color: cor.muted, cursor: "pointer", fontSize: 18, padding: "0 0 0 8px" }}>✓</button>
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
              <button style={s.btnVerde} onClick={salvarCliente}>💾 Salvar</button>
            </div>
          )}
          {lcs.map(l => {
            const dias = diasAte(l.proximoEnvio);
            return (
              <div key={l.id} style={{ ...s.card, ...urgBorder(dias) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{l.clienteNome}</p>
                    <p style={{ margin: "2px 0", fontSize: 12, color: cor.muted }}>💊 {l.medicamento}</p>
                    <p style={{ margin: "2px 0", fontSize: 12, color: cor.muted }}>📞 {l.clienteTelefone}</p>
                  </div>
                  <button style={toggle(l.ativo)} onClick={() => toggleCliente(l.id)}>{l.ativo ? "Ativo" : "Pausado"}</button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: urgCor(dias), fontWeight: 700 }}>📅 {urgLabel(dias)}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: cor.muted }}>A cada {l.frequenciaDias} dias</p>
                  </div>
                  <button style={s.btnWpp} onClick={() => enviarWhatsApp(l)}>📱 Enviar WhatsApp</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ABA ESTOQUE ── */}
      {aba === "estoque" && (
        <div style={s.corpo}>
          {/* Resumo */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            <div style={{ ...s.card, textAlign: "center", padding: "12px 8px", borderLeft: `3px solid ${cor.vermelho}`, marginBottom: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: cor.vermelho }}>{qtdCritico}</div>
              <div style={{ fontSize: 10, color: cor.muted, marginTop: 2 }}>⚠️ PRECISAM REPOR</div>
            </div>
            <div style={{ ...s.card, textAlign: "center", padding: "12px 8px", borderLeft: `3px solid ${cor.verde}`, marginBottom: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: cor.verdeClaro }}>{monitorados.length - qtdCritico}</div>
              <div style={{ fontSize: 10, color: cor.muted, marginTop: 2 }}>✅ EM DIA</div>
            </div>
          </div>

          {monitorados.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: cor.muted }}>
              <p style={{ fontSize: 36 }}>📦</p>
              <p style={{ fontSize: 13 }}>Nenhum produto monitorado ainda.</p>
              <p style={{ fontSize: 12 }}>Busque um produto abaixo para configurar o estoque mínimo.</p>
            </div>
          )}

          {/* Lista de monitorados */}
          {monitorados
            .sort((a, b) => {
              const ca = (a.estoque ?? 0) <= thresholds[a.id];
              const cb = (b.estoque ?? 0) <= thresholds[b.id];
              return ca === cb ? 0 : ca ? -1 : 1;
            })
            .map(p => {
              const est    = p.estoque ?? 0;
              const min    = thresholds[p.id];
              const critico = est <= min;
              const pct    = min > 0 ? Math.min(100, Math.round((est / min) * 100)) : 100;
              const eEd    = editando[p.id] !== undefined;
              return (
                <div key={p.id} style={{ ...s.card, borderLeft: `3px solid ${critico ? cor.vermelho : cor.verde}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ flex: 1, marginRight: 8 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{p.nome}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: critico ? cor.vermelho : cor.verdeClaro, fontWeight: 700 }}>
                        {critico ? "⚠️" : "✅"} {est} un. {critico ? "— REPOR!" : "em estoque"}
                      </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      {eEd ? (
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <input type="number" min="0" value={editando[p.id]}
                            onChange={e => setEditando(prev => ({ ...prev, [p.id]: e.target.value }))}
                            style={s.inputSm} autoFocus />
                          <button onClick={() => salvarThreshold(p.id, editando[p.id])}
                            style={{ background: cor.verde, color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✓</button>
                          <button onClick={() => setEditando(prev => { const n = { ...prev }; delete n[p.id]; return n; })}
                            style={{ background: cor.borda, color: cor.muted, border: "none", borderRadius: 6, padding: "6px 8px", fontSize: 12, cursor: "pointer" }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditando(prev => ({ ...prev, [p.id]: String(min) }))}
                          style={{ background: cor.borda, color: cor.muted, border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>
                          ✏️ Mín: {min}
                        </button>
                      )}
                      <button onClick={() => removerThreshold(p.id)}
                        style={{ background: "none", color: cor.muted, border: "none", fontSize: 10, cursor: "pointer", padding: 0 }}>
                        🗑️ remover
                      </button>
                    </div>
                  </div>
                  <div style={{ background: "#0f172a", borderRadius: 6, height: 7, overflow: "hidden", marginBottom: 4 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: critico ? cor.vermelho : cor.verde, borderRadius: 6, transition: "width 0.5s" }} />
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: cor.muted }}>
                    Mínimo: {min} un. · Atual: {pct}% do mínimo
                  </p>
                </div>
              );
            })}

          {/* Busca para adicionar novos */}
          <div style={{ marginTop: 16, borderTop: `1px solid ${cor.borda}`, paddingTop: 14 }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: cor.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
              ➕ Monitorar produto do catálogo
            </p>
            <input
              style={{ ...s.input, marginBottom: 4 }}
              placeholder="🔍 Digite o nome do produto..."
              value={buscaEstoque}
              onChange={e => setBuscaEstoque(e.target.value)}
            />
            {buscaEstoque.trim().length >= 2 && produtosBusca.length === 0 && (
              <p style={{ color: cor.muted, fontSize: 12, textAlign: "center" }}>Nenhum produto encontrado ou todos já monitorados.</p>
            )}
            {produtosBusca.slice(0, 6).map(p => (
              <div key={p.id} style={{ ...s.card, marginTop: 6, marginBottom: 6, padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, marginRight: 8 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{p.nome}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: cor.muted }}>Estoque atual: {p.estoque ?? "—"} un.</p>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: cor.muted }}>Mín:</span>
                    <input
                      type="number" min="1" defaultValue="10"
                      id={`min-${p.id}`}
                      style={{ ...s.inputSm, width: 55 }}
                    />
                    <button
                      onClick={() => {
                        const el = document.getElementById(`min-${p.id}`) as HTMLInputElement;
                        salvarThreshold(p.id, el?.value || "10");
                        setBuscaEstoque("");
                      }}
                      style={{ background: cor.verde, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                      ✓ OK
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

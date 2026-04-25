import { useState, useEffect } from "react";
import { PRODUTOS_INICIAIS, VERSAO_CATALOGO, calcularPreco, Produto } from "../data/produtos";
import BarcodeScanner from "./BarcodeScanner";
import RelatorioPedidos from "./RelatorioPedidos";
import CadastroClientes from "./CadastroClientes";
import LembretesAutomaticos from "./LembretesAutomaticos";
import GeradorPromocao from "./GeradorPromocao";
import FechamentoCaixa from "./FechamentoCaixa";
import AnalyticsDashboard from "./AnalyticsDashboard";
import { trackWhatsAppClick, trackProdutoAdicionado } from "../lib/analytics";
import {
  salvarProdutoFirebase,
  buscarProdutosFirebase,
  deletarProdutoFirebase,
  registrarPedidoFirebase,
  registrarLogFirebase,
  registrarCliqueWhatsAppFirebase,
  buscarInteracoesLara,
  buscarCliquesWhatsApp,
  type InteracaoLara,
  type CliqueWhatsApp,
} from "../lib/firebase";

const WHATSAPP = "5588993375650";

type NivelAcesso = "master" | "editor" | "viewer";
interface UsuarioAdmin { id: string; nome: string; funcao: string; senha: string; nivel: NivelAcesso; ativo: boolean; }

const USUARIOS_DEFAULT: UsuarioAdmin[] = [
  { id: "admin",        nome: "Administrador", funcao: "Master",      senha: "arcanjo2026", nivel: "master", ativo: true },
  { id: "farmaceutico", nome: "Farmacêutico",  funcao: "Farmacêutico", senha: "farm2026",   nivel: "editor", ativo: true },
  { id: "atendente",    nome: "Atendente",     funcao: "Atendente",   senha: "atend2026",  nivel: "viewer", ativo: true },
];
const LS_USUARIOS_KEY = "farmacia_usuarios_admin";
function carregarUsuarios(): UsuarioAdmin[] {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_USUARIOS_KEY) || "[]") as UsuarioAdmin[];
    if (saved.length > 0) return saved;
  } catch {}
  localStorage.setItem(LS_USUARIOS_KEY, JSON.stringify(USUARIOS_DEFAULT));
  return USUARIOS_DEFAULT;
}
function persistirUsuarios(users: UsuarioAdmin[]) {
  localStorage.setItem(LS_USUARIOS_KEY, JSON.stringify(users));
}

type TipoAcao = "produto_adicionado" | "produto_editado" | "produto_deletado";
interface LogEntry { acao: TipoAcao; usuario: string; userId: string; produto: string; ts: number; }
const LS_LOG_KEY = "farmacia_admin_log";

function carregarLog(): LogEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_LOG_KEY) || "[]"); } catch { return []; }
}
function registrarLog(entry: LogEntry) {
  const log = carregarLog();
  log.push(entry);
  try { localStorage.setItem(LS_LOG_KEY, JSON.stringify(log.slice(-100))); } catch {}
  registrarLogFirebase(entry as unknown as Record<string, unknown>);
}

function VisitantesLara() {
  const [interacoes, setInteracoes] = useState<InteracaoLara[]>([]);
  const [cliques, setCliques] = useState<CliqueWhatsApp[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const lsInter: InteracaoLara[] = (() => { try { return JSON.parse(localStorage.getItem("farmacia_interacoes_lara") || "[]"); } catch { return []; } })();
    const lsCliq: CliqueWhatsApp[] = (() => { try { return JSON.parse(localStorage.getItem("farmacia_cliques_whatsapp") || "[]"); } catch { return []; } })();
    setInteracoes(lsInter);
    setCliques(lsCliq);
    Promise.all([buscarInteracoesLara(200), buscarCliquesWhatsApp(200)]).then(([fi, fc]) => {
      if (fi.length > 0) setInteracoes(fi);
      if (fc.length > 0) setCliques(fc);
    }).finally(() => setCarregando(false));
  }, []);

  const hoje = new Date().toDateString();
  const hojeInter = interacoes.filter(i => new Date(i.ts).toDateString() === hoje).length;
  const hojeCliq = cliques.filter(c => new Date(c.ts).toDateString() === hoje).length;
  const ultimas10 = [...interacoes].sort((a, b) => b.ts - a.ts).slice(0, 10);

  const dias7: { label: string; conversas: number; cliques: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const str = d.toDateString();
    dias7.push({
      label: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      conversas: interacoes.filter(x => new Date(x.ts).toDateString() === str).length,
      cliques: cliques.filter(x => new Date(x.ts).toDateString() === str).length,
    });
  }
  const maxVal = Math.max(...dias7.map(d => d.conversas + d.cliques), 1);

  return (
    <div style={{ padding: 16, fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1565c0", margin: "0 0 14px" }}>📊 Visitantes</h3>

      {carregando && <div style={{ textAlign: "center", color: "#888", fontSize: 13, padding: 16 }}>⏳ Carregando dados...</div>}

      {/* Cards de hoje */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Conversas com Lara hoje", valor: hojeInter, icon: "💬", cor: "#1565c0", fundo: "#e3f2fd" },
          { label: "Cliques no WhatsApp hoje", valor: hojeCliq, icon: "📲", cor: "#1565c0", fundo: "#e3f2fd" },
        ].map(c => (
          <div key={c.label} style={{ background: c.fundo, borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 24 }}>{c.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: c.cor, lineHeight: 1.1 }}>{c.valor}</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 4, lineHeight: 1.3 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Gráfico 7 dias */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 14, marginBottom: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: "#333", margin: "0 0 12px" }}>📅 Últimos 7 dias</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
          {dias7.map((d, i) => {
            const total = d.conversas + d.cliques;
            const altura = total === 0 ? 4 : Math.max(8, Math.round((total / maxVal) * 72));
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#555" }}>{total > 0 ? total : ""}</div>
                <div style={{ width: "100%", borderRadius: 6, overflow: "hidden", height: altura }}>
                  <div style={{ height: `${d.conversas > 0 ? Math.round((d.conversas / Math.max(total, 1)) * 100) : 0}%`, background: "#1976d2", minHeight: d.conversas > 0 ? 4 : 0 }} />
                  <div style={{ height: `${d.cliques > 0 ? Math.round((d.cliques / Math.max(total, 1)) * 100) : 0}%`, background: "#43a047", minHeight: d.cliques > 0 ? 4 : 0 }} />
                  {total === 0 && <div style={{ height: "100%", background: "#e0e0e0", borderRadius: 6 }} />}
                </div>
                <div style={{ fontSize: 9, color: "#999", textTransform: "capitalize" }}>{d.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <span style={{ fontSize: 10, color: "#555", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: "#1976d2", borderRadius: 2, display: "inline-block" }} />Conversas</span>
          <span style={{ fontSize: 10, color: "#555", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, background: "#43a047", borderRadius: 2, display: "inline-block" }} />WhatsApp</span>
        </div>
      </div>

      {/* Últimas 10 interações */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: "#333", margin: "0 0 10px" }}>💬 Últimas interações com a Lara</p>
        {ultimas10.length === 0 ? (
          <div style={{ textAlign: "center", color: "#bbb", fontSize: 12, padding: 16 }}>Nenhuma conversa registrada ainda.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ultimas10.map((inter, i) => {
              const data = new Date(inter.ts);
              const dataStr = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
              const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={i} style={{ borderLeft: "3px solid #1976d2", paddingLeft: 10, paddingTop: 2, paddingBottom: 2 }}>
                  <div style={{ fontSize: 11, color: "#888" }}>{dataStr} às {hora}</div>
                  <div style={{ fontSize: 13, color: "#333", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    "{inter.primeiraMensagem.length > 60 ? inter.primeiraMensagem.slice(0, 60) + "…" : inter.primeiraMensagem}"
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface ItemPedido {
  produto: Produto;
  quantidade: number;
}

const CATEGORIAS = ["Todos", ...Array.from(new Set(PRODUTOS_INICIAIS.map(p => p.categoria)))];

// ── Gerenciar Usuários ────────────────────────────────────────────────────────
function GerenciarUsuarios({
  usuarios, setUsuarios,
}: {
  usuarios: UsuarioAdmin[];
  setUsuarios: (u: UsuarioAdmin[]) => void;
}) {
  const [tela, setTela] = useState<"lista" | "form">("lista");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formU, setFormU] = useState({ nome: "", funcao: "", senha: "", nivel: "viewer" as NivelAcesso });
  const [confirmarDelete, setConfirmarDelete] = useState<string | null>(null);
  const [erroForm, setErroForm] = useState("");

  const abrirNovo = () => { setFormU({ nome: "", funcao: "", senha: "", nivel: "viewer" }); setEditandoId(null); setErroForm(""); setTela("form"); };
  const abrirEditar = (u: UsuarioAdmin) => { setFormU({ nome: u.nome, funcao: u.funcao, senha: u.senha, nivel: u.nivel }); setEditandoId(u.id); setErroForm(""); setTela("form"); };

  const salvarUsuario = () => {
    if (!formU.nome.trim()) { setErroForm("Nome é obrigatório."); return; }
    if (!formU.senha.trim()) { setErroForm("Senha é obrigatória."); return; }
    let novos: UsuarioAdmin[];
    if (editandoId) {
      novos = usuarios.map(u => u.id === editandoId ? { ...u, nome: formU.nome, funcao: formU.funcao || formU.nivel, senha: formU.senha, nivel: formU.nivel } : u);
    } else {
      const novo: UsuarioAdmin = { id: Date.now().toString(), nome: formU.nome, funcao: formU.funcao || formU.nivel, senha: formU.senha, nivel: formU.nivel, ativo: true };
      novos = [...usuarios, novo];
    }
    persistirUsuarios(novos);
    setUsuarios(novos);
    setTela("lista");
  };

  const toggleAtivo = (id: string) => {
    const novos = usuarios.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u);
    persistirUsuarios(novos);
    setUsuarios(novos);
  };

  const excluirUsuario = (id: string) => {
    const novos = usuarios.filter(u => u.id !== id);
    persistirUsuarios(novos);
    setUsuarios(novos);
    setConfirmarDelete(null);
  };

  const nivelCor: Record<NivelAcesso, { bg: string; cor: string }> = {
    master: { bg: "#fff9c4", cor: "#f57f17" },
    editor: { bg: "#e3f2fd", cor: "#1565c0" },
    viewer: { bg: "#eceff1", cor: "#546e7a" },
  };

  return (
    <div style={{ padding: 16, fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {tela === "lista" ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0d47a1", margin: 0 }}>👤 Gerenciar Usuários</h3>
            <button onClick={abrirNovo} style={{ padding: "7px 14px", borderRadius: 20, border: "none", background: "#1565c0", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Novo</button>
          </div>

          {usuarios.map(u => (
            <div key={u.id} style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: `2px solid ${u.ativo ? "transparent" : "#ffcdd2"}`, opacity: u.ativo ? 1 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1a1a" }}>{u.nome}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{u.funcao}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 10px", background: nivelCor[u.nivel].bg, color: nivelCor[u.nivel].cor }}>{u.nivel}</span>
                  {!u.ativo && <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 8px", background: "#ffebee", color: "#c62828" }}>Inativo</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                <button onClick={() => abrirEditar(u)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#e3f2fd", color: "#1565c0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏️ Editar</button>
                <button onClick={() => toggleAtivo(u.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: u.ativo ? "#fff9c4" : "#e8f5e9", color: u.ativo ? "#f57f17" : "#2e7d32", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {u.ativo ? "⏸ Desativar" : "▶ Ativar"}
                </button>
                {u.nivel !== "master" && (
                  <button onClick={() => setConfirmarDelete(u.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#ffebee", color: "#c62828", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🗑️ Excluir</button>
                )}
              </div>
              {confirmarDelete === u.id && (
                <div style={{ marginTop: 10, background: "#ffebee", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ color: "#c62828", fontSize: 13, margin: "0 0 8px", fontWeight: 700 }}>Excluir {u.nome}?</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => excluirUsuario(u.id)} style={{ flex: 1, background: "#c62828", color: "#fff", border: "none", borderRadius: 8, padding: "8px", fontSize: 13, cursor: "pointer" }}>Sim</button>
                    <button onClick={() => setConfirmarDelete(null)} style={{ flex: 1, background: "#eee", color: "#555", border: "none", borderRadius: 8, padding: "8px", fontSize: 13, cursor: "pointer" }}>Não</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <button onClick={() => setTela("lista")} style={{ padding: "7px 14px", borderRadius: 20, border: "none", background: "#e3f2fd", color: "#1565c0", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>← Voltar</button>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0d47a1", margin: 0 }}>{editandoId ? "✏️ Editar Usuário" : "➕ Novo Usuário"}</h3>
          </div>
          {erroForm && <div style={{ background: "#ffebee", borderRadius: 10, padding: "10px 14px", color: "#c62828", fontSize: 13, marginBottom: 12 }}>{erroForm}</div>}

          {(["Nome *|nome|Ex: Maria Farmácia", "Função|funcao|Ex: Balconista", "Senha *|senha|Mínimo 6 caracteres"] as string[]).map(f => {
            const [lbl, key, ph] = f.split("|");
            return (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#888", fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" as const }}>{lbl}</label>
                <input
                  type={key === "senha" ? "password" : "text"}
                  placeholder={ph}
                  value={(formU as Record<string, string>)[key] ?? ""}
                  onChange={e => setFormU(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 15, fontFamily: "'Nunito', sans-serif", outline: "none", boxSizing: "border-box" as const }}
                />
              </div>
            );
          })}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#888", fontWeight: 600, display: "block", marginBottom: 8, textTransform: "uppercase" as const }}>Nível de Acesso</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["master", "editor", "viewer"] as NivelAcesso[]).map(n => (
                <button key={n} onClick={() => setFormU(prev => ({ ...prev, nivel: n }))}
                  style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: formU.nivel === n ? `2px solid ${nivelCor[n].cor}` : "2px solid #e0e0e0", background: formU.nivel === n ? nivelCor[n].bg : "#fff", color: formU.nivel === n ? nivelCor[n].cor : "#666", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  {n === "master" ? "🔑 Master" : n === "editor" ? "✏️ Editor" : "👁 Viewer"}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#888", lineHeight: 1.5 }}>
              {formU.nivel === "master" && "🔑 Acesso total — pode criar, editar e excluir"}
              {formU.nivel === "editor" && "✏️ Pode adicionar e editar produtos, mas não excluir"}
              {formU.nivel === "viewer" && "👁 Apenas visualiza, sem alterar nada"}
            </div>
          </div>

          <button onClick={salvarUsuario} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #0d47a1, #1565c0)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif", marginBottom: 10 }}>
            {editandoId ? "💾 Salvar" : "✅ Criar Usuário"}
          </button>
          <button onClick={() => setTela("lista")} style={{ width: "100%", padding: 12, borderRadius: 12, border: "none", background: "#f5f5f5", color: "#666", fontSize: 14, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>Cancelar</button>
        </>
      )}
    </div>
  );
}

function LogAtividades() {
  const log = carregarLog().reverse().slice(0, 20);
  const corAcao: Record<TipoAcao, { bg: string; cor: string; label: string }> = {
    produto_adicionado: { bg: "#e3f2fd", cor: "#1565c0", label: "Adicionou" },
    produto_editado:    { bg: "#e3f2fd", cor: "#1565c0", label: "Editou"    },
    produto_deletado:   { bg: "#ffebee", cor: "#c62828", label: "Deletou"   },
  };
  return (
    <div style={{ padding: 16, fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <h3 style={{ fontSize: 16, fontWeight: 800, color: "#4527a0", margin: "0 0 14px" }}>📋 Log de Atividades</h3>
      {log.length === 0 ? (
        <div style={{ textAlign: "center", padding: 32, color: "#bbb", fontSize: 13 }}>
          Nenhuma atividade registrada ainda.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {log.map((entry, i) => {
            const cfg = corAcao[entry.acao];
            const data = new Date(entry.ts);
            const dataStr = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
            const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "10px 14px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", borderLeft: `4px solid ${cfg.cor}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>
                  {entry.usuario} <span style={{ color: cfg.cor }}>{cfg.label.toLowerCase()}</span> {entry.produto}
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  em {dataStr} às {hora}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CatalogoAdmin() {
  const [produtos, setProdutos] = useState<Produto[]>(PRODUTOS_INICIAIS);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [usuariosAdmin, setUsuariosAdmin] = useState<UsuarioAdmin[]>(() => carregarUsuarios());
  const [modo, setModo] = useState<"catalogo" | "login" | "admin" | "form">("catalogo");
  const [senha, setSenha] = useState("");
  const [erroSenha, setErroSenha] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioAdmin | null>(null);
  const [pedido, setPedido] = useState<ItemPedido[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState({ nome: "", preco: "", precoOriginal: "", categoria: "", emoji: "💊", desc: "", prescricao: false, estoque: "", promoQtd: "", promoPreco: "", promoDesc: "", codigoBarras: "" });
  const [msgSucesso, setMsgSucesso] = useState("");
  const [secaoAdmin, setSecaoAdmin] = useState<string|null>(null);
  const [firebaseAtivo, setFirebaseAtivo] = useState<boolean | null>(null);
  const [seedProgresso, setSeedProgresso] = useState("");
  const [seedStatus, setSeedStatus] = useState<"idle" | "enviando" | "concluido">("idle");

  useEffect(() => {
    const inicializar = async () => {
      try {
        const fbProdutos = await buscarProdutosFirebase();
        if (fbProdutos && fbProdutos.length > 0) {
          setProdutos(fbProdutos);
          setFirebaseAtivo(true);
          try {
            localStorage.removeItem("farmacia_produtos_v3");
            localStorage.setItem("farmacia_produtos_v3", JSON.stringify(fbProdutos));
          } catch {}
        } else {
          setFirebaseAtivo(false);
          // Firebase vazio — seed com PRODUTOS_INICIAIS
          for (const p of PRODUTOS_INICIAIS) {
            await salvarProdutoFirebase(p);
          }
        }
      } catch {
        setFirebaseAtivo(false);
      }
    };
    inicializar();
  }, []);

// Hook para detectar leitor de código de barras (USB - digita rápido + Enter)
  useEffect(() => {
    let buffer = '';
    let timer: ReturnType<typeof setTimeout>;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && buffer.length > 4) {
        const codigo = buffer.trim();
        const encontrado = produtos.find(p => p.codigoBarras === codigo);
        if (encontrado) {
          setBusca(encontrado.nome);
        } else {
          if (modo === 'form') setForm(f => ({ ...f, codigoBarras: codigo }));
        }
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timer);
        timer = setTimeout(() => { buffer = ''; }, 300);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [produtos, modo]);



  useEffect(() => {
    const pendente = localStorage.getItem("lara_produto_pendente");
    if (!pendente) return;
    localStorage.removeItem("lara_produto_pendente");
    const id = Number(pendente);
    const produto = produtos.find(p => p.id === id);
    if (produto) {
      setPedido(prev => {
        const existe = prev.find(i => i.produto.id === id);
        if (existe) return prev.map(i => i.produto.id === id ? { ...i, quantidade: i.quantidade + 1 } : i);
        return [...prev, { produto, quantidade: 1 }];
      });
    }
  }, []);

  const produtosFiltrados = produtos.filter(p => {
    const matchCat = categoriaFiltro === "Todos" || p.categoria === categoriaFiltro;
    const matchBusca = busca === "" || p.nome.toLowerCase().includes(busca.toLowerCase());
    return matchCat && matchBusca;
  });

  const promocoes = produtos.filter(p => p.promocao);
  const totalPedido = pedido.reduce((acc, item) => acc + calcularPreco(item.produto, item.quantidade), 0);

  function getQuantidade(produtoId: number): number {
    return pedido.find(i => i.produto.id === produtoId)?.quantidade || 0;
  }

  function setQuantidade(produto: Produto, qty: number) {
    if (qty <= 0) {
      setPedido(prev => prev.filter(i => i.produto.id !== produto.id));
    } else {
      setPedido(prev => {
        const exists = prev.find(i => i.produto.id === produto.id);
        if (!exists) trackProdutoAdicionado(produto.nome);
        if (exists) return prev.map(i => i.produto.id === produto.id ? { ...i, quantidade: qty } : i);
        return [...prev, { produto, quantidade: qty }];
      });
    }
  }

  function login() {
    const usuario = usuariosAdmin.find(u => u.senha === senha && u.ativo !== false);
    if (usuario) { setUsuarioLogado(usuario); setModo("admin"); setErroSenha(false); setSenha(""); }
    else setErroSenha(true);
  }

  function logout() { setUsuarioLogado(null); setModo("catalogo"); }

  const podeEditar = usuarioLogado?.nivel === "master" || usuarioLogado?.nivel === "editor";

  const enviarTodosAoFirebase = async () => {
    setSeedStatus("enviando");
    const total = produtos.length;
    const tamanhoChunk = 10;
    let enviados = 0;
    for (let i = 0; i < total; i += tamanhoChunk) {
      const chunk = produtos.slice(i, i + tamanhoChunk);
      await Promise.all(chunk.map(p => salvarProdutoFirebase(p)));
      enviados = Math.min(i + tamanhoChunk, total);
      setSeedProgresso(`Enviando ${enviados}/${total}...`);
      await new Promise(res => setTimeout(res, 0));
    }
    setSeedProgresso("");
    setSeedStatus("concluido");
    setTimeout(() => setSeedStatus("idle"), 4000);
  };
  const podeDeletar = usuarioLogado?.nivel === "master";

  function salvarProduto() {
    if (!form.nome || !form.preco) return;
    const novo: Produto = {
      id: editando || Date.now(),
      nome: form.nome,
      preco: parseFloat(form.preco),
      precoOriginal: form.precoOriginal ? parseFloat(form.precoOriginal) : undefined,
      categoria: form.categoria || "Geral",
      emoji: form.emoji,
      desc: form.desc,
      prescricao: form.prescricao,
      estoque: form.estoque ? parseInt(form.estoque) : undefined,
        codigoBarras: form.codigoBarras || undefined,
      promocao: form.promoQtd && form.promoPreco ? {
        quantidade: parseInt(form.promoQtd),
        precoTotal: parseFloat(form.promoPreco),
        descricao: form.promoDesc || `LEVE ${form.promoQtd} por R$${form.promoPreco}`
      } : undefined
    };
    const acao: TipoAcao = editando ? "produto_editado" : "produto_adicionado";
    if (editando) {
      const novos = produtos.map(p => p.id === editando ? novo : p);
      setProdutos(novos);
      salvarProdutoFirebase(novo).then(ok => { if (!ok) { try { localStorage.setItem("farmacia_produtos_v3", JSON.stringify(novos)); } catch {} } });
    } else {
      const novos = [...produtos, novo];
      setProdutos(novos);
      salvarProdutoFirebase(novo).then(ok => { if (!ok) { try { localStorage.setItem("farmacia_produtos_v3", JSON.stringify(novos)); } catch {} } });
    }
    registrarLog({ acao, usuario: usuarioLogado?.nome ?? "Admin", userId: usuarioLogado?.id ?? "admin", produto: novo.nome, ts: Date.now() });
    setMsgSucesso(editando ? "✅ Produto atualizado!" : "✅ Produto adicionado!");
    setTimeout(() => setMsgSucesso(""), 2000);
    setModo("admin");
    setEditando(null);
  }

  function abrirForm(produto?: Produto) {
    if (produto) {
      setEditando(produto.id);
      setForm({
        nome: produto.nome, preco: String(produto.preco),
        precoOriginal: String(produto.precoOriginal || ""),
        categoria: produto.categoria, emoji: produto.emoji, desc: produto.desc,
        prescricao: produto.prescricao || false,
        estoque: String(produto.estoque || ""),
        promoQtd: String(produto.promocao?.quantidade || ""),
        promoPreco: String(produto.promocao?.precoTotal || ""),
        promoDesc: produto.promocao?.descricao || ""
      });
    } else {
      setEditando(null);
      setForm({ nome: "", preco: "", precoOriginal: "", categoria: "", emoji: "💊", desc: "", prescricao: false, estoque: "", promoQtd: "", promoPreco: "", promoDesc: "", codigoBarras: "" });
    }
    setModo("form");
  }

  function enviarWhatsApp() {
    trackWhatsAppClick(pedido.map(i => i.produto.nome).join(", "));
    const nomesProdutos = pedido.map(i => i.produto.nome);
    const tsClique = Date.now();
    const urlClique = window.location.href;
    try {
      const arr = JSON.parse(localStorage.getItem("farmacia_cliques_whatsapp") || "[]");
      arr.push({ tipo: "clique_whatsapp", ts: tsClique, produtos: nomesProdutos, url: urlClique });
      localStorage.setItem("farmacia_cliques_whatsapp", JSON.stringify(arr.slice(-500)));
    } catch {}
    registrarCliqueWhatsAppFirebase({ tipo: "clique_whatsapp", ts: tsClique, produtos: nomesProdutos, url: urlClique });
    registrarPedidoFirebase({
      cliente: "Anônimo",
      itens: pedido.map(i => ({ produto: i.produto.nome, quantidade: i.quantidade, precoUnitario: i.produto.preco })),
      total: totalPedido,
      pagamento: "WhatsApp",
    });
    const lista = pedido.map(i => {
      const total = calcularPreco(i.produto, i.quantidade);
      return `• ${i.quantidade}x ${i.produto.nome} — R$${total.toFixed(2)}`;
    }).join("\n");
    const msg = `Olá! Vi o catálogo da Farmácia Arcanjo e gostaria de:\n\n${lista}\n\n💰 Total: R$${totalPedido.toFixed(2)}\n\nPoderia confirmar disponibilidade e entrega? 😊`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  }if (modo === "login") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0d47a1, #1565c0)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ background: "#fff", borderRadius: 24, padding: 32, width: "100%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0d47a1", margin: "8px 0 4px" }}>Área Admin</h2>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>Farmácia Arcanjo</p>
        </div>
        <input type="password" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} placeholder="Digite a senha"
          style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: erroSenha ? "2px solid #e53935" : "2px solid #e0e0e0", fontSize: 15, fontFamily: "'Nunito', sans-serif", outline: "none", boxSizing: "border-box" as any, marginBottom: 8 }} />
        {erroSenha && <p style={{ color: "#e53935", fontSize: 12, margin: "0 0 8px" }}>Senha incorreta!</p>}
        <button onClick={login} style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #0d47a1, #1565c0)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif", marginBottom: 10 }}>Entrar</button>
        <button onClick={() => setModo("catalogo")} style={{ width: "100%", padding: 10, borderRadius: 12, border: "none", background: "#f5f5f5", color: "#666", fontSize: 14, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>← Voltar</button>
      </div>
    </div>
  );

  
  const secoesAdmin = [
    { id: 'relatorio', emoji: '📊', titulo: 'Relatório', desc: 'Pedidos e faturamento', cor: '#0066cc', fundo: '#e6f0ff' },
    { id: 'clientes', emoji: '👥', titulo: 'Clientes', desc: 'Cadastro de clientes', cor: '#1565c0', fundo: '#e3f2fd' },
    { id: 'lembretes', emoji: '⏰', titulo: 'Lembretes', desc: 'Alertas automáticos', cor: '#e07b00', fundo: '#fff0e6' },
    { id: 'promocao', emoji: '📢', titulo: 'Promoção', desc: 'Gerador WhatsApp', cor: '#c62828', fundo: '#ffebee' },
    { id: 'caixa', emoji: '🧾', titulo: 'Caixa', desc: 'Fechamento de caixa', cor: '#0d47a1', fundo: '#e3f2fd' },
    { id: 'visitantes', emoji: '👁️', titulo: 'Visitantes', desc: 'Conversas e WhatsApp', cor: '#1565c0', fundo: '#e3f2fd' },
    { id: 'analytics', emoji: '📈', titulo: 'Analytics', desc: 'Visitantes e engajamento', cor: '#1565c0', fundo: '#e3f2fd' },
    { id: 'logatividades', emoji: '📋', titulo: 'Log', desc: 'Atividades do admin', cor: '#37474f', fundo: '#eceff1' },
    ...(usuarioLogado?.nivel === "master" ? [{ id: 'usuarios', emoji: '🔐', titulo: 'Usuários', desc: 'Gerenciar logins', cor: '#f57f17', fundo: '#fff9c4' }] : []),
    { id: 'cupom', emoji: '🧾', titulo: 'Cupom', desc: 'Imprimir cupom', cor: '#6d4c41', fundo: '#efebe9', externo: '/cupom.html' },
    { id: 'etiquetas', emoji: '🏷️', titulo: 'Etiquetas', desc: 'Imprimir etiquetas', cor: '#37474f', fundo: '#eceff1', externo: '/etiquetas.html' },
  ];

  if (modo === "admin") return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ background: "linear-gradient(135deg, #0d47a1, #1565c0)", padding: "20px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h1 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0 }}>⚙️ Gerenciar</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, margin: 0 }}>
                Olá, {usuarioLogado?.nome ?? "Admin"}! · <span style={{ color: "#90caf9" }}>{usuarioLogado?.funcao ?? usuarioLogado?.nivel}</span>
              </p>
              <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 20, background: usuarioLogado?.nivel === "master" ? "#ffd600" : usuarioLogado?.nivel === "editor" ? "#90caf9" : "#b0bec5", color: "#111", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {usuarioLogado?.nivel}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {podeEditar && <button onClick={() => abrirForm()} style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: "#fff", color: "#1565c0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>+ Novo</button>}
            <button onClick={() => setModo("catalogo")} style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>👁️ Ver</button>
            <button onClick={logout} style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>Sair</button>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          {firebaseAtivo === true && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#90caf9", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 9 }}>🟢</span> Sincronizado com a nuvem
            </span>
          )}
          {firebaseAtivo === false && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff176", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 9 }}>🟡</span> Modo offline (localStorage)
            </span>
          )}
          {firebaseAtivo === null && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 4 }}>
              ⏳ Conectando...
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "Produtos", valor: `${produtos.length}`, icon: "💊" },
            { label: "Baixo estoque", valor: `${produtos.filter(p => (p as any).estoque !== undefined && (p as any).estoque <= 5).length}`, icon: "⚠️" },
            { label: "Promoções ativas", valor: `${produtos.filter(p => p.desc?.includes("PROMOÇÃO")).length}`, icon: "🔥" },
          ].map(stat => (
            <div key={stat.label} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 12, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>{stat.icon}</span>
              <div>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 800, lineHeight: 1 }}>{stat.valor}</div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, lineHeight: 1.2 }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
        <BarcodeScanner
  produtos={produtos}
  onSalvar={(p) => {
    const idx = produtos.findIndex(x => x.id === p.id);
    if (idx >= 0) {
      const novos = [...produtos];
      novos[idx] = p;
      setProdutos(novos);
    } else {
      setProdutos([...produtos, p]);
    }
  }}
/>
<RelatorioPedidos />
      {!secaoAdmin ? (
        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {secoesAdmin.map(s => (
              <div
                key={s.id}
                onClick={() => s.externo ? window.open(s.externo, '_blank') : setSecaoAdmin(s.id)}
                style={{ background: "#fff", borderRadius: 16, padding: "20px 14px", textAlign: "center", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", border: "2px solid transparent", transition: "all 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = s.cor; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "transparent"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 14, background: s.fundo, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 26 }}>{s.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 14, color: s.cor }}>{s.titulo}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "0 16px 24px" }}>
            <button
              onClick={enviarTodosAoFirebase}
              disabled={seedStatus === "enviando"}
              style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: seedStatus === "concluido" ? "#1b5e20" : seedStatus === "enviando" ? "#555" : "#b71c1c", color: "#fff", fontSize: 15, fontWeight: 800, cursor: seedStatus === "enviando" ? "not-allowed" : "pointer", fontFamily: "'Nunito', sans-serif", transition: "background 0.3s" }}
            >
              {seedStatus === "idle" && "🔥 Enviar produtos ao Firebase"}
              {seedStatus === "enviando" && (seedProgresso || "Enviando...")}
              {seedStatus === "concluido" && "✅ Concluído! Todos os produtos enviados"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button onClick={() => setSecaoAdmin(null)} style={{ margin: 16, padding: "8px 16px", borderRadius: 20, border: "none", background: "#1565c0", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>← Voltar</button>
          {secaoAdmin === "relatorio" && <RelatorioPedidos />}
          {secaoAdmin === "clientes" && <CadastroClientes />}
          {secaoAdmin === "lembretes" && <LembretesAutomaticos />}
          {secaoAdmin === "promocao" && <GeradorPromocao />}
          {secaoAdmin === "caixa" && <FechamentoCaixa produtos={produtos} onAtualizarEstoque={setProdutos} />}
          {secaoAdmin === "visitantes" && <VisitantesLara />}
          {secaoAdmin === "analytics" && <AnalyticsDashboard />}
          {secaoAdmin === "logatividades" && <LogAtividades />}
          {secaoAdmin === "usuarios" && usuarioLogado?.nivel === "master" && (
            <GerenciarUsuarios usuarios={usuariosAdmin} setUsuarios={setUsuariosAdmin} />
          )}
        </div>
      )}
      {msgSucesso && <div style={{ background: "#e3f2fd", padding: "10px 16px", textAlign: "center", color: "#1565c0", fontWeight: 700, fontSize: 14 }}>{msgSucesso}</div>}
      <div style={{ padding: 16 }}>
        {produtos.map(p => (
          <div key={p.id} style={{ background: "#fff", borderRadius: 16, padding: "12px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: p.estoque !== undefined && p.estoque <= 5 ? "2px solid #ff9800" : "2px solid transparent" }}>
            <span style={{ fontSize: 28 }}>{p.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{p.nome}</div>
              <div style={{ fontSize: 13, color: "#1565c0", fontWeight: 700 }}>R${p.preco.toFixed(2)}</div>
              {p.estoque !== undefined && <div style={{ fontSize: 11, color: p.estoque <= 5 ? "#ff9800" : "#888" }}>Estoque: {p.estoque} {p.estoque <= 5 ? "⚠️ Baixo!" : ""}</div>}
              {p.prescricao && <div style={{ fontSize: 11, color: "#e53935" }}>⚠️ Receita médica</div>}
              {(p as any).promocao && <div style={{ fontSize: 11, color: "#f57c00" }}>🔥 {(p as any).promocao.descricao}</div>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {podeEditar && <button onClick={() => abrirForm(p)} style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "#e3f2fd", color: "#1565c0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏️</button>}
              {podeDeletar && <button onClick={() => {
                registrarLog({ acao: "produto_deletado", usuario: usuarioLogado?.nome ?? "Admin", userId: usuarioLogado?.id ?? "admin", produto: p.nome, ts: Date.now() });
                setProdutos(prev => prev.filter(x => x.id !== p.id));
                deletarProdutoFirebase(p.id).catch(() => {});
              }} style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "#ffebee", color: "#c62828", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🗑️</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );if (modo === "form") return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ background: "linear-gradient(135deg, #0d47a1, #1565c0)", padding: "20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setModo("admin")} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "50%", width: 36, height: 36, fontSize: 18, cursor: "pointer" }}>←</button>
        <h1 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0 }}>{editando ? "✏️ Editar" : "➕ Novo Produto"}</h1>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          {([["Nome *", "nome", "Ex: Dipirona 500mg"], ["Preço (R$) *", "preco", "Ex: 12.90"], ["Preço original (antes da promoção)", "precoOriginal", "Ex: 18.00"], ["Categoria", "categoria", "Ex: Analgésicos"], ["Descrição", "desc", "Ex: Para dor e febre"], ["Código de Barras", "codigoBarras", "Escanear ou digitar"], ["Estoque (qtd)", "estoque", "Ex: 50"], ["Promoção — Quantidade mínima", "promoQtd", "Ex: 3"], ["Promoção — Preço total", "promoPreco", "Ex: 10.00"], ["Promoção — Descrição", "promoDesc", "Ex: LEVE 3 por R$10,00"]] as [string, string, string][]).map(([label, key, placeholder]) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>{label}</label>
              <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "2px solid #e0e0e0", fontSize: 14, fontFamily: "'Nunito', sans-serif", outline: "none", boxSizing: "border-box" as any }} />
            </div>
          ))}
          <label style={{ fontSize: 13, fontWeight: 700, color: "#555", display: "flex", alignItems: "center", gap: 8, marginBottom: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={form.prescricao} onChange={e => setForm(f => ({ ...f, prescricao: e.target.checked }))} style={{ width: 18, height: 18 }} />
            ⚠️ Venda sob prescrição médica
          </label>
          <button onClick={salvarProduto} disabled={!form.nome || !form.preco}
            style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", background: (!form.nome || !form.preco) ? "#e0e0e0" : "linear-gradient(135deg, #0d47a1, #1565c0)", color: (!form.nome || !form.preco) ? "#aaa" : "#fff", fontSize: 15, fontWeight: 800, cursor: (!form.nome || !form.preco) ? "not-allowed" : "pointer", fontFamily: "'Nunito', sans-serif" }}>
            {editando ? "💾 Salvar" : "✅ Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );

  if (produtos.length === 0) return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff", fontFamily: "'Nunito', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ fontSize: 48 }}>💊</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1565c0" }}>Carregando catálogo...</div>
      <div style={{ fontSize: 13, color: "#888" }}>Buscando produtos no servidor</div>
      <button onClick={() => setModo("login")} style={{ marginTop: 8, padding: "10px 20px", borderRadius: 20, border: "2px solid #1565c0", background: "transparent", color: "#1565c0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⚙️ Admin</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff", fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ background: "linear-gradient(135deg, #0d47a1, #1565c0, #1976d2)", padding: "24px 20px 28px", position: "relative", overflow: "hidden" }}>
        <button onClick={() => setModo("login")} style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.25)", border: "2px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 20, padding: "12px 20px", fontSize: 13, cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito', sans-serif", zIndex: 10 }}>⚙️ Admin</button>
        <div style={{ textAlign: "center", position: "relative" }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>💊</div>
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>Farmácia Arcanjo</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: "3px 0 14px" }}>📍 Meruoca, Ceará · (88) 99337-5650</p>
          <div style={{ position: "relative", maxWidth: 400, margin: "0 auto" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, zIndex: 1 }}>🔍</span>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..."
              style={{ width: "100%", padding: "12px 16px 12px 40px", borderRadius: 24, border: "2px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.95)", fontSize: 14, fontFamily: "'Nunito', sans-serif", outline: "none", boxSizing: "border-box" as any }} />
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 16px 0", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 8, paddingBottom: 4, minWidth: "max-content" }}>
          {CATEGORIAS.map(cat => (
            <button key={cat} onClick={() => setCategoriaFiltro(cat)}
              style={{ padding: "7px 16px", borderRadius: 20, border: "none", background: categoriaFiltro === cat ? "#1565c0" : "#fff", color: categoriaFiltro === cat ? "#fff" : "#555", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 6px rgba(0,0,0,0.08)", whiteSpace: "nowrap" }}>{cat}</button>
          ))}
        </div>
      </div>
      {categoriaFiltro === "Todos" && busca === "" && promocoes.length > 0 && (
        <div style={{ margin: "12px 16px 0", background: "#ffebee", borderRadius: 16, padding: 16, border: "2px solid #c62828" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>🔥</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#c62828" }}>Ofertas da Semana</div>
              <div style={{ fontSize: 12, color: "#e53935" }}>Aproveite enquanto dura o estoque!</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {promocoes.map(p => {
              const qty = getQuantidade(p.id);
              return (
                <div key={p.id} style={{ background: "#fff", borderRadius: 14, padding: 12, minWidth: 160, border: "2px solid #c62828", flexShrink: 0 }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{p.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>{p.nome.split(" ").slice(0, 3).join(" ")}</div>
                  {p.precoOriginal && <div style={{ fontSize: 12, color: "#aaa", textDecoration: "line-through" }}>R${(p.precoOriginal * p.promocao!.quantidade).toFixed(2)}</div>}
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#c62828" }}>R${p.promocao!.precoTotal.toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: "#c62828", fontWeight: 700, marginBottom: 8 }}>🔥 {p.promocao!.descricao}</div>
                  {qty === 0 ? (
                    <button onClick={() => setQuantidade(p, p.promocao!.quantidade)} style={{ width: "100%", padding: "8px", borderRadius: 10, border: "none", background: "#c62828", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Adicionar</button>
                  ) : (
                    <div style={{ display: "block" }}>
                      <button onClick={() => setQuantidade(p, qty - 1)} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "#f5f5f5", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>−</button>
                      <span style={{ fontWeight: 800, fontSize: 16 }}>{qty}</span>
                      <button onClick={() => setQuantidade(p, qty + 1)} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "#1565c0", color: "#fff", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}<div style={{ padding: "12px 16px 120px" }}>
              <p style={{ color: "#aaa", fontSize: 12, margin: "0 0 10px" }}>{produtosFiltrados.length} produto(s)</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {produtosFiltrados.map(p => {
                  const qty = getQuantidade(p.id);
                  const esgotado = p.estoque !== undefined && p.estoque === 0;
                  const estoqueBaixo = p.estoque !== undefined && p.estoque > 0 && p.estoque <= 5;
                  const precoExibir = qty > 0 ? calcularPreco(p, qty) : p.preco;
                  return (
                    <div key={p.id} style={{ background: "#fff", borderRadius: 16, padding: 14, boxShadow: p.promocao ? "0 0 0 2px #c62828, 0 4px 12px rgba(198,40,40,0.15)" : qty > 0 ? "0 0 0 2px #1565c0" : "0 2px 8px rgba(0,0,0,0.07)", border: "2px solid transparent", position: "relative", opacity: esgotado ? 0.6 : 1 }}>
                      {p.promocao && <div style={{ position: "absolute", top: 0, left: 0, background: "#c62828", color: "#fff", fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: "14px 0 10px 0" }}>🔥 PROMOÇÃO</div>}
                      {esgotado && <div style={{ position: "absolute", top: 8, right: 8, background: "#e53935", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 6 }}>Esgotado</div>}
                      {estoqueBaixo && <div style={{ position: "absolute", top: 8, right: 8, background: "#ff9800", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 6 }}>⚠️ Últimas</div>}
                      <div style={{ fontSize: 26, marginBottom: 6, marginTop: p.promocao ? 12 : 0 }}>{p.emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.3, marginBottom: 3 }}>{p.nome}</div>
                      {p.precoOriginal && qty >= (p.promocao?.quantidade || 999) && (
                        <div style={{ fontSize: 11, color: "#aaa", textDecoration: "line-through" }}>R${(p.precoOriginal * qty).toFixed(2)}</div>
                      )}
                      <div style={{ fontSize: 14, fontWeight: 800, color: p.promocao && qty >= p.promocao.quantidade ? "#c62828" : "#1565c0", marginBottom: 3 }}>
                        R${qty > 0 ? precoExibir.toFixed(2) : p.preco.toFixed(2)}
                        {qty > 0 && p.promocao && qty >= p.promocao.quantidade && <span style={{ fontSize: 10, color: "#e65100", marginLeft: 4 }}>🔥</span>}
                      </div>
                      {p.prescricao && <div style={{ fontSize: 9, color: "#e53935", fontWeight: 700, marginBottom: 4 }}>⚠️ Receita médica</div>}
                      <div style={{ fontSize: 10, color: "#888", marginBottom: 8 }}>{p.desc}</div>
                      {!esgotado && (
                        qty === 0 ? (
                          <button onClick={() => setQuantidade(p, 1)}
                            style={{ width: "100%", padding: "8px", borderRadius: 10, border: "none", background: p.promocao ? "#c62828" : "#1565c0", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Adicionar</button>
                        ) : (
                          <div style={{ display: "block" }}>
                            <button onClick={() => setQuantidade(p, qty - 1)} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "#f5f5f5", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>−</button>
                            <span style={{ fontWeight: 800, fontSize: 15 }}>{qty}</span>
                            <button onClick={() => setQuantidade(p, qty + 1)} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "#1565c0", color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>+</button>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {pedido.length > 0 && (
              <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", padding: "14px 20px", boxShadow: "0 -4px 20px rgba(0,0,0,0.12)", borderRadius: "20px 20px 0 0" }}>
                <div style={{ maxWidth: 480, margin: "0 auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>🛒 {pedido.reduce((a, i) => a + i.quantidade, 0)} item(ns) · <span style={{ color: "#1565c0" }}>R${totalPedido.toFixed(2)}</span></span>
                    <span onClick={() => setPedido([])} style={{ fontSize: 12, color: "#e53935", cursor: "pointer", fontWeight: 700 }}>Limpar</span>
                  </div>
                  <button onClick={enviarWhatsApp} style={{ width: "100%", padding: 14, borderRadius: 16, border: "none", background: "linear-gradient(135deg, #25d366, #128c7e)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>📲</span> Pedir pelo WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }
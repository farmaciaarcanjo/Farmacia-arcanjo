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
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

const WHATSAPP = "5588993375650";

type NivelAcesso = "master" | "editor" | "viewer";
interface UsuarioAdmin { id: string; nome: string; senha: string; nivel: NivelAcesso; }
const USUARIOS_ADMIN: UsuarioAdmin[] = [
  { id: "admin",        nome: "Administrador", senha: "arcanjo2026", nivel: "master" },
  { id: "farmaceutico", nome: "Farmacêutico",  senha: "farm2026",   nivel: "editor" },
  { id: "atendente",    nome: "Atendente",     senha: "atend2026",  nivel: "viewer" },
];

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
  try { addDoc(collection(db, "admin_log"), { ...entry, createdAt: serverTimestamp() }); } catch {}
}

interface ItemPedido {
  produto: Produto;
  quantidade: number;
}

const CATEGORIAS = ["Todos", ...Array.from(new Set(PRODUTOS_INICIAIS.map(p => p.categoria)))];

function LogAtividades() {
  const log = carregarLog().reverse().slice(0, 20);
  const corAcao: Record<TipoAcao, { bg: string; cor: string; label: string }> = {
    produto_adicionado: { bg: "#e8f5e9", cor: "#2e7d32", label: "Adicionou" },
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
              <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "10px 14px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", borderLeft: `4px solid ${cfg.cor}`, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ background: cfg.bg, color: cfg.cor, borderRadius: 8, padding: "3px 9px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>
                  {cfg.label}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.produto}
                  </div>
                  <div style={{ fontSize: 11, color: "#888" }}>
                    {entry.usuario}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#aaa", whiteSpace: "nowrap", textAlign: "right" }}>
                  <div>{dataStr}</div>
                  <div>{hora}</div>
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
  const [produtos, setProdutos] = useState<Produto[]>(() => {
    try {
      const saved =localStorage.getItem("farmacia_produtos_v3") ;
      return saved ? JSON.parse(saved) : PRODUTOS_INICIAIS;
    } catch { return PRODUTOS_INICIAIS; }
  });
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
    try { localStorage.setItem("farmacia_produtos_v3", JSON.stringify(produtos)); } catch {}
  }, [produtos]);

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
    const usuario = USUARIOS_ADMIN.find(u => u.senha === senha);
    if (usuario) { setUsuarioLogado(usuario); setModo("admin"); setErroSenha(false); setSenha(""); }
    else setErroSenha(true);
  }

  function logout() { setUsuarioLogado(null); setModo("catalogo"); }

  const podeEditar = usuarioLogado?.nivel === "master" || usuarioLogado?.nivel === "editor";
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
    if (editando) { const novos = produtos.map(p => p.id === editando ? novo : p); setProdutos(novos); try { localStorage.setItem("farmacia_produtos_v3", JSON.stringify(novos)); } catch {} }
    else { const novos = [...produtos, novo]; setProdutos(novos); try { localStorage.setItem("farmacia_produtos_v3", JSON.stringify(novos)); } catch {} }
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
    const lista = pedido.map(i => {
      const total = calcularPreco(i.produto, i.quantidade);
      return `• ${i.quantidade}x ${i.produto.nome} — R$${total.toFixed(2)}`;
    }).join("\n");
    const msg = `Olá! Vi o catálogo da Farmácia Arcanjo e gostaria de:\n\n${lista}\n\n💰 Total: R$${totalPedido.toFixed(2)}\n\nPoderia confirmar disponibilidade e entrega? 😊`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  }if (modo === "login") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1b5e20, #2e7d32)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ background: "#fff", borderRadius: 24, padding: 32, width: "100%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1b5e20", margin: "8px 0 4px" }}>Área Admin</h2>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>Farmácia Arcanjo</p>
        </div>
        <input type="password" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} placeholder="Digite a senha"
          style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: erroSenha ? "2px solid #e53935" : "2px solid #e0e0e0", fontSize: 15, fontFamily: "'Nunito', sans-serif", outline: "none", boxSizing: "border-box" as any, marginBottom: 8 }} />
        {erroSenha && <p style={{ color: "#e53935", fontSize: 12, margin: "0 0 8px" }}>Senha incorreta!</p>}
        <button onClick={login} style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #2e7d32, #43a047)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif", marginBottom: 10 }}>Entrar</button>
        <button onClick={() => setModo("catalogo")} style={{ width: "100%", padding: 10, borderRadius: 12, border: "none", background: "#f5f5f5", color: "#666", fontSize: 14, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>← Voltar</button>
      </div>
    </div>
  );

  
  const secoesAdmin = [
    { id: 'relatorio', emoji: '📊', titulo: 'Relatório', desc: 'Pedidos e faturamento', cor: '#0066cc', fundo: '#e6f0ff' },
    { id: 'clientes', emoji: '👥', titulo: 'Clientes', desc: 'Cadastro de clientes', cor: '#7c3aed', fundo: '#f0ebff' },
    { id: 'lembretes', emoji: '⏰', titulo: 'Lembretes', desc: 'Alertas automáticos', cor: '#e07b00', fundo: '#fff0e6' },
    { id: 'promocao', emoji: '📢', titulo: 'Promoção', desc: 'Gerador WhatsApp', cor: '#c0392b', fundo: '#fdecea' },
    { id: 'caixa', emoji: '🧾', titulo: 'Caixa', desc: 'Fechamento de caixa', cor: '#0d7680', fundo: '#e6f5f6' },
    { id: 'analytics', emoji: '📈', titulo: 'Analytics', desc: 'Visitantes e engajamento', cor: '#145f2e', fundo: '#e8f5ee' },
    { id: 'logatividades', emoji: '📋', titulo: 'Log', desc: 'Atividades do admin', cor: '#4527a0', fundo: '#ede7f6' },
    { id: 'cupom', emoji: '🧾', titulo: 'Cupom', desc: 'Imprimir cupom', cor: '#6d4c41', fundo: '#efebe9', externo: '/cupom.html' },
    { id: 'etiquetas', emoji: '🏷️', titulo: 'Etiquetas', desc: 'Imprimir etiquetas', cor: '#37474f', fundo: '#eceff1', externo: '/etiquetas.html' },
  ];

  if (modo === "admin") return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ background: "linear-gradient(135deg, #1b5e20, #2e7d32)", padding: "20px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h1 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0 }}>⚙️ Gerenciar</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, margin: 0 }}>
                Olá, {usuarioLogado?.nome ?? "Admin"}
              </p>
              <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 20, background: usuarioLogado?.nivel === "master" ? "#ffd600" : usuarioLogado?.nivel === "editor" ? "#81d4fa" : "#b0bec5", color: "#111", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {usuarioLogado?.nivel}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {podeEditar && <button onClick={() => abrirForm()} style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: "#fff", color: "#1b5e20", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>+ Novo</button>}
            <button onClick={() => setModo("catalogo")} style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>👁️ Ver</button>
            <button onClick={logout} style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>Sair</button>
          </div>
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
        </div>
      ) : (
        <div>
          <button onClick={() => setSecaoAdmin(null)} style={{ margin: 16, padding: "8px 16px", borderRadius: 20, border: "none", background: "#1b5e20", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>← Voltar</button>
          {secaoAdmin === "relatorio" && <RelatorioPedidos />}
          {secaoAdmin === "clientes" && <CadastroClientes />}
          {secaoAdmin === "lembretes" && <LembretesAutomaticos />}
          {secaoAdmin === "promocao" && <GeradorPromocao />}
          {secaoAdmin === "caixa" && <FechamentoCaixa produtos={produtos} onAtualizarEstoque={setProdutos} />}
          {secaoAdmin === "analytics" && <AnalyticsDashboard />}
          {secaoAdmin === "logatividades" && <LogAtividades />}
        </div>
      )}
      {msgSucesso && <div style={{ background: "#e8f5e9", padding: "10px 16px", textAlign: "center", color: "#2e7d32", fontWeight: 700, fontSize: 14 }}>{msgSucesso}</div>}
      <div style={{ padding: 16 }}>
        {produtos.map(p => (
          <div key={p.id} style={{ background: "#fff", borderRadius: 16, padding: "12px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: p.estoque !== undefined && p.estoque <= 5 ? "2px solid #ff9800" : "2px solid transparent" }}>
            <span style={{ fontSize: 28 }}>{p.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{p.nome}</div>
              <div style={{ fontSize: 13, color: "#2e7d32", fontWeight: 700 }}>R${p.preco.toFixed(2)}</div>
              {p.estoque !== undefined && <div style={{ fontSize: 11, color: p.estoque <= 5 ? "#ff9800" : "#888" }}>Estoque: {p.estoque} {p.estoque <= 5 ? "⚠️ Baixo!" : ""}</div>}
              {p.prescricao && <div style={{ fontSize: 11, color: "#e53935" }}>⚠️ Receita médica</div>}
              {(p as any).promocao && <div style={{ fontSize: 11, color: "#f57c00" }}>🔥 {(p as any).promocao.descricao}</div>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {podeEditar && <button onClick={() => abrirForm(p)} style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "#e3f2fd", color: "#1565c0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏️</button>}
              {podeDeletar && <button onClick={() => { registrarLog({ acao: "produto_deletado", usuario: usuarioLogado?.nome ?? "Admin", userId: usuarioLogado?.id ?? "admin", produto: p.nome, ts: Date.now() }); setProdutos(prev => prev.filter(x => x.id !== p.id)); }} style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "#ffebee", color: "#c62828", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🗑️</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );if (modo === "form") return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ background: "linear-gradient(135deg, #1b5e20, #2e7d32)", padding: "20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
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
            style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", background: (!form.nome || !form.preco) ? "#e0e0e0" : "linear-gradient(135deg, #2e7d32, #43a047)", color: (!form.nome || !form.preco) ? "#aaa" : "#fff", fontSize: 15, fontWeight: 800, cursor: (!form.nome || !form.preco) ? "not-allowed" : "pointer", fontFamily: "'Nunito', sans-serif" }}>
            {editando ? "💾 Salvar" : "✅ Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0faf4", fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ background: "linear-gradient(135deg, #1b5e20, #2e7d32, #388e3c)", padding: "24px 20px 28px", position: "relative", overflow: "hidden" }}>
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
              style={{ padding: "7px 16px", borderRadius: 20, border: "none", background: categoriaFiltro === cat ? "#2e7d32" : "#fff", color: categoriaFiltro === cat ? "#fff" : "#555", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 6px rgba(0,0,0,0.08)", whiteSpace: "nowrap" }}>{cat}</button>
          ))}
        </div>
      </div>
      {categoriaFiltro === "Todos" && busca === "" && promocoes.length > 0 && (
        <div style={{ margin: "12px 16px 0", background: "#fff8f0", borderRadius: 16, padding: 16, border: "2px solid #ff9800" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>🔥</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#e65100" }}>Ofertas da Semana</div>
              <div style={{ fontSize: 12, color: "#f57c00" }}>Aproveite enquanto dura o estoque!</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {promocoes.map(p => {
              const qty = getQuantidade(p.id);
              return (
                <div key={p.id} style={{ background: "#fff", borderRadius: 14, padding: 12, minWidth: 160, border: "2px solid #ff9800", flexShrink: 0 }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{p.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>{p.nome.split(" ").slice(0, 3).join(" ")}</div>
                  {p.precoOriginal && <div style={{ fontSize: 12, color: "#aaa", textDecoration: "line-through" }}>R${(p.precoOriginal * p.promocao!.quantidade).toFixed(2)}</div>}
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#e65100" }}>R${p.promocao!.precoTotal.toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: "#f57c00", fontWeight: 700, marginBottom: 8 }}>🔥 {p.promocao!.descricao}</div>
                  {qty === 0 ? (
                    <button onClick={() => setQuantidade(p, p.promocao!.quantidade)} style={{ width: "100%", padding: "8px", borderRadius: 10, border: "none", background: "#ff9800", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Adicionar</button>
                  ) : (
                    <div style={{ display: "block" }}>
                      <button onClick={() => setQuantidade(p, qty - 1)} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "#f5f5f5", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>−</button>
                      <span style={{ fontWeight: 800, fontSize: 16 }}>{qty}</span>
                      <button onClick={() => setQuantidade(p, qty + 1)} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "#2e7d32", color: "#fff", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>+</button>
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
                    <div key={p.id} style={{ background: "#fff", borderRadius: 16, padding: 14, boxShadow: p.promocao ? "0 0 0 2px #ff9800, 0 4px 12px rgba(255,152,0,0.15)" : qty > 0 ? "0 0 0 2px #2e7d32" : "0 2px 8px rgba(0,0,0,0.07)", border: "2px solid transparent", position: "relative", opacity: esgotado ? 0.6 : 1 }}>
                      {p.promocao && <div style={{ position: "absolute", top: 0, left: 0, background: "#ff9800", color: "#fff", fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: "14px 0 10px 0" }}>🔥 PROMOÇÃO</div>}
                      {esgotado && <div style={{ position: "absolute", top: 8, right: 8, background: "#e53935", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 6 }}>Esgotado</div>}
                      {estoqueBaixo && <div style={{ position: "absolute", top: 8, right: 8, background: "#ff9800", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 6 }}>⚠️ Últimas</div>}
                      <div style={{ fontSize: 26, marginBottom: 6, marginTop: p.promocao ? 12 : 0 }}>{p.emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.3, marginBottom: 3 }}>{p.nome}</div>
                      {p.precoOriginal && qty >= (p.promocao?.quantidade || 999) && (
                        <div style={{ fontSize: 11, color: "#aaa", textDecoration: "line-through" }}>R${(p.precoOriginal * qty).toFixed(2)}</div>
                      )}
                      <div style={{ fontSize: 14, fontWeight: 800, color: p.promocao && qty >= p.promocao.quantidade ? "#e65100" : "#2e7d32", marginBottom: 3 }}>
                        R${qty > 0 ? precoExibir.toFixed(2) : p.preco.toFixed(2)}
                        {qty > 0 && p.promocao && qty >= p.promocao.quantidade && <span style={{ fontSize: 10, color: "#e65100", marginLeft: 4 }}>🔥</span>}
                      </div>
                      {p.prescricao && <div style={{ fontSize: 9, color: "#e53935", fontWeight: 700, marginBottom: 4 }}>⚠️ Receita médica</div>}
                      <div style={{ fontSize: 10, color: "#888", marginBottom: 8 }}>{p.desc}</div>
                      {!esgotado && (
                        qty === 0 ? (
                          <button onClick={() => setQuantidade(p, 1)}
                            style={{ width: "100%", padding: "8px", borderRadius: 10, border: "none", background: p.promocao ? "#ff9800" : "#2e7d32", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Adicionar</button>
                        ) : (
                          <div style={{ display: "block" }}>
                            <button onClick={() => setQuantidade(p, qty - 1)} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "#f5f5f5", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>−</button>
                            <span style={{ fontWeight: 800, fontSize: 15 }}>{qty}</span>
                            <button onClick={() => setQuantidade(p, qty + 1)} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "#2e7d32", color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>+</button>
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
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>🛒 {pedido.reduce((a, i) => a + i.quantidade, 0)} item(ns) · <span style={{ color: "#2e7d32" }}>R${totalPedido.toFixed(2)}</span></span>
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
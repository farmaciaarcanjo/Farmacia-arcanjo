import { useState, useEffect } from "react";
import { PRODUTOS_INICIAIS, VERSAO_CATALOGO } from "../data/produtos";

const SENHA_ADMIN = "arcanjo2026";


const EMOJIS = ["💊","🌿","🍯","💧","🦠","🌡️","❤️","🩺","🧴","☀️","👶","🍶","🛡️","💆","🥛","💨","🍊","🧪"];

export default function CatalogoAdmin() {
  const [produtos, setProdutos] = useState(() => {
    try {
      const versaoSalva = localStorage.getItem("farmacia_versao");
      const saved = localStorage.getItem("farmacia_produtos");
      if (versaoSalva !== VERSAO_CATALOGO) {
        localStorage.setItem("farmacia_versao", VERSAO_CATALOGO);
        localStorage.setItem("farmacia_produtos", JSON.stringify(PRODUTOS_INICIAIS));
        return PRODUTOS_INICIAIS;
      }
      return saved ? JSON.parse(saved) : PRODUTOS_INICIAIS;
    } catch { return PRODUTOS_INICIAIS; }
  });
  const [modo, setModo] = useState("catalogo");
  const [senha, setSenha] = useState("");
  const [erroSenha, setErroSenha] = useState(false);
  const [pedido, setPedido] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: "", preco: "", categoria: "", emoji: "💊", desc: "" });
  const [msgSucesso, setMsgSucesso] = useState("");

  useEffect(() => {
    try { localStorage.setItem("farmacia_produtos", JSON.stringify(produtos)); } catch {}
  }, [produtos]);

  const categorias = ["Todos", ...Array.from(new Set(produtos.map(p => p.categoria)))];

  const produtosFiltrados = produtos.filter(p => {
    const matchCat = categoriaFiltro === "Todos" || p.categoria === categoriaFiltro;
    const matchBusca = busca === "" || p.nome.toLowerCase().includes(busca.toLowerCase());
    return matchCat && matchBusca;
  });

  function login() {
    if (senha === SENHA_ADMIN) { setModo("admin"); setErroSenha(false); setSenha(""); }
    else { setErroSenha(true); }
  }

  function abrirForm(produto = null) {
    if (produto) {
      setEditando(produto.id);
      setForm({ nome: produto.nome, preco: produto.preco, categoria: produto.categoria, emoji: produto.emoji, desc: produto.desc });
    } else {
      setEditando(null);
      setForm({ nome: "", preco: "", categoria: "", emoji: "💊", desc: "" });
    }
    setModo("form");
  }

  function salvarProduto() {
    if (!form.nome || !form.preco) return;
    if (editando) {
      setProdutos(prev => prev.map(p => p.id === editando ? { ...p, ...form, preco: parseFloat(form.preco) } : p));
      setMsgSucesso("Produto atualizado! ✅");
    } else {
      const novo = { ...form, preco: parseFloat(form.preco), id: Date.now() };
      setProdutos(prev => [...prev, novo]);
      setMsgSucesso("Produto adicionado! ✅");
    }
    setTimeout(() => setMsgSucesso(""), 2000);
    setModo("admin");
  }

  function deletarProduto(id) {
    setProdutos(prev => prev.filter(p => p.id !== id));
    setMsgSucesso("Produto removido! ✅");
    setTimeout(() => setMsgSucesso(""), 2000);
  }

  function togglePedido(produto) {
    setPedido(prev => prev.find(p => p.id === produto.id) ? prev.filter(p => p.id !== produto.id) : [...prev, produto]);
  }

  function enviarWhatsApp() {
    const lista = pedido.map(p => `• ${p.nome} — R$${p.preco.toFixed(2)}`).join("\n");
    const msg = `Olá! Vi o catálogo da Farmácia Arcanjo e gostaria de:\n\n${lista}\n\nPoderia confirmar disponibilidade e entrega? 😊`;
    window.open(`https://wa.me/5588993375650?text=${encodeURIComponent(msg)}`, "_blank");
  }

  // TELA DE LOGIN
  if (modo === "login") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1b5e20, #2e7d32)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ background: "#fff", borderRadius: 24, padding: 32, width: "100%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1b5e20", margin: "8px 0 4px" }}>Área Admin</h2>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>Farmácia Arcanjo</p>
        </div>
        <input
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
          placeholder="Digite a senha"
          style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: erroSenha ? "2px solid #e53935" : "2px solid #e0e0e0", fontSize: 15, fontFamily: "'Nunito', sans-serif", outline: "none", boxSizing: "border-box", marginBottom: 8 }}
        />
        {erroSenha && <p style={{ color: "#e53935", fontSize: 12, margin: "0 0 8px" }}>Senha incorreta!</p>}
        <button onClick={login} style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #2e7d32, #43a047)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif", marginBottom: 10 }}>
          Entrar
        </button>
        <button onClick={() => setModo("catalogo")} style={{ width: "100%", padding: 10, borderRadius: 12, border: "none", background: "#f5f5f5", color: "#666", fontSize: 14, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
          ← Voltar ao catálogo
        </button>
      </div>
    </div>
  );

  // TELA ADMIN
  if (modo === "admin") return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ background: "linear-gradient(135deg, #1b5e20, #2e7d32)", padding: "20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0 }}>⚙️ Gerenciar Produtos</h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: "2px 0 0" }}>{produtos.length} produtos cadastrados</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => abrirForm()} style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: "#fff", color: "#1b5e20", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
            + Novo
          </button>
          <button onClick={() => setModo("catalogo")} style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
            👁️ Ver
          </button>
        </div>
      </div>

      {msgSucesso && (
        <div style={{ background: "#e8f5e9", padding: "10px 16px", textAlign: "center", color: "#2e7d32", fontWeight: 700, fontSize: 14 }}>
          {msgSucesso}
        </div>
      )}

      <div style={{ padding: 16 }}>
        {produtos.map(p => (
          <div key={p.id} style={{ background: "#fff", borderRadius: 16, padding: "12px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <span style={{ fontSize: 28 }}>{p.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{p.nome}</div>
              <div style={{ fontSize: 13, color: "#2e7d32", fontWeight: 700 }}>R${p.preco.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{p.categoria}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => abrirForm(p)} style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "#e3f2fd", color: "#1565c0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>✏️</button>
              <button onClick={() => deletarProduto(p.id)} style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "#ffebee", color: "#c62828", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // TELA FORM
  if (modo === "form") return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ background: "linear-gradient(135deg, #1b5e20, #2e7d32)", padding: "20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setModo("admin")} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "50%", width: 36, height: 36, fontSize: 18, cursor: "pointer" }}>←</button>
        <h1 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0 }}>{editando ? "✏️ Editar Produto" : "➕ Novo Produto"}</h1>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>Nome do produto *</label>
          <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Dipirona 500mg" style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "2px solid #e0e0e0", fontSize: 14, fontFamily: "'Nunito', sans-serif", outline: "none", boxSizing: "border-box", marginBottom: 14 }} />

          <label style={{ fontSize: 13, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>Preço (R$) *</label>
          <input value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))} placeholder="Ex: 12.90" type="number" step="0.01" style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "2px solid #e0e0e0", fontSize: 14, fontFamily: "'Nunito', sans-serif", outline: "none", boxSizing: "border-box", marginBottom: 14 }} />

          <label style={{ fontSize: 13, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>Categoria</label>
          <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} placeholder="Ex: Dor, Estômago, Vitaminas..." style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "2px solid #e0e0e0", fontSize: 14, fontFamily: "'Nunito', sans-serif", outline: "none", boxSizing: "border-box", marginBottom: 14 }} />

          <label style={{ fontSize: 13, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>Descrição curta</label>
          <input value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Ex: Para dor de cabeça e febre" style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "2px solid #e0e0e0", fontSize: 14, fontFamily: "'Nunito', sans-serif", outline: "none", boxSizing: "border-box", marginBottom: 14 }} />

          <label style={{ fontSize: 13, fontWeight: 700, color: "#555", display: "block", marginBottom: 8 }}>Emoji do produto</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))} style={{ width: 40, height: 40, borderRadius: 10, border: form.emoji === e ? "3px solid #2e7d32" : "2px solid #e0e0e0", background: form.emoji === e ? "#e8f5e9" : "#fff", fontSize: 20, cursor: "pointer" }}>{e}</button>
            ))}
          </div>

          <button onClick={salvarProduto} disabled={!form.nome || !form.preco} style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", background: (!form.nome || !form.preco) ? "#e0e0e0" : "linear-gradient(135deg, #2e7d32, #43a047)", color: (!form.nome || !form.preco) ? "#aaa" : "#fff", fontSize: 15, fontWeight: 800, cursor: (!form.nome || !form.preco) ? "not-allowed" : "pointer", fontFamily: "'Nunito', sans-serif" }}>
            {editando ? "💾 Salvar alterações" : "✅ Adicionar produto"}
          </button>
        </div>
      </div>
    </div>
  );

  // TELA CATÁLOGO (pública)
  return (
    <div style={{ minHeight: "100vh", background: "#f0faf4", fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ background: "linear-gradient(135deg, #1b5e20, #2e7d32, #388e3c)", padding: "24px 20px 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ textAlign: "center", position: "relative" }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>💊</div>
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>Farmácia Arcanjo</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: "3px 0 14px" }}>📍 Meruoca, Ceará · (88) 99337-5650</p>
          <div style={{ position: "relative", maxWidth: 320, margin: "0 auto" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..." style={{ width: "100%", padding: "10px 14px 10px 36px", borderRadius: 24, border: "none", fontSize: 13, fontFamily: "'Nunito', sans-serif", outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
        <button onClick={() => setModo("login")} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 20, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
          ⚙️ Admin
        </button>
      </div>

      <div style={{ padding: "12px 16px 0", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 8, paddingBottom: 4, minWidth: "max-content" }}>
          {categorias.map(cat => (
            <button key={cat} onClick={() => setCategoriaFiltro(cat)} style={{ padding: "7px 16px", borderRadius: 20, border: "none", background: categoriaFiltro === cat ? "#2e7d32" : "#fff", color: categoriaFiltro === cat ? "#fff" : "#555", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif", boxShadow: "0 1px 6px rgba(0,0,0,0.08)", whiteSpace: "nowrap" }}>{cat}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 16px 100px" }}>
        <p style={{ color: "#aaa", fontSize: 12, margin: "0 0 10px" }}>{produtosFiltrados.length} produto(s)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {produtosFiltrados.map(p => {
            const sel = pedido.find(x => x.id === p.id);
            return (
              <div key={p.id} onClick={() => togglePedido(p)} style={{ background: "#fff", borderRadius: 16, padding: 14, boxShadow: sel ? "0 0 0 2px #2e7d32, 0 4px 12px rgba(46,125,50,0.15)" : "0 2px 8px rgba(0,0,0,0.07)", cursor: "pointer", border: sel ? "2px solid #2e7d32" : "2px solid transparent", position: "relative", transition: "all 0.2s" }}>
                {sel && <div style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: "50%", background: "#2e7d32", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 700 }}>✓</div>}
                <div style={{ fontSize: 26, marginBottom: 6 }}>{p.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.3, marginBottom: 3 }}>{p.nome}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#2e7d32", marginBottom: 3 }}>R${p.preco.toFixed(2)}</div>
                <div style={{ fontSize: 10, color: "#888" }}>{p.desc}</div>
                <div style={{ marginTop: 6, fontSize: 10, color: "#2e7d32", fontWeight: 700, background: "#e8f5e9", borderRadius: 6, padding: "2px 7px", display: "inline-block" }}>{p.categoria}</div>
              </div>
            );
          })}
        </div>
      </div>

      {pedido.length > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", padding: "14px 20px", boxShadow: "0 -4px 20px rgba(0,0,0,0.12)", borderRadius: "20px 20px 0 0" }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>🛒 {pedido.length} item(s)</span>
              <span onClick={() => setPedido([])} style={{ fontSize: 12, color: "#e53935", cursor: "pointer", fontWeight: 700 }}>Limpar</span>
            </div>
            <button onClick={enviarWhatsApp} style={{ width: "100%", padding: 14, borderRadius: 16, border: "none", background: "linear-gradient(135deg, #25d366, #128c7e)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>📲</span> Pedir pelo WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { PRODUTOS_INICIAIS, VERSAO_CATALOGO, calcularPreco, Produto } from "../data/produtos";

const SENHA_ADMIN = "arcanjo2026";
const WHATSAPP = "5588993375650";

interface ItemPedido {
  produto: Produto;
  quantidade: number;
}

const CATEGORIAS = ["Todos", ...Array.from(new Set(PRODUTOS_INICIAIS.map(p => p.categoria)))];

export default function CatalogoAdmin() {
  const [produtos, setProdutos] = useState<Produto[]>(() => {
    try {
      const saved = localStorage.getItem("farmacia_produtos_v2");
      return saved ? JSON.parse(saved) : PRODUTOS_INICIAIS;
    } catch { return PRODUTOS_INICIAIS; }
  });
  const [modo, setModo] = useState<"catalogo" | "login" | "admin" | "form">("catalogo");
  const [senha, setSenha] = useState("");
  const [erroSenha, setErroSenha] = useState(false);
  const [pedido, setPedido] = useState<ItemPedido[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState({ nome: "", preco: "", precoOriginal: "", categoria: "", emoji: "💊", desc: "", prescricao: false, estoque: "", promoQtd: "", promoPreco: "", promoDesc: "" });
  const [msgSucesso, setMsgSucesso] = useState("");

  useEffect(() => {
    try { localStorage.setItem("farmacia_produtos_v2", JSON.stringify(produtos)); } catch {}
  }, [produtos]);

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
        if (exists) return prev.map(i => i.produto.id === produto.id ? { ...i, quantidade: qty } : i);
        return [...prev, { produto, quantidade: qty }];
      });
    }
  }

  function login() {
    if (senha === SENHA_ADMIN) { setModo("admin"); setErroSenha(false); setSenha(""); }
    else setErroSenha(true);
  }

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
      promocao: form.promoQtd && form.promoPreco ? {
        quantidade: parseInt(form.promoQtd),
        precoTotal: parseFloat(form.promoPreco),
        descricao: form.promoDesc || `LEVE ${form.promoQtd} por R$${form.promoPreco}`
      } : undefined
    };
    if (editando) setProdutos(prev => prev.map(p => p.id === editando ? novo : p));
    else setProdutos(prev => [...prev, novo]);
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
      setForm({ nome: "", preco: "", precoOriginal: "", categoria: "", emoji: "💊", desc: "", prescricao: false, estoque: "", promoQtd: "", promoPreco: "", promoDesc: "" });
    }
    setModo("form");
  }

  function enviarWhatsApp() {
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

  if (modo === "admin") return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ background: "linear-gradient(135deg, #1b5e20, #2e7d32)", padding: "20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0 }}>⚙️ Gerenciar Produtos</h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: "2px 0 0" }}>{produtos.length} produtos cadastrados</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => abrirForm()} style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: "#fff", color: "#1b5e20", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Novo</button>
          <button onClick={() => setModo("catalogo")} style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>👁️ Ver</button>
        </div>
      </div>
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
              {p.promocao && <div style={{ fontSize: 11, color: "#f57c00" }}>🔥 {p.promocao.descricao}</div>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => abrirForm(p)} style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "#e3f2fd", color: "#1565c0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏️</button>
              <button onClick={() => setProdutos(prev => prev.filter(x => x.id !== p.id))} style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "#ffebee", color: "#c62828", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🗑️</button>
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
          {([["Nome *", "nome", "Ex: Dipirona 500mg"], ["Preço (R$) *", "preco", "Ex: 12.90"], ["Preço original (antes da promoção)", "precoOriginal", "Ex: 18.00"], ["Categoria", "categoria", "Ex: Analgésicos"], ["Descrição", "desc", "Ex: Para dor e febre"], ["Estoque (qtd)", "estoque", "Ex: 50"], ["Promoção — Quantidade mínima", "promoQtd", "Ex: 3"], ["Promoção — Preço total", "promoPreco", "Ex: 10.00"], ["Promoção — Descrição", "promoDesc", "Ex: LEVE 3 por R$10,00"]] as [string, string, string][]).map(([label, key, placeholder]) => (
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
        <button onClick={() => setModo("login")} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 20, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>⚙️ Admin</button>
        <div style={{ textAlign: "center", position: "relative" }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>💊</div>
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>Farmácia Arcanjo</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, margin: "3px 0 14px" }}>📍 Meruoca, Ceará · (88) 99337-5650</p>
          <div style={{ position: "relative", maxWidth: 320, margin: "0 auto" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..."
              style={{ width: "100%", padding: "10px 14px 10px 36px", borderRadius: 24, border: "none", fontSize: 13, fontFamily: "'Nunito', sans-serif", outline: "none", boxSizing: "border-box" as any }} />
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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
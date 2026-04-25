import { useState, useEffect } from "react";
import { PRODUTOS_INICIAIS } from "../data/produtos";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface PostGerado {
  id: string;
  ts: number;
  tipo: string;
  tom: string;
  produto: string;
  texto: string;
  hashtags: string;
  horario: string;
  sugestao: string;
}

// ── Configurações ─────────────────────────────────────────────────────────────
const TIPOS_POST = [
  { value: "promocao",         label: "🔥 Promoção",           desc: "Oferta ou desconto especial" },
  { value: "dica_saude",       label: "💚 Dica de Saúde",      desc: "Orientação de bem-estar" },
  { value: "produto_destaque", label: "⭐ Produto em Destaque", desc: "Apresentar um produto" },
  { value: "sazonalidade",     label: "📅 Sazonalidade",        desc: "Data especial ou campanha" },
];

const TONS = [
  { value: "descontraido", label: "😊 Descontraído", desc: "Próximo e amigável" },
  { value: "formal",       label: "👔 Formal",       desc: "Profissional e sério" },
  { value: "urgente",      label: "⚡ Urgente",       desc: "Cria senso de oportunidade" },
];

const LS_KEY = "farmacia_instagram_historico";
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Helpers ───────────────────────────────────────────────────────────────────
function carregarHistorico(): PostGerado[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}
function salvarHistorico(posts: PostGerado[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(posts.slice(0, 5)));
}

// ── Estilos (verde farmácia) ───────────────────────────────────────────────────
const G = {
  fundo:       "#f0fdf4",
  verde:       "#16a34a",
  verdeEsc:    "#15803d",
  verdeCl:     "#dcfce7",
  verdeText:   "#14532d",
  borda:       "#86efac",
  texto:       "#1a2e1a",
  muted:       "#6b7280",
  card:        "#ffffff",
  cardBorda:   "#e5e7eb",
};

export default function InstagramGenerator() {
  // Produtos do catálogo (localStorage ou padrão)
  const produtos = (() => {
    try {
      const saved = localStorage.getItem("farmacia_produtos_v3");
      return saved ? JSON.parse(saved) : PRODUTOS_INICIAIS;
    } catch { return PRODUTOS_INICIAIS; }
  })();

  const [tipo, setTipo] = useState("promocao");
  const [tom, setTom] = useState("descontraido");
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [topico, setTopico] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<PostGerado | null>(null);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [historico, setHistorico] = useState<PostGerado[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<"gerar" | "historico">("gerar");

  useEffect(() => { setHistorico(carregarHistorico()); }, []);

  // ── Gerar post ──────────────────────────────────────────────────────────────
  const gerarPost = async () => {
    setLoading(true);
    setErro("");
    setResultado(null);

    try {
      const resp = await fetch(`${API_BASE}/api/instagram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, tom, produto: produtoSelecionado, topico }),
      });

      if (!resp.ok) throw new Error("Erro na geração");

      const data = await resp.json();
      const novo: PostGerado = {
        id: Date.now().toString(),
        ts: Date.now(),
        tipo,
        tom,
        produto: produtoSelecionado,
        texto: data.texto || "",
        hashtags: data.hashtags || "",
        horario: data.horario || "",
        sugestao: data.sugestao || "",
      };
      setResultado(novo);
      const novoHistorico = [novo, ...historico].slice(0, 5);
      setHistorico(novoHistorico);
      salvarHistorico(novoHistorico);
    } catch {
      setErro("Não foi possível gerar o post. Verifique a conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ── Copiar ──────────────────────────────────────────────────────────────────
  const copiar = async (texto: string, chave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setErro("Não foi possível copiar. Selecione o texto manualmente.");
    }
  };

  // ── WhatsApp ────────────────────────────────────────────────────────────────
  const compartilharWpp = (post: PostGerado) => {
    const texto = `${post.texto}\n\n${post.hashtags}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };

  // ── Render helpers ──────────────────────────────────────────────────────────
  const tipoLabel = TIPOS_POST.find(t => t.value === tipo)?.label || tipo;
  const fmtData = (ts: number) =>
    new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ background: G.fundo, minHeight: "100vh", fontFamily: "'Nunito', sans-serif", paddingBottom: 40 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${G.verdeEsc}, ${G.verde})`, padding: "20px 16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 28 }}>📱</span>
          <div>
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0 }}>Gerador de Posts</h2>
            <p style={{ color: "#bbf7d0", fontSize: 12, margin: 0 }}>IA para Instagram da Farmácia Arcanjo</p>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", background: "#fff", borderBottom: `2px solid ${G.cardBorda}` }}>
        {(["gerar", "historico"] as const).map(aba => (
          <button key={aba} onClick={() => setAbaAtiva(aba)}
            style={{ flex: 1, padding: "12px 0", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: abaAtiva === aba ? G.verde : G.muted, borderBottom: abaAtiva === aba ? `3px solid ${G.verde}` : "3px solid transparent", fontFamily: "'Nunito', sans-serif" }}>
            {aba === "gerar" ? "✨ Gerar Post" : `📜 Histórico (${historico.length})`}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>

        {/* ── ABA GERAR ── */}
        {abaAtiva === "gerar" && (
          <>
            {/* Tipo de Post */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: G.verdeText, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>Tipo de Post</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {TIPOS_POST.map(t => (
                  <button key={t.value} onClick={() => setTipo(t.value)}
                    style={{ padding: "10px 12px", borderRadius: 12, border: `2px solid ${tipo === t.value ? G.verde : G.cardBorda}`, background: tipo === t.value ? G.verdeCl : G.card, cursor: "pointer", textAlign: "left", fontFamily: "'Nunito', sans-serif" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: tipo === t.value ? G.verdeText : "#374151" }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tom */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: G.verdeText, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>Tom da Mensagem</label>
              <div style={{ display: "flex", gap: 8 }}>
                {TONS.map(t => (
                  <button key={t.value} onClick={() => setTom(t.value)}
                    style={{ flex: 1, padding: "10px 8px", borderRadius: 12, border: `2px solid ${tom === t.value ? G.verde : G.cardBorda}`, background: tom === t.value ? G.verdeCl : G.card, cursor: "pointer", textAlign: "center", fontFamily: "'Nunito', sans-serif" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: tom === t.value ? G.verdeText : "#374151" }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: G.muted }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Produto (opcional) */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: G.verdeText, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
                Produto do Catálogo <span style={{ color: G.muted, fontWeight: 400, fontSize: 11, textTransform: "none" }}>(opcional)</span>
              </label>
              <select
                value={produtoSelecionado}
                onChange={e => setProdutoSelecionado(e.target.value)}
                style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `2px solid ${G.cardBorda}`, background: G.card, fontSize: 14, color: G.texto, fontFamily: "'Nunito', sans-serif", outline: "none" }}>
                <option value="">— Sem produto específico —</option>
                {produtos.map((p: { id: number; nome: string; emoji: string; categoria: string; preco: number }) => (
                  <option key={p.id} value={`${p.emoji} ${p.nome} (R$${p.preco.toFixed(2)})`}>
                    {p.emoji} {p.nome} — R${p.preco.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* Contexto adicional */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: G.verdeText, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
                Contexto Adicional <span style={{ color: G.muted, fontWeight: 400, fontSize: 11, textTransform: "none" }}>(opcional)</span>
              </label>
              <textarea
                value={topico}
                onChange={e => setTopico(e.target.value)}
                placeholder="Ex: Desconto de 30% só essa semana, ou Campanha do Outubro Rosa..."
                rows={3}
                style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `2px solid ${G.cardBorda}`, background: G.card, fontSize: 14, color: G.texto, fontFamily: "'Nunito', sans-serif", resize: "none", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Botão gerar */}
            <button
              onClick={gerarPost}
              disabled={loading}
              style={{ width: "100%", padding: 15, borderRadius: 14, border: "none", background: loading ? "#9ca3af" : `linear-gradient(135deg, ${G.verdeEsc}, ${G.verde})`, color: "#fff", fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Nunito', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
              {loading ? (
                <>
                  <svg style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M4 12a8 8 0 018-8" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  Gerando com IA...
                </>
              ) : "✨ Gerar Post com IA"}
            </button>

            {/* Erro */}
            {erro && (
              <div style={{ background: "#ffebee", borderRadius: 12, padding: "12px 14px", color: "#c62828", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                ⚠️ {erro}
              </div>
            )}

            {/* Resultado */}
            {resultado && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(22,163,74,0.12)", border: `2px solid ${G.borda}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: G.verdeText, textTransform: "uppercase", letterSpacing: 0.5 }}>📝 Texto do Post</span>
                    <span style={{ fontSize: 11, color: G.muted }}>{resultado.texto.length}/2200 chars</span>
                  </div>
                  <p style={{ fontSize: 14, color: G.texto, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{resultado.texto}</p>
                </div>

                {resultado.hashtags && (
                  <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(22,163,74,0.12)", border: `2px solid ${G.borda}` }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: G.verdeText, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>🏷️ Hashtags</span>
                    <p style={{ fontSize: 13, color: G.verde, lineHeight: 1.8, margin: 0, wordBreak: "break-word" }}>{resultado.hashtags}</p>
                  </div>
                )}

                {resultado.horario && (
                  <div style={{ background: G.verdeCl, borderRadius: 14, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20 }}>⏰</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: G.verdeText, marginBottom: 2 }}>Horário ideal para postar</div>
                      <div style={{ fontSize: 13, color: G.verdeText }}>{resultado.horario}</div>
                    </div>
                  </div>
                )}

                {resultado.sugestao && (
                  <div style={{ background: "#fffbeb", borderRadius: 14, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start", border: "1px solid #fde68a" }}>
                    <span style={{ fontSize: 20 }}>💡</span>
                    <div style={{ fontSize: 13, color: "#92400e" }}>{resultado.sugestao}</div>
                  </div>
                )}

                {/* Botões de ação */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    onClick={() => copiar(`${resultado.texto}\n\n${resultado.hashtags}`, "tudo")}
                    style={{ padding: "12px 10px", borderRadius: 12, border: `2px solid ${G.verde}`, background: copiado === "tudo" ? G.verdeCl : "#fff", color: G.verde, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                    {copiado === "tudo" ? "✓ Copiado!" : "📋 Copiar Texto"}
                  </button>
                  <button
                    onClick={() => compartilharWpp(resultado)}
                    style={{ padding: "12px 10px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #128c7e, #25d366)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                    📲 WhatsApp
                  </button>
                </div>
                <button
                  onClick={gerarPost}
                  disabled={loading}
                  style={{ padding: "12px", borderRadius: 12, border: `2px solid ${G.cardBorda}`, background: "#fff", color: G.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                  🔄 Gerar Outra Versão
                </button>
              </div>
            )}
          </>
        )}

        {/* ── ABA HISTÓRICO ── */}
        {abaAtiva === "historico" && (
          <div>
            {historico.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48 }}>
                <p style={{ fontSize: 40 }}>📭</p>
                <p style={{ color: G.muted, fontSize: 14 }}>Nenhum post gerado ainda.</p>
                <button onClick={() => setAbaAtiva("gerar")} style={{ marginTop: 12, padding: "10px 20px", borderRadius: 20, border: "none", background: G.verde, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                  ✨ Gerar primeiro post
                </button>
              </div>
            ) : (
              historico.map((post, idx) => (
                <div key={post.id} style={{ background: G.card, borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: `2px solid ${idx === 0 ? G.borda : G.cardBorda}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                      <span style={{ fontSize: 11, fontWeight: 700, background: G.verdeCl, color: G.verdeText, borderRadius: 20, padding: "3px 8px" }}>
                        {TIPOS_POST.find(t => t.value === post.tipo)?.label || post.tipo}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, background: "#f3f4f6", color: "#374151", borderRadius: 20, padding: "3px 8px" }}>
                        {TONS.find(t => t.value === post.tom)?.label || post.tom}
                      </span>
                      {idx === 0 && <span style={{ fontSize: 11, fontWeight: 700, background: "#fef9c3", color: "#713f12", borderRadius: 20, padding: "3px 8px" }}>Mais recente</span>}
                    </div>
                    <span style={{ fontSize: 11, color: G.muted }}>{fmtData(post.ts)}</span>
                  </div>

                  {post.produto && (
                    <p style={{ fontSize: 12, color: G.verde, fontWeight: 700, margin: "0 0 8px" }}>{post.produto}</p>
                  )}

                  <p style={{ fontSize: 13, color: G.texto, lineHeight: 1.5, margin: "0 0 10px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as "vertical", overflow: "hidden" }}>
                    {post.texto}
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <button
                      onClick={() => { setResultado(post); setAbaAtiva("gerar"); }}
                      style={{ padding: "8px", borderRadius: 8, border: `2px solid ${G.verde}`, background: "#fff", color: G.verde, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                      👁 Ver completo
                    </button>
                    <button
                      onClick={() => copiar(`${post.texto}\n\n${post.hashtags}`, post.id)}
                      style={{ padding: "8px", borderRadius: 8, border: "none", background: copiado === post.id ? G.verdeCl : G.verde, color: copiado === post.id ? G.verdeText : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                      {copiado === post.id ? "✓ Copiado!" : "📋 Copiar"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

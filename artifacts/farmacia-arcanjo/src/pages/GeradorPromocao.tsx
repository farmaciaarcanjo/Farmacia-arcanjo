import { useState, useRef, useEffect } from "react";
import { salvarProdutoFirebase, buscarProdutosFirebase } from "../lib/firebase";
import { PRODUTOS_INICIAIS, Produto } from "../data/produtos";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type TipoPromo = "desconto" | "leveXpagueY" | "doDia";
type Aba = "whatsapp" | "instagram" | "ativas";

interface PromoForm {
  tipo: TipoPromo;
  produto: string;
  produtoId?: number;
  precoOriginal: string;
  precoPromocao: string;
  leveQtd: string;
  pagueQtd: string;
  validade: string;
  emoji: string;
  adicionarCatalogo: boolean;
  quantidadeCatalogo: string;
}

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

// ── Constantes ────────────────────────────────────────────────────────────────
const emojis = ["💊", "🏥", "❤️", "✨", "🔥", "⭐", "💙", "🌿", "💚", "🎯"];

const TIPOS_POST = [
  { value: "promocao", label: "🔥 Promoção", desc: "Oferta ou desconto especial" },
  { value: "dica_saude", label: "💚 Dica de Saúde", desc: "Orientação de bem-estar" },
  { value: "produto_destaque", label: "⭐ Produto em Destaque", desc: "Apresentar um produto" },
  { value: "sazonalidade", label: "📅 Sazonalidade", desc: "Data especial ou campanha" },
];

const TONS = [
  { value: "descontraido", label: "😊 Descontraído", desc: "Próximo e amigável" },
  { value: "formal", label: "👔 Formal", desc: "Profissional e sério" },
  { value: "urgente", label: "⚡ Urgente", desc: "Cria senso de oportunidade" },
];

const LS_HISTORICO = "farmacia_instagram_historico";
const API_URL = import.meta.env.VITE_API_URL || "";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtMoeda = (v: string) => {
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const desconto = (original: string, promo: string) => {
  const o = parseFloat(original);
  const p = parseFloat(promo);
  if (!o || !p) return 0;
  return Math.round(((o - p) / o) * 100);
};

const gerarTextoWhatsApp = (form: PromoForm): string => {
  const { tipo, produto, precoOriginal, precoPromocao, leveQtd, pagueQtd, validade, emoji } = form;
  const farm = "🏥 *Farmácia Arcanjo* — Meruoca-CE";
  const tel = "📞 (88) 99337-5650";
  const valid = validade ? `\n⏰ Válido até: ${validade}` : "";
  if (tipo === "desconto") {
    const pct = desconto(precoOriginal, precoPromocao);
    return `${emoji} *OFERTA ESPECIAL!* ${emoji}\n\n💊 *${produto}*\n\nDe: ~~${fmtMoeda(precoOriginal)}~~\nPor apenas: *${fmtMoeda(precoPromocao)}*\n\n🎯 *${pct}% de desconto!*${valid}\n\n${farm}\n${tel}`;
  }
  if (tipo === "leveXpagueY") {
    return `${emoji} *PROMOÇÃO IMPERDÍVEL!* ${emoji}\n\n💊 *${produto}*\n\n🛒 LEVE *${leveQtd}* PAGUE *${pagueQtd}*\n\nEconomize muito!${valid}\n\n${farm}\n${tel}`;
  }
  return `${emoji} *PROMOÇÃO DO DIA!* ${emoji}\n\n💊 *${produto}*\n\n✨ Por apenas *${fmtMoeda(precoPromocao)}*\n\nCorra que é só hoje!${valid}\n\n${farm}\n${tel}`;
};

function carregarHistorico(): PostGerado[] {
  try { return JSON.parse(localStorage.getItem(LS_HISTORICO) || "[]"); } catch { return []; }
}
function salvarHistoricoLS(posts: PostGerado[]) {
  localStorage.setItem(LS_HISTORICO, JSON.stringify(posts.slice(0, 5)));
}

const formVazio = (): PromoForm => ({
  tipo: "desconto", produto: "", produtoId: undefined,
  precoOriginal: "", precoPromocao: "", leveQtd: "3", pagueQtd: "2",
  validade: "", emoji: "🔥", adicionarCatalogo: false, quantidadeCatalogo: "1",
});

// ── Estilos ───────────────────────────────────────────────────────────────────
const C = {
  verde: "#16a34a", verdeEsc: "#15803d", verdeCl: "#dcfce7",
  verdeText: "#14532d", vermelho: "#c62828", fundo: "#f0fdf4",
  card: "#ffffff", borda: "#e5e7eb", muted: "#6b7280", texto: "#1a1a1a",
};

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: `2px solid ${C.borda}`, background: C.card, fontSize: 14,
  color: C.texto, fontFamily: "'Nunito', sans-serif", outline: "none",
  boxSizing: "border-box",
};

const lbl: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: C.verdeText,
  textTransform: "uppercase", letterSpacing: 0.5,
  display: "block", marginBottom: 6,
};

const btnVerde: React.CSSProperties = {
  width: "100%", padding: 14, borderRadius: 14, border: "none",
  background: `linear-gradient(135deg, ${C.verdeEsc}, ${C.verde})`,
  color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer",
  fontFamily: "'Nunito', sans-serif", marginBottom: 10,
};

// ── Componente Principal ──────────────────────────────────────────────────────
export default function GeradorPromocao() {
  const [aba, setAba] = useState<Aba>("whatsapp");

  // WhatsApp state
  const [form, setForm] = useState<PromoForm>(formVazio());
  const [etapa, setEtapa] = useState<"form" | "resultado">("form");
  const [textoGerado, setTextoGerado] = useState("");
  const [imagemGerada, setImagemGerada] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [salvandoCatalogo, setSalvandoCatalogo] = useState(false);
  const [msgCatalogo, setMsgCatalogo] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Instagram state
  const [tipoPost, setTipoPost] = useState("promocao");
  const [tom, setTom] = useState("descontraido");
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [topico, setTopico] = useState("");
  const [loadingIG, setLoadingIG] = useState(false);
  const [resultadoIG, setResultadoIG] = useState<PostGerado | null>(null);
  const [erroIG, setErroIG] = useState("");
  const [copiadoIG, setCopiadoIG] = useState<string | null>(null);
  const [historico, setHistorico] = useState<PostGerado[]>([]);
  const [abaIG, setAbaIG] = useState<"gerar" | "historico">("gerar");

  // Promoções ativas
  const [promocoesAtivas, setPromocoesAtivas] = useState<Produto[]>([]);
  const [carregandoPromos, setCarregandoPromos] = useState(false);
  const [removendo, setRemovendo] = useState<number | null>(null);

  const produtos: Produto[] = (() => {
    try {
      const saved = localStorage.getItem("farmacia_produtos_v3");
      return saved ? JSON.parse(saved) : PRODUTOS_INICIAIS;
    } catch { return PRODUTOS_INICIAIS; }
  })();

  useEffect(() => { setHistorico(carregarHistorico()); }, []);

  useEffect(() => {
    if (aba === "ativas") carregarPromocoesAtivas();
  }, [aba]);

  // ── Carregar promoções ativas ───────────────────────────────────────────────
  const carregarPromocoesAtivas = async () => {
    setCarregandoPromos(true);
    try {
      const todos = await buscarProdutosFirebase();
      setPromocoesAtivas(todos.filter((p: Produto) => p.promocao));
    } catch {
      const local = produtos.filter(p => p.promocao);
      setPromocoesAtivas(local);
    } finally {
      setCarregandoPromos(false);
    }
  };

  // ── Remover promoção do catálogo ───────────────────────────────────────────
  const removerPromocao = async (produto: Produto) => {
    setRemovendo(produto.id);
    try {
      const atualizado = { ...produto, promocao: undefined, precoOriginal: undefined };
      await salvarProdutoFirebase({
        id: produto.id, nome: produto.nome, preco: produto.preco,
        categoria: produto.categoria, emoji: produto.emoji || "💊",
        desc: produto.desc || "", estoque: produto.estoque || 0,
      });
      setPromocoesAtivas(prev => prev.filter(p => p.id !== produto.id));
    } catch {
      alert("Erro ao remover promoção. Tente novamente.");
    } finally {
      setRemovendo(null);
    }
  };

  // ── Gerar imagem WhatsApp ──────────────────────────────────────────────────
  const gerarImagem = (f: PromoForm) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 800; canvas.height = 800;
    const grad = ctx.createLinearGradient(0, 0, 0, 800);
    grad.addColorStop(0, "#1b5e20"); grad.addColorStop(1, "#2e7d32");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 800, 800);
    ctx.beginPath(); ctx.arc(700, 100, 180, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fill();
    ctx.beginPath(); ctx.arc(100, 700, 150, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(0, 0, 800, 120);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 36px Arial"; ctx.textAlign = "center";
    ctx.fillText("🏥 Farmácia Arcanjo", 400, 55);
    ctx.font = "24px Arial"; ctx.fillStyle = "#a5d6a7"; ctx.fillText("Meruoca - CE", 400, 95);
    const badgeTexto = f.tipo === "desconto" ? "🔥 OFERTA ESPECIAL" : f.tipo === "leveXpagueY" ? "🛒 LEVE E PAGUE" : "⭐ PROMOÇÃO DO DIA";
    ctx.fillStyle = "#ff6f00"; ctx.beginPath();
    (ctx as any).roundRect(200, 140, 400, 60, 30); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 28px Arial"; ctx.fillText(badgeTexto, 400, 180);
    ctx.font = "80px Arial"; ctx.fillText(f.emoji, 400, 310);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 40px Arial";
    const quebrar = (texto: string, maxW: number) => {
      const palavras = texto.split(" "); const linhas: string[] = []; let atual = "";
      for (const p of palavras) {
        const teste = atual ? `${atual} ${p}` : p;
        if (ctx.measureText(teste).width > maxW && atual) { linhas.push(atual); atual = p; }
        else atual = teste;
      }
      if (atual) linhas.push(atual); return linhas;
    };
    const nomeLinhas = quebrar(f.produto, 700);
    nomeLinhas.forEach((linha, i) => ctx.fillText(linha, 400, 370 + i * 50));
    const yPreco = 370 + nomeLinhas.length * 50 + 30;
    if (f.tipo === "desconto") {
      const pct = desconto(f.precoOriginal, f.precoPromocao);
      ctx.fillStyle = "#ef9a9a"; ctx.font = "28px Arial";
      ctx.fillText(`De: ${fmtMoeda(f.precoOriginal)}`, 400, yPreco);
      ctx.fillStyle = "#69f0ae"; ctx.font = "bold 56px Arial";
      ctx.fillText(fmtMoeda(f.precoPromocao), 400, yPreco + 70);
      if (pct > 0) {
        ctx.fillStyle = "#ff6f00"; ctx.beginPath();
        (ctx as any).roundRect(300, yPreco + 90, 200, 50, 25); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 28px Arial";
        ctx.fillText(`${pct}% OFF`, 400, yPreco + 123);
      }
    } else if (f.tipo === "leveXpagueY") {
      ctx.fillStyle = "#69f0ae"; ctx.font = "bold 52px Arial";
      ctx.fillText(`LEVE ${f.leveQtd}`, 400, yPreco + 20);
      ctx.fillStyle = "#ffffff"; ctx.font = "bold 36px Arial";
      ctx.fillText(`PAGUE ${f.pagueQtd}`, 400, yPreco + 75);
    } else {
      ctx.fillStyle = "#69f0ae"; ctx.font = "bold 56px Arial";
      ctx.fillText(fmtMoeda(f.precoPromocao), 400, yPreco + 50);
      ctx.fillStyle = "#fff176"; ctx.font = "bold 30px Arial";
      ctx.fillText("SÓ HOJE!", 400, yPreco + 100);
    }
    if (f.validade) {
      ctx.fillStyle = "#fff9c4"; ctx.font = "24px Arial";
      ctx.fillText(`⏰ Válido até: ${f.validade}`, 400, 730);
    }
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(0, 750, 800, 50);
    ctx.fillStyle = "#a5d6a7"; ctx.font = "22px Arial";
    ctx.fillText("📞 (88) 99337-5650", 400, 782);
    setImagemGerada(canvas.toDataURL("image/png"));
  };

  // ── Gerar promoção WhatsApp ────────────────────────────────────────────────
  const gerarPromocao = () => {
    if (!form.produto.trim()) return;
    setTextoGerado(gerarTextoWhatsApp(form));
    gerarImagem(form);
    setEtapa("resultado");
  };

  // ── Adicionar ao catálogo Firebase ────────────────────────────────────────
  const adicionarAoCatalogo = async () => {
    if (!form.produtoId) { setMsgCatalogo("⚠️ Selecione um produto do catálogo para adicionar a promoção."); return; }
    setSalvandoCatalogo(true);
    setMsgCatalogo("");
    try {
      const produtoBase = produtos.find(p => p.id === form.produtoId);
      if (!produtoBase) throw new Error("Produto não encontrado");
      const qtd = parseInt(form.quantidadeCatalogo) || 1;
      const precoTotal = parseFloat(form.precoPromocao) || produtoBase.preco;
      const ok = await salvarProdutoFirebase({
        id: produtoBase.id, nome: produtoBase.nome,
        preco: produtoBase.preco, precoOriginal: parseFloat(form.precoOriginal) || undefined,
        categoria: produtoBase.categoria, emoji: produtoBase.emoji || "💊",
        desc: produtoBase.desc || "", estoque: produtoBase.estoque || 0,
        promocao: {
          quantidade: qtd, precoTotal,
          descricao: form.tipo === "leveXpagueY"
            ? `Leve ${form.leveQtd} por R$${precoTotal.toFixed(2)}`
            : form.tipo === "desconto"
            ? `${desconto(form.precoOriginal, form.precoPromocao)}% de desconto`
            : `Promoção do dia: R$${precoTotal.toFixed(2)}`,
        },
      });
      setMsgCatalogo(ok ? "✅ Promoção adicionada ao catálogo com sucesso!" : "⚠️ Erro ao salvar. Tente novamente.");
    } catch {
      setMsgCatalogo("⚠️ Erro ao salvar no Firebase.");
    } finally {
      setSalvandoCatalogo(false);
    }
  };

  // ── Gerar POST Instagram com IA ───────────────────────────────────────────
  const gerarPostIG = async () => {
    setLoadingIG(true); setErroIG(""); setResultadoIG(null);
    try {
      const systemPrompt = `Você é um especialista em marketing digital para farmácias. 
Gere posts para Instagram da Farmácia Arcanjo (Meruoca-CE, tel: (88) 99337-5650).
Responda APENAS em JSON válido, sem texto extra, no formato:
{"texto": "...", "hashtags": "...", "horario": "...", "sugestao": "..."}
- texto: post completo para Instagram (máx 2200 chars)
- hashtags: hashtags relevantes separadas por espaço
- horario: melhor horário para postar (ex: "18h-20h, período de maior engajamento")
- sugestao: dica rápida de engajamento`;

      const userMsg = `Tipo: ${TIPOS_POST.find(t => t.value === tipoPost)?.label}
Tom: ${TONS.find(t => t.value === tom)?.label}
${produtoSelecionado ? `Produto: ${produtoSelecionado}` : ""}
${topico ? `Contexto: ${topico}` : ""}
Crie um post envolvente para Instagram.`;

      const resp = await fetch(`${API_URL}/api/lara`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userMsg }],
          systemPrompt,
        }),
      });
      if (!resp.ok) throw new Error("Erro na geração");
      const data = await resp.json();
      let parsed: { texto: string; hashtags: string; horario: string; sugestao: string };
      try {
        const clean = (data.content || "").replace(/```json|```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = { texto: data.content || "", hashtags: "#FarmáciaArcanjo #Saúde #Meruoca", horario: "18h-20h", sugestao: "" };
      }
      const novo: PostGerado = { id: Date.now().toString(), ts: Date.now(), tipo: tipoPost, tom, produto: produtoSelecionado, ...parsed };
      setResultadoIG(novo);
      const novoH = [novo, ...historico].slice(0, 5);
      setHistorico(novoH); salvarHistoricoLS(novoH);
    } catch {
      setErroIG("Não foi possível gerar o post. Verifique a conexão e tente novamente.");
    } finally {
      setLoadingIG(false);
    }
  };

  const copiar = async (texto: string, chave: string) => {
    try { await navigator.clipboard.writeText(texto); setCopiadoIG(chave); setTimeout(() => setCopiadoIG(null), 2000); }
    catch { setErroIG("Não foi possível copiar."); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.fundo, minHeight: "100vh", fontFamily: "'Nunito', sans-serif", paddingBottom: 40 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.verdeEsc}, ${C.verde})`, padding: "20px 16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>📣</span>
          <div>
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0 }}>Promoções & Marketing</h2>
            <p style={{ color: "#bbf7d0", fontSize: 12, margin: 0 }}>Farmácia Arcanjo — Painel Admin</p>
          </div>
        </div>
      </div>

      {/* Abas principais */}
      <div style={{ display: "flex", background: "#fff", borderBottom: `2px solid ${C.borda}`, overflowX: "auto" }}>
        {([["whatsapp", "📣 WhatsApp"], ["instagram", "📱 Instagram"], ["ativas", "🔥 Ativas"]] as [Aba, string][]).map(([a, l]) => (
          <button key={a} onClick={() => setAba(a)} style={{
            flex: 1, padding: "12px 8px", border: "none", background: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
            color: aba === a ? C.verde : C.muted,
            borderBottom: aba === a ? `3px solid ${C.verde}` : "3px solid transparent",
            fontFamily: "'Nunito', sans-serif",
          }}>{l}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>

        {/* ══ ABA WHATSAPP ══ */}
        {aba === "whatsapp" && (
          <>
            {etapa === "form" && (
              <div>
                {/* Tipo */}
                <label style={lbl}>Tipo de Promoção</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  {([["desconto", "💰 Desconto"], ["leveXpagueY", "🛒 Leve/Pague"], ["doDia", "⭐ Do Dia"]] as [TipoPromo, string][]).map(([t, l]) => (
                    <button key={t} onClick={() => setForm({ ...form, tipo: t })} style={{
                      flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", fontSize: 11, fontWeight: 700,
                      border: `2px solid ${form.tipo === t ? C.verde : C.borda}`,
                      background: form.tipo === t ? C.verdeCl : C.card,
                      color: form.tipo === t ? C.verdeText : C.muted,
                      fontFamily: "'Nunito', sans-serif",
                    }}>{l}</button>
                  ))}
                </div>

                {/* Produto do catálogo */}
                <label style={lbl}>Produto do Catálogo</label>
                <select value={form.produtoId || ""} onChange={e => {
  const id = parseInt(e.target.value);
  const p = produtos.find(p => p.id === id);
  setForm({ ...form, produtoId: isNaN(id) ? undefined : id, produto: p ? p.nome : "" });
}} style={{ ...inp, marginBottom: 12 }}>
  <option value="">— Digitar nome manualmente —</option>
  {produtos.map((p: Produto) => (
    <option key={p.id} value={p.id}>{p.emoji} {p.nome} — R${p.preco.toFixed(2)}</option>
  ))}
</select>

                {!form.produtoId && (
                  <>
                    <label style={lbl}>Nome do Produto *</label>
                    <input style={{ ...inp, marginBottom: 12 }} placeholder="Ex: Dipirona 500mg"
                      value={form.produto} onChange={e => setForm({ ...form, produto: e.target.value })} />
                  </>
                )}

                {/* Preços */}
                {form.tipo === "desconto" && (
                  <>
                    <label style={lbl}>Preço Original (R$)</label>
                    <input style={{ ...inp, marginBottom: 12 }} type="number" step="0.01" placeholder="Ex: 15.00"
                      value={form.precoOriginal} onChange={e => setForm({ ...form, precoOriginal: e.target.value })} />
                    <label style={lbl}>Preço Promocional (R$)</label>
                    <input style={{ ...inp, marginBottom: 12 }} type="number" step="0.01" placeholder="Ex: 9.90"
                      value={form.precoPromocao} onChange={e => setForm({ ...form, precoPromocao: e.target.value })} />
                  </>
                )}
                {form.tipo === "leveXpagueY" && (
                  <>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={lbl}>Leve (qtd)</label>
                        <input style={inp} type="number" value={form.leveQtd}
                          onChange={e => setForm({ ...form, leveQtd: e.target.value })} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={lbl}>Pague (qtd)</label>
                        <input style={inp} type="number" value={form.pagueQtd}
                          onChange={e => setForm({ ...form, pagueQtd: e.target.value })} />
                      </div>
                    </div>
                    <label style={lbl}>Preço Total Promocional (R$)</label>
                    <input style={{ ...inp, marginBottom: 12 }} type="number" step="0.01" placeholder="Ex: 8.00"
                      value={form.precoPromocao} onChange={e => setForm({ ...form, precoPromocao: e.target.value })} />
                  </>
                )}
                {form.tipo === "doDia" && (
                  <>
                    <label style={lbl}>Preço do Dia (R$)</label>
                    <input style={{ ...inp, marginBottom: 12 }} type="number" step="0.01" placeholder="Ex: 9.90"
                      value={form.precoPromocao} onChange={e => setForm({ ...form, precoPromocao: e.target.value })} />
                  </>
                )}

                <label style={lbl}>Validade (opcional)</label>
                <input style={{ ...inp, marginBottom: 12 }} placeholder="Ex: 30/04/2026"
                  value={form.validade} onChange={e => setForm({ ...form, validade: e.target.value })} />

                <label style={lbl}>Emoji</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {emojis.map(e => (
                    <button key={e} onClick={() => setForm({ ...form, emoji: e })} style={{
                      fontSize: 24, background: form.emoji === e ? C.verdeCl : C.card,
                      border: `2px solid ${form.emoji === e ? C.verde : C.borda}`,
                      borderRadius: 10, padding: "6px 10px", cursor: "pointer",
                    }}>{e}</button>
                  ))}
                </div>

                {/* Checkbox adicionar ao catálogo */}
                {form.produtoId && (
                  <div style={{ background: C.verdeCl, borderRadius: 12, padding: 14, marginBottom: 16, border: `2px solid ${C.verde}` }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input type="checkbox" checked={form.adicionarCatalogo}
                        onChange={e => setForm({ ...form, adicionarCatalogo: e.target.checked })}
                        style={{ width: 20, height: 20, cursor: "pointer" }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.verdeText }}>🛍️ Adicionar ao catálogo</div>
                        <div style={{ fontSize: 12, color: C.muted }}>Aparece em "Ofertas da Semana" para todos os clientes</div>
                      </div>
                    </label>
                    {form.adicionarCatalogo && (
                      <div style={{ marginTop: 12 }}>
                        <label style={lbl}>Quantidade mínima para ativar promoção</label>
                        <input style={inp} type="number" min="1" value={form.quantidadeCatalogo}
                          onChange={e => setForm({ ...form, quantidadeCatalogo: e.target.value })} />
                      </div>
                    )}
                  </div>
                )}

                <button style={btnVerde} onClick={gerarPromocao}>✨ Gerar Promoção</button>
              </div>
            )}

            {etapa === "resultado" && (
              <div>
                {imagemGerada && (
                  <img src={imagemGerada} style={{ width: "100%", borderRadius: 12, marginBottom: 14 }} alt="Promoção" />
                )}
                <div style={{ background: C.card, borderRadius: 14, padding: 14, marginBottom: 12, border: `2px solid ${C.borda}` }}>
                  <p style={{ ...lbl, marginBottom: 8 }}>📝 Texto para WhatsApp:</p>
                  <pre style={{ color: C.texto, fontSize: 13, whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>{textoGerado}</pre>
                </div>

                <button style={btnVerde} onClick={() => { navigator.clipboard.writeText(textoGerado); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}>
                  {copiado ? "✅ Copiado!" : "📋 Copiar Texto"}
                </button>
                <button style={{ ...btnVerde, background: "linear-gradient(135deg, #15803d, #166534)" }}
                  onClick={() => { const a = document.createElement("a"); a.href = imagemGerada; a.download = `promo-${form.produto}.png`; a.click(); }}>
                  💾 Salvar Imagem
                </button>
                <button style={{ ...btnVerde, background: "linear-gradient(135deg, #25d366, #128c7e)" }}
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(textoGerado)}`, "_blank")}>
                  📱 Compartilhar no WhatsApp
                </button>

                {form.adicionarCatalogo && form.produtoId && (
                  <div style={{ marginBottom: 10 }}>
                    <button style={{ ...btnVerde, background: "linear-gradient(135deg, #c62828, #b71c1c)" }}
                      onClick={adicionarAoCatalogo} disabled={salvandoCatalogo}>
                      {salvandoCatalogo ? "⏳ Salvando..." : "🛍️ Adicionar ao Catálogo"}
                    </button>
                    {msgCatalogo && (
                      <div style={{ background: msgCatalogo.startsWith("✅") ? C.verdeCl : "#ffebee", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, color: msgCatalogo.startsWith("✅") ? C.verdeText : C.vermelho }}>
                        {msgCatalogo}
                      </div>
                    )}
                  </div>
                )}

                <button onClick={() => { setEtapa("form"); setImagemGerada(""); setMsgCatalogo(""); }}
                  style={{ width: "100%", padding: 13, borderRadius: 14, border: `2px solid ${C.borda}`, background: C.card, color: C.muted, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                  ← Criar Nova Promoção
                </button>
              </div>
            )}
          </>
        )}

        {/* ══ ABA INSTAGRAM ══ */}
        {aba === "instagram" && (
          <>
            <div style={{ display: "flex", background: "#fff", borderRadius: 12, marginBottom: 16, overflow: "hidden", border: `2px solid ${C.borda}` }}>
              {(["gerar", "historico"] as const).map(a => (
                <button key={a} onClick={() => setAbaIG(a)} style={{
                  flex: 1, padding: "10px 0", border: "none", background: abaIG === a ? C.verdeCl : "none",
                  cursor: "pointer", fontSize: 13, fontWeight: 700,
                  color: abaIG === a ? C.verdeText : C.muted, fontFamily: "'Nunito', sans-serif",
                }}>
                  {a === "gerar" ? "✨ Gerar Post" : `📜 Histórico (${historico.length})`}
                </button>
              ))}
            </div>

            {abaIG === "gerar" && (
              <>
                <label style={lbl}>Tipo de Post</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {TIPOS_POST.map(t => (
                    <button key={t.value} onClick={() => setTipoPost(t.value)} style={{
                      padding: "10px 12px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                      border: `2px solid ${tipoPost === t.value ? C.verde : C.borda}`,
                      background: tipoPost === t.value ? C.verdeCl : C.card,
                      fontFamily: "'Nunito', sans-serif",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: tipoPost === t.value ? C.verdeText : "#374151" }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{t.desc}</div>
                    </button>
                  ))}
                </div>

                <label style={lbl}>Tom da Mensagem</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  {TONS.map(t => (
                    <button key={t.value} onClick={() => setTom(t.value)} style={{
                      flex: 1, padding: "10px 8px", borderRadius: 12, cursor: "pointer", textAlign: "center",
                      border: `2px solid ${tom === t.value ? C.verde : C.borda}`,
                      background: tom === t.value ? C.verdeCl : C.card,
                      fontFamily: "'Nunito', sans-serif",
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: tom === t.value ? C.verdeText : "#374151" }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{t.desc}</div>
                    </button>
                  ))}
                </div>

                <label style={lbl}>Produto <span style={{ fontWeight: 400, textTransform: "none", fontSize: 11 }}>(opcional)</span></label>
                <select value={produtoSelecionado} onChange={e => setProdutoSelecionado(e.target.value)}
                  style={{ ...inp, marginBottom: 12 }}>
                  <option value="">— Sem produto específico —</option>
                  {produtos.map((p: Produto) => (
                    <option key={p.id} value={`${p.emoji} ${p.nome} (R$${p.preco.toFixed(2)})`}>
                      {p.emoji} {p.nome} — R${p.preco.toFixed(2)}
                    </option>
                  ))}
                </select>

                <label style={lbl}>Contexto Adicional <span style={{ fontWeight: 400, textTransform: "none", fontSize: 11 }}>(opcional)</span></label>
                <textarea value={topico} onChange={e => setTopico(e.target.value)}
                  placeholder="Ex: Desconto de 30% só essa semana..."
                  rows={3} style={{ ...inp, resize: "none", marginBottom: 16 }} />

                <button onClick={gerarPostIG} disabled={loadingIG} style={{
                  ...btnVerde, background: loadingIG ? "#9ca3af" : `linear-gradient(135deg, ${C.verdeEsc}, ${C.verde})`,
                  cursor: loadingIG ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  {loadingIG ? "⏳ Gerando com IA..." : "✨ Gerar Post com IA"}
                </button>

                {erroIG && (
                  <div style={{ background: "#ffebee", borderRadius: 12, padding: "12px 14px", color: C.vermelho, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                    ⚠️ {erroIG}
                  </div>
                )}

                {resultadoIG && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `2px solid #86efac` }}>
                      <p style={{ ...lbl, marginBottom: 8 }}>📝 Texto do Post</p>
                      <p style={{ fontSize: 14, color: C.texto, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{resultadoIG.texto}</p>
                    </div>
                    {resultadoIG.hashtags && (
                      <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `2px solid #86efac` }}>
                        <p style={{ ...lbl, marginBottom: 8 }}>🏷️ Hashtags</p>
                        <p style={{ fontSize: 13, color: C.verde, lineHeight: 1.8, margin: 0, wordBreak: "break-word" }}>{resultadoIG.hashtags}</p>
                      </div>
                    )}
                    {resultadoIG.horario && (
                      <div style={{ background: C.verdeCl, borderRadius: 14, padding: "12px 14px", display: "flex", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>⏰</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.verdeText, marginBottom: 2 }}>Horário ideal</div>
                          <div style={{ fontSize: 13, color: C.verdeText }}>{resultadoIG.horario}</div>
                        </div>
                      </div>
                    )}
                    {resultadoIG.sugestao && (
                      <div style={{ background: "#fffbeb", borderRadius: 14, padding: "12px 14px", border: "1px solid #fde68a", display: "flex", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>💡</span>
                        <div style={{ fontSize: 13, color: "#92400e" }}>{resultadoIG.sugestao}</div>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <button onClick={() => copiar(`${resultadoIG.texto}\n\n${resultadoIG.hashtags}`, "tudo")}
                        style={{ padding: "12px", borderRadius: 12, border: `2px solid ${C.verde}`, background: copiadoIG === "tudo" ? C.verdeCl : C.card, color: C.verde, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                        {copiadoIG === "tudo" ? "✓ Copiado!" : "📋 Copiar"}
                      </button>
                      <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${resultadoIG.texto}\n\n${resultadoIG.hashtags}`)}`, "_blank")}
                        style={{ padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #128c7e, #25d366)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                        📲 WhatsApp
                      </button>
                    </div>
                    <button onClick={gerarPostIG} disabled={loadingIG}
                      style={{ padding: "12px", borderRadius: 12, border: `2px solid ${C.borda}`, background: C.card, color: C.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                      🔄 Gerar Outra Versão
                    </button>
                  </div>
                )}
              </>
            )}

            {abaIG === "historico" && (
              <div>
                {historico.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 48 }}>
                    <p style={{ fontSize: 40 }}>📭</p>
                    <p style={{ color: C.muted, fontSize: 14 }}>Nenhum post gerado ainda.</p>
                    <button onClick={() => setAbaIG("gerar")} style={{ marginTop: 12, padding: "10px 20px", borderRadius: 20, border: "none", background: C.verde, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                      ✨ Gerar primeiro post
                    </button>
                  </div>
                ) : historico.map((post, idx) => (
                  <div key={post.id} style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 12, border: `2px solid ${idx === 0 ? "#86efac" : C.borda}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, background: C.verdeCl, color: C.verdeText, borderRadius: 20, padding: "3px 8px" }}>
                        {TIPOS_POST.find(t => t.value === post.tipo)?.label}
                      </span>
                      <span style={{ fontSize: 11, color: C.muted }}>{new Date(post.ts).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <p style={{ fontSize: 13, color: C.texto, lineHeight: 1.5, margin: "0 0 10px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as any }}>
                      {post.texto}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <button onClick={() => { setResultadoIG(post); setAbaIG("gerar"); }}
                        style={{ padding: "8px", borderRadius: 8, border: `2px solid ${C.verde}`, background: C.card, color: C.verde, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        👁 Ver completo
                      </button>
                      <button onClick={() => copiar(`${post.texto}\n\n${post.hashtags}`, post.id)}
                        style={{ padding: "8px", borderRadius: 8, border: "none", background: copiadoIG === post.id ? C.verdeCl : C.verde, color: copiadoIG === post.id ? C.verdeText : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        {copiadoIG === post.id ? "✓ Copiado!" : "📋 Copiar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ ABA PROMOÇÕES ATIVAS ══ */}
        {aba === "ativas" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: C.verdeText, margin: 0 }}>🔥 Ofertas no Catálogo</h3>
              <button onClick={carregarPromocoesAtivas} style={{ padding: "7px 14px", borderRadius: 20, border: `2px solid ${C.verde}`, background: "none", color: C.verde, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                🔄 Atualizar
              </button>
            </div>

            {carregandoPromos && (
              <div style={{ textAlign: "center", padding: 32, color: C.muted }}>⏳ Carregando...</div>
            )}

            {!carregandoPromos && promocoesAtivas.length === 0 && (
              <div style={{ textAlign: "center", padding: 48 }}>
                <p style={{ fontSize: 40 }}>🏷️</p>
                <p style={{ color: C.muted, fontSize: 14 }}>Nenhuma promoção ativa no catálogo.</p>
                <button onClick={() => setAba("whatsapp")} style={{ marginTop: 12, padding: "10px 20px", borderRadius: 20, border: "none", background: C.verde, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  + Criar Promoção
                </button>
              </div>
            )}

            {promocoesAtivas.map(p => (
              <div key={p.id} style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 12, border: `2px solid #fca5a5` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.texto }}>{p.emoji} {p.nome}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>R${p.preco.toFixed(2)} unitário</div>
                  </div>
                  <span style={{ background: "#ffebee", color: C.vermelho, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 10px" }}>
                    🔥 Ativa
                  </span>
                </div>
                {p.promocao && (
                  <div style={{ background: "#fff5f5", borderRadius: 10, padding: "8px 12px", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.vermelho }}>
                      R${p.promocao.precoTotal.toFixed(2)} — {p.promocao.descricao}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      Mínimo: {p.promocao.quantidade} unidade(s)
                    </div>
                  </div>
                )}
                <button onClick={() => removerPromocao(p)} disabled={removendo === p.id}
                  style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: removendo === p.id ? "#e5e7eb" : "#ffebee", color: removendo === p.id ? C.muted : C.vermelho, fontSize: 13, fontWeight: 700, cursor: removendo === p.id ? "not-allowed" : "pointer" }}>
                  {removendo === p.id ? "⏳ Removendo..." : "🗑️ Remover Promoção do Catálogo"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

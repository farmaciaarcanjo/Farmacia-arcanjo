// ============================================================
// COMPONENTE: GeradorPromocao.tsx
// FARMÁCIA ARCANJO — Painel Admin
// ============================================================
// COMO USAR:
// 1. Crie o arquivo GeradorPromocao.tsx na pasta pages
// 2. Cole este código
// 3. No Catalogo.tsx adicione:
//    import GeradorPromocao from "./GeradorPromocao";
//    <GeradorPromocao />
// ============================================================

import { useState, useRef } from "react";

type TipoPromo = "desconto" | "leveXpagueY" | "doDia";

interface PromoForm {
  tipo: TipoPromo;
  produto: string;
  precoOriginal: string;
  precoPromocao: string;
  leveQtd: string;
  pagueQtd: string;
  validade: string;
  emoji: string;
}

const emojis = ["💊","🏥","❤️","✨","🔥","⭐","💙","🌿","💚","🎯"];

const formVazio = (): PromoForm => ({
  tipo: "desconto",
  produto: "",
  precoOriginal: "",
  precoPromocao: "",
  leveQtd: "3",
  pagueQtd: "2",
  validade: "",
  emoji: "🔥",
});

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

const gerarTexto = (form: PromoForm): string => {
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

export default function GeradorPromocao() {
  const [form, setForm] = useState<PromoForm>(formVazio());
  const [texto, setTexto] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [etapa, setEtapa] = useState<"form" | "resultado">("form");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imagemGerada, setImagemGerada] = useState("");

  const gerar = () => {
    if (!form.produto.trim()) return;
    const t = gerarTexto(form);
    setTexto(t);
    gerarImagem(form);
    setEtapa("resultado");
  };

  const gerarImagem = (f: PromoForm) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 800;

    // Fundo gradiente verde
    const grad = ctx.createLinearGradient(0, 0, 0, 800);
    grad.addColorStop(0, "#1b5e20");
    grad.addColorStop(1, "#2e7d32");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 800);

    // Círculo decorativo
    ctx.beginPath();
    ctx.arc(700, 100, 180, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(100, 700, 150, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();

    // Header
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(0, 0, 800, 120);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🏥 Farmácia Arcanjo", 400, 55);
    ctx.font = "24px Arial";
    ctx.fillStyle = "#a5d6a7";
    ctx.fillText("Meruoca - CE", 400, 95);

    // Badge tipo promoção
    const badgeTexto = f.tipo === "desconto" ? "🔥 OFERTA ESPECIAL" : f.tipo === "leveXpagueY" ? "🛒 LEVE E PAGUE" : "⭐ PROMOÇÃO DO DIA";
    ctx.fillStyle = "#ff6f00";
    ctx.beginPath();
    ctx.roundRect(200, 140, 400, 60, 30);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Arial";
    ctx.fillText(badgeTexto, 400, 180);

    // Emoji grande
    ctx.font = "80px Arial";
    ctx.fillText(f.emoji, 400, 310);

    // Nome do produto
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px Arial";
    const nomeLinhas = quebrarTexto(ctx, f.produto, 700);
    nomeLinhas.forEach((linha, i) => {
      ctx.fillText(linha, 400, 370 + i * 50);
    });

    const yPreco = 370 + nomeLinhas.length * 50 + 30;

    // Preços
    if (f.tipo === "desconto") {
      const pct = desconto(f.precoOriginal, f.precoPromocao);
      ctx.fillStyle = "#ef9a9a";
      ctx.font = "28px Arial";
      ctx.fillText(`De: ${fmtMoeda(f.precoOriginal)}`, 400, yPreco);

      ctx.fillStyle = "#69f0ae";
      ctx.font = "bold 56px Arial";
      ctx.fillText(fmtMoeda(f.precoPromocao), 400, yPreco + 70);

      if (pct > 0) {
        ctx.fillStyle = "#ff6f00";
        ctx.beginPath();
        ctx.roundRect(300, yPreco + 90, 200, 50, 25);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 28px Arial";
        ctx.fillText(`${pct}% OFF`, 400, yPreco + 123);
      }
    } else if (f.tipo === "leveXpagueY") {
      ctx.fillStyle = "#69f0ae";
      ctx.font = "bold 52px Arial";
      ctx.fillText(`LEVE ${f.leveQtd}`, 400, yPreco + 20);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px Arial";
      ctx.fillText(`PAGUE ${f.pagueQtd}`, 400, yPreco + 75);
    } else {
      ctx.fillStyle = "#69f0ae";
      ctx.font = "bold 56px Arial";
      ctx.fillText(fmtMoeda(f.precoPromocao), 400, yPreco + 50);
      ctx.fillStyle = "#fff176";
      ctx.font = "bold 30px Arial";
      ctx.fillText("SÓ HOJE!", 400, yPreco + 100);
    }

    // Validade
    if (f.validade) {
      ctx.fillStyle = "#fff9c4";
      ctx.font = "24px Arial";
      ctx.fillText(`⏰ Válido até: ${f.validade}`, 400, 730);
    }

    // Footer
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, 750, 800, 50);
    ctx.fillStyle = "#a5d6a7";
    ctx.font = "22px Arial";
    ctx.fillText("📞 (88) 99337-5650", 400, 782);

    setImagemGerada(canvas.toDataURL("image/png"));
  };

  const quebrarTexto = (ctx: CanvasRenderingContext2D, texto: string, maxW: number): string[] => {
    const palavras = texto.split(" ");
    const linhas: string[] = [];
    let atual = "";
    for (const p of palavras) {
      const teste = atual ? `${atual} ${p}` : p;
      if (ctx.measureText(teste).width > maxW && atual) {
        linhas.push(atual);
        atual = p;
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  };

  const copiarTexto = () => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const baixarImagem = () => {
    const a = document.createElement("a");
    a.href = imagemGerada;
    a.download = `promo-${form.produto.replace(/\s+/g, "-")}.png`;
    a.click();
  };

  const compartilharWhatsApp = () => {
    const msg = encodeURIComponent(texto);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const cor = {
    verde: "#16a34a", fundo: "#0f172a", card: "#1e293b",
    borda: "#334155", texto: "#f1f5f9", muted: "#94a3b8",
  };

  const s: Record<string, React.CSSProperties> = {
    wrap: { fontFamily: "'Segoe UI', sans-serif", background: cor.fundo, minHeight: "100vh", color: cor.texto, paddingBottom: 40 },
    header: { background: "linear-gradient(135deg, #16a34a, #15803d)", padding: "20px 20px 16px" },
    h1: { margin: 0, fontSize: 20, fontWeight: 700 },
    sub: { margin: "4px 0 0", fontSize: 13, color: "#bbf7d0" },
    corpo: { padding: 16 },
    input: { background: "#0f172a", border: `1.5px solid ${cor.borda}`, borderRadius: 10, padding: "12px 14px", fontSize: 15, color: cor.texto, width: "100%", boxSizing: "border-box" as const, marginBottom: 12 },
    label: { fontSize: 12, color: cor.muted, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    btnVerde: { background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: 10 },
    btnCinza: { background: cor.card, color: cor.muted, border: `1px solid ${cor.borda}`, borderRadius: 12, padding: "12px 20px", fontSize: 14, cursor: "pointer", width: "100%", marginBottom: 10 },
    card: { background: cor.card, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${cor.borda}` },
    tipoBotao: (ativo: boolean) => ({ flex: 1, padding: "10px 8px", borderRadius: 10, border: `2px solid ${ativo ? cor.verde : cor.borda}`, background: ativo ? "#14532d" : cor.fundo, color: ativo ? "#86efac" : cor.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center" as const }),
  };

  return (
    <div style={s.wrap}>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={s.header}>
        <p style={s.h1}>📣 Gerador de Promoção</p>
        <p style={s.sub}>WhatsApp Status — Farmácia Arcanjo</p>
      </div>

      {etapa === "form" && (
        <div style={s.corpo}>
          {/* Tipo de promoção */}
          <label style={s.label}>Tipo de Promoção</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {([["desconto", "💰 Desconto"], ["leveXpagueY", "🛒 Leve/Pague"], ["doDia", "⭐ Do Dia"]] as [TipoPromo, string][]).map(([t, l]) => (
              <button key={t} style={s.tipoBotao(form.tipo === t)} onClick={() => setForm({ ...form, tipo: t })}>{l}</button>
            ))}
          </div>

          {/* Produto */}
          <label style={s.label}>Nome do Produto *</label>
          <input style={s.input} placeholder="Ex: Dipirona 500mg" value={form.produto} onChange={e => setForm({ ...form, produto: e.target.value })} />

          {/* Preços */}
          {(form.tipo === "desconto") && (
            <>
              <label style={s.label}>Preço Original (R$)</label>
              <input style={s.input} type="number" step="0.01" placeholder="Ex: 15.00" value={form.precoOriginal} onChange={e => setForm({ ...form, precoOriginal: e.target.value })} />
              <label style={s.label}>Preço Promocional (R$)</label>
              <input style={s.input} type="number" step="0.01" placeholder="Ex: 9.90" value={form.precoPromocao} onChange={e => setForm({ ...form, precoPromocao: e.target.value })} />
            </>
          )}
          {form.tipo === "leveXpagueY" && (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Leve (qtd)</label>
                <input style={s.input} type="number" value={form.leveQtd} onChange={e => setForm({ ...form, leveQtd: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Pague (qtd)</label>
                <input style={s.input} type="number" value={form.pagueQtd} onChange={e => setForm({ ...form, pagueQtd: e.target.value })} />
              </div>
            </div>
          )}
          {form.tipo === "doDia" && (
            <>
              <label style={s.label}>Preço do Dia (R$)</label>
              <input style={s.input} type="number" step="0.01" placeholder="Ex: 9.90" value={form.precoPromocao} onChange={e => setForm({ ...form, precoPromocao: e.target.value })} />
            </>
          )}

          {/* Validade */}
          <label style={s.label}>Validade (opcional)</label>
          <input style={s.input} placeholder="Ex: 30/04/2026" value={form.validade} onChange={e => setForm({ ...form, validade: e.target.value })} />

          {/* Emoji */}
          <label style={s.label}>Emoji</label>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginBottom: 16 }}>
            {emojis.map(e => (
              <button key={e} onClick={() => setForm({ ...form, emoji: e })}
                style={{ fontSize: 24, background: form.emoji === e ? "#14532d" : cor.fundo, border: `2px solid ${form.emoji === e ? cor.verde : cor.borda}`, borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}>
                {e}
              </button>
            ))}
          </div>

          <button style={s.btnVerde} onClick={gerar}>✨ Gerar Promoção</button>
        </div>
      )}

      {etapa === "resultado" && (
        <div style={s.corpo}>
          {/* Imagem */}
          {imagemGerada && (
            <div style={{ marginBottom: 16 }}>
              <img src={imagemGerada} style={{ width: "100%", borderRadius: 12 }} alt="Promoção" />
            </div>
          )}

          {/* Texto */}
          <div style={s.card}>
            <p style={{ ...s.label, marginBottom: 8 }}>📝 Texto para copiar:</p>
            <pre style={{ color: cor.texto, fontSize: 13, whiteSpace: "pre-wrap" as const, margin: 0, fontFamily: "inherit" }}>{texto}</pre>
          </div>

          {/* Botões */}
          <button style={s.btnVerde} onClick={copiarTexto}>
            {copiado ? "✅ Copiado!" : "📋 Copiar Texto"}
          </button>
          <button style={{ ...s.btnVerde, background: "linear-gradient(135deg, #15803d, #166534)" }} onClick={baixarImagem}>
            💾 Salvar Imagem
          </button>
          <button style={{ ...s.btnVerde, background: "linear-gradient(135deg, #25d366, #128c7e)" }} onClick={compartilharWhatsApp}>
            📱 Compartilhar no WhatsApp
          </button>
          <button style={s.btnCinza as React.CSSProperties} onClick={() => { setEtapa("form"); setImagemGerada(""); }}>
            ← Criar Nova Promoção
          </button>
        </div>
      )}
    </div>
  );
}

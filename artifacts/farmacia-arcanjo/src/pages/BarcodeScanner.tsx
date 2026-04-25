import { useState, useRef } from "react";
import { salvarProdutoFirebase } from "../lib/firebase";

interface Produto {
  id: string;
  codigoBarras?: string;
  nome: string;
  categoria: string;
  preco: number;
  estoque: number;
  descricao?: string;
}

interface BarcodeScannerProps {
  produtos: Produto[];
  onSalvar: (produto: Produto) => void;
}

const categorias = [
  "Analgésicos","Anti-inflamatórios","Antibióticos","Antialérgicos",
  "Antigripais","Vitaminas e Suplementos","Dermocosméticos","Perfumaria",
  "Higiene Pessoal","Genéricos","Manipulados","Outros"
];

const formVazio = (codigo = ""): Produto => ({
  id: Date.now().toString(),
  codigoBarras: codigo,
  nome: "", categoria: "Outros", preco: 0, estoque: 0, descricao: "",
});

type Modo = "inicio" | "manual" | "busca" | "edicao" | "novo" | "sucesso" | "foto";

export default function BarcodeScanner({ produtos, onSalvar }: BarcodeScannerProps) {
  const [modo, setModo] = useState<Modo>("inicio");
  const [codigo, setCodigo] = useState("");
  const [buscaNome, setBuscaNome] = useState("");
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [form, setForm] = useState<Produto>(formVazio());
  const [erro, setErro] = useState("");
  const [statusFoto, setStatusFoto] = useState("");
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "erro" } | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const mostrarToast = (msg: string, tipo: "ok" | "erro") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const processarCodigo = (cod: string) => {
    setErro("");
    const encontrado = produtos.find(p => p.codigoBarras === cod);
    if (encontrado) {
      setForm({ ...encontrado });
      setModo("edicao");
    } else {
      setForm(formVazio(cod));
      setModo("novo");
    }
  };

  const buscarPorNome = (texto: string) => {
    setBuscaNome(texto);
    if (!texto.trim()) { setResultados([]); return; }
    const q = texto.toLowerCase();
    setResultados(produtos.filter(p => p.nome.toLowerCase().includes(q)).slice(0, 8));
  };

  const selecionarProduto = (p: Produto) => {
    setForm({ ...p });
    setModo("edicao");
    setBuscaNome("");
    setResultados([]);
  };

  // Tenta ler com múltiplas tentativas e ajustes de imagem
  const lerFoto = async (file: File) => {
    setModo("foto");
    setStatusFoto("🔍 Analisando imagem...");
    try {
      await loadZXing();
      const ZXing = (window as any).ZXing;
      const reader = new ZXing.BrowserMultiFormatReader();

      // Tenta 3 versões da imagem: original, mais clara, com alto contraste
      const tentativas = await Promise.all([
        fileToCanvas(file, 1, 1),     // Original
        fileToCanvas(file, 1.5, 1),   // Mais brilho
        fileToCanvas(file, 1, 2),     // Alto contraste
      ]);

      let resultado = null;
      for (const canvas of tentativas) {
        try {
          const img = canvasToImg(canvas);
          resultado = await reader.decodeFromImageElement(img);
          if (resultado) break;
        } catch { continue; }
      }

      if (resultado) {
        setStatusFoto("✅ Código lido com sucesso!");
        setTimeout(() => processarCodigo(resultado.text), 500);
      } else {
        throw new Error("Não reconhecido");
      }
    } catch {
      setModo("manual");
      setErro("❌ Não consegui ler o código. Dicas: aproxime mais, boa iluminação, foto sem tremida. Ou use a digitação manual.");
    }
  };

  const fileToCanvas = (file: File, brilho: number, contraste: number): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // Redimensionar para melhor leitura
        const maxW = 1280;
        const scale = img.width > maxW ? maxW / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.filter = `brightness(${brilho}) contrast(${contraste})`;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const canvasToImg = (canvas: HTMLCanvasElement): HTMLImageElement => {
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  };

  const loadZXing = (): Promise<void> => new Promise((res, rej) => {
    if ((window as any).ZXing) { res(); return; }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js";
    s.onload = () => res();
    s.onerror = () => rej();
    document.head.appendChild(s);
  });

  const salvar = async () => {
    if (!form.nome.trim()) { setErro("Nome é obrigatório."); return; }
    if (form.preco <= 0) { setErro("Informe um preço válido."); return; }

    const idNumerico = Number(form.id);
    const idValido = !isNaN(idNumerico) && idNumerico > 0;
    const idFinal = idValido ? idNumerico : Date.now();

    onSalvar(form);

    try {
      const ok = await salvarProdutoFirebase({
        id: idFinal,
        nome: form.nome,
        preco: form.preco,
        categoria: form.categoria,
        emoji: "💊",
        desc: form.descricao || "",
        estoque: form.estoque,
        codigoBarras: form.codigoBarras,
      });
      if (ok) {
        mostrarToast(`✅ Salvo no Firebase com sucesso! (ID: ${idFinal})`, "ok");
      } else {
        mostrarToast("⚠️ Erro ao salvar no Firebase. Verifique a conexão.", "erro");
      }
    } catch {
      mostrarToast("⚠️ Erro ao salvar no Firebase. Verifique a conexão.", "erro");
    }

    setModo("sucesso");
    setTimeout(() => { setModo("inicio"); setErro(""); }, 2500);
  };

  const voltar = () => { setModo("inicio"); setErro(""); setCodigo(""); setBuscaNome(""); setResultados([]); };

  const cor = {
    verde: "#16a34a", verdeClaro: "#22c55e", fundo: "#0f172a",
    card: "#1e293b", borda: "#334155", texto: "#f1f5f9", muted: "#94a3b8",
  };

  const s: Record<string, React.CSSProperties> = {
    wrap: { fontFamily: "'Segoe UI', sans-serif", background: cor.fundo, minHeight: "100vh", color: cor.texto, paddingBottom: 40 },
    header: { background: `linear-gradient(135deg, ${cor.verde}, #15803d)`, padding: "20px 20px 16px" },
    h1: { margin: 0, fontSize: 20, fontWeight: 700 },
    sub: { margin: "4px 0 0", fontSize: 13, color: "#bbf7d0" },
    corpo: { padding: 16 },
    input: { background: "#0f172a", border: `1.5px solid ${cor.borda}`, borderRadius: 10, padding: "12px 14px", fontSize: 15, color: cor.texto, width: "100%", boxSizing: "border-box" as const, marginBottom: 12 },
    label: { fontSize: 12, color: cor.muted, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    btnVerde: { background: `linear-gradient(135deg, ${cor.verde}, #15803d)`, color: "#fff", border: "none", borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: 10 },
    btnCinza: { background: cor.card, color: cor.muted, border: `1px solid ${cor.borda}`, borderRadius: 12, padding: "12px 20px", fontSize: 14, cursor: "pointer", width: "100%", marginBottom: 10 },
    btnAzul: { background: "linear-gradient(135deg, #1e40af, #1e3a5f)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: 10 },
    erro: { background: "#450a0a", border: `1px solid #dc2626`, color: "#fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 },
    badge: (bg: string, color: string) => ({ display: "inline-block", background: bg, color, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600, marginBottom: 16 }),
    card: { background: cor.card, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${cor.borda}` },
    dica: { background: "#1e3a5f", border: `1px solid #1e40af`, borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13 },
  };

  return (
    <div style={s.wrap}>
      <input ref={inputFotoRef} type="file" accept="image/*" capture="environment"
        style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) lerFoto(f); e.target.value = ""; }} />

      {/* Toast Firebase */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          background: toast.tipo === "ok" ? "#14532d" : "#450a0a",
          border: `1.5px solid ${toast.tipo === "ok" ? "#22c55e" : "#dc2626"}`,
          color: toast.tipo === "ok" ? "#bbf7d0" : "#fca5a5",
          borderRadius: 14, padding: "12px 20px", fontSize: 13, fontWeight: 700,
          zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          maxWidth: "90vw", textAlign: "center", whiteSpace: "pre-wrap",
        }}>
          {toast.msg}
        </div>
      )}

      <div style={s.header}>
        <p style={s.h1}>📷 Scanner & Cadastro</p>
        <p style={s.sub}>Farmácia Arcanjo — Painel Admin</p>
      </div>

      <div style={s.corpo}>

        {/* ── INÍCIO ── */}
        {modo === "inicio" && (
          <div>
            <p style={{ color: cor.muted, fontSize: 14, marginBottom: 20 }}>
              Escolha como quer localizar ou cadastrar o produto:
            </p>

            {/* Busca por nome */}
            <label style={s.label}>🔍 Buscar produto por nome</label>
            <input style={s.input} placeholder="Digite o nome do produto..." value={buscaNome}
              onChange={e => buscarPorNome(e.target.value)} />
            {resultados.length > 0 && (
              <div style={{ ...s.card, padding: 8, marginTop: -8, marginBottom: 16 }}>
                {resultados.map(p => (
                  <div key={p.id} onClick={() => selecionarProduto(p)}
                    style={{ display: "flex", justifyContent: "space-between", padding: "10px 8px", borderBottom: `1px solid ${cor.borda}`, cursor: "pointer" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{p.nome}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: cor.muted }}>{p.categoria} • Estoque: {p.estoque}</p>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: cor.verdeClaro }}>
                      R$ {p.preco.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {buscaNome.length > 2 && resultados.length === 0 && (
              <div style={{ ...s.dica, marginTop: -8, marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#93c5fd" }}>Produto não encontrado. Use o scanner ou código abaixo para cadastrar.</p>
              </div>
            )}

            <button style={s.btnVerde} onClick={() => { setErro(""); inputFotoRef.current?.click(); }}>
              📷 Fotografar Código de Barras
            </button>
            <button style={s.btnAzul} onClick={() => { setErro(""); setModo("manual"); }}>
              ⌨️ Digitar Código Manualmente
            </button>
            <button style={s.btnCinza as React.CSSProperties} onClick={() => { setForm(formVazio()); setModo("novo"); }}>
              ➕ Cadastrar Novo Produto
            </button>
          </div>
        )}

        {/* ── PROCESSANDO FOTO ── */}
        {modo === "foto" && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>🔍</p>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{statusFoto}</p>
            <p style={{ color: cor.muted, fontSize: 13 }}>Tentando 3 ajustes de imagem...</p>
          </div>
        )}

        {/* ── MANUAL ── */}
        {modo === "manual" && (
          <div>
            {erro && <div style={s.erro}>{erro}</div>}

            {/* Dicas para foto */}
            <div style={s.dica}>
              <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#93c5fd" }}>💡 Dicas para melhor leitura:</p>
              <p style={{ margin: "2px 0", fontSize: 12, color: "#bfdbfe" }}>• Boa iluminação — evite sombras</p>
              <p style={{ margin: "2px 0", fontSize: 12, color: "#bfdbfe" }}>• Aproxime bem o celular do código</p>
              <p style={{ margin: "2px 0", fontSize: 12, color: "#bfdbfe" }}>• Mantenha o celular firme ao fotografar</p>
              <p style={{ margin: "2px 0", fontSize: 12, color: "#bfdbfe" }}>• Código deve ocupar 70% da foto</p>
            </div>

            <button style={s.btnVerde} onClick={() => { setErro(""); inputFotoRef.current?.click(); }}>
              📷 Tentar Foto Novamente
            </button>

            <label style={s.label}>Ou digite o código:</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input style={{ ...s.input, marginBottom: 0, flex: 1 }} type="number"
                placeholder="Ex: 7891234567890" value={codigo}
                onChange={e => setCodigo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && codigo.trim() && processarCodigo(codigo.trim())} />
              <button onClick={() => codigo.trim() && processarCodigo(codigo.trim())}
                style={{ background: cor.verde, color: "#fff", border: "none", borderRadius: 10, padding: "0 16px", fontSize: 20, cursor: "pointer" }}>→</button>
            </div>
            <button style={s.btnCinza as React.CSSProperties} onClick={voltar}>← Voltar</button>
          </div>
        )}

        {/* ── EDIÇÃO ── */}
        {modo === "edicao" && (
          <div>
            <span style={s.badge("#166534", "#bbf7d0")}>✅ Produto encontrado — editando</span>
            {erro && <div style={s.erro}>{erro}</div>}
            {form.codigoBarras && (
              <p style={{ color: cor.muted, fontSize: 12, marginBottom: 12 }}>
                Código: <strong style={{ color: cor.verdeClaro }}>{form.codigoBarras}</strong>
              </p>
            )}
            <label style={s.label}>Nome do Produto</label>
            <input style={s.input} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            <label style={s.label}>Categoria</label>
            <select style={{ ...s.input, marginBottom: 12 }} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label style={s.label}>Preço (R$)</label>
            <input style={s.input} type="number" step="0.01" min="0" value={form.preco}
              onChange={e => setForm({ ...form, preco: parseFloat(e.target.value) || 0 })} />
            <label style={s.label}>Estoque (unidades)</label>
            <input style={s.input} type="number" min="0" value={form.estoque}
              onChange={e => setForm({ ...form, estoque: parseInt(e.target.value) || 0 })} />
            <label style={s.label}>Descrição (opcional)</label>
            <input style={s.input} placeholder="Ex: Analgésico e antipirético"
              value={form.descricao || ""} onChange={e => setForm({ ...form, descricao: e.target.value })} />
            <button style={s.btnVerde} onClick={salvar}>💾 Salvar Alterações</button>
            <button style={s.btnCinza as React.CSSProperties} onClick={voltar}>← Cancelar</button>
          </div>
        )}

        {/* ── NOVO ── */}
        {modo === "novo" && (
          <div>
            <span style={s.badge("#1e3a5f", "#93c5fd")}>➕ Novo produto</span>
            {erro && <div style={s.erro}>{erro}</div>}
            {form.codigoBarras && (
              <p style={{ color: cor.muted, fontSize: 12, marginBottom: 8 }}>
                Código: <strong style={{ color: "#60a5fa" }}>{form.codigoBarras}</strong>
              </p>
            )}
            <label style={s.label}>Nome do Produto *</label>
            <input style={s.input} placeholder="Ex: Dipirona 500mg" value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })} />
            <label style={s.label}>Categoria</label>
            <select style={{ ...s.input, marginBottom: 12 }} value={form.categoria}
              onChange={e => setForm({ ...form, categoria: e.target.value })}>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label style={s.label}>Preço (R$) *</label>
            <input style={s.input} type="number" step="0.01" min="0" placeholder="0,00"
              value={form.preco || ""} onChange={e => setForm({ ...form, preco: parseFloat(e.target.value) || 0 })} />
            <label style={s.label}>Estoque (unidades)</label>
            <input style={s.input} type="number" min="0" placeholder="0"
              value={form.estoque || ""} onChange={e => setForm({ ...form, estoque: parseInt(e.target.value) || 0 })} />
            <label style={s.label}>Código de Barras (opcional)</label>
            <input style={s.input} placeholder="Ex: 7891234567890"
              value={form.codigoBarras || ""} onChange={e => setForm({ ...form, codigoBarras: e.target.value })} />
            <label style={s.label}>Descrição (opcional)</label>
            <input style={s.input} placeholder="Ex: Analgésico e antipirético"
              value={form.descricao || ""} onChange={e => setForm({ ...form, descricao: e.target.value })} />
            <button style={s.btnVerde} onClick={salvar}>➕ Cadastrar Produto</button>
            <button style={s.btnCinza as React.CSSProperties} onClick={voltar}>← Cancelar</button>
          </div>
        )}

        {/* ── SUCESSO ── */}
        {modo === "sucesso" && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontSize: 56, marginBottom: 12 }}>✅</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: cor.verdeClaro, marginBottom: 8 }}>Salvo com sucesso!</p>
            <p style={{ color: cor.muted, fontSize: 14 }}>Produto atualizado no catálogo.</p>
          </div>
        )}

      </div>
    </div>
  );
}

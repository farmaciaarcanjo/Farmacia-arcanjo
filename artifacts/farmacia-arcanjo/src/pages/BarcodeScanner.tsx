import { useState, useRef } from "react";

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
  "Analgésicos","Anti-inflamatórios","Antibióticos","Antigripais",
  "Vitaminas","Dermocosméticos","Genéricos","Outros"
];

const formVazio = (codigo = ""): Produto => ({
  id: Date.now().toString(),
  codigoBarras: codigo,
  nome: "", categoria: "Outros", preco: 0, estoque: 0, descricao: "",
});

export default function BarcodeScanner({ produtos, onSalvar }: BarcodeScannerProps) {
  const [etapa, setEtapa] = useState<"inicio"|"manual"|"edicao"|"novo"|"lendo"|"sucesso">("inicio");
  const [codigoDigitado, setCodigoDigitado] = useState("");
  const [form, setForm] = useState<Produto>(formVazio());
  const [erro, setErro] = useState("");
  const [statusLeitura, setStatusLeitura] = useState("");
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const processarCodigo = (codigo: string) => {
    setErro("");
    const encontrado = produtos.find(p => p.codigoBarras === codigo);
    if (encontrado) {
      setForm({ ...encontrado });
      setEtapa("edicao");
    } else {
      setForm(formVazio(codigo));
      setEtapa("novo");
    }
  };

  // Lê o código da foto usando ZXing via CDN (sem instalar nada)
  const lerFoto = async (file: File) => {
    setEtapa("lendo");
    setStatusLeitura("Analisando imagem...");
    try {
      // Carrega ZXing via CDN dinamicamente
      await loadZXing();
      const ZXing = (window as any).ZXing;
      const reader = new ZXing.BrowserMultiFormatReader();
      const img = await fileToImageElement(file);
      const result = await reader.decodeFromImageElement(img);
      setStatusLeitura("✅ Código lido!");
      setTimeout(() => processarCodigo(result.text), 500);
    } catch {
      setEtapa("inicio");
      setErro("Não consegui ler o código. Tente de novo com melhor iluminação ou use a digitação manual.");
    }
  };

  const loadZXing = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).ZXing) { resolve(); return; }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  };

  const fileToImageElement = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  const onFotoCapturada = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) lerFoto(file);
    e.target.value = "";
  };

  const buscarManual = () => {
    if (!codigoDigitado.trim()) { setErro("Digite um código de barras."); return; }
    processarCodigo(codigoDigitado.trim());
    setCodigoDigitado("");
  };

  const salvar = () => {
    if (!form.nome.trim()) { setErro("Nome é obrigatório."); return; }
    if (form.preco <= 0) { setErro("Informe um preço válido."); return; }
    onSalvar(form);
    setEtapa("sucesso");
    setTimeout(() => setEtapa("inicio"), 2500);
  };

  // ── Estilos ───────────────────────────────────────────────
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
    btnVerde: { background: `linear-gradient(135deg, ${cor.verde}, #15803d)`, color: "#fff", border: "none", borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: 10, display: "block", textAlign: "center" as const },
    btnCinza: { background: cor.card, color: cor.muted, border: `1px solid ${cor.borda}`, borderRadius: 12, padding: "12px 20px", fontSize: 14, cursor: "pointer", width: "100%", marginBottom: 10 },
    erro: { background: "#450a0a", border: `1px solid #dc2626`, color: "#fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 },
    badge: (bg: string, color: string) => ({ display: "inline-block", background: bg, color, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600, marginBottom: 16 }),
    dica: { background: "#1e293b", border: `1px solid ${cor.borda}`, borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: cor.muted },
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <p style={s.h1}>📷 Scanner de Código de Barras</p>
        <p style={s.sub}>Farmácia Arcanjo — Painel Admin</p>
      </div>

      {/* Input oculto para foto */}
      <input
        ref={inputFotoRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={onFotoCapturada}
      />

      <div style={s.corpo}>

        {/* ── INÍCIO ── */}
        {etapa === "inicio" && (
          <div>
            {erro && <div style={s.erro}>{erro}</div>}
            <div style={s.dica}>
              💡 <strong>Como usar:</strong> Toque em "Fotografar Código", aponte a câmera para o código de barras do produto e tire a foto. O app vai ler automaticamente!
            </div>
            <button style={s.btnVerde} onClick={() => { setErro(""); inputFotoRef.current?.click(); }}>
              📷 Fotografar Código de Barras
            </button>
            <button style={s.btnCinza as React.CSSProperties} onClick={() => { setErro(""); setEtapa("manual"); }}>
              ⌨️ Digitar Código Manualmente
            </button>
          </div>
        )}

        {/* ── LENDO ── */}
        {etapa === "lendo" && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>🔍</p>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{statusLeitura}</p>
            <p style={{ color: cor.muted, fontSize: 13 }}>Aguarde um momento...</p>
          </div>
        )}

        {/* ── MANUAL ── */}
        {etapa === "manual" && (
          <div>
            {erro && <div style={s.erro}>{erro}</div>}
            <label style={s.label}>Código de Barras (EAN-13)</label>
            <input
              style={s.input}
              type="number"
              placeholder="Ex: 7891234567890"
              value={codigoDigitado}
              onChange={e => setCodigoDigitado(e.target.value)}
              onKeyDown={e => e.key === "Enter" && buscarManual()}
            />
            <button style={s.btnVerde} onClick={buscarManual}>🔍 Buscar Produto</button>
            <button style={s.btnCinza as React.CSSProperties} onClick={() => { setEtapa("inicio"); setErro(""); }}>← Voltar</button>
          </div>
        )}

        {/* ── EDIÇÃO ── */}
        {etapa === "edicao" && (
          <div>
            <span style={s.badge("#166534", "#bbf7d0")}>✅ Produto encontrado</span>
            {erro && <div style={s.erro}>{erro}</div>}
            <p style={{ color: cor.muted, fontSize: 12, marginBottom: 12 }}>
              Código: <strong style={{ color: cor.verdeClaro }}>{form.codigoBarras}</strong>
            </p>
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
            <button style={s.btnVerde} onClick={salvar}>💾 Salvar Alterações</button>
            <button style={s.btnCinza as React.CSSProperties} onClick={() => setEtapa("inicio")}>← Cancelar</button>
          </div>
        )}

        {/* ── NOVO ── */}
        {etapa === "novo" && (
          <div>
            <span style={s.badge("#1e3a5f", "#93c5fd")}>➕ Novo produto</span>
            {erro && <div style={s.erro}>{erro}</div>}
            <p style={{ color: cor.muted, fontSize: 12, marginBottom: 8 }}>
              Código: <strong style={{ color: "#60a5fa" }}>{form.codigoBarras}</strong>
            </p>
            <p style={{ color: "#f59e0b", fontSize: 13, marginBottom: 16 }}>
              Produto não encontrado. Preencha para cadastrar:
            </p>
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
            <label style={s.label}>Descrição (opcional)</label>
            <input style={s.input} placeholder="Ex: Analgésico e antipirético"
              value={form.descricao || ""} onChange={e => setForm({ ...form, descricao: e.target.value })} />
            <button style={s.btnVerde} onClick={salvar}>➕ Cadastrar Produto</button>
            <button style={s.btnCinza as React.CSSProperties} onClick={() => setEtapa("inicio")}>← Cancelar</button>
          </div>
        )}

        {/* ── SUCESSO ── */}
        {etapa === "sucesso" && (
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
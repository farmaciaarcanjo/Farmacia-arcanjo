import { useState, useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

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

const formVazio = (codigo = ""): Produto => ({
  id: Date.now().toString(),
  codigoBarras: codigo,
  nome: "",
  categoria: "Outros",
  preco: 0,
  estoque: 0,
  descricao: "",
});

const categorias = [
  "Analgésicos","Anti-inflamatórios","Antibióticos","Antigripais",
  "Vitaminas","Dermocosméticos","Genéricos","Outros"
];

export default function BarcodeScanner({ produtos, onSalvar }: BarcodeScannerProps) {
  const [etapa, setEtapa] = useState<"inicio"|"camera"|"manual"|"edicao"|"novo"|"sucesso">("inicio");
  const [codigoDigitado, setCodigoDigitado] = useState("");
  const [form, setForm] = useState<Produto>(formVazio());
  const [erro, setErro] = useState("");
  const [lendo, setLendo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const processarCodigo = (codigo: string) => {
    const encontrado = produtos.find(p => p.codigoBarras === codigo);
    if (encontrado) {
      setForm({ ...encontrado });
      setEtapa("edicao");
    } else {
      setForm(formVazio(codigo));
      setEtapa("novo");
    }
  };

  const abrirCamera = async () => {
    setErro("");
    setEtapa("camera");
    setLendo(true);
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const deviceId = devices[devices.length - 1]?.deviceId;
      await reader.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
        if (result) {
          fecharCamera();
          processarCodigo(result.getText());
        }
      });
    } catch {
      setErro("Não foi possível acessar a câmera. Use a entrada manual.");
      setEtapa("manual");
      setLendo(false);
    }
  };

  const fecharCamera = () => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    setLendo(false);
    setEtapa("inicio");
  };

  const buscarManual = () => {
    if (!codigoDigitado.trim()) { setErro("Digite um código de barras."); return; }
    setErro("");
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

  useEffect(() => {
    return () => { if (readerRef.current) readerRef.current.reset(); };
  }, []);

  const c = {
    verde: "#16a34a", verdeClaro: "#22c55e", fundo: "#0f172a",
    card: "#1e293b", borda: "#334155", texto: "#f1f5f9", muted: "#94a3b8",
  };

  const s: Record<string, React.CSSProperties> = {
    wrap: { fontFamily: "'Segoe UI', sans-serif", background: c.fundo, minHeight: "100vh", color: c.texto, paddingBottom: 40 },
    header: { background: `linear-gradient(135deg, ${c.verde}, #15803d)`, padding: "20px 20px 16px" },
    h1: { margin: 0, fontSize: 20, fontWeight: 700 },
    sub: { margin: "4px 0 0", fontSize: 13, color: "#bbf7d0" },
    corpo: { padding: 16 },
    input: { background: "#0f172a", border: `1.5px solid ${c.borda}`, borderRadius: 10, padding: "12px 14px", fontSize: 15, color: c.texto, width: "100%", boxSizing: "border-box" as const, marginBottom: 12 },
    label: { fontSize: 12, color: c.muted, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    btnVerde: { background: `linear-gradient(135deg, ${c.verde}, #15803d)`, color: "#fff", border: "none", borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: 10 },
    btnCinza: { background: c.card, color: c.muted, border: `1px solid ${c.borda}`, borderRadius: 12, padding: "12px 20px", fontSize: 14, cursor: "pointer", width: "100%", marginBottom: 10 },
    erro: { background: "#450a0a", border: `1px solid #dc2626`, color: "#fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 },
    badge: { display: "inline-block", background: "#166534", color: "#bbf7d0", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600, marginBottom: 16 },
    videoBox: { borderRadius: 12, overflow: "hidden", background: "#000", position: "relative" as const, marginBottom: 16 },
    scanLine: { position: "absolute" as const, left: 0, right: 0, height: 3, background: "#22c55e", boxShadow: "0 0 10px #22c55e", animation: "scanMove 2s linear infinite" },
  };

  return (
    <div style={s.wrap}>
      <style>{`
        @keyframes scanMove { 0%{top:10%} 50%{top:85%} 100%{top:10%} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .sc-anim { animation: fadeIn 0.3s ease; }
      `}</style>

      <div style={s.header}>
        <p style={s.h1}>📷 Scanner de Código de Barras</p>
        <p style={s.sub}>Farmácia Arcanjo — Painel Admin</p>
      </div>

      <div style={s.corpo} className="sc-anim">

        {etapa === "inicio" && (
          <div>
            <p style={{ color: c.muted, fontSize: 14, marginBottom: 20 }}>
              Escaneie o código de barras para cadastrar ou editar um produto.
            </p>
            <button style={s.btnVerde} onClick={abrirCamera}>📷 Abrir Câmera</button>
            <button style={s.btnCinza} onClick={() => setEtapa("manual")}>⌨️ Digitar Código Manualmente</button>
          </div>
        )}

        {etapa === "camera" && (
          <div>
            <div style={s.videoBox}>
              <video ref={videoRef} style={{ width: "100%", display: "block", maxHeight: 300 }} playsInline muted />
              {lendo && <div style={s.scanLine} />}
            </div>
            <p style={{ color: c.muted, fontSize: 13, textAlign: "center", marginBottom: 16 }}>
              {lendo ? "📡 Aponte para o código de barras..." : "Iniciando câmera..."}
            </p>
            <button style={s.btnCinza} onClick={fecharCamera}>← Cancelar</button>
          </div>
        )}

        {etapa === "manual" && (
          <div>
            {erro && <div style={s.erro}>{erro}</div>}
            <label style={s.label}>Código de Barras (EAN-13)</label>
            <input style={s.input} type="number" placeholder="Ex: 7891234567890"
              value={codigoDigitado} onChange={e => setCodigoDigitado(e.target.value)}
              onKeyDown={e => e.key === "Enter" && buscarManual()} />
            <button style={s.btnVerde} onClick={buscarManual}>🔍 Buscar Produto</button>
            <button style={s.btnCinza} onClick={() => { setEtapa("inicio"); setErro(""); }}>← Voltar</button>
          </div>
        )}

        {etapa === "edicao" && (
          <div>
            <span style={s.badge}>✅ Produto encontrado</span>
            {erro && <div style={s.erro}>{erro}</div>}
            <p style={{ color: c.muted, fontSize: 12, marginBottom: 12 }}>
              Código: <strong style={{ color: c.verdeClaro }}>{form.codigoBarras}</strong>
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
            <button style={s.btnCinza} onClick={() => setEtapa("inicio")}>← Cancelar</button>
          </div>
        )}

        {etapa === "novo" && (
          <div>
            <span style={{ ...s.badge, background: "#1e3a5f", color: "#93c5fd" }}>➕ Novo produto</span>
            {erro && <div style={s.erro}>{erro}</div>}
            <p style={{ color: c.muted, fontSize: 12, marginBottom: 8 }}>
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
            <button style={s.btnCinza} onClick={() => setEtapa("inicio")}>← Cancelar</button>
          </div>
        )}

        {etapa === "sucesso" && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontSize: 56, marginBottom: 12 }}>✅</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: c.verdeClaro }}>Salvo com sucesso!</p>
            <p style={{ color: c.muted, fontSize: 14 }}>Produto atualizado no catálogo.</p>
          </div>
        )}

      </div>
    </div>
  );
}
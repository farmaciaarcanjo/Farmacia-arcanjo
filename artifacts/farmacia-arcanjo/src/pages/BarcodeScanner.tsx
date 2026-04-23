// ============================================================
// COMPONENTE: BarcodeScanner.tsx
// FARMÁCIA ARCANJO — Painel Admin
// ============================================================
// COMO USAR:
// 1. Copie este arquivo para sua pasta de componentes no Replit
// 2. No seu painel Admin, importe e use assim:
//    import BarcodeScanner from './BarcodeScanner'
//    <BarcodeScanner produtos={produtos} onSalvar={handleSalvarProduto} />
// ============================================================

import { useState, useEffect, useRef } from "react";

// ── Tipos ────────────────────────────────────────────────────
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

// ── Componente principal ─────────────────────────────────────
export default function BarcodeScanner({ produtos, onSalvar }: BarcodeScannerProps) {
  const [etapa, setEtapa] = useState<"inicio" | "camera" | "manual" | "edicao" | "novo" | "sucesso">("inicio");
  const [codigoDigitado, setCodigoDigitado] = useState("");
  const [produtoEncontrado, setProdutoEncontrado] = useState<Produto | null>(null);
  const [form, setForm] = useState<Produto>({ id: "", codigoBarras: "", nome: "", categoria: "", preco: 0, estoque: 0 });
  const [erro, setErro] = useState("");
  const [scanAtivo, setScanAtivo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const categorias = ["Analgésicos", "Anti-inflamatórios", "Antibióticos", "Vitaminas", "Dermocosméticos", "Genéricos", "Outros"];

  // ── Câmera ────────────────────────────────────────────────
  const abrirCamera = async () => {
    setErro("");
    setEtapa("camera");
    setScanAtivo(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setErro("Não foi possível acessar a câmera. Use a entrada manual.");
      setEtapa("manual");
    }
  };

  const fecharCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanAtivo(false);
    setEtapa("inicio");
  };

  // Simulação: em produção use zxing-js/browser ou quagga2
  const simularScan = () => {
    const codigosExemplo = ["7891234567890", "7899876543210", "7891111111111"];
    const codigo = codigosExemplo[Math.floor(Math.random() * codigosExemplo.length)];
    fecharCamera();
    processarCodigo(codigo);
  };

  // ── Processamento ─────────────────────────────────────────
  const processarCodigo = (codigo: string) => {
    const encontrado = produtos.find(p => p.codigoBarras === codigo);
    if (encontrado) {
      setProdutoEncontrado(encontrado);
      setForm({ ...encontrado });
      setEtapa("edicao");
    } else {
      setForm({ id: Date.now().toString(), codigoBarras: codigo, nome: "", categoria: "Outros", preco: 0, estoque: 0 });
      setEtapa("novo");
    }
  };

  const buscarManual = () => {
    if (!codigoDigitado.trim()) { setErro("Digite um código de barras."); return; }
    setErro("");
    processarCodigo(codigoDigitado.trim());
    setCodigoDigitado("");
  };

  const salvar = () => {
    if (!form.nome.trim()) { setErro("O nome do produto é obrigatório."); return; }
    if (form.preco <= 0) { setErro("Informe um preço válido."); return; }
    onSalvar(form);
    setEtapa("sucesso");
    setTimeout(() => setEtapa("inicio"), 2500);
  };

  useEffect(() => {
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  // ── Estilos inline (sem dependência de tailwind config) ───
  const s = {
    overlay: { fontFamily: "'Segoe UI', sans-serif", background: "#0f172a", minHeight: "100vh", padding: "0", color: "#f1f5f9" } as React.CSSProperties,
    card: { background: "#1e293b", borderRadius: 16, padding: 24, margin: "0 auto", maxWidth: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" } as React.CSSProperties,
    header: { background: "linear-gradient(135deg, #16a34a, #15803d)", borderRadius: "16px 16px 0 0", padding: "20px 24px", marginBottom: 0 } as React.CSSProperties,
    titulo: { margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" } as React.CSSProperties,
    subtitulo: { margin: "4px 0 0", fontSize: 13, color: "#bbf7d0", opacity: 0.9 } as React.CSSProperties,
    btnVerde: { background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 } as React.CSSProperties,
    btnCinza: { background: "#334155", color: "#cbd5e1", border: "none", borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: 10 } as React.CSSProperties,
    btnPerigo: { background: "#dc2626", color: "#fff", border: "none", borderRadius: 12, padding: "14px 20px", fontSize: 15, cursor: "pointer", width: "100%", marginBottom: 10 } as React.CSSProperties,
    input: { background: "#0f172a", border: "1.5px solid #334155", borderRadius: 10, padding: "12px 14px", fontSize: 15, color: "#f1f5f9", width: "100%", boxSizing: "border-box" as const, marginBottom: 12 },
    label: { fontSize: 12, color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    badge: { display: "inline-block", background: "#166534", color: "#bbf7d0", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600, marginBottom: 16 },
    erro: { background: "#450a0a", border: "1px solid #dc2626", color: "#fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 },
    videoBox: { borderRadius: 12, overflow: "hidden", background: "#000", position: "relative" as const, marginBottom: 16 },
    scanLine: { position: "absolute" as const, left: 0, right: 0, height: 2, background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "scanMove 2s linear infinite" },
    sucesso: { textAlign: "center" as const, padding: 32 },
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={s.overlay}>
      <style>{`
        @keyframes scanMove {
          0% { top: 10%; }
          50% { top: 85%; }
          100% { top: 10%; }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .scanner-anim { animation: fadeIn 0.3s ease; }
      `}</style>

      <div style={s.header}>
        <p style={s.titulo}>📷 Scanner de Código de Barras</p>
        <p style={s.subtitulo}>Farmácia Arcanjo — Painel Admin</p>
      </div>

      <div style={{ ...s.card, borderRadius: "0 0 16px 16px" }} className="scanner-anim">

        {/* ── INÍCIO ── */}
        {etapa === "inicio" && (
          <div>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20, marginTop: 8 }}>
              Escaneie o código de barras de um produto para cadastrar ou editar preço e estoque.
            </p>
            <button style={s.btnVerde} onClick={abrirCamera}>
              📷 Abrir Câmera
            </button>
            <button style={s.btnCinza} onClick={() => setEtapa("manual")}>
              ⌨️ Digitar Código Manualmente
            </button>
          </div>
        )}

        {/* ── CÂMERA ── */}
        {etapa === "camera" && (
          <div>
            <div style={s.videoBox}>
              <video ref={videoRef} style={{ width: "100%", display: "block", maxHeight: 280 }} playsInline muted />
              <div style={s.scanLine} />
            </div>
            <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", marginBottom: 16 }}>
              Aponte para o código de barras do produto
            </p>

            {/* ATENÇÃO: Botão de simulação — substitua por zxing-js em produção */}
            <button style={s.btnVerde} onClick={simularScan}>
              ✅ Simular Leitura (teste)
            </button>
            <p style={{ color: "#f59e0b", fontSize: 11, textAlign: "center", marginBottom: 12 }}>
              ⚠️ Para leitura real, instale: npm install @zxing/browser
            </p>
            <button style={s.btnCinza} onClick={fecharCamera}>← Voltar</button>
          </div>
        )}

        {/* ── MANUAL ── */}
        {etapa === "manual" && (
          <div>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 16, marginTop: 8 }}>
              Digite o código de barras do produto:
            </p>
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
            <button style={s.btnCinza} onClick={() => { setEtapa("inicio"); setErro(""); }}>← Voltar</button>
          </div>
        )}

        {/* ── EDIÇÃO (produto encontrado) ── */}
        {etapa === "edicao" && (
          <div>
            <span style={s.badge}>✅ Produto encontrado</span>
            {erro && <div style={s.erro}>{erro}</div>}
            <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12 }}>
              Código: <strong style={{ color: "#22c55e" }}>{form.codigoBarras}</strong>
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

        {/* ── NOVO PRODUTO ── */}
        {etapa === "novo" && (
          <div>
            <span style={{ ...s.badge, background: "#1e3a5f", color: "#93c5fd" }}>➕ Novo produto</span>
            {erro && <div style={s.erro}>{erro}</div>}
            <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12 }}>
              Código: <strong style={{ color: "#60a5fa" }}>{form.codigoBarras}</strong>
            </p>
            <p style={{ color: "#f59e0b", fontSize: 13, marginBottom: 16 }}>
              Produto não encontrado no catálogo. Preencha os dados para cadastrar:
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
            <input style={s.input} type="number" step="0.01" min="0" placeholder="0,00" value={form.preco || ""}
              onChange={e => setForm({ ...form, preco: parseFloat(e.target.value) || 0 })} />

            <label style={s.label}>Estoque (unidades)</label>
            <input style={s.input} type="number" min="0" placeholder="0" value={form.estoque || ""}
              onChange={e => setForm({ ...form, estoque: parseInt(e.target.value) || 0 })} />

            <label style={s.label}>Descrição (opcional)</label>
            <input style={s.input} placeholder="Ex: Analgésico e antipirético" value={form.descricao || ""}
              onChange={e => setForm({ ...form, descricao: e.target.value })} />

            <button style={s.btnVerde} onClick={salvar}>➕ Cadastrar Produto</button>
            <button style={s.btnCinza} onClick={() => setEtapa("inicio")}>← Cancelar</button>
          </div>
        )}

        {/* ── SUCESSO ── */}
        {etapa === "sucesso" && (
          <div style={s.sucesso}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#22c55e", marginBottom: 8 }}>Salvo com sucesso!</p>
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Produto atualizado no catálogo.</p>
          </div>
        )}

      </div>

      {/* ── INSTRUÇÃO DE INTEGRAÇÃO ── */}
      <div style={{ maxWidth: 420, margin: "16px auto", background: "#1e293b", borderRadius: 12, padding: 16, border: "1px solid #334155" }}>
        <p style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700, margin: "0 0 8px" }}>⚙️ INTEGRAÇÃO NO SEU ADMIN:</p>
        <pre style={{ color: "#94a3b8", fontSize: 11, margin: 0, whiteSpace: "pre-wrap" }}>{`// No seu arquivo Admin.tsx:
import BarcodeScanner from './BarcodeScanner'

// Dentro do componente:
<BarcodeScanner
  produtos={produtos}
  onSalvar={(p) => {
    // Salve no seu estado ou banco:
    setProdutos(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx >= 0) {
        const novo = [...prev]
        novo[idx] = p
        return novo
      }
      return [...prev, p]
    })
  }}
/>`}</pre>
      </div>
    </div>
  );
}
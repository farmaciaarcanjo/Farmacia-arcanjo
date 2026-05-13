import { useState } from "react";
import type { Produto } from "../data/produtos";

const f = "'Nunito', 'Segoe UI', sans-serif";

interface ModalPosologiaProps {
  produto: Produto | null;
  onConfirmar: (posologia: string) => void;
  onCancelar: () => void;
}

function ModalPosologia({ produto, onConfirmar, onCancelar }: ModalPosologiaProps) {
  const [posologia, setPosologia] = useState("");

  if (!produto) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 16,
    }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400, fontFamily: f }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0d47a1", marginBottom: 4 }}>
          🏷️ Posologia da Etiqueta
        </h3>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
          {produto.nome}
        </p>

        <label style={{ fontSize: 12, fontWeight: 700, color: "#555", display: "block", marginBottom: 6, textTransform: "uppercase" as const }}>
          Posologia (opcional)
        </label>
        <textarea
          placeholder="Ex: Tomar 1 comprimido 2x ao dia após as refeições"
          value={posologia}
          onChange={e => setPosologia(e.target.value)}
          rows={3}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 10,
            border: "2px solid #e0e0e0", fontSize: 13, fontFamily: f,
            outline: "none", resize: "none", boxSizing: "border-box" as const,
            marginBottom: 16,
          }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => onConfirmar(posologia)}
            style={{
              flex: 1, padding: 12, borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #0d47a1, #1565c0)",
              color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: f,
            }}>
            🖨️ Imprimir
          </button>
          <button
            onClick={onCancelar}
            style={{
              flex: 1, padding: 12, borderRadius: 12, border: "none",
              background: "#f5f5f5", color: "#555", fontSize: 14,
              fontWeight: 700, cursor: "pointer", fontFamily: f,
            }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GeradorEtiquetas({ produtos }: { produtos: Produto[] }) {
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set(produtos.map(p => p.id)));
  const [quantidade, setQuantidade] = useState(1);
  const [busca, setBusca] = useState("");
  const [modalProduto, setModalProduto] = useState<Produto | null>(null);
  const [posologiaGlobal, setPosologiaGlobal] = useState("");
  const [mostrarModalGlobal, setMostrarModalGlobal] = useState(false);
  const [listaParaImprimir, setListaParaImprimir] = useState<Produto[]>([]);

  const filtrados = busca.trim()
    ? produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
    : produtos;

  const totalSelecionados = produtos.filter(p => selecionados.has(p.id)).length;
  const todosSelecionados = totalSelecionados === produtos.length;

  function toggleProduto(id: number) {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (todosSelecionados) setSelecionados(new Set());
    else setSelecionados(new Set(produtos.map(p => p.id)));
  }

  function gerarEtiquetasHTML(lista: Produto[], qtd: number, posologia: string): string {
    const etiquetas = lista.flatMap(p => Array.from({ length: qtd }, () => p));
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Etiquetas — Farmácia Arcanjo</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Courier New', monospace; background: #fff; }
@page { size: 80mm auto; margin: 3mm; }
@media print { .no-print { display: none !important; } body { width: 74mm; } }
.info-bar { padding: 10px 14px; background: #e3f2fd; border-bottom: 1px solid #ccc; font-family: sans-serif; }
.info-bar button { margin-left: 10px; padding: 6px 14px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 700; }
.btn-print { background: #1565c0; color: #fff; }
.btn-close { background: #e0e0e0; color: #333; }
.lista { display: flex; flex-direction: column; gap: 4mm; padding: 3mm; width: 74mm; }
.etiqueta {
  border-bottom: 1px dashed #ccc;
  padding-bottom: 4mm;
  text-align: center;
  page-break-inside: avoid;
}
.etiqueta:last-child { border-bottom: none; }
.nome {
  font-size: 11pt;
  font-weight: bold;
  line-height: 1.3;
  margin-bottom: 2mm;
  word-break: break-word;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.posologia {
  font-size: 8pt;
  color: #333;
  margin-bottom: 2.5mm;
  line-height: 1.4;
  font-style: italic;
}
.preco {
  font-size: 22pt;
  font-weight: bold;
  margin-bottom: 1.5mm;
  letter-spacing: -0.5px;
}
.cod {
  font-size: 7pt;
  color: #666;
  margin-bottom: 1.5mm;
  letter-spacing: 0.5px;
}
.rodape {
  font-size: 7pt;
  color: #555;
  letter-spacing: 0.3px;
}
.separador {
  border: none;
  border-top: 1px dotted #999;
  margin: 1.5mm 0;
}
</style>
</head>
<body>
<div class="info-bar no-print">
  <strong>${etiquetas.length} etiqueta(s) gerada(s)</strong>
  <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
  <button class="btn-close" onclick="window.close()">✕ Fechar</button>
</div>
<div class="lista">
${etiquetas.map(p => `  <div class="etiqueta">
    <div class="nome">${p.nome}</div>
    ${posologia ? `<div class="posologia">${posologia}</div>` : ""}
    <hr class="separador">
    <div class="preco">R$ ${p.preco.toFixed(2).replace(".", ",")}</div>
    ${p.codigoBarras ? `<div class="cod">Cód: ${p.codigoBarras}</div>` : ""}
    <div class="rodape">Farmácia Arcanjo — Meruoca-CE</div>
  </div>`).join("\n")}
</div>
</body>
</html>`;
  }

  function imprimirLista(lista: Produto[], posologia: string) {
    if (lista.length === 0) return;
    const win = window.open("", "_blank");
    if (!win) { alert("Permita pop-ups para imprimir."); return; }
    win.document.write(gerarEtiquetasHTML(lista, quantidade, posologia));
    win.document.close();
  }

  // Imprimir todas com modal de posologia global
  function solicitarImpressaoLista(lista: Produto[]) {
    if (lista.length === 0) return;
    setListaParaImprimir(lista);
    setPosologiaGlobal("");
    setMostrarModalGlobal(true);
  }

  // Imprimir produto individual com modal
  function solicitarImpressaoIndividual(produto: Produto) {
    setModalProduto(produto);
  }

  const inputStyle: React.CSSProperties = {
    padding: "10px 12px", borderRadius: 10, border: "2px solid #e0e0e0",
    fontSize: 14, fontFamily: f, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ fontFamily: f }}>

      {/* Modal posologia individual */}
      {modalProduto && (
        <ModalPosologia
          produto={modalProduto}
          onConfirmar={(pos) => {
            imprimirLista([modalProduto], pos);
            setModalProduto(null);
          }}
          onCancelar={() => setModalProduto(null)}
        />
      )}

      {/* Modal posologia global (todas/selecionadas) */}
      {mostrarModalGlobal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: 16,
        }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400, fontFamily: f }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0d47a1", marginBottom: 4 }}>
              🏷️ Posologia das Etiquetas
            </h3>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
              {listaParaImprimir.length} produto(s) · {listaParaImprimir.length * quantidade} etiqueta(s)
            </p>

            <label style={{ fontSize: 12, fontWeight: 700, color: "#555", display: "block", marginBottom: 6, textTransform: "uppercase" as const }}>
              Posologia (opcional — aparece em todas as etiquetas)
            </label>
            <textarea
              placeholder="Ex: Tomar 1 comprimido 2x ao dia após as refeições"
              value={posologiaGlobal}
              onChange={e => setPosologiaGlobal(e.target.value)}
              rows={3}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10,
                border: "2px solid #e0e0e0", fontSize: 13, fontFamily: f,
                outline: "none", resize: "none", boxSizing: "border-box" as const,
                marginBottom: 16,
              }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  imprimirLista(listaParaImprimir, posologiaGlobal);
                  setMostrarModalGlobal(false);
                }}
                style={{
                  flex: 1, padding: 12, borderRadius: 12, border: "none",
                  background: "linear-gradient(135deg, #0d47a1, #1565c0)",
                  color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: f,
                }}>
                🖨️ Imprimir
              </button>
              <button
                onClick={() => setMostrarModalGlobal(false)}
                style={{
                  flex: 1, padding: 12, borderRadius: 12, border: "none",
                  background: "#f5f5f5", color: "#555", fontSize: 14,
                  fontWeight: 700, cursor: "pointer", fontFamily: f,
                }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ margin: "0 0 16px", color: "#0d47a1", fontSize: 16 }}>🏷️ Gerador de Etiquetas</h3>

      {/* Barra de ações */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginBottom: 16 }}>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>
            QUANTIDADE DE CÓPIAS POR ETIQUETA
          </label>
          <input type="number" min="1" max="99" value={quantidade}
            onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ ...inputStyle, width: 100, textAlign: "center", fontSize: 18, fontWeight: 700 }} />
          <span style={{ marginLeft: 10, fontSize: 13, color: "#888" }}>cópia(s) de cada produto selecionado</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            onClick={() => solicitarImpressaoLista(produtos)}
            style={{ padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #0d47a1, #1565c0)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: f }}>
            🏷️ Imprimir TODAS ({produtos.length * quantidade} etiq.)
          </button>
          <button
            onClick={() => solicitarImpressaoLista(produtos.filter(p => selecionados.has(p.id)))}
            disabled={totalSelecionados === 0}
            style={{ padding: "12px", borderRadius: 12, border: "none", background: totalSelecionados === 0 ? "#e0e0e0" : "linear-gradient(135deg, #2e7d32, #388e3c)", color: totalSelecionados === 0 ? "#aaa" : "#fff", fontSize: 13, fontWeight: 800, cursor: totalSelecionados === 0 ? "not-allowed" : "pointer", fontFamily: f }}>
            🖨️ Imprimir selecionadas ({totalSelecionados * quantidade})
          </button>
        </div>
      </div>

      {/* Filtro e lista */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#333" }}>
            <input type="checkbox" checked={todosSelecionados} onChange={toggleTodos}
              style={{ width: 17, height: 17, cursor: "pointer" }} />
            {todosSelecionados ? "Desmarcar todos" : "Selecionar todos"}
            <span style={{ fontSize: 11, color: "#888", fontWeight: 400 }}>({totalSelecionados}/{produtos.length})</span>
          </label>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Filtrar produto..."
            style={{ ...inputStyle, width: 180, padding: "8px 12px", fontSize: 13 }} />
        </div>

        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {filtrados.map(p => {
            const sel = selecionados.has(p.id);
            return (
              <div key={p.id}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, marginBottom: 4, background: sel ? "#e3f2fd" : "#f8f9fa", border: sel ? "2px solid #90caf9" : "2px solid transparent" }}>
                <input type="checkbox" checked={sel} onChange={() => toggleProduto(p.id)}
                  style={{ width: 17, height: 17, cursor: "pointer", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{p.emoji} {p.nome}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#1565c0", flexShrink: 0 }}>R$ {p.preco.toFixed(2).replace(".", ",")}</span>
                <button
                  onClick={() => solicitarImpressaoIndividual(p)}
                  title="Imprimir etiqueta deste produto"
                  style={{ padding: "5px 10px", borderRadius: 8, border: "none", background: "#e3f2fd", color: "#1565c0", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                  🏷️
                </button>
              </div>
            );
          })}
          {filtrados.length === 0 && (
            <div style={{ textAlign: "center", color: "#aaa", padding: 24 }}>Nenhum produto encontrado</div>
          )}
        </div>
      </div>

      {/* Preview */}
      <div style={{ marginTop: 16, padding: 14, background: "#f5f5f5", borderRadius: 14 }}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 8, fontWeight: 700 }}>PRÉVIA DA ETIQUETA (80mm):</div>
        <div style={{ display: "inline-block", padding: "8px 10px", textAlign: "center", width: 160, background: "#fff", borderBottom: "1px dashed #ccc" }}>
          <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, fontFamily: "monospace", textTransform: "uppercase" as const }}>NOME DO PRODUTO</div>
          <div style={{ fontSize: 9, color: "#555", fontFamily: "monospace", fontStyle: "italic", marginBottom: 4 }}>Tomar 1 comprimido 2x ao dia</div>
          <div style={{ borderTop: "1px dotted #999", margin: "4px 0" }} />
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "monospace", marginBottom: 3 }}>R$ 0,00</div>
          <div style={{ fontSize: 8, color: "#555", fontFamily: "monospace" }}>Farmácia Arcanjo — Meruoca-CE</div>
        </div>
        <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>📄 Uma etiqueta por linha · posologia editável · 80mm</div>
      </div>
    </div>
  );
}

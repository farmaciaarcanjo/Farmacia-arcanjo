import React, { useState, useEffect, useRef } from "react";
import { salvarPedidoCaixaFirebase, type PedidoFirebase } from "../lib/firebase";
import { registrarCompraCliente } from "./CadastroClientes";

const CHAVE_PEDIDOS = "farmacia_arcanjo_pedidos";
function salvarPedidoLocal(pedido: PedidoFirebase) {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE_PEDIDOS) || "[]");
    localStorage.setItem(CHAVE_PEDIDOS, JSON.stringify([pedido, ...lista]));
  } catch {}
}

interface Produto {
  id: string;
  nome: string;
  preco: number;
  estoque?: number;
}

interface ClienteSimples {
  id: string;
  nome: string;
  telefone: string;
}

interface Props {
  produtos: Produto[];
  onAtualizarEstoque: (produtos: Produto[]) => void;
}

const s = {
  container: { minHeight: "100vh", background: "#0f172a", padding: "20px", color: "#e2e8f0" },
  header: { fontSize: 22, fontWeight: "bold", color: "#4ade80", marginBottom: 20 },
  card: { background: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 16 },
  label: { fontSize: 13, color: "#94a3b8", marginBottom: 4 },
  input: { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 15, boxSizing: "border-box" as const },
  btn: { borderRadius: 8, padding: "12px 20px", fontWeight: "bold", fontSize: 15, border: "none", cursor: "pointer", width: "100%" },
  btnGreen: { background: "#4ade80", color: "#0f172a" },
  btnGray: { background: "#334155", color: "#e2e8f0" },
  row: { display: "flex", gap: 8, marginBottom: 8 },
  total: { fontSize: 28, fontWeight: "bold", color: "#4ade80" },
  tag: { display: "inline-block", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: "bold" },
};

const fmtMoeda = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

function carregarClientes(): ClienteSimples[] {
  try {
    const raw = JSON.parse(localStorage.getItem("farmacia_arcanjo_clientes") || "[]");
    return (raw as ClienteSimples[]).map(c => ({ id: c.id, nome: c.nome, telefone: c.telefone }));
  } catch { return []; }
}

export default function FechamentoCaixa({ produtos, onAtualizarEstoque }: Props) {
  const [itens, setItens] = useState<{ produto: Produto; qtd: number }[]>([]);
  const [busca, setBusca] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [valorRecebido, setValorRecebido] = useState("");
  const [fechado, setFechado] = useState(false);

  // Cliente
  const [clientes, setClientes] = useState<ClienteSimples[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteSimples | null>(null);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const clienteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setClientes(carregarClientes());
  }, []);

  const clientesFiltrados = buscaCliente.trim().length >= 1
    ? clientes.filter(c =>
        c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) ||
        c.telefone.includes(buscaCliente)
      ).slice(0, 6)
    : [];

  const produtosFiltrados = produtos.filter(
    (p) => p.nome.toLowerCase().includes(busca.toLowerCase()) && (p.estoque ?? 1) > 0
  );

  const total = itens.reduce((acc, i) => acc + i.produto.preco * i.qtd, 0);

  function adicionarItem(produto: Produto) {
    setItens((prev) => {
      const existe = prev.find((i) => i.produto.id === produto.id);
      if (existe) {
        return prev.map((i) =>
          i.produto.id === produto.id ? { ...i, qtd: i.qtd + 1 } : i
        );
      }
      return [...prev, { produto, qtd: 1 }];
    });
    setBusca("");
  }

  function removerItem(id: string) {
    setItens((prev) => prev.filter((i) => i.produto.id !== id));
  }

  function selecionarCliente(c: ClienteSimples) {
    setClienteSelecionado(c);
    setBuscaCliente(c.nome);
    setMostrarDropdown(false);
  }

  function limparCliente() {
    setClienteSelecionado(null);
    setBuscaCliente("");
  }

  function finalizarVenda() {
    const novos = produtos.map((p) => {
      const item = itens.find((i) => i.produto.id === p.id);
      if (item) return { ...p, quantidade: (p.estoque ?? 0) - item.qtd };
      return p;
    });
    onAtualizarEstoque(novos);

    const nomeCliente = clienteSelecionado?.nome || (buscaCliente.trim() || undefined);

    const pedido: PedidoFirebase = {
      id: Date.now().toString(),
      data: new Date().toISOString(),
      cliente: nomeCliente,
      itens: itens.map(i => ({
        produtoId: i.produto.id,
        nome: i.produto.nome,
        quantidade: i.qtd,
        precoUnitario: i.produto.preco,
      })),
      total,
      formaPagamento,
      status: "concluido",
    };
    salvarPedidoLocal(pedido);
    salvarPedidoCaixaFirebase(pedido);

    // Registrar compra no histórico do cliente (se vinculado via cadastro)
    if (clienteSelecionado?.telefone) {
      registrarCompraCliente(clienteSelecionado.telefone, {
        data: pedido.data,
        itens: itens.map(i => `${i.produto.nome} (${i.qtd}x)`),
        total,
      });
    }

    setFechado(true);
  }

  function novaVenda() {
    setItens([]);
    setBusca("");
    setFormaPagamento("dinheiro");
    setValorRecebido("");
    setFechado(false);
    setClienteSelecionado(null);
    setBuscaCliente("");
  }

  if (fechado) {
    return (
      <div style={s.container}>
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: "#4ade80", marginBottom: 8 }}>
            Venda Finalizada!
          </div>
          {clienteSelecionado && (
            <div style={{ color: "#93c5fd", marginBottom: 8, fontSize: 15 }}>
              👤 {clienteSelecionado.nome}
            </div>
          )}
          <div style={{ color: "#94a3b8", marginBottom: 8 }}>Total: {fmtMoeda(total)}</div>
          {formaPagamento === "dinheiro" && parseFloat(valorRecebido) > 0 && (
            <div style={{ color: "#4ade80", marginBottom: 24 }}>
              Troco: {fmtMoeda(Math.max(0, parseFloat(valorRecebido) - total))}
            </div>
          )}
          <button style={{ ...s.btn, ...s.btnGreen }} onClick={novaVenda}>
            Nova Venda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.header}>🧾 Fechamento de Caixa</div>

      {/* Campo Cliente */}
      <div style={s.card}>
        <div style={s.label}>👤 Cliente (opcional)</div>
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              ref={clienteInputRef}
              style={{ ...s.input, flex: 1, borderColor: clienteSelecionado ? "#4ade80" : "#334155" }}
              placeholder="Buscar cliente cadastrado ou digitar nome..."
              value={buscaCliente}
              onChange={(e) => {
                setBuscaCliente(e.target.value);
                setClienteSelecionado(null);
                setMostrarDropdown(true);
              }}
              onFocus={() => setMostrarDropdown(true)}
              onBlur={() => setTimeout(() => setMostrarDropdown(false), 150)}
            />
            {buscaCliente && (
              <button
                onClick={limparCliente}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, padding: "0 4px", flexShrink: 0 }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Dropdown de clientes */}
          {mostrarDropdown && clientesFiltrados.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, zIndex: 50, marginTop: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
              {clientesFiltrados.map(c => (
                <div
                  key={c.id}
                  onMouseDown={() => selecionarCliente(c)}
                  style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #0f172a", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#334155")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{c.nome}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.telefone}</div>
                  </div>
                  <span style={{ fontSize: 18 }}>👤</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {clienteSelecionado && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: "#14532d", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#86efac" }}>{clienteSelecionado.nome}</div>
              <div style={{ fontSize: 11, color: "#4ade80" }}>{clienteSelecionado.telefone} — histórico será atualizado</div>
            </div>
          </div>
        )}
      </div>

      {/* Busca produto */}
      <div style={s.card}>
        <div style={s.label}>Buscar Produto</div>
        <input
          style={s.input}
          placeholder="Digite o nome do produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {busca.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {produtosFiltrados.slice(0, 5).map((p) => (
              <div
                key={p.id}
                onClick={() => adicionarItem(p)}
                style={{ ...s.card, cursor: "pointer", marginBottom: 6, display: "flex", justifyContent: "space-between" }}
              >
                <span>{p.nome}</span>
                <span style={{ color: "#4ade80" }}>{fmtMoeda(p.preco)}</span>
              </div>
            ))}
            {produtosFiltrados.length === 0 && (
              <div style={{ color: "#94a3b8", fontSize: 13 }}>Nenhum produto encontrado</div>
            )}
          </div>
        )}
      </div>

      {/* Itens da venda */}
      {itens.length > 0 && (
        <div style={s.card}>
          <div style={s.label}>Itens da Venda</div>
          {itens.map((item) => (
            <div key={item.produto.id} style={{ ...s.row, justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14 }}>{item.produto.nome}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  {item.qtd}x {fmtMoeda(item.produto.preco)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "#4ade80" }}>{fmtMoeda(item.produto.preco * item.qtd)}</span>
                <button
                  onClick={() => removerItem(item.produto.id)}
                  style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 18 }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <div style={{ borderTop: "1px solid #334155", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Total</span>
            <span style={s.total}>{fmtMoeda(total)}</span>
          </div>
        </div>
      )}

      {/* Forma de pagamento */}
      {itens.length > 0 && (
        <div style={s.card}>
          <div style={s.label}>Forma de Pagamento</div>
          <div style={s.row}>
            {["dinheiro", "pix", "cartão"].map((t) => (
              <button
                key={t}
                style={{
                  ...s.btn,
                  ...(formaPagamento === t ? s.btnGreen : s.btnGray),
                  flex: "none",
                  padding: "10px 12px",
                }}
                onClick={() => setFormaPagamento(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {formaPagamento === "dinheiro" && (
            <>
              <div style={{ ...s.label, marginTop: 12 }}>Valor Recebido (R$)</div>
              <input
                style={s.input}
                type="number"
                step="0.01"
                placeholder="Ex: 50.00"
                value={valorRecebido}
                onChange={(e) => setValorRecebido(e.target.value)}
              />
              {parseFloat(valorRecebido) > 0 && (
                <div style={{ ...s.card, background: "#1e3a5f", marginTop: 12, marginBottom: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, color: "#bfdbfe" }}>
                    Troco:{" "}
                    <strong style={{ color: "#4ade80", fontSize: 18 }}>
                      {fmtMoeda(Math.max(0, parseFloat(valorRecebido) - total))}
                    </strong>
                  </p>
                </div>
              )}
            </>
          )}

          <button
            style={{ ...s.btn, ...s.btnGreen, marginTop: 16 }}
            onClick={finalizarVenda}
            disabled={itens.length === 0}
          >
            ✅ Finalizar Venda {clienteSelecionado ? `— ${clienteSelecionado.nome}` : ""}
          </button>
        </div>
      )}

      {itens.length === 0 && (
        <div style={{ textAlign: "center", color: "#94a3b8", marginTop: 40 }}>
          <div style={{ fontSize: 40 }}>🛒</div>
          <div>Busque um produto para começar</div>
        </div>
      )}
    </div>
  );
}

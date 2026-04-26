import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection, getDocs, addDoc, setDoc, doc, deleteDoc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import type { Produto } from "../data/produtos";

export type CategoriaContas = "Luz" | "Água" | "Aluguel" | "Funcionário" | "Fornecedor" | "Outro";
export type StatusContas = "Pendente" | "Pago" | "Atrasado";

export interface ContaPagar {
  id: string;
  nome: string;
  valor: number;
  vencimento: string;
  categoria: CategoriaContas;
  status: StatusContas;
  criadoEm?: number;
  recorrenteKey?: string;
}

export interface ContaRecorrente {
  id: string;
  nome: string;
  valor: number;
  diaVencimento: number;
  categoria: CategoriaContas;
}

export interface Fornecedor {
  id: string;
  nome: string;
  telefone: string;
  produto: string;
}

interface PedidoFirestore {
  total: number;
  itens?: Array<{ produto: string; quantidade: number; precoUnitario: number }>;
  createdAt?: { toDate: () => Date } | null;
}

const corStatus: Record<StatusContas, string> = { Pendente: "#f57f17", Pago: "#2e7d32", Atrasado: "#c62828" };
const bgStatus: Record<StatusContas, string> = { Pendente: "#fff9c4", Pago: "#e8f5e9", Atrasado: "#ffebee" };
const f = "'Nunito', 'Segoe UI', sans-serif";

export default function Financeiro({ produtos }: { produtos: Produto[] }) {
  type Aba = "caixa" | "contas" | "dre" | "fornecedores" | "produtos";
  const [aba, setAba] = useState<Aba>("caixa");

  const [caixa, setCaixa] = useState(0);
  const [caixaEdit, setCaixaEdit] = useState("0");
  const [salvandoCaixa, setSalvandoCaixa] = useState(false);
  const [msgCaixa, setMsgCaixa] = useState("");

  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [carregandoContas, setCarregandoContas] = useState(true);
  const [formConta, setFormConta] = useState<Omit<ContaPagar, "id">>({
    nome: "", valor: 0, vencimento: "", categoria: "Outro", status: "Pendente",
  });
  const [mostrarFormConta, setMostrarFormConta] = useState(false);
  const [editandoConta, setEditandoConta] = useState<string | null>(null);
  const [salvandoConta, setSalvandoConta] = useState(false);
  const [msgConta, setMsgConta] = useState("");

  const [recorrentes, setRecorrentes] = useState<ContaRecorrente[]>([]);
  const [formRec, setFormRec] = useState<Omit<ContaRecorrente, "id">>({ nome: "", valor: 0, diaVencimento: 5, categoria: "Outro" });
  const [mostrarFormRec, setMostrarFormRec] = useState(false);
  const [salvandoRec, setSalvandoRec] = useState(false);
  const [msgRec, setMsgRec] = useState("");
  const [lancarRecMes, setLancarRecMes] = useState<Record<string, boolean>>({});

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [carregandoFornecedores, setCarregandoFornecedores] = useState(true);
  const [formForn, setFormForn] = useState({ nome: "", telefone: "", produto: "" });
  const [mostrarFormForn, setMostrarFormForn] = useState(false);

  const [pedidosMes, setPedidosMes] = useState<PedidoFirestore[]>([]);
  const [carregandoDRE, setCarregandoDRE] = useState(true);

  useEffect(() => {
    carregarCaixa();
    carregarContas();
    carregarRecorrentes();
    carregarFornecedores();
    carregarPedidosMes();
  }, []);

  async function carregarCaixa() {
    try {
      const snap = await getDocs(collection(db, "caixa_atual"));
      if (!snap.empty) {
        const saldo = Number(snap.docs[0].data().saldo ?? 0);
        setCaixa(saldo);
        setCaixaEdit(String(saldo));
      }
    } catch {}
  }

  async function salvarCaixa() {
    setSalvandoCaixa(true);
    setMsgCaixa("");
    try {
      const saldo = parseFloat(caixaEdit) || 0;
      await setDoc(doc(db, "caixa_atual", "saldo"), { saldo, atualizadoEm: serverTimestamp() });
      setCaixa(saldo);
      setMsgCaixa("✅ Caixa atualizado!");
    } catch {
      setMsgCaixa("❌ Erro ao salvar.");
    }
    setSalvandoCaixa(false);
    setTimeout(() => setMsgCaixa(""), 2500);
  }

  async function carregarContas() {
    setCarregandoContas(true);
    try {
      const q = query(collection(db, "contas_pagar"), orderBy("vencimento", "asc"));
      const snap = await getDocs(q);
      setContas(snap.docs.map(d => ({ id: d.id, ...d.data() } as ContaPagar)));
    } catch {}
    setCarregandoContas(false);
  }

  async function salvarConta() {
    if (!formConta.nome.trim() || !formConta.valor || !formConta.vencimento) {
      setMsgConta("❌ Preencha Descrição, Valor e Vencimento.");
      setTimeout(() => setMsgConta(""), 3000);
      return;
    }
    setSalvandoConta(true);
    setMsgConta("");
    try {
      if (editandoConta) {
        await setDoc(doc(db, "contas_pagar", editandoConta), { ...formConta, atualizadoEm: serverTimestamp() });
        setContas(prev => prev.map(c => c.id === editandoConta ? { ...formConta, id: editandoConta } : c));
      } else {
        const ref = await addDoc(collection(db, "contas_pagar"), {
          ...formConta, criadoEm: Date.now(), createdAt: serverTimestamp(),
        });
        setContas(prev => [...prev, { ...formConta, id: ref.id }]);
      }
      setFormConta({ nome: "", valor: 0, vencimento: "", categoria: "Outro", status: "Pendente" });
      setEditandoConta(null);
      setMostrarFormConta(false);
      setMsgConta("✅ Conta salva com sucesso!");
      setTimeout(() => setMsgConta(""), 3000);
    } catch (err) {
      console.error("Erro ao salvar conta:", err);
      setMsgConta("❌ Erro ao salvar. Verifique sua conexão.");
      setTimeout(() => setMsgConta(""), 4000);
    }
    setSalvandoConta(false);
  }

  async function deletarConta(id: string) {
    if (!window.confirm("Remover esta conta?")) return;
    await deleteDoc(doc(db, "contas_pagar", id));
    setContas(prev => prev.filter(c => c.id !== id));
  }

  function editarConta(c: ContaPagar) {
    setFormConta({ nome: c.nome, valor: c.valor, vencimento: c.vencimento, categoria: c.categoria, status: c.status });
    setEditandoConta(c.id);
    setMostrarFormConta(true);
    window.scrollTo(0, 0);
  }

  async function carregarRecorrentes() {
    try {
      const snap = await getDocs(collection(db, "contas_recorrentes"));
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() } as ContaRecorrente));
      setRecorrentes(lista);
      // auto-lançar para o mês atual
      const agora = new Date();
      const ano = agora.getFullYear();
      const mes = String(agora.getMonth() + 1).padStart(2, "0");
      const contasSnap = await getDocs(collection(db, "contas_pagar"));
      const contasExistentes = contasSnap.docs.map(d => d.data() as ContaPagar);
      for (const r of lista) {
        const chave = `rec_${r.id}_${ano}_${mes}`;
        const jaExiste = contasExistentes.some(c => c.recorrenteKey === chave);
        if (!jaExiste) {
          const dia = String(Math.min(r.diaVencimento, 28)).padStart(2, "0");
          const venc = `${ano}-${mes}-${dia}`;
          await addDoc(collection(db, "contas_pagar"), {
            nome: r.nome, valor: r.valor, vencimento: venc,
            categoria: r.categoria, status: "Pendente",
            recorrenteKey: chave, criadoEm: Date.now(), createdAt: serverTimestamp(),
          });
        }
      }
    } catch (err) { console.error("Erro ao carregar recorrentes:", err); }
  }

  async function salvarRecorrente() {
    if (!formRec.nome.trim() || !formRec.valor || !formRec.diaVencimento) {
      setMsgRec("❌ Preencha todos os campos.");
      setTimeout(() => setMsgRec(""), 3000);
      return;
    }
    setSalvandoRec(true);
    try {
      const ref = await addDoc(collection(db, "contas_recorrentes"), { ...formRec, criadoEm: serverTimestamp() });
      const nova: ContaRecorrente = { id: ref.id, ...formRec };
      setRecorrentes(prev => [...prev, nova]);
      // lançar para o mês atual imediatamente
      const agora = new Date();
      const ano = agora.getFullYear();
      const mes = String(agora.getMonth() + 1).padStart(2, "0");
      const dia = String(Math.min(formRec.diaVencimento, 28)).padStart(2, "0");
      const chave = `rec_${ref.id}_${ano}_${mes}`;
      const contaRef = await addDoc(collection(db, "contas_pagar"), {
        nome: formRec.nome, valor: formRec.valor, vencimento: `${ano}-${mes}-${dia}`,
        categoria: formRec.categoria, status: "Pendente",
        recorrenteKey: chave, criadoEm: Date.now(), createdAt: serverTimestamp(),
      });
      setContas(prev => [...prev, { id: contaRef.id, nome: formRec.nome, valor: formRec.valor, vencimento: `${ano}-${mes}-${dia}`, categoria: formRec.categoria, status: "Pendente", recorrenteKey: chave }]);
      setFormRec({ nome: "", valor: 0, diaVencimento: 5, categoria: "Outro" });
      setMostrarFormRec(false);
      setMsgRec("✅ Conta fixa salva e lançada no mês atual!");
      setTimeout(() => setMsgRec(""), 3500);
    } catch (err) {
      console.error("Erro ao salvar recorrente:", err);
      setMsgRec("❌ Erro ao salvar. Verifique conexão.");
      setTimeout(() => setMsgRec(""), 4000);
    }
    setSalvandoRec(false);
  }

  async function deletarRecorrente(id: string) {
    if (!window.confirm("Remover esta conta fixa? Ela não será mais lançada automaticamente.")) return;
    try {
      await deleteDoc(doc(db, "contas_recorrentes", id));
      setRecorrentes(prev => prev.filter(r => r.id !== id));
    } catch {}
  }

  async function lancarRecorrenteMesAtual(r: ContaRecorrente) {
    setLancarRecMes(prev => ({ ...prev, [r.id]: true }));
    try {
      const agora = new Date();
      const ano = agora.getFullYear();
      const mes = String(agora.getMonth() + 1).padStart(2, "0");
      const dia = String(Math.min(r.diaVencimento, 28)).padStart(2, "0");
      const chave = `rec_${r.id}_${ano}_${mes}`;
      const jaExiste = contas.some(c => c.recorrenteKey === chave);
      if (jaExiste) {
        alert("Esta conta já foi lançada neste mês!");
      } else {
        const ref = await addDoc(collection(db, "contas_pagar"), {
          nome: r.nome, valor: r.valor, vencimento: `${ano}-${mes}-${dia}`,
          categoria: r.categoria, status: "Pendente",
          recorrenteKey: chave, criadoEm: Date.now(), createdAt: serverTimestamp(),
        });
        setContas(prev => [...prev, { id: ref.id, nome: r.nome, valor: r.valor, vencimento: `${ano}-${mes}-${dia}`, categoria: r.categoria, status: "Pendente", recorrenteKey: chave }]);
      }
    } catch {}
    setLancarRecMes(prev => ({ ...prev, [r.id]: false }));
  }

  async function alterarStatus(c: ContaPagar, novoStatus: StatusContas) {
    try {
      await setDoc(doc(db, "contas_pagar", c.id), { ...c, id: undefined, status: novoStatus, atualizadoEm: serverTimestamp() });
      setContas(prev => prev.map(x => x.id === c.id ? { ...x, status: novoStatus } : x));
    } catch {}
  }

  async function carregarFornecedores() {
    setCarregandoFornecedores(true);
    try {
      const snap = await getDocs(collection(db, "fornecedores"));
      setFornecedores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Fornecedor)));
    } catch {}
    setCarregandoFornecedores(false);
  }

  async function salvarFornecedor() {
    if (!formForn.nome.trim()) return;
    try {
      const ref = await addDoc(collection(db, "fornecedores"), { ...formForn, createdAt: serverTimestamp() });
      setFornecedores(prev => [...prev, { id: ref.id, ...formForn }]);
      setFormForn({ nome: "", telefone: "", produto: "" });
      setMostrarFormForn(false);
    } catch {}
  }

  async function deletarFornecedor(id: string) {
    if (!window.confirm("Remover fornecedor?")) return;
    await deleteDoc(doc(db, "fornecedores", id));
    setFornecedores(prev => prev.filter(x => x.id !== id));
  }

  async function carregarPedidosMes() {
    setCarregandoDRE(true);
    try {
      const snap = await getDocs(collection(db, "pedidos"));
      const agora = new Date();
      const mes = agora.getMonth();
      const ano = agora.getFullYear();
      const pedidos = snap.docs
        .map(d => d.data() as PedidoFirestore)
        .filter(p => {
          if (!p.createdAt) return false;
          const d = p.createdAt.toDate();
          return d.getMonth() === mes && d.getFullYear() === ano;
        });
      setPedidosMes(pedidos);
    } catch {}
    setCarregandoDRE(false);
  }

  const faturamento = pedidosMes.reduce((acc, p) => acc + (p.total || 0), 0);

  const custoMercadorias = pedidosMes.reduce((acc, p) => {
    return acc + (p.itens || []).reduce((a, item) => {
      const prod = produtos.find(x => x.nome === item.produto);
      const custo = prod?.precoCusto ?? 0;
      return a + custo * item.quantidade;
    }, 0);
  }, 0);

  const mesAtual = new Date().toISOString().slice(0, 7);
  const despesasPagas = contas
    .filter(c => c.status === "Pago" && c.vencimento.startsWith(mesAtual))
    .reduce((a, c) => a + c.valor, 0);

  const lucroLiquido = faturamento - custoMercadorias - despesasPagas;

  const totalPendente = contas
    .filter(c => c.status === "Pendente" || c.status === "Atrasado")
    .reduce((a, c) => a + c.valor, 0);

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: "2px solid #e0e0e0",
    fontSize: 14, fontFamily: f, outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: "#555", display: "block", marginBottom: 4,
  };
  const btnPrimary: React.CSSProperties = {
    width: "100%", padding: "12px", borderRadius: 12, border: "none",
    background: "linear-gradient(135deg, #0d47a1, #1565c0)", color: "#fff",
    fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: f,
  };

  return (
    <div style={{ fontFamily: f }}>
      {/* ── Resumo ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "12px 16px 0", background: "#f8f9fa" }}>
        <div style={{ background: "#e3f2fd", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#1565c0", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Caixa Atual</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0d47a1", marginTop: 2 }}>{fmt(caixa)}</div>
        </div>
        <div style={{ background: totalPendente > 0 ? "#fff9c4" : "#e8f5e9", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#e65100", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Pendente</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#e65100", marginTop: 2 }}>{fmt(totalPendente)}</div>
        </div>
        <div style={{ background: lucroLiquido >= 0 ? "#e8f5e9" : "#ffebee", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#2e7d32", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Lucro Mês</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: lucroLiquido >= 0 ? "#1b5e20" : "#c62828", marginTop: 2 }}>{fmt(lucroLiquido)}</div>
        </div>
      </div>

      {/* ── Abas ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", borderBottom: "2px solid #e0e0e0", background: "#fff", marginTop: 12 }}>
        {([ { id: "caixa", label: "💰 Caixa" }, { id: "contas", label: "📋 Contas" }, { id: "dre", label: "📊 DRE" }, { id: "fornecedores", label: "🤝 Fornec." }, { id: "produtos", label: "📦 Prod." } ] as { id: Aba; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setAba(t.id)}
            style={{ padding: "10px 2px", border: "none", background: "none", fontSize: 11, fontWeight: aba === t.id ? 800 : 600, color: aba === t.id ? "#1565c0" : "#888", borderBottom: aba === t.id ? "3px solid #1565c0" : "3px solid transparent", cursor: "pointer", fontFamily: f }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>

        {/* ══ ABA CAIXA ══ */}
        {aba === "caixa" && (
          <div>
            <h3 style={{ margin: "0 0 16px", color: "#0d47a1", fontSize: 16 }}>💰 Saldo em Caixa</h3>
            <div style={{ background: "#e3f2fd", borderRadius: 16, padding: 20, textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#1565c0", fontWeight: 700, marginBottom: 4 }}>Dinheiro físico agora</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#0d47a1" }}>{fmt(caixa)}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <label style={labelStyle}>Novo valor do caixa (R$)</label>
              <input type="number" step="0.01" min="0" value={caixaEdit}
                onChange={e => setCaixaEdit(e.target.value)}
                style={{ ...inputStyle, fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 12 }} />
              <button onClick={salvarCaixa} disabled={salvandoCaixa} style={btnPrimary}>
                {salvandoCaixa ? "⏳ Salvando..." : "💾 Atualizar Caixa"}
              </button>
              {msgCaixa && <div style={{ marginTop: 10, textAlign: "center", fontWeight: 700, color: msgCaixa.startsWith("✅") ? "#2e7d32" : "#c62828" }}>{msgCaixa}</div>}
            </div>
          </div>
        )}

        {/* ══ ABA CONTAS A PAGAR ══ */}
        {aba === "contas" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#0d47a1", fontSize: 16 }}>📋 Contas a Pagar</h3>
              <button onClick={() => { setMostrarFormConta(!mostrarFormConta); setEditandoConta(null); setFormConta({ nome: "", valor: 0, vencimento: "", categoria: "Outro", status: "Pendente" }); }}
                style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: mostrarFormConta ? "#e0e0e0" : "#1565c0", color: mostrarFormConta ? "#333" : "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: f }}>
                {mostrarFormConta && !editandoConta ? "✕ Fechar" : "+ Nova conta"}
              </button>
            </div>

            {mostrarFormConta && (
              <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginBottom: 16 }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Descrição *</label>
                  <input value={formConta.nome} onChange={e => setFormConta(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Ex: Conta de luz junho" style={inputStyle} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>Valor (R$) *</label>
                    <input type="number" step="0.01" min="0" value={formConta.valor || ""}
                      onChange={e => setFormConta(p => ({ ...p, valor: parseFloat(e.target.value) || 0 }))}
                      placeholder="0,00" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Vencimento *</label>
                    <input type="date" value={formConta.vencimento}
                      onChange={e => setFormConta(p => ({ ...p, vencimento: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Categoria</label>
                    <select value={formConta.categoria} onChange={e => setFormConta(p => ({ ...p, categoria: e.target.value as CategoriaContas }))} style={inputStyle}>
                      {["Luz", "Água", "Aluguel", "Funcionário", "Fornecedor", "Outro"].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select value={formConta.status} onChange={e => setFormConta(p => ({ ...p, status: e.target.value as StatusContas }))} style={inputStyle}>
                      {["Pendente", "Pago", "Atrasado"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={salvarConta} disabled={salvandoConta} style={{ ...btnPrimary, opacity: salvandoConta ? 0.7 : 1 }}>
                  {salvandoConta ? "⏳ Salvando..." : editandoConta ? "💾 Salvar alterações" : "✅ Adicionar conta"}
                </button>
                {msgConta && (
                  <div style={{ marginTop: 10, textAlign: "center", fontWeight: 700, fontSize: 13, color: msgConta.startsWith("✅") ? "#2e7d32" : "#c62828" }}>
                    {msgConta}
                  </div>
                )}
                {editandoConta && (
                  <button onClick={() => { setMostrarFormConta(false); setEditandoConta(null); setFormConta({ nome: "", valor: 0, vencimento: "", categoria: "Outro", status: "Pendente" }); }}
                    style={{ ...btnPrimary, background: "#e0e0e0", color: "#333", marginTop: 8 }}>
                    ✕ Cancelar edição
                  </button>
                )}
              </div>
            )}

            {carregandoContas ? (
              <div style={{ textAlign: "center", color: "#888", padding: 24 }}>⏳ Carregando...</div>
            ) : contas.length === 0 ? (
              <div style={{ textAlign: "center", color: "#aaa", padding: 24 }}>Nenhuma conta cadastrada</div>
            ) : contas.map(c => (
              <div key={c.id} style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", marginBottom: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, marginRight: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{c.nome}</span>
                      {c.recorrenteKey && <span style={{ fontSize: 9, background: "#e8eaf6", color: "#3949ab", borderRadius: 8, padding: "2px 6px", fontWeight: 700 }}>🔄 FIXA</span>}
                    </div>
                    <div style={{ fontSize: 14, color: "#1565c0", fontWeight: 700, marginTop: 2 }}>{fmt(c.valor)}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>📅 {c.vencimento} · {c.categoria}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span style={{ background: bgStatus[c.status], color: corStatus[c.status], borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{c.status}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {c.status !== "Pago" && (
                        <button onClick={() => alterarStatus(c, "Pago")}
                          style={{ padding: "4px 8px", borderRadius: 8, border: "none", background: "#e8f5e9", color: "#2e7d32", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✓ Pago</button>
                      )}
                      <button onClick={() => editarConta(c)}
                        style={{ padding: "4px 8px", borderRadius: 8, border: "none", background: "#e3f2fd", color: "#1565c0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✏️</button>
                      <button onClick={() => deletarConta(c.id)}
                        style={{ padding: "4px 8px", borderRadius: 8, border: "none", background: "#ffebee", color: "#c62828", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🗑️</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* ── Seção Contas Fixas ── */}
            <div style={{ marginTop: 24, borderTop: "2px dashed #e8eaf6", paddingTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <h4 style={{ margin: 0, color: "#3949ab", fontSize: 15 }}>🔄 Contas Fixas Mensais</h4>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Lançadas automaticamente todo mês</div>
                </div>
                <button onClick={() => setMostrarFormRec(!mostrarFormRec)}
                  style={{ padding: "7px 13px", borderRadius: 20, border: "none", background: mostrarFormRec ? "#e0e0e0" : "#3949ab", color: mostrarFormRec ? "#333" : "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: f }}>
                  {mostrarFormRec ? "✕ Fechar" : "+ Nova fixa"}
                </button>
              </div>

              {mostrarFormRec && (
                <div style={{ background: "#f3f4fd", borderRadius: 14, padding: 16, marginBottom: 14, border: "2px solid #c5cae9" }}>
                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Descrição *</label>
                    <input value={formRec.nome} onChange={e => setFormRec(p => ({ ...p, nome: e.target.value }))}
                      placeholder="Ex: Aluguel do ponto" style={inputStyle} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={labelStyle}>Valor (R$) *</label>
                      <input type="number" step="0.01" min="0" value={formRec.valor || ""}
                        onChange={e => setFormRec(p => ({ ...p, valor: parseFloat(e.target.value) || 0 }))}
                        placeholder="0,00" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Dia do vencimento *</label>
                      <input type="number" min="1" max="28" value={formRec.diaVencimento || ""}
                        onChange={e => setFormRec(p => ({ ...p, diaVencimento: parseInt(e.target.value) || 1 }))}
                        placeholder="Ex: 5" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Categoria</label>
                    <select value={formRec.categoria} onChange={e => setFormRec(p => ({ ...p, categoria: e.target.value as CategoriaContas }))} style={inputStyle}>
                      {["Luz", "Água", "Aluguel", "Funcionário", "Fornecedor", "Outro"].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <button onClick={salvarRecorrente} disabled={salvandoRec} style={{ ...btnPrimary, background: salvandoRec ? "#9fa8da" : "linear-gradient(135deg, #283593, #3949ab)", opacity: salvandoRec ? 0.8 : 1 }}>
                    {salvandoRec ? "⏳ Salvando..." : "✅ Salvar conta fixa"}
                  </button>
                  {msgRec && <div style={{ marginTop: 10, textAlign: "center", fontWeight: 700, fontSize: 13, color: msgRec.startsWith("✅") ? "#2e7d32" : "#c62828" }}>{msgRec}</div>}
                </div>
              )}

              {recorrentes.length === 0 ? (
                <div style={{ textAlign: "center", color: "#aaa", padding: 16, fontSize: 13 }}>Nenhuma conta fixa cadastrada</div>
              ) : recorrentes.map(r => {
                const agora = new Date();
                const ano = agora.getFullYear();
                const mes = String(agora.getMonth() + 1).padStart(2, "0");
                const chave = `rec_${r.id}_${ano}_${mes}`;
                const jaLancada = contas.some(c => c.recorrenteKey === chave);
                return (
                  <div key={r.id} style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", marginBottom: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: "4px solid #3949ab" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>🔄 {r.nome}</div>
                        <div style={{ fontSize: 13, color: "#3949ab", fontWeight: 700, marginTop: 1 }}>{fmt(r.valor)}</div>
                        <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Todo dia {r.diaVencimento} · {r.categoria}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                        <span style={{ fontSize: 10, background: jaLancada ? "#e8f5e9" : "#fff9c4", color: jaLancada ? "#2e7d32" : "#f57f17", borderRadius: 8, padding: "2px 8px", fontWeight: 700 }}>
                          {jaLancada ? "✓ Lançada" : "Pendente"}
                        </span>
                        <div style={{ display: "flex", gap: 4 }}>
                          {!jaLancada && (
                            <button onClick={() => lancarRecorrenteMesAtual(r)} disabled={lancarRecMes[r.id]}
                              style={{ padding: "4px 8px", borderRadius: 8, border: "none", background: "#e8eaf6", color: "#3949ab", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                              {lancarRecMes[r.id] ? "⏳" : "📅 Lançar"}
                            </button>
                          )}
                          <button onClick={() => deletarRecorrente(r.id)}
                            style={{ padding: "4px 8px", borderRadius: 8, border: "none", background: "#ffebee", color: "#c62828", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ ABA DRE ══ */}
        {aba === "dre" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: "#0d47a1", fontSize: 16 }}>
                📊 DRE — {new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" })}
              </h3>
              <button onClick={carregarPedidosMes}
                style={{ padding: "6px 12px", borderRadius: 20, border: "none", background: "#e3f2fd", color: "#1565c0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                ↻ Atualizar
              </button>
            </div>
            {carregandoDRE ? (
              <div style={{ textAlign: "center", color: "#888", padding: 24 }}>⏳ Calculando...</div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
                {[
                  { label: "🛒 Faturamento total", valor: faturamento, sinal: "+", cor: "#1565c0", bg: "#e3f2fd" },
                  { label: "📦 Custo de mercadorias (CMV)", valor: custoMercadorias, sinal: "−", cor: "#c62828", bg: "#ffebee" },
                  { label: "🧾 Despesas pagas no mês", valor: despesasPagas, sinal: "−", cor: "#e65100", bg: "#fff3e0" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <div>
                      <span style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>{row.label}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: row.cor }}>
                      {row.sinal} {fmt(row.valor)}
                    </span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, marginTop: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>💰 Lucro Líquido</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: lucroLiquido >= 0 ? "#1b5e20" : "#c62828" }}>
                    {fmt(lucroLiquido)}
                  </span>
                </div>
                <div style={{ marginTop: 16, padding: 12, background: "#f8f9fa", borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
                    ℹ️ Baseado em {pedidosMes.length} pedido(s) via WhatsApp este mês.
                  </div>
                  {custoMercadorias === 0 && (
                    <div style={{ fontSize: 11, color: "#f57f17", marginTop: 4 }}>
                      ⚠️ Cadastre o "Preço de Custo" nos produtos (via Scanner) para calcular o CMV automaticamente.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ ABA FORNECEDORES ══ */}
        {aba === "fornecedores" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#0d47a1", fontSize: 16 }}>🤝 Fornecedores</h3>
              <button onClick={() => setMostrarFormForn(!mostrarFormForn)}
                style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: mostrarFormForn ? "#e0e0e0" : "#1565c0", color: mostrarFormForn ? "#333" : "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: f }}>
                {mostrarFormForn ? "✕ Fechar" : "+ Novo"}
              </button>
            </div>

            {mostrarFormForn && (
              <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginBottom: 16 }}>
                {[
                  { label: "Nome do fornecedor *", key: "nome", placeholder: "Ex: Distribuidora ABC" },
                  { label: "Telefone / WhatsApp", key: "telefone", placeholder: "Ex: (88) 99999-0000" },
                  { label: "Produto / Linha fornecida", key: "produto", placeholder: "Ex: Analgésicos e antibióticos" },
                ].map(({ label, key, placeholder }) => (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>{label}</label>
                    <input value={(formForn as Record<string, string>)[key]}
                      onChange={e => setFormForn(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder} style={inputStyle} />
                  </div>
                ))}
                <button onClick={salvarFornecedor} style={btnPrimary}>✅ Adicionar fornecedor</button>
              </div>
            )}

            {carregandoFornecedores ? (
              <div style={{ textAlign: "center", color: "#888", padding: 24 }}>⏳ Carregando...</div>
            ) : fornecedores.length === 0 ? (
              <div style={{ textAlign: "center", color: "#aaa", padding: 24 }}>Nenhum fornecedor cadastrado</div>
            ) : fornecedores.map(forn => (
              <div key={forn.id} style={{ background: "#fff", borderRadius: 14, padding: "14px", marginBottom: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>🤝 {forn.nome}</div>
                    {forn.telefone && <div style={{ fontSize: 12, color: "#25d366", fontWeight: 600, marginTop: 3 }}>📱 {forn.telefone}</div>}
                    {forn.produto && <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>📦 {forn.produto}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
                    {forn.telefone && (
                      <button onClick={() => window.open(`https://wa.me/55${forn.telefone.replace(/\D/g, "")}`, "_blank")}
                        style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: "#e8f5e9", color: "#2e7d32", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        WhatsApp
                      </button>
                    )}
                    <button onClick={() => deletarFornecedor(forn.id)}
                      style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: "#ffebee", color: "#c62828", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}


        {/* ══ ABA PRODUTOS ══ */}
        {aba === "produtos" && (
          <div>
            <h3 style={{ margin: "0 0 4px", color: "#0d47a1", fontSize: 16 }}>📦 Produtos — Preço & Margem</h3>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#888" }}>
              {produtos.filter(p => p.precoCusto && p.precoCusto > 0).length} de {produtos.length} produto(s) com custo cadastrado
            </p>
            {produtos.length === 0 ? (
              <div style={{ textAlign: "center", color: "#aaa", padding: 24 }}>Nenhum produto no catálogo</div>
            ) : produtos.map(p => {
              const temCusto = p.precoCusto && p.precoCusto > 0;
              const margem = temCusto ? ((p.preco - p.precoCusto!) / p.precoCusto!) * 100 : null;
              const margemCor = margem === null ? "#888" : margem >= 30 ? "#2e7d32" : margem >= 10 ? "#f57f17" : "#c62828";
              const margemBg  = margem === null ? "#f5f5f5" : margem >= 30 ? "#e8f5e9" : margem >= 10 ? "#fff3e0" : "#ffebee";
              return (
                <div key={p.id} style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", marginBottom: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, marginRight: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>
                        {p.emoji} {p.nome}
                      </div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "#1565c0" }}>
                          <strong>Venda:</strong> R$ {p.preco.toFixed(2).replace(".", ",")}
                        </span>
                        {temCusto ? (
                          <span style={{ fontSize: 12, color: "#555" }}>
                            <strong>Custo:</strong> R$ {p.precoCusto!.toFixed(2).replace(".", ",")}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "#bbb", fontStyle: "italic" }}>Custo não informado</span>
                        )}
                      </div>
                    </div>
                    <div style={{ background: margemBg, color: margemCor, borderRadius: 12, padding: "6px 12px", textAlign: "center", flexShrink: 0 }}>
                      {margem !== null ? (
                        <>
                          <div style={{ fontSize: 16, fontWeight: 800 }}>{margem.toFixed(0)}%</div>
                          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>margem</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 11, color: "#aaa" }}>—</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

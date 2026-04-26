import { useState } from "react";
import { enviarPushAdmin, registrarPushNotification } from "../lib/push";

export default function PushNotificacoes() {
  const [titulo, setTitulo] = useState("📢 Farmácia Arcanjo");
  const [corpo, setCorpo] = useState("");
  const [url, setUrl] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [assinando, setAssinando] = useState(false);

  async function assinar() {
    setAssinando(true);
    const ok = await registrarPushNotification();
    setAssinando(false);
    if (ok) setResultado("✅ Notificações ativadas neste dispositivo!");
    else setResultado("❌ Permissão negada ou navegador não suportado.");
  }

  async function enviar() {
    if (!corpo.trim()) return;
    setEnviando(true);
    setResultado(null);
    try {
      const res = await enviarPushAdmin(titulo, corpo, url || undefined);
      setResultado(`✅ Enviado para ${res.enviadas} dispositivo(s) de ${res.total} cadastrado(s).`);
    } catch {
      setResultado("❌ Erro ao enviar notificação.");
    }
    setEnviando(false);
  }

  return (
    <div style={{ padding: 16, fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1565c0", margin: "0 0 4px" }}>🔔 Push Notifications</h2>
      <p style={{ fontSize: 12, color: "#888", margin: "0 0 20px" }}>Envie alertas diretamente para o celular dos clientes</p>

      {/* Ativar notificações neste dispositivo */}
      <div style={{ background: "#e3f2fd", borderRadius: 16, padding: 16, marginBottom: 20, border: "2px solid #90caf9" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0d47a1", marginBottom: 8 }}>📱 Ativar no meu dispositivo</div>
        <p style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>
          Ative primeiro neste dispositivo para testar. Clientes que visitarem o app e autorizarem receberão as notificações.
        </p>
        <button
          onClick={assinar}
          disabled={assinando}
          style={{ padding: "10px 20px", borderRadius: 20, border: "none", background: "#1565c0", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif", opacity: assinando ? 0.6 : 1 }}
        >
          {assinando ? "⏳ Ativando..." : "🔔 Ativar Notificações"}
        </button>
      </div>

      {/* Formulário de envio */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1565c0", marginBottom: 14 }}>📤 Enviar Notificação</div>

        <label style={{ fontSize: 12, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>Título</label>
        <input
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 13, fontFamily: "'Nunito', sans-serif", marginBottom: 12, boxSizing: "border-box" as const }}
        />

        <label style={{ fontSize: 12, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>Mensagem *</label>
        <textarea
          value={corpo}
          onChange={e => setCorpo(e.target.value)}
          rows={3}
          placeholder="Ex: 🔥 Promoção de hoje: Dipirona 500mg com 30% de desconto!"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 13, fontFamily: "'Nunito', sans-serif", marginBottom: 12, resize: "vertical", boxSizing: "border-box" as const }}
        />

        <label style={{ fontSize: 12, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>Link (opcional)</label>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Ex: /farmacia-arcanjo/"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "2px solid #e0e0e0", fontSize: 13, fontFamily: "'Nunito', sans-serif", marginBottom: 16, boxSizing: "border-box" as const }}
        />

        {resultado && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: resultado.startsWith("✅") ? "#e8f5e9" : "#ffebee", color: resultado.startsWith("✅") ? "#2e7d32" : "#c62828", fontWeight: 700, fontSize: 13, marginBottom: 12, textAlign: "center" }}>
            {resultado}
          </div>
        )}

        <button
          onClick={enviar}
          disabled={enviando || !corpo.trim()}
          style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: (!corpo.trim() || enviando) ? "#e0e0e0" : "linear-gradient(135deg, #0d47a1, #1565c0)", color: (!corpo.trim() || enviando) ? "#aaa" : "#fff", fontSize: 15, fontWeight: 800, cursor: (!corpo.trim() || enviando) ? "default" : "pointer", fontFamily: "'Nunito', sans-serif" }}
        >
          {enviando ? "⏳ Enviando..." : "📣 Enviar para Todos"}
        </button>
      </div>

      <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 16 }}>
        As assinaturas são mantidas em memória — reiniciando o servidor as assinaturas são perdidas.
      </p>
    </div>
  );
}

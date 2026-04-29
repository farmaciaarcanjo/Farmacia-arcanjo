export default function SobreFarmacia() {
  const whatsapp = "https://wa.me/5588993375650?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20a%20Farmácia%20Arcanjo.";
  const gmaps = "https://www.google.com/maps/search/?api=1&query=Farmácia+Arcanjo+Meruoca+CE";
  const waze = "https://waze.com/ul?q=Farmácia+Arcanjo+Meruoca+CE";

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", paddingBottom: 40 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #0d47a1, #1976d2)", borderRadius: 20, padding: "32px 20px", textAlign: "center", marginBottom: 20, color: "#fff" }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>⚕️</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px" }}>Farmácia Arcanjo</h1>
        <p style={{ fontSize: 14, opacity: 0.85, margin: 0 }}>Cuidando da sua saúde em Meruoca-CE</p>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer"
            style={{ background: "#25d366", color: "#fff", borderRadius: 12, padding: "10px 20px", fontWeight: 700, fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            📲 WhatsApp
          </a>
          <a href={gmaps} target="_blank" rel="noopener noreferrer"
            style={{ background: "#fff", color: "#1565c0", borderRadius: 12, padding: "10px 20px", fontWeight: 700, fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            📍 Ver no Mapa
          </a>
        </div>
      </div>

      {/* Sobre */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1565c0", margin: "0 0 10px" }}>📖 Nossa História</h2>
        <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7, margin: 0 }}>
          A <strong>Farmácia Arcanjo</strong> é uma farmácia local com tradição no município de
          Meruoca-CE. Nosso compromisso é oferecer atendimento humanizado, preços acessíveis e
          produtos de qualidade para toda a família.
        </p>
        <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7, marginTop: 8, marginBottom: 0 }}>
          Contamos com a <strong>Lara</strong>, nossa assistente virtual, que está disponível 24h para
          tirar dúvidas, buscar medicamentos e ajudar com pedidos pelo WhatsApp.
        </p>
      </div>

      {/* Diferenciais */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1565c0", margin: "0 0 14px" }}>⭐ Por que escolher a Arcanjo?</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { emoji: "💊", titulo: "Mais de 360 produtos", sub: "Catálogo completo" },
            { emoji: "🛵", titulo: "Entrega rápida", sub: "Ligou, a gente leva" },
            { emoji: "🤖", titulo: "Atendimento 24h", sub: "Com a Lara virtual" },
            { emoji: "💳", titulo: "Todos pagamentos", sub: "Pix, débito, crédito" },
            { emoji: "💰", titulo: "Preço justo", sub: "Genéricos disponíveis" },
            { emoji: "👩‍⚕️", titulo: "Farmacêutico", sub: "Sempre disponível" },
          ].map(d => (
            <div key={d.titulo} style={{ background: "#f0f4ff", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{d.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1565c0", lineHeight: 1.2 }}>{d.titulo}</div>
              <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{d.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Horários */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1565c0", margin: "0 0 14px" }}>🕐 Horário de Funcionamento</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { dias: "Segunda a Sexta", horario: "8h às 20h", destaque: true },
            { dias: "Sábado", horario: "8h às 20h", destaque: true },
            { dias: "Domingo", horario: "8h às 12h", destaque: false },
          ].map(h => (
            <div key={h.dias} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: h.destaque ? "#e3f2fd" : "#fff3e0", borderRadius: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{h.dias}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: h.destaque ? "#1565c0" : "#e65100" }}>{h.horario}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: "10px 14px", background: "#e8f5e9", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🚨</span>
          <span style={{ fontSize: 12, color: "#2e7d32", fontWeight: 600 }}>
            Urgência? Chame no WhatsApp!
          </span>
        </div>
      </div>

      {/* Localização */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1565c0", margin: "0 0 14px" }}>📍 Localização</h2>
        <div style={{ background: "#f0f4ff", borderRadius: 12, padding: "14px", marginBottom: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#1565c0", margin: "0 0 4px" }}>Rua Dom José, 135</p>
          <p style={{ fontSize: 13, color: "#555", margin: 0 }}>Centro — Meruoca-CE · CEP 62.130-000</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href={gmaps} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, background: "#4285f4", color: "#fff", borderRadius: 12, padding: "12px 10px", fontWeight: 700, fontSize: 13, textDecoration: "none", textAlign: "center" }}>
            🗺️ Google Maps
          </a>
          <a href={waze} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, background: "#00d4ff", color: "#fff", borderRadius: 12, padding: "12px 10px", fontWeight: 700, fontSize: 13, textDecoration: "none", textAlign: "center" }}>
            🚗 Waze
          </a>
        </div>
      </div>

      {/* Contato */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1565c0", margin: "0 0 14px" }}>📞 Contato</h2>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 14, background: "#25d366", color: "#fff", borderRadius: 14, padding: "16px 20px", textDecoration: "none" }}>
          <span style={{ fontSize: 32 }}>💬</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>WhatsApp</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>(88) 99337-5650</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Toque para conversar</div>
          </div>
        </a>
        <div style={{ marginTop: 12, padding: "12px 16px", background: "#f0f4ff", borderRadius: 12, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#555", margin: 0 }}>
            🌐 <strong>App</strong>: farmacia-arcanjo-chat--derlandioursuli.replit.app
          </p>
        </div>
      </div>
    </div>
  );
}

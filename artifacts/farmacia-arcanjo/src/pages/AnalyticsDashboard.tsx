import { useMemo } from "react";
import { getEventos, type TipoEvento } from "../lib/analytics";

function diasPassados(n: number): string[] {
  const dias: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dias.push(d.toISOString().split("T")[0]);
  }
  return dias;
}

function nomeDia(data: string): string {
  const d = new Date(data + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" });
}

export default function AnalyticsDashboard() {
  const eventos = getEventos();
  const hoje = new Date().toISOString().split("T")[0];
  const ultimos7 = diasPassados(7);

  const todayCount = (tipo: TipoEvento) =>
    eventos.filter((e) => e.tipo === tipo && e.data === hoje).length;

  const visitasHoje = todayCount("visita");
  const mensagensHoje = todayCount("lara_mensagem");
  const whatsHoje = todayCount("whatsapp_click");
  const adicionadosHoje = todayCount("produto_adicionado");

  const por7Dias = useMemo(() =>
    ultimos7.map((data) => ({
      data,
      visitas: eventos.filter((e) => e.tipo === "visita" && e.data === data).length,
      mensagens: eventos.filter((e) => e.tipo === "lara_mensagem" && e.data === data).length,
      whatsapp: eventos.filter((e) => e.tipo === "whatsapp_click" && e.data === data).length,
      adicionados: eventos.filter((e) => e.tipo === "produto_adicionado" && e.data === data).length,
    })),
    [eventos]
  );

  const maxTotal = Math.max(
    1,
    ...por7Dias.map((d) => d.visitas + d.mensagens + d.whatsapp + d.adicionados)
  );

  const topProdutos = useMemo(() => {
    const contagem: Record<string, number> = {};
    for (const e of eventos) {
      if (e.produto) contagem[e.produto] = (contagem[e.produto] || 0) + 1;
    }
    return Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [eventos]);

  const stats = [
    { label: "Visitantes hoje", valor: visitasHoje, emoji: "👥", cor: "#145f2e" },
    { label: "Msg para Lara", valor: mensagensHoje, emoji: "💬", cor: "#0066cc" },
    { label: "Cliques WhatsApp", valor: whatsHoje, emoji: "📲", cor: "#25d366" },
    { label: "Produtos add.", valor: adicionadosHoje, emoji: "🛒", cor: "#e07b00" },
  ];

  const barColors = ["#145f2e", "#0066cc", "#25d366", "#e07b00"];

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", padding: 16 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#145f2e", margin: "0 0 16px" }}>
        📈 Analytics — Hoje
      </h2>

      {/* Cards de hoje */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "14px 12px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", borderLeft: `4px solid ${s.cor}` }}>
            <div style={{ fontSize: 22 }}>{s.emoji}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.cor, lineHeight: 1 }}>{s.valor}</div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Gráfico 7 dias */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.08)", marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, color: "#333", margin: "0 0 12px" }}>Últimos 7 dias</h3>

        {/* Legenda */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", marginBottom: 12 }}>
          {[
            { label: "Visitantes", cor: barColors[0] },
            { label: "Msg Lara", cor: barColors[1] },
            { label: "WhatsApp", cor: barColors[2] },
            { label: "Produtos", cor: barColors[3] },
          ].map(({ label, cor }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: cor }} />
              <span style={{ fontSize: 10, color: "#666" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Barras */}
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 100 }}>
          {por7Dias.map((dia) => {
            const total = dia.visitas + dia.mensagens + dia.whatsapp + dia.adicionados;
            const alturaTotal = total === 0 ? 0 : Math.max(4, Math.round((total / maxTotal) * 90));
            const segs = [
              { v: dia.visitas, cor: barColors[0] },
              { v: dia.mensagens, cor: barColors[1] },
              { v: dia.whatsapp, cor: barColors[2] },
              { v: dia.adicionados, cor: barColors[3] },
            ].filter((s) => s.v > 0);

            return (
              <div key={dia.data} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", display: "flex", flexDirection: "column-reverse", alignItems: "stretch", height: 90 }}>
                  {total === 0 ? (
                    <div style={{ height: 4, background: "#e0e0e0", borderRadius: 4 }} />
                  ) : (
                    <div style={{ width: "100%", height: alturaTotal, display: "flex", flexDirection: "column", borderRadius: 6, overflow: "hidden", alignSelf: "flex-end" }}>
                      {segs.map((s, i) => (
                        <div
                          key={i}
                          style={{
                            flex: s.v,
                            background: s.cor,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 9, color: "#888", textAlign: "center", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                  {nomeDia(dia.data)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top produtos */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.08)", marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, color: "#333", margin: "0 0 12px" }}>🏆 Produtos mais buscados</h3>
        {topProdutos.length === 0 ? (
          <p style={{ fontSize: 12, color: "#aaa", textAlign: "center", padding: "16px 0" }}>
            Ainda sem dados. Conforme os clientes interagirem, aparecerá aqui.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topProdutos.map(([produto, count], i) => {
              const max = topProdutos[0][1];
              const pct = Math.round((count / max) * 100);
              const medalhas = ["🥇", "🥈", "🥉", "4.", "5."];
              return (
                <div key={produto}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>
                      {medalhas[i]} {produto}
                    </span>
                    <span style={{ fontSize: 11, color: "#145f2e", fontWeight: 700 }}>{count}x</span>
                  </div>
                  <div style={{ height: 6, background: "#e8f5ee", borderRadius: 10 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "#145f2e", borderRadius: 10, transition: "width 0.4s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p style={{ fontSize: 10, color: "#bbb", textAlign: "center" }}>
        Dados salvos localmente e na nuvem · Atualiza ao recarregar
      </p>
    </div>
  );
}

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

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function AnalyticsDashboard() {
  const eventos = getEventos();
  const hoje = new Date().toISOString().split("T")[0];
  const ultimos7 = diasPassados(7);
  const ultimos30 = diasPassados(30);

  const todayCount = (tipo: TipoEvento) =>
    eventos.filter((e) => e.tipo === tipo && e.data === hoje).length;

  const totalCount = (tipo: TipoEvento) =>
    eventos.filter((e) => e.tipo === tipo).length;

  const visitasHoje = todayCount("visita");
  const mensagensHoje = todayCount("lara_mensagem");
  const whatsHoje = todayCount("whatsapp_click");
  const adicionadosHoje = todayCount("produto_adicionado");

  const visitasTotal = totalCount("visita");
  const mensagensTotal = totalCount("lara_mensagem");
  const whatsTotal = totalCount("whatsapp_click");

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

  const porDiaSemana = useMemo(() => {
    const counts = Array(7).fill(0);
    for (const e of eventos) {
      if (e.tipo === "visita" && e.data) {
        const dow = new Date(e.data + "T12:00:00").getDay();
        counts[dow]++;
      }
    }
    return counts;
  }, [eventos]);

  const maxDiaSemana = Math.max(1, ...porDiaSemana);

  const taxaConversao = visitasTotal > 0
    ? Math.round((whatsTotal / visitasTotal) * 100)
    : 0;

  const mediaVisitasDia = ultimos30.length > 0
    ? Math.round(eventos.filter(e => e.tipo === "visita" && ultimos30.includes(e.data ?? "")).length / 30)
    : 0;

  const stats = [
    { label: "Visitantes hoje", valor: visitasHoje, emoji: "👥", cor: "#145f2e" },
    { label: "Msg para Lara", valor: mensagensHoje, emoji: "💬", cor: "#0066cc" },
    { label: "Cliques WhatsApp", valor: whatsHoje, emoji: "📲", cor: "#25d366" },
    { label: "Produtos add.", valor: adicionadosHoje, emoji: "🛒", cor: "#e07b00" },
  ];

  const totais = [
    { label: "Total visitantes", valor: visitasTotal, emoji: "👁️", cor: "#1565c0" },
    { label: "Total msg Lara", valor: mensagensTotal, emoji: "🤖", cor: "#7b1fa2" },
    { label: "Total WhatsApp", valor: whatsTotal, emoji: "📲", cor: "#25d366" },
    { label: "Taxa conversão", valor: `${taxaConversao}%`, emoji: "📊", cor: "#c62828" },
  ];

  const barColors = ["#145f2e", "#0066cc", "#25d366", "#e07b00"];

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", padding: 16 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#145f2e", margin: "0 0 4px" }}>
        📈 Analytics
      </h2>
      <p style={{ fontSize: 12, color: "#888", margin: "0 0 16px" }}>Média diária (30d): {mediaVisitasDia} visitante(s)</p>

      {/* Cards de hoje */}
      <div style={{ fontSize: 12, fontWeight: 800, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Hoje</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "14px 12px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", borderLeft: `4px solid ${s.cor}` }}>
            <div style={{ fontSize: 22 }}>{s.emoji}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.cor, lineHeight: 1 }}>{s.valor}</div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Cards de totais */}
      <div style={{ fontSize: 12, fontWeight: 800, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Acumulado total</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
        {totais.map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "14px 12px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", borderLeft: `4px solid ${s.cor}` }}>
            <div style={{ fontSize: 22 }}>{s.emoji}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.cor, lineHeight: 1 }}>{s.valor}</div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Gráfico 7 dias */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.08)", marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, color: "#333", margin: "0 0 12px" }}>Últimos 7 dias</h3>
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
                        <div key={i} style={{ flex: s.v, background: s.cor }} />
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

      {/* Dia da semana mais movimentado */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.08)", marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, color: "#333", margin: "0 0 12px" }}>📅 Dias mais movimentados</h3>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 70 }}>
          {porDiaSemana.map((count, i) => {
            const altura = count === 0 ? 4 : Math.max(8, Math.round((count / maxDiaSemana) * 60));
            const ehMaior = count === maxDiaSemana && count > 0;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 9, color: ehMaior ? "#1565c0" : "#ccc", fontWeight: ehMaior ? 800 : 400 }}>{count}</div>
                <div style={{ width: "100%", height: altura, background: ehMaior ? "#1565c0" : "#b3d4f5", borderRadius: 6, transition: "height 0.4s" }} />
                <div style={{ fontSize: 9, color: ehMaior ? "#1565c0" : "#888", fontWeight: ehMaior ? 800 : 400 }}>{DIAS_SEMANA[i]}</div>
              </div>
            );
          })}
        </div>
        {maxDiaSemana > 0 && (
          <p style={{ fontSize: 11, color: "#888", marginTop: 8, marginBottom: 0, textAlign: "center" }}>
            Dia mais movimentado: <strong style={{ color: "#1565c0" }}>{DIAS_SEMANA[porDiaSemana.indexOf(maxDiaSemana)]}</strong>
          </p>
        )}
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

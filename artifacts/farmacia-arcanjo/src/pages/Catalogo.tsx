import { useState, useMemo } from "react";

interface Produto {
  id: number;
  nome: string;
  categoria: string;
  descricao: string;
  preco?: string;
  emoji: string;
  tags: string[];
}

const PRODUTOS: Produto[] = [
  {
    id: 1,
    nome: "Dipirona 500mg",
    categoria: "Analgésicos",
    descricao: "Alívio eficaz de dores e febre. Caixa com 20 comprimidos.",
    preco: "R$ 8,90",
    emoji: "💊",
    tags: ["dor", "febre", "analgésico"],
  },
  {
    id: 2,
    nome: "Ibuprofeno 400mg",
    categoria: "Analgésicos",
    descricao: "Anti-inflamatório e analgésico. Caixa com 20 comprimidos.",
    preco: "R$ 14,90",
    emoji: "💊",
    tags: ["inflamação", "dor", "anti-inflamatório"],
  },
  {
    id: 3,
    nome: "Amoxicilina 500mg",
    categoria: "Antibióticos",
    descricao: "Antibiótico de amplo espectro. Somente com receita médica.",
    emoji: "💉",
    tags: ["antibiótico", "infecção", "receita"],
  },
  {
    id: 4,
    nome: "Omeprazol 20mg",
    categoria: "Gastro",
    descricao: "Protetor gástrico para azia e refluxo. Caixa com 28 cápsulas.",
    preco: "R$ 19,90",
    emoji: "🫙",
    tags: ["azia", "refluxo", "estômago"],
  },
  {
    id: 5,
    nome: "Vitamina C 1000mg",
    categoria: "Suplementos",
    descricao: "Suplemento vitamínico para imunidade. Frasco com 60 comprimidos.",
    preco: "R$ 24,90",
    emoji: "🍊",
    tags: ["vitamina", "imunidade", "suplemento"],
  },
  {
    id: 6,
    nome: "Vitamina D3 2000UI",
    categoria: "Suplementos",
    descricao: "Essencial para ossos e imunidade. Frasco com 60 cápsulas.",
    preco: "R$ 29,90",
    emoji: "☀️",
    tags: ["vitamina", "ossos", "suplemento"],
  },
  {
    id: 7,
    nome: "Complexo B",
    categoria: "Suplementos",
    descricao: "Vitaminas do complexo B para energia e sistema nervoso.",
    preco: "R$ 18,90",
    emoji: "⚡",
    tags: ["vitamina", "energia", "suplemento"],
  },
  {
    id: 8,
    nome: "Soro Fisiológico",
    categoria: "Cuidados",
    descricao: "Solução salina para limpeza nasal e ferimentos. 250ml.",
    preco: "R$ 5,90",
    emoji: "💧",
    tags: ["soro", "limpeza", "nasal"],
  },
  {
    id: 9,
    nome: "Álcool 70%",
    categoria: "Cuidados",
    descricao: "Antisséptico para higienização. Frasco 500ml.",
    preco: "R$ 12,90",
    emoji: "🧴",
    tags: ["álcool", "antisséptico", "higiene"],
  },
  {
    id: 10,
    nome: "Termômetro Digital",
    categoria: "Equipamentos",
    descricao: "Termômetro axilar digital rápido e preciso.",
    preco: "R$ 39,90",
    emoji: "🌡️",
    tags: ["termômetro", "febre", "medição"],
  },
  {
    id: 11,
    nome: "Protetor Solar FPS 50",
    categoria: "Cuidados",
    descricao: "Proteção solar eficaz para uso diário. 120ml.",
    preco: "R$ 34,90",
    emoji: "🌞",
    tags: ["protetor", "solar", "pele"],
  },
  {
    id: 12,
    nome: "Losartana 50mg",
    categoria: "Pressão Arterial",
    descricao: "Medicamento para hipertensão. Somente com receita médica.",
    emoji: "❤️",
    tags: ["pressão", "hipertensão", "coração", "receita"],
  },
  {
    id: 13,
    nome: "Metformina 850mg",
    categoria: "Diabetes",
    descricao: "Controle da glicemia. Somente com receita médica.",
    emoji: "🩸",
    tags: ["diabetes", "glicemia", "receita"],
  },
  {
    id: 14,
    nome: "Ômega 3",
    categoria: "Suplementos",
    descricao: "Ácidos graxos essenciais para coração e cérebro. 60 cápsulas.",
    preco: "R$ 42,90",
    emoji: "🐟",
    tags: ["ômega", "coração", "suplemento"],
  },
  {
    id: 15,
    nome: "Pomada Bepantol",
    categoria: "Cuidados",
    descricao: "Cicatrizante e hidratante para pele ressecada. 30g.",
    preco: "R$ 21,90",
    emoji: "🧸",
    tags: ["pomada", "pele", "cicatrizante"],
  },
  {
    id: 16,
    nome: "Loratadina 10mg",
    categoria: "Alérgicos",
    descricao: "Antialérgico não sedativo. Caixa com 12 comprimidos.",
    preco: "R$ 13,90",
    emoji: "🌸",
    tags: ["alergia", "rinite", "antialérgico"],
  },
];

const CATEGORIAS = ["Todas", ...Array.from(new Set(PRODUTOS.map((p) => p.categoria)))];

const WHATSAPP_NUMBER = "5588999999999";

export default function Catalogo() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas");

  const filtrados = useMemo(() => {
    return PRODUTOS.filter((p) => {
      const matchBusca =
        !busca ||
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.descricao.toLowerCase().includes(busca.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(busca.toLowerCase()));
      const matchCat = categoria === "Todas" || p.categoria === categoria;
      return matchBusca && matchCat;
    });
  }, [busca, categoria]);

  const fazerPedido = (produto: Produto) => {
    const msg = encodeURIComponent(
      `Olá! Gostaria de fazer um pedido pela Farmácia Arcanjo.\n\nProduto: ${produto.nome}\nCategoria: ${produto.categoria}\n${produto.preco ? `Preço: ${produto.preco}` : ""}\n\nPor favor, confirme a disponibilidade. Obrigado!`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-4 p-1">
      <div className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-xl p-4 border border-accent/20">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🏪</span>
          <h2 className="font-semibold text-foreground">Catálogo de Medicamentos</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Encontre e peça pelo WhatsApp diretamente
        </p>
      </div>

      <div className="space-y-3 sticky top-0 bg-background pb-2 z-10">
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar medicamento..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoria(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all shrink-0 ${
                categoria === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl">🔍</span>
          <p className="text-muted-foreground text-sm mt-2">
            Nenhum produto encontrado
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Tente outro termo ou categoria
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtrados.map((produto) => (
            <div
              key={produto.id}
              className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                {produto.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm leading-tight">
                      {produto.nome}
                    </h3>
                    <span className="inline-block mt-0.5 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {produto.categoria}
                    </span>
                  </div>
                  {produto.preco && (
                    <span className="font-bold text-sm text-primary shrink-0">
                      {produto.preco}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {produto.descricao}
                </p>

                {produto.tags.includes("receita") && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      ⚠️ Receita médica obrigatória
                    </span>
                  </div>
                )}

                <button
                  onClick={() => fazerPedido(produto)}
                  className="mt-2.5 w-full py-2 rounded-lg bg-[#25D366] text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#22C35E] active:scale-[0.98] transition-all shadow-sm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Pedir pelo WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-4 mt-2 text-center">
        <p className="text-xs text-muted-foreground mb-2">
          Produto indisponivel na lista? Fale conosco!
        </p>
        <button
          onClick={() => {
            const msg = encodeURIComponent(
              "Olá! Gostaria de consultar sobre um produto que não encontrei no catálogo da Farmácia Arcanjo."
            );
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
          }}
          className="py-2 px-6 rounded-lg bg-[#25D366] text-white text-xs font-semibold flex items-center justify-center gap-1.5 mx-auto hover:bg-[#22C35E] active:scale-[0.98] transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Consultar pelo WhatsApp
        </button>
      </div>
    </div>
  );
}

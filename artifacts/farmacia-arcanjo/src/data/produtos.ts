export interface Produto {
  id: number;
  nome: string;
  preco: number;
  precoOriginal?: number;
  precoCusto?: number;
  categoria: string;
  emoji: string;
  desc: string;
  prescricao?: boolean;
  usoControlado?: boolean;
  estoque?: number;
  codigoBarras?: string;
  codigoSisMoura?: string;
  promocao?: {
    quantidade: number;
    precoTotal: number;
    descricao: string;
  };
}

export const VERSAO_CATALOGO = "v5-2026-04";

export const PRODUTOS_INICIAIS: Produto[] = [
  // ANALGÉSICOS
  { id: 1, nome: "Aberalgina (dipirona 500mg/ml)", preco: 3.50, categoria: "Analgésicos", emoji: "💊", desc: "Analgésico e antitérmico" },
  { id: 2, nome: "Belspan composto", preco: 18.50, categoria: "Analgésicos", emoji: "💊", desc: "Analgésico composto" },
  { id: 3, nome: "Cetoprofeno 150mg (10 comp.)", preco: 15.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório" },
  { id: 4, nome: "Colchicina", preco: 14.00, categoria: "Analgésicos", emoji: "💊", desc: "Para gota e inflamação" },
  { id: 5, nome: "Diclofenaco 50mg Altefar (30 comp.)", preco: 7.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório genérico" },
  { id: 6, nome: "Diclofenaco 50mg Cimed (20 comp.)", preco: 7.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório genérico" },
  { id: 7, nome: "Dipirona 500mg/ml", preco: 4.50, categoria: "Analgésicos", emoji: "💊", desc: "Analgésico e antitérmico" },
  { id: 8, nome: "Dipirona Medquímica 1g (10 comp.)", preco: 13.00, categoria: "Analgésicos", emoji: "💊", desc: "Analgésico forte" },
  { id: 9, nome: "Ibuprofeno gotas 100mg/ml", preco: 9.50, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório infantil" },
  { id: 10, nome: "Ibuprofeno gotas 100mg/ml Med Química", preco: 9.50, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório infantil" },
  { id: 11, nome: "Ibupril (ibuprofeno 400mg)", preco: 15.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório adulto" },
  { id: 12, nome: "Naproxeno sódico (10 comp.)", preco: 23.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório" },
  { id: 13, nome: "Nimesulida 100mg Globo Farma", preco: 5.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório" },
  { id: 14, nome: "Nimesulida 100mg Vitamedic (12 comp.)", preco: 5.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório" },
  { id: 15, nome: "Nimesulida gotas 50mg/ml Scaflogin 15ml", preco: 7.00, precoOriginal: 14.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório gotas", promocao: { quantidade: 2, precoTotal: 8.00, descricao: "🔥 PROMOÇÃO: LEVE 2 por R$8,00" } },
  { id: 16, nome: "Piroxicam 20mg", preco: 14.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório" },
  { id: 17, nome: "Tandene", preco: 23.00, categoria: "Analgésicos", emoji: "💊", desc: "Analgésico e relaxante muscular" },
  { id: 18, nome: "Tandriflan 30 comp.", preco: 18.00, categoria: "Analgésicos", emoji: "💊", desc: "Analgésico composto" },
  { id: 19, nome: "Tyflen 750mg (paracetamol)", preco: 13.00, categoria: "Analgésicos", emoji: "💊", desc: "Analgésico e antitérmico" },// ANTIGRIPAIS
  { id: 20, nome: "Paracetamol gotas 200mg/ml", preco: 6.00, categoria: "Antigripais", emoji: "🤧", desc: "Antitérmico infantil" },
  { id: 21, nome: "Paracetamol gotas sabor laranja 200mg/ml", preco: 6.00, categoria: "Antigripais", emoji: "🤧", desc: "Antitérmico infantil" },

  // ANTI-HIPERTENSIVOS
  { id: 22, nome: "Atenolol 25mg – Sandoz", preco: 6.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 23, nome: "Atenolol 50mg – Sandoz", preco: 7.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 24, nome: "Besilato de anlodipino 5mg", preco: 5.50, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 25, nome: "Carvedilol 3,125mg – Biolab", preco: 12.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão e coração" },
  { id: 26, nome: "Carvedilol 6,25mg – Biolab", preco: 10.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão e coração" },
  { id: 27, nome: "Clortalidona 50mg – Vitamedic", preco: 17.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Diurético para pressão" },
  { id: 28, nome: "Dicloridrato de betaistina 16mg – Geolab", preco: 18.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para vertigem e tontura" },
  { id: 29, nome: "Espironolactona 25mg – Eurofarma", preco: 20.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Diurético" },
  { id: 30, nome: "Furosemida 40mg – Teuto", preco: 8.50, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Diurético" },
  { id: 31, nome: "Hidroclorotiazida 25mg – Germed", preco: 5.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Diurético para pressão" },
  { id: 32, nome: "Losartana potássica 50mg – Eurofarma", preco: 6.00, precoOriginal: 18.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta", promocao: { quantidade: 3, precoTotal: 10.00, descricao: "🔥 PROMOÇÃO: LEVE 3 por R$10,00" } },
  { id: 33, nome: "Maleato de enalapril 10mg – Teuto", preco: 10.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 34, nome: "Maleato de enalapril 20mg – Nova Química", preco: 12.50, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 35, nome: "Mesilato de doxazosina 2mg – Neo Química", preco: 18.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 36, nome: "Mesilato de doxazosina 4mg – Eurofarma", preco: 30.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 37, nome: "Neo fedipina 10mg – Neo Química", preco: 21.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 38, nome: "Neo fedipina 20mg – Neo Química", preco: 18.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 39, nome: "Olmesartana medoxomila 20mg – Eurofarma", preco: 45.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 40, nome: "Olmesartana + HCTZ 20mg+12,5mg", preco: 45.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 41, nome: "Olmesartana + HCTZ 40mg+12,5mg – Eurofarma", preco: 54.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 42, nome: "Olmesartana + HCTZ 40mg+25mg – Eurofarma", preco: 45.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 43, nome: "Olmesartana + HCTZ 40mg+25mg – Germed", preco: 45.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 44, nome: "Renalapril 20mg – Neo Química", preco: 14.94, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 45, nome: "Rivaroxabana 15mg – Germed", preco: 36.50, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Anticoagulante", prescricao: true },
  { id: 46, nome: "Succinato de metropolol 50mg – Biolab", preco: 40.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão e coração" },
  { id: 47, nome: "Vertizan 10mg – Vitamedic", preco: 18.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para vertigem e tontura" },

  // ANTIDIABÉTICOS
  { id: 48, nome: "Cloridrato de metformina – Teuto", preco: 12.50, categoria: "Antidiabéticos", emoji: "🩸", desc: "Controle da glicemia" },
  { id: 49, nome: "Cloridrato de metformina 850mg – Teuto", preco: 13.50, categoria: "Antidiabéticos", emoji: "🩸", desc: "Controle da glicemia" },
  { id: 50, nome: "Glibenclamida 5mg – Cimed", preco: 5.00, categoria: "Antidiabéticos", emoji: "🩸", desc: "Para diabetes tipo 2" },
  { id: 51, nome: "Glicazida 30mg – Torrent Pharma", preco: 22.00, categoria: "Antidiabéticos", emoji: "🩸", desc: "Para diabetes tipo 2" },
  { id: 52, nome: "Glicazida 60mg – Pharlab", preco: 40.00, categoria: "Antidiabéticos", emoji: "🩸", desc: "Para diabetes tipo 2" },// ANTIBIÓTICOS
  { id: 53, nome: "Amoxicilina 500mg – Cimed", preco: 20.00, categoria: "Antibióticos", emoji: "🦠", desc: "Antibiótico", prescricao: true },
  { id: 54, nome: "Amoxicilina + clavulanato 875mg+125mg", preco: 90.00, categoria: "Antibióticos", emoji: "🦠", desc: "Antibiótico potente", prescricao: true },
  { id: 55, nome: "Amoxicilina + clavulanato suspensão 400mg+57mg", preco: 45.00, categoria: "Antibióticos", emoji: "🦠", desc: "Antibiótico infantil", prescricao: true },
  { id: 56, nome: "Azitromicina 500mg comprimido", preco: 13.00, categoria: "Antibióticos", emoji: "🦠", desc: "Antibiótico", prescricao: true },
  { id: 57, nome: "Azitromicina suspensão 900mg", preco: 45.00, categoria: "Antibióticos", emoji: "🦠", desc: "Antibiótico infantil", prescricao: true },
  { id: 58, nome: "Cefalexina 250mg/5ml", preco: 26.00, categoria: "Antibióticos", emoji: "🦠", desc: "Antibiótico", prescricao: true },
  { id: 59, nome: "Cefalexina 500mg", preco: 16.00, categoria: "Antibióticos", emoji: "🦠", desc: "Antibiótico", prescricao: true },
  { id: 60, nome: "Cetoconazol 200mg", preco: 8.00, categoria: "Antibióticos", emoji: "🦠", desc: "Antifúngico", prescricao: true },
  { id: 61, nome: "Ciprofloxacino 500mg – Globo Pharma", preco: 16.00, categoria: "Antibióticos", emoji: "🦠", desc: "Antibiótico", prescricao: true },
  { id: 62, nome: "Ciprofloxacino 500mg – Pharlab", preco: 15.90, categoria: "Antibióticos", emoji: "🦠", desc: "Antibiótico", prescricao: true },
  { id: 63, nome: "Fluconazol 150mg (1 cápsula)", preco: 3.00, categoria: "Antibióticos", emoji: "🦠", desc: "Antifúngico", prescricao: true },
  { id: 64, nome: "Fluconazol 150mg (2 cápsulas)", preco: 8.00, categoria: "Antibióticos", emoji: "🦠", desc: "Antifúngico", prescricao: true },
  { id: 65, nome: "Meracilina 500.000mg", preco: 24.00, categoria: "Antibióticos", emoji: "🦠", desc: "Antibiótico", prescricao: true },
  { id: 66, nome: "Policlavumoxil 500mg+125mg", preco: 82.99, categoria: "Antibióticos", emoji: "🦠", desc: "Antibiótico potente", prescricao: true },
  { id: 67, nome: "Tetraciclina 500mg", preco: 5.00, categoria: "Antibióticos", emoji: "🦠", desc: "Antibiótico", prescricao: true },

  // COLESTEROL
  { id: 68, nome: "Ciprofibrato 100mg – Biolab", preco: 24.88, categoria: "Colesterol", emoji: "🫀", desc: "Para triglicerídeos" },
  { id: 69, nome: "Rosuvastatina cálcica – Eurofarma", preco: 23.00, categoria: "Colesterol", emoji: "🫀", desc: "Para colesterol" },
  { id: 70, nome: "Sinvastatina 20mg – Globo Pharma", preco: 15.87, categoria: "Colesterol", emoji: "🫀", desc: "Para colesterol" },
  { id: 71, nome: "Sinvastatina 40mg – Legrand", preco: 14.00, categoria: "Colesterol", emoji: "🫀", desc: "Para colesterol" },

  // COLÍRIOS
  { id: 72, nome: "Colírio Geolab 0,15mg/ml + 0,3mg/ml", preco: 14.34, categoria: "Colírios", emoji: "👁️", desc: "Para olhos secos e irritados" },
  { id: 73, nome: "Colírio Neo Brasil 0,15mg/ml + 0,30mg/ml", preco: 17.45, categoria: "Colírios", emoji: "👁️", desc: "Para olhos secos e irritados" },
  { id: 74, nome: "Colírio Teuto 0,15mg/ml + 0,30mg/ml", preco: 13.20, categoria: "Colírios", emoji: "👁️", desc: "Para olhos secos e irritados" },
  { id: 75, nome: "Maleato de timolol 5mg/ml – Neo Química", preco: 16.00, categoria: "Colírios", emoji: "👁️", desc: "Para glaucoma", prescricao: true },
  { id: 76, nome: "Otomixyn – Multilab", preco: 10.00, categoria: "Colírios", emoji: "👁️", desc: "Para ouvido" },

  // DIGESTIVOS
  { id: 77, nome: "Buscopan comprimido", preco: 39.00, categoria: "Digestivos", emoji: "🌿", desc: "Para cólicas e espasmos" },
  { id: 78, nome: "Buscopan gotas", preco: 39.00, categoria: "Digestivos", emoji: "🌿", desc: "Para cólicas e espasmos" },
  { id: 79, nome: "Buscoplex composto – Natulab", preco: 18.50, categoria: "Digestivos", emoji: "🌿", desc: "Para cólicas" },
  { id: 80, nome: "Cloridrato de metoclopramida 4mg/ml", preco: 6.00, categoria: "Digestivos", emoji: "🌿", desc: "Para enjoo e náusea" },
  { id: 81, nome: "Digestil 10mg (bromoprida)", preco: 11.00, categoria: "Digestivos", emoji: "🌿", desc: "Para enjoo e náusea" },
  { id: 82, nome: "Digevita (bromoprida 4mg/ml)", preco: 7.00, categoria: "Digestivos", emoji: "🌿", desc: "Para enjoo e náusea" },
  { id: 83, nome: "Espasmopan composto", preco: 20.00, categoria: "Digestivos", emoji: "🌿", desc: "Para cólicas e espasmos" },
  { id: 84, nome: "Espasmopan composto gotas", preco: 20.00, categoria: "Digestivos", emoji: "🌿", desc: "Para cólicas e espasmos" },
  { id: 85, nome: "Extrato Aquoso de Própolis 20ml", preco: 24.99, categoria: "Digestivos", emoji: "🍯", desc: "Fortalece a imunidade" },
  { id: 86, nome: "Florax adulto", preco: 10.00, categoria: "Digestivos", emoji: "🌿", desc: "Probiótico para flora intestinal" },
  { id: 87, nome: "Florax infantil", preco: 10.00, categoria: "Digestivos", emoji: "🌿", desc: "Probiótico para crianças" },
  { id: 88, nome: "Lactugold xarope 120ml", preco: 22.00, categoria: "Digestivos", emoji: "🌿", desc: "Laxante suave" },
  { id: 89, nome: "Leite de Magnésia Gastrimec 80ml", preco: 12.00, categoria: "Digestivos", emoji: "🌿", desc: "Antiácido e laxante" },
  { id: 90, nome: "Neogermina", preco: 6.00, categoria: "Digestivos", emoji: "🌿", desc: "Regulador intestinal" },
  { id: 91, nome: "Óleo Mineral Laxante Teuto 100ml", preco: 12.82, categoria: "Digestivos", emoji: "🌿", desc: "Laxante suave" },
  { id: 92, nome: "Omeprazol 20mg 56 cápsulas genérico", preco: 20.00, categoria: "Digestivos", emoji: "🌿", desc: "Para gastrite e refluxo" },
  { id: 93, nome: "Pantoprazol sódico 40mg (30 comp.)", preco: 15.00, categoria: "Digestivos", emoji: "🌿", desc: "Protetor gástrico" },
  { id: 94, nome: "Profergan 25mg (prometazina)", preco: 11.60, categoria: "Digestivos", emoji: "🌿", desc: "Para enjoo e alergia" },
  { id: 95, nome: "Simeticona antigases 75mg/ml", preco: 5.00, categoria: "Digestivos", emoji: "🌿", desc: "Para gases e cólicas" },// HIDRATAÇÃO
    { id: 96, nome: "Rehidralin", preco: 6.00, categoria: "Hidratação", emoji: "💧", desc: "Sais para reidratação oral" },
    { id: 97, nome: "Soro Helidra sabor guaraná 500ml", preco: 17.00, categoria: "Hidratação", emoji: "💧", desc: "Soro de reidratação oral" },
    { id: 98, nome: "Soro Helidra sabor uva 500ml", preco: 17.00, categoria: "Hidratação", emoji: "💧", desc: "Soro de reidratação oral" },
    { id: 99, nome: "Soro Neolyte sabor limão 500ml", preco: 17.00, categoria: "Hidratação", emoji: "💧", desc: "Soro de reidratação oral" },
    { id: 100, nome: "Soro Neolyte sabor uva em pó (29,44g)", preco: 6.00, categoria: "Hidratação", emoji: "💧", desc: "Soro de reidratação em pó" },

    // POMADAS
    { id: 101, nome: "Acetato de dexametasona 1mg/g pomada", preco: 12.00, categoria: "Pomadas", emoji: "🧴", desc: "Anti-inflamatório tópico" },
    { id: 102, nome: "Acetato de hidrocortisona 10mg/g", preco: 16.00, categoria: "Pomadas", emoji: "🧴", desc: "Corticoide tópico" },
    { id: 103, nome: "Bacina", preco: 10.00, categoria: "Pomadas", emoji: "🧴", desc: "Antibiótico tópico" },
    { id: 104, nome: "Betacortazol", preco: 17.00, categoria: "Pomadas", emoji: "🧴", desc: "Corticoide tópico" },
    { id: 105, nome: "Cetoconazol pomada", preco: 14.00, categoria: "Pomadas", emoji: "🧴", desc: "Antifúngico tópico" },
    { id: 106, nome: "Hemorroydina", preco: 26.20, categoria: "Pomadas", emoji: "🧴", desc: "Para hemorroidas" },
    { id: 107, nome: "Hervirax 50mg/g (aciclovir pomada)", preco: 10.00, categoria: "Pomadas", emoji: "🧴", desc: "Para herpes labial" },
    { id: 108, nome: "Lidocaína 50mg/g", preco: 17.00, categoria: "Pomadas", emoji: "🧴", desc: "Anestésico tópico" },
    { id: 109, nome: "Minoxidil 50mg/ml", preco: 60.00, categoria: "Pomadas", emoji: "🧴", desc: "Para queda de cabelo", prescricao: true },
    { id: 110, nome: "Oncicrem-A 1mg/g", preco: 10.35, categoria: "Pomadas", emoji: "🧴", desc: "Creme dermatológico" },
    { id: 111, nome: "Promergan 20mg/g", preco: 14.00, categoria: "Pomadas", emoji: "🧴", desc: "Anti-histamínico tópico" },
    { id: 112, nome: "Sulfadiazina de prata 10mg/g", preco: 16.00, categoria: "Pomadas", emoji: "🧴", desc: "Para queimaduras" },

    // SUPLEMENTOS
    { id: 113, nome: "Apetiferr B+C uva", preco: 19.00, categoria: "Suplementos", emoji: "🌟", desc: "Suplemento vitamínico" },
    { id: 114, nome: "Bioargi C (500mg Ác. Ascórbico + 500mg L-Arginina)", preco: 29.00, categoria: "Suplementos", emoji: "🌟", desc: "Suplemento imunidade" },
    { id: 115, nome: "Coenzima Q10 50mg (60 cápsulas)", preco: 83.48, categoria: "Suplementos", emoji: "🌟", desc: "Antioxidante" },
    { id: 116, nome: "Vitamina B12 metilcobalamina (60 cápsulas)", preco: 45.00, categoria: "Suplementos", emoji: "🌟", desc: "Vitamina B12 ativa" },
  ];

const PALAVRAS_CONTROLADAS_RESUMO = [
  "clonazepam","diazepam","alprazolam","bromazepam","lorazepam","midazolam",
  "nitrazepam","clobazam","flunitrazepam","triazolam","clordiazepóxido",
  "amitriptilina","nortriptilina","imipramina","clomipramina","desipramina",
  "amoxapina","maprotilina","trimipramina","doxepina",
  "paroxetina","metilfenidato","modafinila","zolpidem","zopiclona","eszopiclona","bupropiona",
  "haloperidol","risperidona","clorpromazina","trifluoperazina","levomepromazina",
  "tioridazina","flufenazina","pimozida","sulpirida",
  "fenobarbital","pentobarbital","secobarbital","amobarbital",
  "tramadol","codeína","morfina","oxicodona","hidrocodona","buprenorfina",
  "metadona","fentanila","meperidina","petidina","tapentadol",
  "isotretinoína","acitretina","talidomida",
  "anfetamina","lisdexanfetamina","femproporex","mazindol","sibutramina","anfepramona",
  "gabapentina","pregabalina","vigabatrina","tiagabina","felbamato",
  "parac+cod","parac cod","(a2)","+codeína",
];

  export function resumoCatalogo(produtos: Produto[]): string {
    const categorias: Record<string, Produto[]> = {};
    produtos.forEach(p => {
      if (p.usoControlado) return;
      const nomeLow = p.nome.toLowerCase();
      if (PALAVRAS_CONTROLADAS_RESUMO.some(k => nomeLow.includes(k))) return;
      if (!categorias[p.categoria]) categorias[p.categoria] = [];
      categorias[p.categoria].push(p);
    });
    let resumo = "CATÁLOGO DE PRODUTOS DISPONÍVEIS (com preços):\n\n";
    Object.entries(categorias).forEach(([cat, prods]) => {
      resumo += `${cat}:\n`;
      prods.forEach(p => {
        let linha = `• ${p.nome} - R$${p.preco.toFixed(2)}`;
        if (p.promocao) linha += ` (${p.promocao.descricao})`;
        if (p.prescricao) linha += " ⚠️ Receita médica";
        resumo += linha + "\n";
      });
      resumo += "\n";
    });
    return resumo;
  }

  export function calcularPreco(produto: Produto, quantidade: number): number {
    if (produto.promocao && quantidade >= produto.promocao.quantidade) {
      const conjuntos = Math.floor(quantidade / produto.promocao.quantidade);
      const resto = quantidade % produto.promocao.quantidade;
      return (conjuntos * produto.promocao.precoTotal) + (resto * (produto.precoOriginal || produto.preco));
    }
    return produto.preco * quantidade;
  }
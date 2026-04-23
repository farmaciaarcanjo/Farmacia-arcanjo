export interface Produto {
  id: number;
  nome: string;
  preco: number;
  precoOriginal?: number;
  categoria: string;
  emoji: string;
  desc: string;
  prescricao?: boolean;
}

export const VERSAO_CATALOGO = "v4-2026-04";

export const PRODUTOS_INICIAIS: Produto[] = [
  // ANALGÉSICOS
  { id: 1, nome: "Aberalgina", preco: 3.50, categoria: "Analgésicos", emoji: "💊", desc: "Analgésico" },
  { id: 2, nome: "Belspan composto", preco: 18.50, categoria: "Analgésicos", emoji: "💊", desc: "Analgésico composto" },
  { id: 3, nome: "Cetoprofeno 150mg", preco: 15.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório" },
  { id: 4, nome: "Colchicina", preco: 14.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório para gota" },
  { id: 5, nome: "Diclofenaco 50mg Altefar", preco: 7.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório" },
  { id: 6, nome: "Diclofenaco 50mg Cimed", preco: 7.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório" },
  { id: 7, nome: "Dipirona 500mg/ml", preco: 4.50, categoria: "Analgésicos", emoji: "💊", desc: "Analgésico e antitérmico" },
  { id: 8, nome: "Dipirona Medquímica 1g", preco: 13.00, categoria: "Analgésicos", emoji: "💊", desc: "Analgésico e antitérmico" },
  { id: 9, nome: "Ibuprofeno gotas", preco: 9.50, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório em gotas" },
  { id: 10, nome: "Ibupril 400mg", preco: 15.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório" },
  { id: 11, nome: "Naproxeno sódico", preco: 23.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório" },
  { id: 12, nome: "Nimesulida 100mg Globo", preco: 5.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório" },
  { id: 13, nome: "Nimesulida 100mg Vitamedic", preco: 5.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório" },
  { id: 14, nome: "Nimesulida gotas", preco: 8.00, precoOriginal: 12.00, categoria: "Analgésicos", emoji: "💊", desc: "🔥 PROMOÇÃO: LEVE 2 por R$8,00" },
  { id: 15, nome: "Piroxicam 20mg", preco: 14.00, categoria: "Analgésicos", emoji: "💊", desc: "Anti-inflamatório" },
  { id: 16, nome: "Tandene", preco: 23.00, categoria: "Analgésicos", emoji: "💆", desc: "Analgésico e relaxante muscular" },
  { id: 17, nome: "Tandriflan", preco: 18.00, categoria: "Analgésicos", emoji: "💊", desc: "Analgésico" },
  { id: 18, nome: "Tyflen 750mg", preco: 13.00, categoria: "Analgésicos", emoji: "💊", desc: "Analgésico" },

  // ANTIGRIPAIS
  { id: 19, nome: "Paracetamol gotas", preco: 6.00, categoria: "Antigripais", emoji: "🤧", desc: "Antitérmico em gotas" },
  { id: 20, nome: "Paracetamol gotas laranja", preco: 6.00, categoria: "Antigripais", emoji: "🍊", desc: "Antitérmico sabor laranja" },

  // ANTI-HIPERTENSIVOS
  { id: 21, nome: "Atenolol 25mg", preco: 6.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 22, nome: "Atenolol 50mg", preco: 7.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 23, nome: "Anlodipino 5mg", preco: 5.50, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 24, nome: "Carvedilol 3,125mg", preco: 12.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão e coração" },
  { id: 25, nome: "Carvedilol 6,25mg", preco: 10.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão e coração" },
  { id: 26, nome: "Clortalidona 50mg", preco: 17.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Diurético para pressão" },
  { id: 27, nome: "Espironolactona 25mg", preco: 20.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Diurético" },
  { id: 28, nome: "Furosemida 40mg", preco: 8.50, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Diurético" },
  { id: 29, nome: "Hidroclorotiazida 25mg", preco: 5.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Diurético para pressão" },
  { id: 30, nome: "Losartana 50mg", preco: 10.00, precoOriginal: 15.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "🔥 PROMOÇÃO: LEVE 3 por R$10,00" },
  { id: 31, nome: "Enalapril 10mg", preco: 10.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 32, nome: "Enalapril 20mg", preco: 12.50, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 33, nome: "Doxazosina 2mg", preco: 18.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 34, nome: "Doxazosina 4mg", preco: 30.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 35, nome: "Neo fedipina 10mg", preco: 21.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 36, nome: "Neo fedipina 20mg", preco: 18.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 37, nome: "Olmesartana 20mg", preco: 45.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 38, nome: "Olmesartana + HCTZ 20+12,5mg", preco: 45.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Pressão alta com diurético" },
  { id: 39, nome: "Olmesartana + HCTZ 40+12,5mg", preco: 54.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Pressão alta com diurético" },
  { id: 40, nome: "Olmesartana + HCTZ 40+25mg", preco: 45.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Pressão alta com diurético" },
  { id: 41, nome: "Renalapril 20mg", preco: 14.94, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão alta" },
  { id: 42, nome: "Rivaroxabana 15mg", preco: 36.50, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Anticoagulante", prescricao: true },
  { id: 43, nome: "Metropolol 50mg", preco: 40.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para pressão e coração" },
  { id: 44, nome: "Vertizan 10mg", preco: 18.00, categoria: "Anti-hipertensivos", emoji: "❤️", desc: "Para tontura e vertigem" },

  // ANTIDIABÉTICOS
  { id: 45, nome: "Metformina", preco: 12.50, categoria: "Antidiabéticos", emoji: "🩸", desc: "Para controle da glicemia" },
  { id: 46, nome: "Metformina 850mg", preco: 13.50, categoria: "Antidiabéticos", emoji: "🩸", desc: "Para controle da glicemia" },
  { id: 47, nome: "Glibenclamida 5mg", preco: 5.00, categoria: "Antidiabéticos", emoji: "🩸", desc: "Para diabetes tipo 2" },
  { id: 48, nome: "Glicazida 30mg", preco: 22.00, categoria: "Antidiabéticos", emoji: "🩸", desc: "Para diabetes tipo 2" },
  { id: 49, nome: "Glicazida 60mg", preco: 40.00, categoria: "Antidiabéticos", emoji: "🩸", desc: "Para diabetes tipo 2" },

  // ANTIBIÓTICOS
  { id: 50, nome: "Amoxicilina 500mg", preco: 20.00, categoria: "Antibióticos", emoji: "💊", desc: "Antibiótico", prescricao: true },
  { id: 51, nome: "Amoxicilina + clavulanato 875mg", preco: 90.00, categoria: "Antibióticos", emoji: "💊", desc: "Antibiótico com clavulanato", prescricao: true },
  { id: 52, nome: "Amoxicilina + clavulanato suspensão", preco: 45.00, categoria: "Antibióticos", emoji: "💊", desc: "Antibiótico em suspensão", prescricao: true },
  { id: 53, nome: "Azitromicina 500mg", preco: 13.00, categoria: "Antibióticos", emoji: "💊", desc: "Antibiótico", prescricao: true },
  { id: 54, nome: "Azitromicina suspensão", preco: 45.00, categoria: "Antibióticos", emoji: "💊", desc: "Antibiótico em suspensão", prescricao: true },
  { id: 55, nome: "Cefalexina 250mg", preco: 26.00, categoria: "Antibióticos", emoji: "💊", desc: "Antibiótico", prescricao: true },
  { id: 56, nome: "Cefalexina 500mg", preco: 16.00, categoria: "Antibióticos", emoji: "💊", desc: "Antibiótico", prescricao: true },
  { id: 57, nome: "Cetoconazol 200mg", preco: 8.00, categoria: "Antibióticos", emoji: "💊", desc: "Antifúngico", prescricao: true },
  { id: 58, nome: "Ciprofloxacino 500mg", preco: 16.00, categoria: "Antibióticos", emoji: "💊", desc: "Antibiótico", prescricao: true },
  { id: 59, nome: "Fluconazol 1 cápsula", preco: 3.00, categoria: "Antibióticos", emoji: "💊", desc: "Antifúngico (1 cáps)", prescricao: true },
  { id: 60, nome: "Fluconazol 2 cápsulas", preco: 8.00, categoria: "Antibióticos", emoji: "💊", desc: "Antifúngico (2 cáps)", prescricao: true },
  { id: 61, nome: "Meracilina", preco: 24.00, categoria: "Antibióticos", emoji: "💊", desc: "Antibiótico", prescricao: true },
  { id: 62, nome: "Policlavumoxil", preco: 82.99, categoria: "Antibióticos", emoji: "💊", desc: "Antibiótico de amplo espectro", prescricao: true },
  { id: 63, nome: "Tetraciclina 500mg", preco: 5.00, categoria: "Antibióticos", emoji: "💊", desc: "Antibiótico", prescricao: true },

  // COLESTEROL
  { id: 64, nome: "Ciprofibrato 100mg", preco: 24.88, categoria: "Colesterol", emoji: "🫀", desc: "Para triglicerídeos" },
  { id: 65, nome: "Rosuvastatina", preco: 23.00, categoria: "Colesterol", emoji: "🫀", desc: "Para colesterol alto" },
  { id: 66, nome: "Sinvastatina 20mg", preco: 15.87, categoria: "Colesterol", emoji: "🫀", desc: "Para colesterol alto" },
  { id: 67, nome: "Sinvastatina 40mg", preco: 14.00, categoria: "Colesterol", emoji: "🫀", desc: "Para colesterol alto" },

  // COLÍRIOS
  { id: 68, nome: "Colírio Geolab", preco: 14.34, categoria: "Colírios", emoji: "👁️", desc: "Lubrificante ocular" },
  { id: 69, nome: "Colírio Neo Brasil", preco: 17.45, categoria: "Colírios", emoji: "👁️", desc: "Lubrificante ocular" },
  { id: 70, nome: "Colírio Teuto", preco: 13.20, categoria: "Colírios", emoji: "👁️", desc: "Lubrificante ocular" },
  { id: 71, nome: "Timolol 5mg/ml", preco: 16.00, categoria: "Colírios", emoji: "👁️", desc: "Para pressão ocular / glaucoma", prescricao: true },
  { id: 72, nome: "Otomixyn", preco: 10.00, categoria: "Colírios", emoji: "👂", desc: "Solução otológica" },

  // DIGESTIVOS
  { id: 73, nome: "Buscopan composto", preco: 39.00, categoria: "Digestivos", emoji: "🛡️", desc: "Antiespasmódico para cólicas" },
  { id: 74, nome: "Buscopan gotas", preco: 39.00, categoria: "Digestivos", emoji: "🛡️", desc: "Antiespasmódico em gotas" },
  { id: 75, nome: "Buscoplex", preco: 18.50, categoria: "Digestivos", emoji: "🛡️", desc: "Para cólicas" },
  { id: 76, nome: "Metoclopramida", preco: 6.00, categoria: "Digestivos", emoji: "💊", desc: "Para enjoo e vômito" },
  { id: 77, nome: "Digestil 10mg", preco: 11.00, categoria: "Digestivos", emoji: "💊", desc: "Auxiliar da digestão" },
  { id: 78, nome: "Digevita", preco: 7.00, categoria: "Digestivos", emoji: "💊", desc: "Auxiliar da digestão" },
  { id: 79, nome: "Espasmopan", preco: 20.00, categoria: "Digestivos", emoji: "🛡️", desc: "Antiespasmódico" },
  { id: 80, nome: "Espasmopan gotas", preco: 20.00, categoria: "Digestivos", emoji: "🛡️", desc: "Antiespasmódico em gotas" },
  { id: 81, nome: "Própolis 20ml", preco: 24.99, categoria: "Digestivos", emoji: "🍯", desc: "Fortalece a imunidade" },
  { id: 82, nome: "Florax adulto", preco: 10.00, categoria: "Digestivos", emoji: "🦠", desc: "Probiótico para flora intestinal" },
  { id: 83, nome: "Florax infantil", preco: 10.00, categoria: "Digestivos", emoji: "🦠", desc: "Probiótico infantil" },
  { id: 84, nome: "Lactugold", preco: 22.00, categoria: "Digestivos", emoji: "🍶", desc: "Laxante" },
  { id: 85, nome: "Leite de Magnésia", preco: 12.00, categoria: "Digestivos", emoji: "🥛", desc: "Antiácido e laxante suave" },
  { id: 86, nome: "Neogermina", preco: 6.00, categoria: "Digestivos", emoji: "💊", desc: "Regulador intestinal" },
  { id: 87, nome: "Óleo Mineral", preco: 12.82, categoria: "Digestivos", emoji: "🌿", desc: "Laxante suave" },
  { id: 88, nome: "Omeprazol 20mg", preco: 20.00, categoria: "Digestivos", emoji: "💊", desc: "Para gastrite e refluxo" },
  { id: 89, nome: "Pantoprazol 40mg", preco: 15.00, categoria: "Digestivos", emoji: "🛡️", desc: "Protetor gástrico" },
  { id: 90, nome: "Profergan 25mg", preco: 11.60, categoria: "Digestivos", emoji: "💊", desc: "Antialérgico / antiemético" },
  { id: 91, nome: "Simeticona", preco: 5.00, categoria: "Digestivos", emoji: "💨", desc: "Alivia gases e cólicas" },

  // HIDRATAÇÃO
  { id: 92, nome: "Rehidralin", preco: 6.00, categoria: "Hidratação", emoji: "💧", desc: "Sais para reidratação oral" },
  { id: 93, nome: "Soro Helidra guaraná", preco: 17.00, categoria: "Hidratação", emoji: "💧", desc: "Soro caseiro sabor guaraná" },
  { id: 94, nome: "Soro Helidra uva", preco: 17.00, categoria: "Hidratação", emoji: "💧", desc: "Soro caseiro sabor uva" },
  { id: 95, nome: "Soro Neolyte limão", preco: 17.00, categoria: "Hidratação", emoji: "💧", desc: "Soro reidratante sabor limão" },
  { id: 96, nome: "Soro Neolyte uva (pó)", preco: 6.00, categoria: "Hidratação", emoji: "💧", desc: "Soro em pó sabor uva" },

  // POMADAS
  { id: 97, nome: "Dexametasona pomada", preco: 12.00, categoria: "Pomadas", emoji: "🧴", desc: "Anti-inflamatório tópico" },
  { id: 98, nome: "Hidrocortisona", preco: 16.00, categoria: "Pomadas", emoji: "🧴", desc: "Anti-inflamatório tópico" },
  { id: 99, nome: "Bacina", preco: 10.00, categoria: "Pomadas", emoji: "🧴", desc: "Antibiótico tópico" },
  { id: 100, nome: "Betacortazol", preco: 17.00, categoria: "Pomadas", emoji: "🧴", desc: "Anti-inflamatório / antibiótico" },
  { id: 101, nome: "Cetoconazol pomada", preco: 14.00, categoria: "Pomadas", emoji: "🧴", desc: "Antifúngico tópico" },
  { id: 102, nome: "Hemorroydina", preco: 26.20, categoria: "Pomadas", emoji: "🧴", desc: "Para hemorroidas" },
  { id: 103, nome: "Hervirax (aciclovir)", preco: 10.00, categoria: "Pomadas", emoji: "🧴", desc: "Para herpes labial" },
  { id: 104, nome: "Lidocaína", preco: 17.00, categoria: "Pomadas", emoji: "🧴", desc: "Anestésico tópico" },
  { id: 105, nome: "Minoxidil", preco: 60.00, categoria: "Pomadas", emoji: "🧴", desc: "Para crescimento capilar", prescricao: true },
  { id: 106, nome: "Oncicrem-A", preco: 10.35, categoria: "Pomadas", emoji: "🧴", desc: "Antifúngico para unhas" },
  { id: 107, nome: "Promergan", preco: 14.00, categoria: "Pomadas", emoji: "🧴", desc: "Antialérgico tópico" },
  { id: 108, nome: "Sulfadiazina de prata", preco: 16.00, categoria: "Pomadas", emoji: "🧴", desc: "Para queimaduras e feridas" },

  // SUPLEMENTOS
  { id: 109, nome: "Apetiferr uva", preco: 19.00, categoria: "Suplementos", emoji: "🍇", desc: "Estimulante de apetite" },
  { id: 110, nome: "Bioargi C", preco: 29.00, categoria: "Suplementos", emoji: "🍊", desc: "Vitamina C com arginina" },
  { id: 111, nome: "Coenzima Q10", preco: 83.48, categoria: "Suplementos", emoji: "💛", desc: "Antioxidante para o coração" },
  { id: 112, nome: "Vitamina B12 metilcobalamina", preco: 45.00, categoria: "Suplementos", emoji: "🧪", desc: "Vitamina B12" },
];

export function resumoCatalogo(produtos: Produto[]): string {
  const porCategoria: Record<string, Produto[]> = {};
  produtos.forEach(p => {
    if (!porCategoria[p.categoria]) porCategoria[p.categoria] = [];
    porCategoria[p.categoria].push(p);
  });
  return Object.entries(porCategoria)
    .map(([cat, items]) => `${cat.toUpperCase()}: ${items.map(p => `${p.nome} (R$${p.preco.toFixed(2)})`).join(", ")}`)
    .join("\n");
}

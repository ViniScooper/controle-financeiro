const { PDFParse } = require('pdf-parse');

/**
 * Categorização Inteligente por palavras-chave
 */
function sugerirCategoria(descricao = '') {
  const d = String(descricao).toUpperCase();

  // Transporte
  if (d.includes('UBER') || d.includes('99APP') || d.includes('99*') || d.includes('POSTO') || 
      d.includes('COMBUSTIVEL') || d.includes('AUTO') || d.includes('ESTAC') || d.includes('IPVA') || 
      d.includes('PEDAGIO') || d.includes('METRO') || d.includes('SHELL') || d.includes('IPIRANGA') || d.includes('BR DISTRIBUIDORA')) {
    return 'Transporte';
  }

  // Supermercado
  if (d.includes('PALATO') || d.includes('MERCADO') || d.includes('SUPERM') || d.includes('ATACADAO') || 
      d.includes('ASSAI') || d.includes('CARREFOUR') || d.includes('EXTRA') || d.includes('HORTIFRUTI') || 
      d.includes('BOMPRECO') || d.includes('HIPER') || d.includes('PAO DE ACUCAR') || d.includes('BIG') || d.includes('ATACADO')) {
    return 'Supermercado';
  }

  // Saúde
  if (d.includes('IMIFARMA') || d.includes('DROGASIL') || d.includes('FARMACIA') || d.includes('PAGUE MENOS') || 
      d.includes('MEDIC') || d.includes('HOSP') || d.includes('DROGARIA') || d.includes('CLINICA') || 
      d.includes('LABORAT') || d.includes('DENT') || d.includes('REMEDIO') || d.includes('CONSULTORIO') || d.includes('SAO PAULO FARM')) {
    return 'Saúde';
  }

  // Alimentação
  if (d.includes('RESTAURANTE') || d.includes('IFOOD') || d.includes('LANCH') || d.includes('BURGER') || 
      d.includes('PIZZA') || d.includes('PADARIA') || d.includes('CAFE') || d.includes('BAR ') || 
      d.includes('ALMOCO') || d.includes('CHURRAS') || d.includes('DOCERIA') || d.includes('SORVETE') || 
      d.includes('MCDONALD') || d.includes('SUBWAY') || d.includes('HABIB') || d.includes('SUSHI')) {
    return 'Alimentação';
  }

  // Lazer & Eventos
  if (d.includes('SMW') || d.includes('EVENTOS') || d.includes('CINEMA') || d.includes('INGRESSO') || 
      d.includes('SHOW') || d.includes('FESTA') || d.includes('SYMPLA') || d.includes('HOTEL') || 
      d.includes('VIAGEM') || d.includes('RESORT') || d.includes('PUBS')) {
    return 'Lazer';
  }

  // Esporte & Bem-estar
  if (d.includes('JIU') || d.includes('ACADEMIA') || d.includes('FITNESS') || d.includes('SMARTFIT') || 
      d.includes('CROSSFIT') || d.includes('SUPLEMENT') || d.includes('GROWTH')) {
    return 'Esporte';
  }

  // Assinaturas & Streaming
  if (d.includes('NETFLIX') || d.includes('SPOTIFY') || d.includes('AMAZON') || d.includes('PRIME') || 
      d.includes('APPLE') || d.includes('GOOGLE') || d.includes('YOUTUBE') || d.includes('DISNEY') || 
      d.includes('HBO') || d.includes('MAX') || d.includes('OPENAI')) {
    return 'Assinaturas';
  }

  // Moradia & Contas Essenciais
  if (d.includes('CELPE') || d.includes('ENEL') || d.includes('NEOENERGIA') || d.includes('COMPESA') || 
      d.includes('SABESP') || d.includes('CLARO') || d.includes('VIVO') || d.includes('TIM') || 
      d.includes('CONDOM') || d.includes('ALUGUEL') || d.includes('INTERNET')) {
    return 'Essencial';
  }

  return 'Outros';
}

/**
 * Parser para Extratos em PDF (Itaú e bancos compatíveis)
 */
async function parsePdfStatement(buffer) {
  const parser = new PDFParse(new Uint8Array(buffer));
  const result = await parser.getText();
  const fullText = (result.pages || []).map(p => p.text).join('\n');
  const lines = fullText.split('\n');

  const transactions = [];
  // Regex: DD/MM/YYYY seguido por descrição e valores (R$)
  const itauLineRegex = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})(?:\s+(-?\d{1,3}(?:\.\d{3})*,\d{2}))?$/;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const match = trimmed.match(itauLineRegex);
    if (match) {
      const dataStr = match[1];
      const desc = match[2].trim();
      const valStr = match[3];

      const descUpper = desc.toUpperCase();
      // Ignora linhas de saldo e resumos de limite
      if (descUpper.includes('SALDO DO DIA') || 
          descUpper.includes('SALDO ANTERIOR') || 
          descUpper.includes('SDO CTA') || 
          descUpper.includes('TOTAL CONTRATADO') || 
          descUpper.includes('LIMITE DA CONTA') || 
          descUpper.includes('RENDIMENTOS')) {
        continue;
      }

      const valorNum = parseFloat(valStr.replace(/\./g, '').replace(',', '.'));
      if (isNaN(valorNum) || valorNum === 0) continue;

      const [dia, mes, ano] = dataStr.split('/');
      const isoDate = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;

      transactions.push({
        id: `stmt-${Date.now()}-${i}`,
        data: isoDate,
        dataFormatada: dataStr,
        descricao: desc,
        valor: Math.abs(valorNum),
        tipo: valorNum < 0 ? 'saida' : 'entrada',
        categoria: sugerirCategoria(desc)
      });
    }
  }

  return transactions;
}

/**
 * Parser para Extratos em OFX (Itaú, Nubank, Bradesco, BB, Inter, etc.)
 */
function parseOfxStatement(text) {
  const transactions = [];
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  let i = 0;

  while ((match = stmtTrnRegex.exec(text)) !== null) {
    const block = match[1];
    
    // Data (<DTPOSTED>20260918...)
    const dtMatch = block.match(/<DTPOSTED>\s*(\d{4})(\d{2})(\d{2})/i);
    // Valor (<TRNAMT>-15.00)
    const valMatch = block.match(/<TRNAMT>\s*(-?[\d\.]+)/i);
    // Descrição (<MEMO> ou <NAME>)
    const memoMatch = block.match(/<MEMO>\s*([^<\r\n]+)/i);
    const nameMatch = block.match(/<NAME>\s*([^<\r\n]+)/i);

    if (dtMatch && valMatch) {
      const ano = dtMatch[1];
      const mes = dtMatch[2];
      const dia = dtMatch[3];
      const isoDate = `${ano}-${mes}-${dia}`;
      const dataFormatada = `${dia}/${mes}/${ano}`;

      const valorNum = parseFloat(valMatch[1]);
      if (isNaN(valorNum) || valorNum === 0) continue;

      const desc = (memoMatch ? memoMatch[1] : (nameMatch ? nameMatch[1] : 'Transação Bancária')).trim();

      transactions.push({
        id: `stmt-ofx-${Date.now()}-${i++}`,
        data: isoDate,
        dataFormatada,
        descricao: desc,
        valor: Math.abs(valorNum),
        tipo: valorNum < 0 ? 'saida' : 'entrada',
        categoria: sugerirCategoria(desc)
      });
    }
  }

  return transactions;
}

/**
 * Parser para Extratos em CSV / TXT
 */
function parseCsvStatement(text) {
  const transactions = [];
  const lines = text.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detecta separador (, ou ;)
    const sep = line.includes(';') ? ';' : ',';
    const parts = line.split(sep).map(p => p.trim().replace(/^["']|["']$/g, ''));

    if (parts.length >= 3) {
      // Procura data (DD/MM/YYYY ou YYYY-MM-DD)
      const dataStr = parts[0];
      const isDateDMY = /^\d{2}\/\d{2}\/\d{4}$/.test(dataStr);
      const isDateYMD = /^\d{4}-\d{2}-\d{2}$/.test(dataStr);

      if (isDateDMY || isDateYMD) {
        let isoDate = dataStr;
        let dataFormatada = dataStr;

        if (isDateDMY) {
          const [d, m, y] = dataStr.split('/');
          isoDate = `${y}-${m}-${d}`;
        } else {
          const [y, m, d] = dataStr.split('-');
          dataFormatada = `${d}/${m}/${y}`;
        }

        const desc = parts[1];
        const valStr = parts[2].replace(/[R$\s]/g, '');
        const valorNum = parseFloat(valStr.replace(/\./g, '').replace(',', '.'));

        if (!isNaN(valorNum) && valorNum !== 0) {
          transactions.push({
            id: `stmt-csv-${Date.now()}-${i}`,
            data: isoDate,
            dataFormatada,
            descricao: desc,
            valor: Math.abs(valorNum),
            tipo: valorNum < 0 ? 'saida' : 'entrada',
            categoria: sugerirCategoria(desc)
          });
        }
      }
    }
  }

  return transactions;
}

/**
 * Parser Principal com detecção automática de formato
 */
async function parseBankStatement(buffer, filename = '') {
  const nameLower = filename.toLowerCase();

  if (nameLower.endsWith('.pdf') || (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46)) {
    return await parsePdfStatement(buffer);
  }

  const textContent = buffer.toString('utf8');

  if (nameLower.endsWith('.ofx') || textContent.includes('<OFX>') || textContent.includes('<STMTTRN>')) {
    return parseOfxStatement(textContent);
  }

  // Tenta CSV / TXT
  return parseCsvStatement(textContent);
}

module.exports = {
  parseBankStatement,
  parsePdfStatement,
  parseOfxStatement,
  parseCsvStatement,
  sugerirCategoria
};

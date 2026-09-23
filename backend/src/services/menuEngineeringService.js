// ============================================================
// backend/src/services/menuEngineeringService.js
// Motor de cálculo de margem e classificação de Kasavana & Smith
// ============================================================

function calcularMargem(preco, custo) {
    const p = parseFloat(preco);
    const c = parseFloat(custo);
    if (!c || c <= 0 || !p || p <= 0) return null;
    return ((p - c) / p) * 100; // Margem bruta percentual
}

function calcularLucroBruto(preco, custo) {
    const p = parseFloat(preco);
    const c = parseFloat(custo);
    if (!c || c <= 0 || !p || p <= 0) return null;
    return p - c; // Lucro em Reais por unidade
}

function media(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Classifica os pratos de uma categoria na matriz:
 * - ESTRELA (Alta margem + Alta popularidade)
 * - VACA LEITEIRA (Baixa margem + Alta popularidade)
 * - ENIGMA (Alta margem + Baixa popularidade)
 * - ABACAXI (Baixa margem + Baixa popularidade)
 */
function classificarPratos(pratosDaCategoria) {
    const comCusto = pratosDaCategoria.filter(p => p.custo && parseFloat(p.custo) > 0);

    let margemMedia = 50; // valor de referência padrão caso poucos tenham custo
    let popMedia = 10;

    if (comCusto.length >= 2) {
        const margens = comCusto.map(p => calcularMargem(p.preco, p.custo));
        const pops = comCusto.map(p => (parseInt(p.pedidos_estimados, 10) || 0) + (parseInt(p.visualizacoes, 10) || 0));
        margemMedia = media(margens);
        popMedia = media(pops);
    }

    return pratosDaCategoria.map(p => {
        const margem = calcularMargem(p.preco, p.custo);
        const lucro = calcularLucroBruto(p.preco, p.custo);
        const pop = (parseInt(p.pedidos_estimados, 10) || 0) + (parseInt(p.visualizacoes, 10) || 0);

        // Se o admin definiu um destaque manual, ele sempre prevalece
        if (p.destaque_manual && p.destaque_manual !== "nenhum") {
            return {
                ...p,
                classificacao: p.destaque_manual,
                origem_classificacao: "manual",
                margem_percentual: margem ? parseFloat(margem.toFixed(1)) : null,
                lucro_unitario: lucro ? parseFloat(lucro.toFixed(2)) : null
            };
        }

        // Se não tiver custo preenchido
        if (!margem) {
            return {
                ...p,
                classificacao: null,
                origem_classificacao: "sem_custo",
                margem_percentual: null,
                lucro_unitario: null
            };
        }

        const altaMargem = margem >= margemMedia;
        const altaPop = pop >= popMedia;

        let classificacao = "abacaxi";
        if (altaMargem && altaPop) classificacao = "estrela";
        else if (!altaMargem && altaPop) classificacao = "vaca_leiteira";
        else if (altaMargem && !altaPop) classificacao = "enigma";

        return {
            ...p,
            classificacao,
            origem_classificacao: "automatico",
            margem_percentual: parseFloat(margem.toFixed(1)),
            lucro_unitario: parseFloat(lucro.toFixed(2))
        };
    });
}

/**
 * Ordenação Estratégica ("Triângulo de Ouro" no Mobile):
 * 1º lugar: Enigma de maior margem ou Estrela
 * 2º e 3º lugares: Estrelas (Prova social + alto lucro)
 * Meio da lista: Vacas Leiteiras e pratos comuns
 * Fim da categoria: Outro Enigma ou Estrela (efeito de recência)
 */
function ordenarPorEstrategia(pratosClassificados) {
    // Se o prato tiver ordem manual específica (> 0), respeita
    return [...pratosClassificados].sort((a, b) => {
        const ordemA = a.ordem_manual || 0;
        const ordemB = b.ordem_manual || 0;

        if (ordemA > 0 && ordemB > 0) return ordemA - ordemB;
        if (ordemA > 0) return -1;
        if (ordemB > 0) return 1;

        // Prioridade visual: Estrela (1) > Enigma (2) > Vaca Leiteira (3) > Abacaxi/Sem dados (4)
        const peso = { estrela: 1, enigma: 2, vaca_leiteira: 3, abacaxi: 4, null: 5 };
        const pesoA = peso[a.classificacao] || 5;
        const pesoB = peso[b.classificacao] || 5;

        if (pesoA !== pesoB) return pesoA - pesoB;

        // Desempate por preço maior (efeito ancoragem)
        return parseFloat(b.preco) - parseFloat(a.preco);
    });
}

module.exports = {
    calcularMargem,
    calcularLucroBruto,
    classificarPratos,
    ordenarPorEstrategia
};

// src/utils/exportUtils.js

/**
 * Converte um array de objetos para uma string CSV e dispara o download.
 * @param {Array<Object>} data - Array de objetos a serem exportados.
 * @param {string} filename - Nome do arquivo a ser salvo.
 */
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert("Nenhum dado para exportar.");
    return;
  }

  // Pega todos os cabeçalhos (chaves dos objetos)
  const headers = Object.keys(data[0]);

  // Cria a linha de cabeçalho (separada por vírgula)
  const csvHeaders = headers.join(";");

  // Mapeia os dados para as linhas CSV
  const csvRows = data.map(row => {
    return headers.map(header => {
      // Pega o valor, tratando valores nulos ou de data
      let value = row[header];
      if (value === null || value === undefined) {
        value = "";
      } else if (value instanceof Date) {
        // Formata a data para um formato legível
        value = value.toLocaleDateString('pt-BR') + ' ' + value.toLocaleTimeString('pt-BR');
      } else {
        // Converte para string e remove quebras de linha/vírgulas que poderiam quebrar o CSV
        value = String(value).replace(/(\r\n|\n|\r)/gm, " ").replace(/;/g, ",").trim();
      }
      return `"${value}"`; // Envolve o valor em aspas para tratar textos com vírgulas internas
    }).join(";");
  });

  // Combina cabeçalhos e linhas
  const csvString = [csvHeaders, ...csvRows].join("\n");

  // Cria um Blob e dispara o download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
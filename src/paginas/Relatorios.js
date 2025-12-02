import React, { useEffect, useState, useRef } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../configuracoes/firebaseConfig";
import { useAuth } from "../configuracoes/AuthContext";

// Util CSV simples (trata datas e objetos)
const exportarCSV = (dados, nomeArquivo) => {
  if (!dados || dados.length === 0) return;

  // Função para serializar valor
  const serializar = (v) => {
    if (v == null) return "";
    if (v instanceof Date) return v.toLocaleString();
    if (typeof v === "object") {
      // Se for Timestamp Firestore (possui toDate) tente converter
      if (typeof v.toDate === "function") {
        return v.toDate().toLocaleString();
      }
      // Caso seja objeto genérico, stringify simples
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    }
    return String(v);
  };

  const colunas = Array.from(
    new Set(
      dados.flatMap((d) =>
        Object.keys(d).filter((k) => k !== "_internal")
      )
    )
  );

  const linhas = dados.map((row) =>
    colunas
      .map((col) => `"${(serializar(row[col]) ?? "").replace(/"/g, '""')}"`)
      .join(";")
  );

  const conteudo = [colunas.join(";"), ...linhas].join("\n");
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nomeArquivo;
  link.click();
};

// Normaliza timestamps em um objeto plano (somente primeiro nível)
const normalizarDoc = (raw) => {
  const obj = {};
  for (const k of Object.keys(raw)) {
    const v = raw[k];
    if (v == null) {
      obj[k] = v;
      continue;
    }
    // Firestore Timestamp tem toDate() ou campos seconds/nanoseconds
    if (typeof v === "object") {
      if (typeof v.toDate === "function") {
        try {
          obj[k] = v.toDate();
          continue;
        } catch {
          // cair para outras verificações
        }
      }
      if (v.seconds !== undefined && v.nanoseconds !== undefined) {
        try {
          obj[k] = new Date(v.seconds * 1000);
          continue;
        } catch {
          // fallback
        }
      }
    }
    obj[k] = v;
  }
  return obj;
};

export default function Relatorios() {
  const { licenca, cnpj } = useAuth();

  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);

  // Filtros
  const [fluxo, setFluxo] = useState("todos");
  const [filtroProduto, setFiltroProduto] = useState("");
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // sugestão do autocomplete
  const [sugestoes, setSugestoes] = useState([]);
  const sugestoesRef = useRef(null);

  const [carregando, setCarregando] = useState(false);

  // Clique fora para fechar autocomplete
  useEffect(() => {
    function handleClickOutside(e) {
      if (sugestoesRef.current && !sugestoesRef.current.contains(e.target)) {
        setSugestoes([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Carregar clientes + produtos + movimentações
  useEffect(() => {
    if (!licenca || !cnpj) return;

    const carregar = async () => {
      setCarregando(true);
      try {
        // CLIENTES
        const qClientes = query(
          collection(db, "clientes"),
          where("licencaCnpj", "==", cnpj),
          orderBy("nome", "asc")
        );
        const snapC = await getDocs(qClientes);
        const arrC = snapC.docs.map((d) => {
          const raw = d.data();
          const norm = normalizarDoc(raw);
          return { id: d.id, ...norm };
        });
        setClientes(arrC);

        // PRODUTOS
        const qProd = query(
          collection(db, "produtos"),
          where("licencaCnpj", "==", cnpj),
          orderBy("nome", "asc")
        );
        const snapP = await getDocs(qProd);
        const arrP = snapP.docs.map((d) => {
          const raw = d.data();
          const norm = normalizarDoc(raw);
          return { id: d.id, ...norm };
        });
        setProdutos(arrP);

        // MOVIMENTAÇÕES
        const qMov = query(
          collection(db, "movimentacoes"),
          where("licenca", "==", licenca),
          orderBy("data", "desc")
        );
        const snapM = await getDocs(qMov);
        const arrM = snapM.docs.map((d) => {
          const raw = d.data();
          const norm = normalizarDoc(raw);
          // garantir que campo 'data' seja Date ou null
          const dataField = norm.data ?? null;
          const dataAsDate =
            dataField instanceof Date
              ? dataField
              : typeof dataField === "object" && dataField?.seconds
              ? new Date(dataField.seconds * 1000)
              : dataField;
          return {
            id: d.id,
            ...norm,
            data: dataAsDate,
          };
        });
        setMovimentacoes(arrM);
      } catch (e) {
        console.error("Erro ao carregar relatório:", e);
      } finally {
        setCarregando(false);
      }
    };

    carregar();
  }, [licenca, cnpj]);

  // Gerar mapa de clientes (para exibir nome)
  const clientesMap = clientes.reduce((acc, c) => {
    acc[c.id] = c.nome;
    return acc;
  }, {});

  // Autocomplete produtos
  useEffect(() => {
    const texto = filtroProduto.trim().toLowerCase();
    if (texto.length < 2) {
      setSugestoes([]);
      return;
    }

    const filtrados = produtos
      .filter((p) => p.nome?.toLowerCase().includes(texto))
      .slice(0, 10);

    setSugestoes(filtrados);
  }, [filtroProduto, produtos]);

  const selecionarProduto = (produto) => {
    setProdutoSelecionado(produto.nome);
    setFiltroProduto(produto.nome);
    setSugestoes([]);
  };

  // Filtragem das movimentações (automática)
  const filtradas = movimentacoes.filter((mov) => {
    if (!mov) return false;

    // Tipo (entrada/saída)
    if (fluxo !== "todos") {
      const isSaida = ["venda", "extravio", "outros"].includes(mov.tipo);
      const isEntrada = ["compra", "devolucao"].includes(mov.tipo);

      let fluxoMov = isSaida ? "saida" : isEntrada ? "entrada" : "ajuste";

      // Ajuste decide pelo valor
      if (mov.tipo === "ajuste") {
        fluxoMov = mov.quantidade >= 0 ? "entrada" : "saida";
      }

      if (fluxoMov !== fluxo) return false;
    }

    // Por produto (nome)
    if (
      produtoSelecionado &&
      !mov.produtoNome?.toLowerCase().includes(produtoSelecionado.toLowerCase())
    ) {
      return false;
    }

    // Por cliente
    if (clienteFiltro && mov.clienteId !== clienteFiltro) return false;

    // Data
    if (dataInicio) {
      const inicio = new Date(dataInicio);
      inicio.setHours(0, 0, 0, 0);
      if (!(mov.data instanceof Date) || mov.data < inicio) return false;
    }
    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
      if (!(mov.data instanceof Date) || mov.data > fim) return false;
    }

    return true;
  });

  // Posição de Estoque
  const estoque = produtos.map((p) => ({
    nome: p.nome,
    codigo: p.codigoBarras || p.codigo || "",
    estoqueAtual: p.estoqueAtual ?? 0,
  }));

  // Limpar filtros
  const limpar = () => {
    setFluxo("todos");
    setFiltroProduto("");
    setProdutoSelecionado("");
    setClienteFiltro("");
    setDataInicio("");
    setDataFim("");
  };

  return (
    <div style={{ padding: 20, maxWidth: 1300, margin: "0 auto" }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        📊 Relatórios
      </h2>

      {/* FILTROS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr 180px 160px 160px",
          gap: 12,
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        {/* Fluxo */}
        <div>
          <label>Fluxo:</label>
          <select
            value={fluxo}
            onChange={(e) => setFluxo(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="todos">Todos</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </div>

        {/* Produto (autocomplete) */}
        <div style={{ position: "relative" }}>
          <label>Produto:</label>
          <input
            value={filtroProduto}
            onChange={(e) => {
              setFiltroProduto(e.target.value);
              setProdutoSelecionado(e.target.value);
            }}
            placeholder="Escreva (mín. 2 letras)"
            style={{ width: "100%", padding: 8 }}
          />

          {sugestoes.length > 0 && (
            <div
              ref={sugestoesRef}
              style={{
                position: "absolute",
                top: 60,
                left: 0,
                right: 0,
                background: "white",
                border: "1px solid #ccc",
                borderRadius: 4,
                zIndex: 50,
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              {sugestoes.map((p) => (
                <div
                  key={p.id}
                  onClick={() => selecionarProduto(p)}
                  style={{
                    padding: 8,
                    cursor: "pointer",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {p.nome} — Estoque: {p.estoqueAtual ?? 0}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cliente */}
        <div>
          <label>Cliente:</label>
          <select
            value={clienteFiltro}
            onChange={(e) => setClienteFiltro(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">— Todos —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Data início */}
        <div>
          <label>De:</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        {/* Data fim */}
        <div>
          <label>Até:</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </div>
      </div>

      {/* BOTÕES */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          onClick={limpar}
          style={{
            background: "#6c757d",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: 6,
          }}
        >
          Limpar
        </button>

        <button
          onClick={() =>
            exportarCSV(
              filtradas.map((m) => ({
                data: m.data instanceof Date ? m.data.toISOString() : m.data,
                produto: m.produtoNome,
                tipo: m.tipo,
                quantidade: m.quantidade,
                cliente: clientesMap[m.clienteId] || "",
                observacao: m.observacao || "",
              })),
              "movimentacoes.csv"
            )
          }
          style={{
            background: "#28a745",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: 6,
          }}
        >
          📥 Exportar Movimentações
        </button>
      </div>

      {/* MOVIMENTAÇÕES */}
      <h3 style={{ marginTop: 20 }}>Movimentações</h3>

      {carregando ? (
        <div>Carregando...</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ padding: 8, border: "1px solid #ddd" }}>Data</th>
                <th style={{ padding: 8, border: "1px solid #ddd" }}>Produto</th>
                <th style={{ padding: 8, border: "1px solid #ddd" }}>Tipo</th>
                <th style={{ padding: 8, border: "1px solid #ddd" }}>
                  Quantidade
                </th>
                <th style={{ padding: 8, border: "1px solid #ddd" }}>Cliente</th>
                <th style={{ padding: 8, border: "1px solid #ddd" }}>
                  Observação
                </th>
              </tr>
            </thead>

            <tbody>
              {filtradas.map((mov) => (
                <tr key={mov.id}>
                  <td style={{ padding: 8, border: "1px solid #eee" }}>
                    {mov.data instanceof Date
                      ? mov.data.toLocaleDateString()
                      : mov.data
                      ? String(mov.data)
                      : "—"}
                  </td>
                  <td style={{ padding: 8, border: "1px solid #eee" }}>
                    {mov.produtoNome}
                  </td>
                  <td style={{ padding: 8, border: "1px solid #eee" }}>
                    {mov.tipo}
                  </td>
                  <td style={{ padding: 8, border: "1px solid #eee" }}>
                    {mov.quantidade}
                  </td>
                  <td style={{ padding: 8, border: "1px solid #eee" }}>
                    {clientesMap[mov.clienteId] || "—"}
                  </td>
                  <td style={{ padding: 8, border: "1px solid #eee" }}>
                    {mov.observacao || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ESTOQUE */}
      <h3 style={{ marginTop: 40 }}>Posição de Estoque</h3>

      <button
        onClick={() =>
          exportarCSV(
            estoque.map((p) => ({
              produto: p.nome,
              codigo: p.codigo,
              estoqueAtual: p.estoqueAtual,
            })),
            "estoque.csv"
          )
        }
        style={{
          background: "#28a745",
          color: "white",
          padding: "8px 16px",
          border: "none",
          borderRadius: 6,
          marginBottom: 10,
        }}
      >
        📥 Exportar Estoque
      </button>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ padding: 8, border: "1px solid #ddd" }}>Produto</th>
              <th style={{ padding: 8, border: "1px solid #ddd" }}>Código</th>
              <th style={{ padding: 8, border: "1px solid #ddd" }}>
                Estoque Atual
              </th>
            </tr>
          </thead>

          <tbody>
            {estoque.map((p, i) => (
              <tr key={i}>
                <td style={{ padding: 8, border: "1px solid #eee" }}>{p.nome}</td>
                <td style={{ padding: 8, border: "1px solid #eee" }}>
                  {p.codigo || "—"}
                </td>
                <td style={{ padding: 8, border: "1px solid #eee" }}>
                  {p.estoqueAtual}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RELATÓRIO DE CLIENTES (NOVO) */}
      <h3 style={{ marginTop: 40 }}>Clientes Cadastrados</h3>

      {/* Contadores */}
      <div style={{ marginBottom: 10 }}>
        <strong>Total de clientes:</strong> {clientes.length}
      </div>

      {/* Filtro por nome (mín. 2 letras) — usa clienteFiltro já existente */}
      <div style={{ marginBottom: 10 }}>
        <label>Buscar cliente:</label>
        <input
          type="text"
          value={clienteFiltro}
          onChange={(e) => setClienteFiltro(e.target.value)}
          placeholder="Digite pelo menos 2 letras"
          style={{ width: "100%", padding: 8, marginTop: 4 }}
        />
      </div>

      {/* Botão Exportar */}
      <button
        onClick={() =>
          exportarCSV(
            clientes.map((c) => ({
              nome: c.nome,
              telefone: c.telefone || "",
              documento: c.cpfCnpj || c.documento || "",
              rua: c.rua || c.endereco || "",
              bairro: c.bairro || "",
              cidade: c.cidade || "",
              estado: c.estado || "",
              observacao: c.observacao || "",
              dataCadastro:
                c.dataCriacao instanceof Date
                  ? c.dataCriacao.toISOString()
                  : c.dataCriacao && c.dataCriacao.seconds
                  ? new Date(c.dataCriacao.seconds * 1000).toISOString()
                  : "",
            })),
            "clientes.csv"
          )
        }
        style={{
          background: "#28a745",
          color: "white",
          padding: "8px 16px",
          border: "none",
          borderRadius: 6,
          marginBottom: 10,
        }}
      >
        📥 Exportar Clientes
      </button>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ padding: 8, border: "1px solid #ddd" }}>Nome</th>
              <th style={{ padding: 8, border: "1px solid #ddd" }}>Telefone</th>
              <th style={{ padding: 8, border: "1px solid #ddd" }}>Documento</th>
              <th style={{ padding: 8, border: "1px solid #ddd" }}>Endereço</th>
              <th style={{ padding: 8, border: "1px solid #ddd" }}>Cadastro</th>
            </tr>
          </thead>

          <tbody>
            {clientes
              .filter((c) => {
                if (!clienteFiltro || clienteFiltro.length < 2) return true;
                return c.nome?.toLowerCase().includes(clienteFiltro.toLowerCase());
              })
              .map((c) => (
                <tr key={c.id}>
                  <td style={{ padding: 8, border: "1px solid #eee" }}>{c.nome}</td>
                  <td style={{ padding: 8, border: "1px solid #eee" }}>
                    {c.telefone || "—"}
                  </td>
                  <td style={{ padding: 8, border: "1px solid #eee" }}>
                    {c.cpfCnpj || c.documento || "—"}
                  </td>
                  <td style={{ padding: 8, border: "1px solid #eee" }}>
                    {c.rua || c.endereco || "—"}
                  </td>
                  <td style={{ padding: 8, border: "1px solid #eee" }}>
                    {c.dataCriacao instanceof Date
                      ? c.dataCriacao.toLocaleDateString()
                      : c.dataCriacao && c.dataCriacao.seconds
                      ? new Date(c.dataCriacao.seconds * 1000).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

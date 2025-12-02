// src/paginas/Movimentacoes.js
import React, { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "../configuracoes/firebaseConfig";
import FormMovimentacao from "../componentes/FormMovimentacao";
import { useAuth } from "../configuracoes/AuthContext";

// Estilos repetitivos
const thStyle = { padding: "10px", borderBottom: "2px solid #ddd", textAlign: "left" };
const tdStyle = { padding: "10px", borderBottom: "1px solid #eee" };

export default function Movimentacoes() {
  const { licenca, cnpj, licencaAtiva } = useAuth();

  const [movimentacoes, setMovimentacoes] = useState([]);
  const [clientes, setClientes] = useState({});
  const [carregando, setCarregando] = useState(true);

  const getCorTipo = (tipo) => {
    switch (tipo) {
      case "entrada":
      case "compra":
      case "devolucao":
        return "#28a745";
      case "venda":
        return "#dc3545";
      case "ajuste":
        return "#0d6efd";
      default:
        return "#6c757d";
    }
  };

  const carregarMovimentacoes = async () => {
    if (!licenca || !cnpj) return;

    try {
      setCarregando(true);

      // ✔️ CORRIGIDO: buscar clientes reais
      const qC = query(collection(db, "clientes"), where("licencaCnpj", "==", cnpj));
      const snapC = await getDocs(qC);

      const mapaClientes = snapC.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data().nome;
        return acc;
      }, {});

      setClientes(mapaClientes);

      // buscar movimentações
      const q = query(
        collection(db, "movimentacoes"),
        where("licenca", "==", licenca),
        orderBy("data", "desc")
      );

      const snap = await getDocs(q);

      const lista = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        data: doc.data().data?.toDate() || null
      }));

      setMovimentacoes(lista);
    } catch (err) {
      console.error("Erro ao carregar movimentações:", err);
      alert("Erro ao carregar movimentações: " + err.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (licenca) carregarMovimentacoes();
  }, [licenca]);

  if (!licencaAtiva) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <h2>🔒 Acesso Restrito</h2>
        <p>Ative a sua licença para acessar o módulo de Movimentações.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Movimentações de Estoque</h1>

      {/* Formulário */}
      <div style={{ marginBottom: 30, padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
        <FormMovimentacao onMovimentacaoSucesso={carregarMovimentacoes} />
      </div>

      <h2>Histórico</h2>

      {carregando ? (
        <p>Carregando...</p>
      ) : (
        <>
          {movimentacoes.length === 0 ? (
            <p>Nenhuma movimentação registrada.</p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "white",
                boxShadow: "0 0 10px rgba(0,0,0,0.05)"
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Data</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Produto</th>
                  <th style={thStyle}>Qtd</th>
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>Observação</th>
                  <th style={thStyle}>Usuário</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map((m) => (
                  <tr key={m.id}>
                    <td style={tdStyle}>
                      {m.data?.toLocaleDateString("pt-BR") || "—"}
                      <div style={{ fontSize: 12, color: "#777" }}>
                        {m.data?.toLocaleTimeString("pt-BR") || ""}
                      </div>
                    </td>

                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 10,
                          fontWeight: "bold",
                          fontSize: 12,
                          background: getCorTipo(m.tipo) + "22",
                          color: getCorTipo(m.tipo),
                          border: `1px solid ${getCorTipo(m.tipo)}`
                        }}
                      >
                        {m.tipo?.toUpperCase()}
                      </span>
                    </td>

                    <td style={tdStyle}>{m.produtoNome || "—"}</td>

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: "bold",
                        textAlign: "center",
                        color:
                          m.tipo === "compra" ||
                          m.tipo === "entrada" ||
                          m.tipo === "devolucao"
                            ? "#28a745"
                            : "#dc3545"
                      }}
                    >
                      {m.tipo === "compra" ||
                      m.tipo === "entrada" ||
                      m.tipo === "devolucao"
                        ? "+"
                        : "-"}
                      {m.quantidade}
                    </td>

                    {/* ✔️ AQUI ESTÁ A CORREÇÃO! */}
                    <td style={tdStyle}>
                      {m.clienteNome ||
                        clientes[m.clienteId] ||
                        "—"}
                    </td>

                    <td style={tdStyle}>{m.observacao || "—"}</td>
                    <td style={tdStyle}>{m.usuario || "Sistema"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

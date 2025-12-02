// src/componentes/GraficoMovimentacoes.js
import React, { useEffect, useState } from "react";
import { db } from "../configuracoes/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";

export default function GraficoMovimentacoes() {
  const [dados, setDados] = useState([]);

  useEffect(() => {
    const carregar = async () => {
      const snap = await getDocs(collection(db, "movimentos"));
      const movimentos = snap.docs.map((doc) => doc.data());

      // Conta as entradas e saídas
      const contagem = movimentos.reduce(
        (acc, m) => {
          if (m.tipo === "entrada") acc.entradas += m.quantidade;
          else if (m.tipo === "saida") acc.saidas += m.quantidade;
          return acc;
        },
        { entradas: 0, saidas: 0 }
      );

      // Estrutura os dados pro gráfico
      const lista = [
        { tipo: "Entradas", quantidade: contagem.entradas },
        { tipo: "Saídas", quantidade: contagem.saidas },
      ];

      setDados(lista);
    };

    carregar();
  }, []);

  return (
    <div style={{ width: "100%", height: 350, marginTop: "30px" }}>
      <h2 style={{ textAlign: "center" }}>📊 Resumo de Movimentações</h2>

      {dados.length === 0 ? (
        <p style={{ textAlign: "center" }}>Nenhum dado disponível ainda.</p>
      ) : (
        <ResponsiveContainer>
          <BarChart
            data={dados}
            margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tipo" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="quantidade"
              name="Quantidade"
              fill="#4CAF50"
              barSize={80}
            >
              <LabelList dataKey="quantidade" position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

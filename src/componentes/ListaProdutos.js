// src/pages/ProdutosList.jsx
import React, { useEffect, useState } from "react";
import { listarProdutos } from "../services/produtoService";
import { Link } from "react-router-dom";

export default function ProdutosList() {
  const [produtos, setProdutos] = useState([]);
  useEffect(() => {
    async function load() {
      const p = await listarProdutos();
      setProdutos(p);
    }
    load();
  }, []);
  return (
    <div>
      <h2>Produtos</h2>
      <Link to="/produtos/novo">Novo produto</Link>
      <table>
        <thead><tr><th>SKU</th><th>Nome</th><th>Cor</th><th>Tamanho</th><th>Estoque</th></tr></thead>
        <tbody>
          {produtos.map(p => (
            <tr key={p.id}>
              <td>{p.sku}</td>
              <td><Link to={`/produtos/${p.id}`}>{p.nome}</Link></td>
              <td>{p.cor}</td>
              <td>{p.tamanho}</td>
              <td>{p.estoque_atual}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

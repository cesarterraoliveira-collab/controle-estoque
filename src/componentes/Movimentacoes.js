// src/pages/Movimentacoes.jsx
import React, { useState, useEffect } from "react";
import { listarProdutos } from "../services/produtoService";
import { registrarMovimento } from "../services/movimentoService";

export default function Movimentacoes() {
  const [produtos, setProdutos] = useState([]);
  const [form, setForm] = useState({ produtoId: "", tipo: "saida", quantidade: 1, observacao: "" });

  useEffect(()=>{ listarProdutos().then(setProdutos); }, []);

  async function submit(e) {
    e.preventDefault();
    await registrarMovimento(form);
    alert("Movimento registrado!");
    setForm({ produtoId: "", tipo: "saida", quantidade: 1, observacao: "" });
  }

  return (
    <div>
      <h2>Registrar Movimentação</h2>
      <form onSubmit={submit}>
        <select value={form.produtoId} onChange={e=>setForm({...form,produtoId:e.target.value})} required>
          <option value="">Selecione produto</option>
          {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} - {p.sku}</option>)}
        </select>
        <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
          <option value="saida">Saída (venda/retirada)</option>
          <option value="entrada">Entrada (compra/recebimento)</option>
          <option value="ajuste">Ajuste</option>
        </select>
        <input type="number" value={form.quantidade} min="1" onChange={e=>setForm({...form,quantidade: parseFloat(e.target.value) || 1})} />
        <input placeholder="Observação" value={form.observacao} onChange={e=>setForm({...form,observacao:e.target.value})}/>
        <button type="submit">Registrar</button>
      </form>
    </div>
  );
}

// src/pages/ProdutoForm.jsx
import React, { useState, useEffect } from "react";
import { criarProduto, pegarProduto, atualizarProduto } from "../services/produtoService";
import { useNavigate, useParams } from "react-router-dom";

export default function ProdutoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    sku: "", nome: "", descricao: "", cor: "", tamanho: "", preco_custo: 0, preco_venda: 0, estoque_atual: 0, estoque_minimo: 0, codigo_barras: "", categoria: ""
  });

  useEffect(() => {
    if (id && id !== "novo") {
      pegarProduto(id).then(p => setForm({ ...p }));
    }
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (id && id !== "novo") {
      await atualizarProduto(id, form);
    } else {
      await criarProduto(form);
    }
    navigate("/produtos");
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>{id && id !== "novo" ? "Editar Produto" : "Novo Produto"}</h2>
      <input placeholder="Nome" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} required/>
      <input placeholder="Cor" value={form.cor} onChange={e=>setForm({...form,cor:e.target.value})}/>
      <input placeholder="Tamanho" value={form.tamanho} onChange={e=>setForm({...form,tamanho:e.target.value})}/>
      <input type="number" placeholder="Preço de custo" value={form.preco_custo} onChange={e=>setForm({...form,preco_custo: parseFloat(e.target.value) || 0})}/>
      <input type="number" placeholder="Preço de venda" value={form.preco_venda} onChange={e=>setForm({...form,preco_venda: parseFloat(e.target.value) || 0})}/>
      <input type="number" placeholder="Estoque atual" value={form.estoque_atual} onChange={e=>setForm({...form,estoque_atual: parseFloat(e.target.value) || 0})}/>
      <input placeholder="Código de barras (opcional)" value={form.codigo_barras} onChange={e=>setForm({...form,codigo_barras:e.target.value})}/>
      <textarea placeholder="Descrição" value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})}/>
      <button type="submit">Salvar</button>
    </form>
  );
}

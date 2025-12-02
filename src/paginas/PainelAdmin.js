import { useState, useEffect } from "react";
import { db } from "../configuracoes/firebaseConfig";
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, orderBy, where } from "firebase/firestore";

export default function Produtos() {
  const [formData, setFormData] = useState({
    nome: "",
    cor: "",
    tamanho: "",
    precoCusto: "",
    precoVenda: "",
    estoqueAtual: "",
    estoqueMinimo: "",
    codigoBarras: "",
    descricao: "",
  });

  const [loading, setLoading] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("cadastro");
  const [produtos, setProdutos] = useState([]);
  const [carregandoEstoque, setCarregandoEstoque] = useState(false);
  const [filtroEstoque, setFiltroEstoque] = useState("todos");
  const [termoPesquisa, setTermoPesquisa] = useState("");

  // Buscar produtos para a aba de estoque
  useEffect(() => {
    if (abaAtiva === "estoque") {
      carregarProdutos();
    }
  }, [abaAtiva]);

  const carregarProdutos = async () => {
    setCarregandoEstoque(true);
    try {
      const licenca = localStorage.getItem('licenca');
      if (!licenca) {
        alert("Licença não encontrada. Ative o sistema primeiro.");
        return;
      }

      const colecaoProdutos = `produtos_${licenca}`;
      console.log("📂 Carregando produtos da coleção:", colecaoProdutos);
      
      const q = query(
        collection(db, colecaoProdutos),
        orderBy("criadoEm", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const produtosData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log("✅ Produtos carregados:", produtosData);
      setProdutos(produtosData);
    } catch (error) {
      console.error("❌ Erro ao carregar produtos:", error);
      alert("Erro ao carregar produtos: " + error.message);
    } finally {
      setCarregandoEstoque(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (loading) return;
    
    console.log("🔥 BOTÃO SALVAR CLICADO!");
    console.log("📦 Dados:", formData);

    if (!formData.nome.trim()) {
      alert("Por favor, preencha o nome do produto");
      return;
    }

    setLoading(true);

    try {
      const licenca = localStorage.getItem('licenca');
      if (!licenca) {
        alert("Licença não encontrada. Ative o sistema primeiro.");
        return;
      }

      const colecaoProdutos = `produtos_${licenca}`;
      console.log("💾 Salvando na coleção:", colecaoProdutos);

      const produtoData = {
        nome: formData.nome.trim(),
        cor: formData.cor.trim(),
        tamanho: formData.tamanho.trim(),
        precoCusto: formData.precoCusto ? parseFloat(formData.precoCusto) : 0,
        precoVenda: formData.precoVenda ? parseFloat(formData.precoVenda) : 0,
        estoqueAtual: formData.estoqueAtual ? parseInt(formData.estoqueAtual) : 0,
        estoqueMinimo: formData.estoqueMinimo ? parseInt(formData.estoqueMinimo) : 5,
        codigoBarras: formData.codigoBarras.trim(),
        descricao: formData.descricao.trim(),
        codigo: `PROD_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        criadoEm: serverTimestamp(),
        status: "ativo"
      };

      console.log("🚀 Dados do produto:", produtoData);
      
      const docRef = await addDoc(collection(db, colecaoProdutos), produtoData);

      console.log("✅ Documento criado! ID:", docRef.id);
      alert("✅ Produto salvo com sucesso!");

      // Limpa o formulário
      setFormData({
        nome: "",
        cor: "",
        tamanho: "",
        precoCusto: "",
        precoVenda: "",
        estoqueAtual: "",
        estoqueMinimo: "",
        codigoBarras: "",
        descricao: "",
      });

      // Recarrega a lista se estiver na aba de estoque
      if (abaAtiva === "estoque") {
        await carregarProdutos();
      }

    } catch (error) {
      console.error("❌ ERRO FIREBASE:", error);
      alert("❌ Erro ao salvar produto: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar produtos baseado no filtro de estoque e pesquisa
  const produtosFiltrados = produtos.filter(produto => {
    // Filtro por pesquisa
    const matchPesquisa = produto.nome.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
                         (produto.codigoBarras && produto.codigoBarras.includes(termoPesquisa));
    
    // Filtro por estoque
    if (filtroEstoque === "baixo") {
      return matchPesquisa && produto.estoqueAtual > 0 && produto.estoqueAtual <= (produto.estoqueMinimo || 5);
    } else if (filtroEstoque === "zerado") {
      return matchPesquisa && produto.estoqueAtual === 0;
    } else {
      return matchPesquisa;
    }
  });

  const getStatusEstoque = (produto) => {
    if (produto.estoqueAtual === 0) {
      return { texto: "ESGOTADO", cor: "#dc3545", bg: "#f8d7da" };
    } else if (produto.estoqueAtual <= (produto.estoqueMinimo || 5)) {
      return { texto: "ESTOQUE BAIXO", cor: "#ffc107", bg: "#fff3cd" };
    } else {
      return { texto: "EM ESTOQUE", cor: "#28a745", bg: "#d4edda" };
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    marginTop: "5px",
    fontSize: "15px",
  };

  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "20px auto",
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "10px",
        background: "#fff",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>📦 Gestão de Produtos</h2>

      {/* Abas de Navegação */}
      <div style={{ 
        display: "flex", 
        marginBottom: "30px",
        borderBottom: "2px solid #f0f0f0"
      }}>
        <button
          onClick={() => setAbaAtiva("cadastro")}
          style={{
            padding: "12px 24px",
            backgroundColor: abaAtiva === "cadastro" ? "#007bff" : "transparent",
            color: abaAtiva === "cadastro" ? "white" : "#007bff",
            border: "none",
            borderBottom: abaAtiva === "cadastro" ? "2px solid #007bff" : "2px solid transparent",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
            marginRight: "10px",
            borderRadius: "5px 5px 0 0"
          }}
        >
          ➕ Cadastrar Produto
        </button>
        <button
          onClick={() => setAbaAtiva("estoque")}
          style={{
            padding: "12px 24px",
            backgroundColor: abaAtiva === "estoque" ? "#28a745" : "transparent",
            color: abaAtiva === "estoque" ? "white" : "#28a745",
            border: "none",
            borderBottom: abaAtiva === "estoque" ? "2px solid #28a745" : "2px solid transparent",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
            borderRadius: "5px 5px 0 0"
          }}
        >
          📊 Consultar Estoque ({produtos.length})
        </button>
      </div>

      {/* ABA DE CADASTRO */}
      {abaAtiva === "cadastro" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input 
            name="nome" 
            placeholder="Nome do Produto *" 
            value={formData.nome} 
            onChange={handleChange} 
            style={inputStyle} 
            disabled={loading}
          />
          <input 
            name="cor" 
            placeholder="Cor" 
            value={formData.cor} 
            onChange={handleChange} 
            style={inputStyle} 
            disabled={loading}
          />
          <input 
            name="tamanho" 
            placeholder="Tamanho" 
            value={formData.tamanho} 
            onChange={handleChange} 
            style={inputStyle} 
            disabled={loading}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <input 
              name="precoCusto" 
              type="number" 
              step="0.01"
              placeholder="Preço de Custo" 
              value={formData.precoCusto} 
              onChange={handleChange} 
              style={inputStyle} 
              disabled={loading}
            />
            <input 
              name="precoVenda" 
              type="number" 
              step="0.01"
              placeholder="Preço de Venda" 
              value={formData.precoVenda} 
              onChange={handleChange} 
              style={inputStyle} 
              disabled={loading}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <input 
              name="estoqueAtual" 
              type="number" 
              placeholder="Estoque Atual *" 
              value={formData.estoqueAtual} 
              onChange={handleChange} 
              style={inputStyle} 
              disabled={loading}
            />
            <input 
              name="estoqueMinimo" 
              type="number" 
              placeholder="Estoque Mínimo" 
              value={formData.estoqueMinimo} 
              onChange={handleChange} 
              style={inputStyle} 
              disabled={loading}
            />
          </div>

          <input 
            name="codigoBarras" 
            placeholder="Código de Barras" 
            value={formData.codigoBarras} 
            onChange={handleChange} 
            style={inputStyle} 
            disabled={loading}
          />

          <textarea 
            name="descricao" 
            placeholder="Descrição" 
            value={formData.descricao} 
            onChange={handleChange} 
            style={{ ...inputStyle, height: "80px" }} 
            disabled={loading}
          />

          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              marginTop: "10px",
              padding: "12px",
              backgroundColor: loading ? "#6c757d" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            {loading ? "⏳ Salvando..." : "💾 Salvar Produto"}
          </button>

          <div style={{ 
            marginTop: "15px", 
            padding: "10px", 
            backgroundColor: "#e7f3ff", 
            borderRadius: "5px",
            fontSize: "14px",
            border: "1px solid #b3d9ff"
          }}>
            <strong>💡 Dica:</strong> Após salvar, vá para a aba <strong>"Consultar Estoque"</strong> para ver todos os produtos cadastrados.
          </div>
        </div>
      )}

      {/* ABA DE ESTOQUE */}
      {abaAtiva === "estoque" && (
        <div>
          {/* Filtros e Pesquisa */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr auto auto", 
            gap: "12px", 
            marginBottom: "20px",
            alignItems: "end"
          }}>
            <div>
              <label style={{ fontWeight: "bold", marginBottom: "5px", display: "block" }}>
                🔍 Pesquisar:
              </label>
              <input
                type="text"
                placeholder="Nome ou código de barras..."
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                style={inputStyle}
              />
            </div>
            
            <div>
              <label style={{ fontWeight: "bold", marginBottom: "5px", display: "block" }}>
                📊 Filtro:
              </label>
              <select
                value={filtroEstoque}
                onChange={(e) => setFiltroEstoque(e.target.value)}
                style={inputStyle}
              >
                <option value="todos">Todos os produtos</option>
                <option value="baixo">Estoque baixo</option>
                <option value="zerado">Estoque zerado</option>
              </select>
            </div>

            <button
              onClick={carregarProdutos}
              disabled={carregandoEstoque}
              style={{
                padding: "10px 16px",
                backgroundColor: carregandoEstoque ? "#6c757d" : "#17a2b8",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: carregandoEstoque ? "not-allowed" : "pointer",
                fontWeight: "bold",
                height: "40px"
              }}
            >
              {carregandoEstoque ? "⏳" : "🔄 Atualizar"}
            </button>
          </div>

          {/* Lista de Produtos */}
          {carregandoEstoque ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
              ⏳ Carregando produtos...
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
              {termoPesquisa || filtroEstoque !== "todos" ? 
                "🔍 Nenhum produto encontrado com os filtros aplicados." : 
                "📭 Nenhum produto cadastrado ainda. Vá para a aba 'Cadastrar Produto' para adicionar o primeiro produto."
              }
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {produtosFiltrados.map(produto => {
                const status = getStatusEstoque(produto);
                return (
                  <div
                    key={produto.id}
                    style={{
                      padding: "15px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      backgroundColor: "#f8f9fa",
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
                      gap: "15px",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                        {produto.nome}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {produto.cor && `Cor: ${produto.cor} | `}
                        {produto.tamanho && `Tamanho: ${produto.tamanho}`}
                        {produto.descricao && ` | ${produto.descricao}`}
                      </div>
                      {produto.codigoBarras && (
                        <div style={{ fontSize: "11px", color: "#999" }}>
                          📋 Cód: {produto.codigoBarras}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "12px", color: "#666" }}>Estoque Atual</div>
                      <div style={{ 
                        fontSize: "18px", 
                        fontWeight: "bold",
                        color: produto.estoqueAtual === 0 ? "#dc3545" : "#28a745"
                      }}>
                        {produto.estoqueAtual}
                      </div>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "12px", color: "#666" }}>Mínimo</div>
                      <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                        {produto.estoqueMinimo || 5}
                      </div>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "12px", color: "#666" }}>Preço Venda</div>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#28a745" }}>
                        R$ {produto.precoVenda?.toFixed(2) || "0,00"}
                      </div>
                    </div>

                    <div>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "10px",
                          fontWeight: "bold",
                          backgroundColor: status.bg,
                          color: status.cor,
                          border: `1px solid ${status.cor}`
                        }}
                      >
                        {status.texto}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resumo */}
          {produtosFiltrados.length > 0 && (
            <div style={{
              marginTop: "20px",
              padding: "15px",
              backgroundColor: "#e9ecef",
              borderRadius: "8px",
              fontSize: "14px"
            }}>
              <strong>📈 Resumo:</strong> {produtosFiltrados.length} produto(s) encontrado(s) | 
              Em estoque: {produtosFiltrados.filter(p => p.estoqueAtual > 0).length} | 
              Baixo estoque: {produtosFiltrados.filter(p => p.estoqueAtual > 0 && p.estoqueAtual <= (p.estoqueMinimo || 5)).length} | 
              Esgotados: {produtosFiltrados.filter(p => p.estoqueAtual === 0).length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
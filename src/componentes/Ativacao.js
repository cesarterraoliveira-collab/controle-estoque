// components/Ativacao.js
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/firestore';

export default function Ativacao({ onAtivacao }) {
  const [cnpj, setCnpj] = useState('');
  const [chaveLicenca, setChaveLicenca] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const handleAtivar = async () => {
    if (!cnpj || !chaveLicenca) {
      setErro('Preencha todos os campos');
      return;
    }

    setCarregando(true);
    setErro('');

    try {
      // Verificar licença no Firebase
      const functions = getFunctions();
      const verificarLicenca = httpsCallable(functions, 'verificarLicenca');
      
      const resultado = await verificarLicenca({
        chaveLicenca: chaveLicenca,
        cnpj: cnpj
      });

      if (resultado.data.valido) {
        // Salvar no localStorage
        localStorage.setItem('licenca', chaveLicenca);
        localStorage.setItem('cnpj', cnpj);
        localStorage.setItem('licencaInfo', JSON.stringify(resultado.data));
        
        // Chamar callback para mostrar o sistema
        onAtivacao();
      } else {
        setErro(`Licença inválida: ${resultado.data.motivo}`);
      }
    } catch (error) {
      setErro('Erro ao ativar licença: ' + error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '400px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
          🔐 Ativação do Sistema
        </h2>
        
        {erro && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '20px',
            border: '1px solid #fcc'
          }}>
            {erro}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            CNPJ da Empresa:
          </label>
          <input
            type="text"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Chave de Licença:
          </label>
          <input
            type="text"
            value={chaveLicenca}
            onChange={(e) => setChaveLicenca(e.target.value)}
            placeholder="LIC-123456-ABC789"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px'
            }}
          />
        </div>

        <button
          onClick={handleAtivar}
          disabled={carregando}
          style={{
            width: '100%',
            padding: '15px',
            backgroundColor: carregando ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: carregando ? 'not-allowed' : 'pointer'
          }}
        >
          {carregando ? '⏳ Ativando...' : '🚀 Ativar Sistema'}
        </button>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '5px',
          fontSize: '14px',
          color: '#666'
        }}>
          <strong>📞 Precisa de ajuda?</strong><br/>
          Entre em contato conosco para obter sua chave de licença.
        </div>
      </div>
    </div>
  );
}
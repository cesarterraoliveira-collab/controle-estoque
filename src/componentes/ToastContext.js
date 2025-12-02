// src/componentes/ToastContext.js
import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((mensagem, tipo = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, mensagem, tipo }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div style={{
        position: "fixed",
        top: 20,
        right: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 9999
      }}>
        {toasts.map(t => (
          <div key={t.id}
            style={{
              padding: "12px 18px",
              borderRadius: 8,
              color: "white",
              backgroundColor:
                t.tipo === "sucesso" ? "#28a745" :
                t.tipo === "erro" ? "#dc3545" :
                t.tipo === "aviso" ? "#ffc107" :
                "#17a2b8",
              minWidth: "220px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
            }}>
            {t.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

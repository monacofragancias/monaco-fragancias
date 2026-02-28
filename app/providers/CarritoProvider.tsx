"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type ItemCarrito = {
  id: string;
  nombre: string;
  precio: number;
  imagen_url: string | null;
  cantidad: number;
};

type CarritoContextType = {
  items: ItemCarrito[];
  total: number;
  agregar: (item: Omit<ItemCarrito, "cantidad">) => void;
  quitar: (id: string) => void;
  cambiarCantidad: (id: string, cantidad: number) => void;
  vaciar: () => void;
};

const CarritoContext = createContext<CarritoContextType | null>(null);

const STORAGE_KEY = "monaco_carrito_v1";

function cargarInicial(): ItemCarrito[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ItemCarrito[]) : [];
  } catch {
    return [];
  }
}

export function CarritoProvider({ children }: { children: React.ReactNode }) {
  // ✅ Carga inmediata desde localStorage (sin esperar useEffect)
  const [items, setItems] = useState<ItemCarrito[]>(cargarInicial);

  // ✅ Evita que el primer render “pise” localStorage
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, hydrated]);

  const total = useMemo(() => {
    return items.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
  }, [items]);

  function agregar(item: Omit<ItemCarrito, "cantidad">) {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      if (idx >= 0) {
        const copia = [...prev];
        copia[idx] = { ...copia[idx], cantidad: copia[idx].cantidad + 1 };
        return copia;
      }
      return [...prev, { ...item, cantidad: 1 }];
    });
  }

  function quitar(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  function cambiarCantidad(id: string, cantidad: number) {
    setItems((prev) =>
      prev
        .map((p) =>
          p.id === id ? { ...p, cantidad: Math.max(1, Math.min(99, cantidad)) } : p
        )
        .filter((p) => p.cantidad > 0)
    );
  }

  function vaciar() {
    setItems([]);
  }

  const value: CarritoContextType = { items, total, agregar, quitar, cambiarCantidad, vaciar };

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <CarritoProvider />");
  return ctx;
}
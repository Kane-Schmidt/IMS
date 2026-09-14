import { useEffect, useState } from 'react'

export function useCollection(storageKey) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items))
    } catch {
      // localStorage unavailable (e.g. private browsing) — data just won't persist
    }
  }, [storageKey, items])

  function addItem(record) {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), ...record }])
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function updateItem(id, updates) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  return { items, addItem, removeItem, updateItem }
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { toCamelCase, toSnakeCase } from '../lib/caseConvert.js'

function tableFor(storageKey) {
  return storageKey ? storageKey.replace(/^ims_/, '') : null
}

// Location/Vehicle Master Data all go through this one hook. storageKey may
// be omitted (e.g. a field that optionally links to another collection) —
// in that case this is a no-op that reports itself as already loaded.
// Reads are scoped to the caller's organization automatically by Row-Level
// Security; writes include organization_id explicitly since RLS requires it
// to match on insert. Updates are optimistic (local state changes
// immediately) with the Supabase write happening in the background, so the
// UI feels the same as the old localStorage-backed version.
export function useCollection(storageKey) {
  const table = tableFor(storageKey)
  const { organization } = useAuth()
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(!table)

  useEffect(() => {
    if (!table) return
    let active = true
    setLoaded(false)

    supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error(`Failed to load ${table}:`, error.message)
          setItems([])
        } else {
          setItems((data ?? []).map(toCamelCase))
        }
        setLoaded(true)
      })

    return () => {
      active = false
    }
  }, [table])

  function addItem(record) {
    if (!organization || !table) return
    const newItem = { id: crypto.randomUUID(), ...record }
    setItems((prev) => [...prev, newItem])

    supabase
      .from(table)
      .insert(toSnakeCase({ ...newItem, organizationId: organization.id }))
      .then(({ error }) => {
        if (error) console.error(`Failed to save new ${table} record:`, error.message)
      })
  }

  function removeItem(id) {
    if (!table) return
    setItems((prev) => prev.filter((item) => item.id !== id))

    supabase
      .from(table)
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error(`Failed to delete ${table} record:`, error.message)
      })
  }

  function updateItem(id, updates) {
    if (!table) return
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))

    supabase
      .from(table)
      .update(toSnakeCase(updates))
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error(`Failed to update ${table} record:`, error.message)
      })
  }

  return { items, addItem, removeItem, updateItem, loaded }
}

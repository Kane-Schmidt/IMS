import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { toCamelCase, toSnakeCase } from '../lib/caseConvert.js'

const STORAGE_KEY = 'ims_app_data'
const MAX_LOG_ENTRIES = 300

const AppDataContext = createContext(null)

// products now lives in Supabase (see useEffect below) — kept out of the
// localStorage blob entirely, loaded fresh from the server every time.
const defaultState = {
  products: [],
  productsLoaded: false,
  inventoryItems: [],
  orders: [],
  bundles: [],
  tickets: [],
  activityLog: [],
  companyAssumptions: {
    monthlyRevenue: 0,
    ebitdaMarginPct: 30,
    ebitdaMultiple: 8,
    subscribers: 0,
  },
}

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // Merge over defaults so fields added after a browser's save (e.g. from an
    // earlier version of the app) don't come back as undefined and crash.
    // products always starts fresh — see the Supabase load effect.
    if (raw) return { ...defaultState, ...JSON.parse(raw), products: [], productsLoaded: false }
  } catch {
    // ignore corrupt storage
  }

  return defaultState
}

// Appends one entry to the activity log, capped to the most recent
// MAX_LOG_ENTRIES so localStorage doesn't grow without bound. siteIds records
// which warehouses/trucks an event touched, so Reports can compute traffic
// per site without re-parsing description text.
function logActivity(activityLog, { type, description, siteIds = [] }) {
  const entry = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), type, description, siteIds }
  return [...activityLog, entry].slice(-MAX_LOG_ENTRIES)
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_PRODUCTS':
      return { ...state, products: action.products, productsLoaded: true }

    case 'ADD_PRODUCT':
      return {
        ...state,
        products: [...state.products, action.product],
        activityLog: logActivity(state.activityLog, {
          type: 'product',
          description: `Added product ${action.product.manufacturer} ${action.product.modelNumber}`,
        }),
      }

    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map((product) =>
          product.id === action.id ? { ...product, ...action.updates } : product,
        ),
        activityLog: logActivity(state.activityLog, {
          type: 'product',
          description: `Updated product ${action.updates.manufacturer} ${action.updates.modelNumber}`,
        }),
      }

    case 'TOGGLE_PRODUCT_ACTIVE': {
      const product = state.products.find((item) => item.id === action.id)
      return {
        ...state,
        products: state.products.map((item) =>
          item.id === action.id ? { ...item, active: !item.active } : item,
        ),
        activityLog: product
          ? logActivity(state.activityLog, {
              type: 'product',
              description: `${product.active ? 'Deactivated' : 'Activated'} product ${product.manufacturer} ${product.modelNumber}`,
            })
          : state.activityLog,
      }
    }

    case 'SET_DEPRECIATION_MODEL': {
      const product = state.products.find((item) => item.id === action.id)
      return {
        ...state,
        products: state.products.map((item) =>
          item.id === action.id ? { ...item, depreciationModel: action.model } : item,
        ),
        activityLog: product
          ? logActivity(state.activityLog, {
              type: 'finance',
              description: `Set depreciation model for ${product.manufacturer} ${product.modelNumber}: ${action.model.method}`,
            })
          : state.activityLog,
      }
    }

    case 'ADD_ORDER':
      return {
        ...state,
        orders: [...state.orders, action.order],
        activityLog: logActivity(state.activityLog, {
          type: 'order',
          description: `${action.order.status === 'draft' ? 'Drafted' : 'Submitted'} order ${action.order.poNumber} (${action.order.vendor})`,
        }),
      }

    case 'SUBMIT_DRAFT': {
      const order = state.orders.find((item) => item.id === action.id)
      return {
        ...state,
        orders: state.orders.map((item) =>
          item.id === action.id
            ? { ...item, status: 'pending-approval', submittedAt: new Date().toISOString() }
            : item,
        ),
        activityLog: order
          ? logActivity(state.activityLog, { type: 'order', description: `Submitted draft order ${order.poNumber} for approval` })
          : state.activityLog,
      }
    }

    case 'REVIEW_ORDER': {
      const order = state.orders.find((item) => item.id === action.id)
      return {
        ...state,
        orders: state.orders.map((item) =>
          item.id === action.id
            ? {
                ...item,
                status: action.decision === 'approve' ? 'approved' : 'rejected',
                rejectionComment: action.decision === 'reject' ? action.comment : item.rejectionComment,
                reviewedAt: new Date().toISOString(),
              }
            : item,
        ),
        activityLog: order
          ? logActivity(state.activityLog, {
              type: 'order',
              description:
                action.decision === 'approve'
                  ? `Approved order ${order.poNumber}`
                  : `Rejected order ${order.poNumber}: ${action.comment}`,
            })
          : state.activityLog,
      }
    }

    case 'RECEIVE_ORDER': {
      const order = state.orders.find((item) => item.id === action.orderId)
      const newItems = action.scannedItems.map((scan) => ({
        id: crypto.randomUUID(),
        serial: scan.serial,
        productId: scan.productId,
        locationId: action.destinationLocationId,
        bundleId: null,
        orderId: action.orderId,
        receivedAt: new Date().toISOString(),
      }))
      return {
        ...state,
        inventoryItems: [...state.inventoryItems, ...newItems],
        orders: state.orders.map((item) =>
          item.id === action.orderId
            ? {
                ...item,
                status: 'received',
                receivedAt: new Date().toISOString(),
                palletBoxCount: action.palletBoxCount,
              }
            : item,
        ),
        activityLog: logActivity(state.activityLog, {
          type: 'receive',
          description: `Received ${newItems.length} unit(s) for ${order ? order.poNumber : 'order'} into ${action.destinationName}`,
          siteIds: [action.destinationLocationId],
        }),
      }
    }

    case 'RELOCATE_ITEMS': {
      const movedItems = state.inventoryItems.filter((item) => action.itemIds.includes(item.id))
      const sourceIds = [...new Set(movedItems.map((item) => item.locationId))]
      return {
        ...state,
        inventoryItems: state.inventoryItems.map((item) =>
          action.itemIds.includes(item.id) ? { ...item, locationId: action.destinationLocationId } : item,
        ),
        activityLog: logActivity(state.activityLog, {
          type: 'relocate',
          description: `Moved ${movedItems.length} item(s) from ${action.sourceName} to ${action.destinationName}`,
          siteIds: [...sourceIds, action.destinationLocationId],
        }),
      }
    }

    case 'CREATE_BUNDLE':
      return {
        ...state,
        bundles: [...state.bundles, action.bundle],
        inventoryItems: state.inventoryItems.map((item) =>
          action.bundle.itemIds.includes(item.id) ? { ...item, bundleId: action.bundle.id } : item,
        ),
        activityLog: logActivity(state.activityLog, {
          type: 'bundle',
          description: `Created bundle "${action.bundle.name}" with ${action.bundle.itemIds.length} item(s) at ${action.warehouseName}`,
          siteIds: [action.bundle.warehouseLocationId],
        }),
      }

    case 'BREAK_BUNDLE': {
      const bundle = state.bundles.find((item) => item.id === action.id)
      return {
        ...state,
        bundles: state.bundles.map((item) =>
          item.id === action.id
            ? { ...item, status: 'broken', brokenAt: new Date().toISOString() }
            : item,
        ),
        inventoryItems: state.inventoryItems.map((item) =>
          item.bundleId === action.id ? { ...item, bundleId: null } : item,
        ),
        activityLog: bundle
          ? logActivity(state.activityLog, {
              type: 'bundle',
              description: `Broke bundle "${bundle.name}"`,
              siteIds: [bundle.warehouseLocationId],
            })
          : state.activityLog,
      }
    }

    case 'ADD_TICKET':
      return {
        ...state,
        tickets: [...state.tickets, action.ticket],
        activityLog: logActivity(state.activityLog, {
          type: 'support',
          description: `Support ticket submitted: ${action.ticket.subject}`,
        }),
      }

    case 'SET_COMPANY_ASSUMPTIONS':
      return { ...state, companyAssumptions: { ...state.companyAssumptions, ...action.updates } }

    default:
      return state
  }
}

export function AppDataProvider({ children }) {
  const { organization } = useAuth()
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState)

  useEffect(() => {
    try {
      // products is excluded — it lives in Supabase, not this blob.
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, products: undefined, productsLoaded: undefined }))
    } catch {
      // localStorage unavailable — data just won't persist
    }
  }, [state])

  useEffect(() => {
    if (!organization) return
    let active = true

    supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error('Failed to load products:', error.message)
          return
        }
        dispatch({ type: 'LOAD_PRODUCTS', products: (data ?? []).map(toCamelCase) })
      })

    return () => {
      active = false
    }
  }, [organization])

  const actions = useMemo(
    () => ({
      addProduct(product) {
        const newProduct = { id: crypto.randomUUID(), active: true, ...product }
        dispatch({ type: 'ADD_PRODUCT', product: newProduct })
        if (!organization) return
        supabase
          .from('products')
          .insert(toSnakeCase({ ...newProduct, organizationId: organization.id }))
          .then(({ error }) => {
            if (error) console.error('Failed to save new product:', error.message)
          })
      },
      updateProduct(id, updates) {
        dispatch({ type: 'UPDATE_PRODUCT', id, updates })
        supabase
          .from('products')
          .update(toSnakeCase(updates))
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('Failed to update product:', error.message)
          })
      },
      toggleProductActive(id, currentlyActive) {
        dispatch({ type: 'TOGGLE_PRODUCT_ACTIVE', id })
        supabase
          .from('products')
          .update({ active: !currentlyActive })
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('Failed to update product status:', error.message)
          })
      },
      setDepreciationModel(id, model) {
        dispatch({ type: 'SET_DEPRECIATION_MODEL', id, model })
        supabase
          .from('products')
          .update({ depreciation_model: model })
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('Failed to save depreciation model:', error.message)
          })
      },
      addOrder(order) {
        const id = crypto.randomUUID()
        dispatch({ type: 'ADD_ORDER', order: { id, createdAt: new Date().toISOString(), ...order } })
        return id
      },
      submitDraft(id) {
        dispatch({ type: 'SUBMIT_DRAFT', id })
      },
      reviewOrder(id, decision, comment) {
        dispatch({ type: 'REVIEW_ORDER', id, decision, comment })
      },
      receiveOrder({ orderId, destinationLocationId, destinationName, scannedItems, palletBoxCount }) {
        dispatch({ type: 'RECEIVE_ORDER', orderId, destinationLocationId, destinationName, scannedItems, palletBoxCount })
      },
      relocateItems(itemIds, destinationLocationId, { sourceName, destinationName }) {
        dispatch({ type: 'RELOCATE_ITEMS', itemIds, destinationLocationId, sourceName, destinationName })
      },
      createBundle(bundle, warehouseName) {
        const id = crypto.randomUUID()
        dispatch({
          type: 'CREATE_BUNDLE',
          bundle: { id, status: 'active', createdAt: new Date().toISOString(), ...bundle },
          warehouseName,
        })
        return id
      },
      breakBundle(id) {
        dispatch({ type: 'BREAK_BUNDLE', id })
      },
      addTicket(ticket) {
        dispatch({
          type: 'ADD_TICKET',
          ticket: { id: crypto.randomUUID(), status: 'open', submittedAt: new Date().toISOString(), ...ticket },
        })
      },
      setCompanyAssumptions(updates) {
        dispatch({ type: 'SET_COMPANY_ASSUMPTIONS', updates })
      },
    }),
    [organization],
  )

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}

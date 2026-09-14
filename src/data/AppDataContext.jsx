import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'

const STORAGE_KEY = 'ims_app_data'
const LEGACY_PRODUCTS_KEY = 'ims_products'

const AppDataContext = createContext(null)

const defaultState = {
  products: [],
  inventoryItems: [],
  orders: [],
  bundles: [],
  users: [],
  totalSeats: 25,
  tickets: [],
}

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // Merge over defaults so fields added after a browser's save (e.g. from an
    // earlier version of the app) don't come back as undefined and crash.
    if (raw) return { ...defaultState, ...JSON.parse(raw) }
  } catch {
    // ignore corrupt storage
  }

  let seedProducts = []
  try {
    const legacyRaw = localStorage.getItem(LEGACY_PRODUCTS_KEY)
    if (legacyRaw) {
      seedProducts = JSON.parse(legacyRaw).map((product) => ({ active: true, ...product }))
    }
  } catch {
    // ignore corrupt legacy storage
  }

  return { ...defaultState, products: seedProducts }
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.product] }

    case 'TOGGLE_PRODUCT_ACTIVE':
      return {
        ...state,
        products: state.products.map((product) =>
          product.id === action.id ? { ...product, active: !product.active } : product,
        ),
      }

    case 'ADD_ORDER':
      return { ...state, orders: [...state.orders, action.order] }

    case 'SUBMIT_DRAFT':
      return {
        ...state,
        orders: state.orders.map((order) =>
          order.id === action.id
            ? { ...order, status: 'pending-approval', submittedAt: new Date().toISOString() }
            : order,
        ),
      }

    case 'REVIEW_ORDER':
      return {
        ...state,
        orders: state.orders.map((order) =>
          order.id === action.id
            ? {
                ...order,
                status: action.decision === 'approve' ? 'approved' : 'rejected',
                rejectionComment: action.decision === 'reject' ? action.comment : order.rejectionComment,
                reviewedAt: new Date().toISOString(),
              }
            : order,
        ),
      }

    case 'RECEIVE_ORDER': {
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
        orders: state.orders.map((order) =>
          order.id === action.orderId
            ? {
                ...order,
                status: 'received',
                receivedAt: new Date().toISOString(),
                palletBoxCount: action.palletBoxCount,
              }
            : order,
        ),
      }
    }

    case 'RELOCATE_ITEMS':
      return {
        ...state,
        inventoryItems: state.inventoryItems.map((item) =>
          action.itemIds.includes(item.id) ? { ...item, locationId: action.destinationLocationId } : item,
        ),
      }

    case 'CREATE_BUNDLE':
      return {
        ...state,
        bundles: [...state.bundles, action.bundle],
        inventoryItems: state.inventoryItems.map((item) =>
          action.bundle.itemIds.includes(item.id) ? { ...item, bundleId: action.bundle.id } : item,
        ),
      }

    case 'BREAK_BUNDLE':
      return {
        ...state,
        bundles: state.bundles.map((bundle) =>
          bundle.id === action.id
            ? { ...bundle, status: 'broken', brokenAt: new Date().toISOString() }
            : bundle,
        ),
        inventoryItems: state.inventoryItems.map((item) =>
          item.bundleId === action.id ? { ...item, bundleId: null } : item,
        ),
      }

    case 'ADD_USER':
      return { ...state, users: [...state.users, action.user] }

    case 'TOGGLE_USER_ACTIVE':
      return {
        ...state,
        users: state.users.map((user) =>
          user.id === action.id ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' } : user,
        ),
      }

    case 'ADD_TICKET':
      return { ...state, tickets: [...state.tickets, action.ticket] }

    default:
      return state
  }
}

export function AppDataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // localStorage unavailable — data just won't persist
    }
  }, [state])

  const actions = useMemo(
    () => ({
      addProduct(product) {
        dispatch({ type: 'ADD_PRODUCT', product: { id: crypto.randomUUID(), active: true, ...product } })
      },
      toggleProductActive(id) {
        dispatch({ type: 'TOGGLE_PRODUCT_ACTIVE', id })
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
      receiveOrder({ orderId, destinationLocationId, scannedItems, palletBoxCount }) {
        dispatch({ type: 'RECEIVE_ORDER', orderId, destinationLocationId, scannedItems, palletBoxCount })
      },
      relocateItems(itemIds, destinationLocationId) {
        dispatch({ type: 'RELOCATE_ITEMS', itemIds, destinationLocationId })
      },
      createBundle(bundle) {
        const id = crypto.randomUUID()
        dispatch({
          type: 'CREATE_BUNDLE',
          bundle: { id, status: 'active', createdAt: new Date().toISOString(), ...bundle },
        })
        return id
      },
      breakBundle(id) {
        dispatch({ type: 'BREAK_BUNDLE', id })
      },
      addUser(user) {
        dispatch({ type: 'ADD_USER', user: { id: crypto.randomUUID(), status: 'active', ...user } })
      },
      toggleUserActive(id) {
        dispatch({ type: 'TOGGLE_USER_ACTIVE', id })
      },
      addTicket(ticket) {
        dispatch({
          type: 'ADD_TICKET',
          ticket: { id: crypto.randomUUID(), status: 'open', submittedAt: new Date().toISOString(), ...ticket },
        })
      },
    }),
    [],
  )

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}

export const SITES = [
  { id: 'wh-1', name: 'Warehouse 1', type: 'warehouse' },
  { id: 'wh-2', name: 'Warehouse 2', type: 'warehouse' },
  { id: 'wh-3', name: 'Warehouse 3', type: 'warehouse' },
  { id: 'wh-4', name: 'Warehouse 4', type: 'warehouse' },
  { id: 'wh-5', name: 'Warehouse 5', type: 'warehouse' },
  { id: 'wh-6', name: 'Warehouse 6', type: 'warehouse' },
  { id: 'wh-7', name: 'Warehouse 7', type: 'warehouse' },
  { id: 'wh-8', name: 'Warehouse 8', type: 'warehouse' },
  { id: 'wh-9', name: 'Warehouse 9', type: 'warehouse' },
  { id: 'truck-1', name: 'Truck 1', type: 'truck' },
  { id: 'truck-2', name: 'Truck 2', type: 'truck' },
  { id: 'truck-3', name: 'Truck 3', type: 'truck' },
]

export const WAREHOUSES = SITES.filter((site) => site.type === 'warehouse')
export const TRUCKS = SITES.filter((site) => site.type === 'truck')

export function siteById(id) {
  return SITES.find((site) => site.id === id)
}

export function siteName(id) {
  return siteById(id)?.name ?? 'Unknown location'
}

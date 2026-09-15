import { useMemo } from 'react'
import { useCollection } from './useCollection.js'

// Sites are the places inventory can physically sit. They come from master
// data rather than a hardcoded list: every Location Master Data record is a
// site, and every Vehicle Master Data record is a site you can sign stock
// out to.
function locationToSite(location) {
  return {
    id: location.id,
    name: location.locationName,
    type: location.locationType === 'Warehouse' ? 'warehouse' : 'location',
  }
}

function vehicleToSite(vehicle) {
  const label = [vehicle.vehicleNumber, vehicle.model].filter(Boolean).join(' — ')
  return { id: vehicle.id, name: label || 'Unnamed vehicle', type: 'vehicle' }
}

export function nameOf(sites, id) {
  return sites.find((site) => site.id === id)?.name ?? 'Unknown location'
}

// Locations + vehicles. Use where inventory can move between both (Relocate,
// on-vehicle counts).
export function useSites() {
  const { items: locations, loaded: locationsLoaded } = useCollection('ims_locations')
  const { items: vehicles, loaded: vehiclesLoaded } = useCollection('ims_vehicles')

  return useMemo(() => {
    const sites = [...locations.map(locationToSite), ...vehicles.map(vehicleToSite)]
    return {
      sites,
      warehouses: sites.filter((site) => site.type === 'warehouse'),
      vehicleSites: sites.filter((site) => site.type === 'vehicle'),
      siteById: (id) => sites.find((site) => site.id === id),
      siteName: (id) => nameOf(sites, id),
      loaded: locationsLoaded && vehiclesLoaded,
    }
  }, [locations, vehicles, locationsLoaded, vehiclesLoaded])
}

// Warehouses only — for places the UI specifically means a warehouse
// (order destinations, bundling, warehouse reporting). Avoids the extra
// vehicles fetch where it isn't needed.
export function useWarehouses() {
  const { items: locations, loaded } = useCollection('ims_locations')

  return useMemo(() => {
    const all = locations.map(locationToSite)
    const warehouses = all.filter((site) => site.type === 'warehouse')
    return {
      warehouses,
      siteName: (id) => nameOf(all, id),
      loaded,
    }
  }, [locations, loaded])
}

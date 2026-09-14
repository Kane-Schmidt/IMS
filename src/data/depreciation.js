const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25

export const DEPRECIATION_METHODS = [
  { value: 'none', label: 'Not Depreciated' },
  { value: 'straight-line', label: 'Straight-Line' },
  { value: 'declining-balance', label: 'Declining Balance' },
]

export function methodLabel(method) {
  return DEPRECIATION_METHODS.find((option) => option.value === method)?.label ?? 'Not Depreciated'
}

function yearsInService(placedInServiceDate, usefulLifeYears) {
  const placed = new Date(placedInServiceDate).getTime()
  if (Number.isNaN(placed)) return 0
  const elapsed = (Date.now() - placed) / MS_PER_YEAR
  return Math.max(0, Math.min(elapsed, usefulLifeYears))
}

// Depreciates a single physical asset from its own cost and in-service date,
// using the product-level policy (method/life/salvage/rate). This is what
// lets book value roll up correctly even though units of the same product
// are received — and start depreciating — on different dates.
export function depreciateAsset({ cost, placedInServiceDate, model }) {
  const basisCost = Number(cost) || 0

  if (!model || model.method === 'none') {
    return { accumulatedDepreciation: 0, netBookValue: basisCost }
  }

  const life = Number(model.usefulLifeYears) || 0
  const salvage = Number(model.salvageValue) || 0

  if (life <= 0) {
    return { accumulatedDepreciation: 0, netBookValue: basisCost }
  }

  const years = yearsInService(placedInServiceDate, life)

  if (model.method === 'straight-line') {
    const depreciableBase = Math.max(basisCost - salvage, 0)
    const annual = depreciableBase / life
    const accumulatedDepreciation = Math.min(annual * years, depreciableBase)
    return { accumulatedDepreciation, netBookValue: basisCost - accumulatedDepreciation }
  }

  if (model.method === 'declining-balance') {
    const rate = Number(model.decliningRate) || 0
    if (rate <= 0) {
      return { accumulatedDepreciation: 0, netBookValue: basisCost }
    }
    const declinedValue = basisCost * Math.pow(1 - rate / 100, years)
    const netBookValue = Math.max(declinedValue, salvage)
    return { accumulatedDepreciation: basisCost - netBookValue, netBookValue }
  }

  return { accumulatedDepreciation: 0, netBookValue: basisCost }
}

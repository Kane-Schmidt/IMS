const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25

export const DEPRECIATION_METHODS = [
  { value: 'none', label: 'Not Depreciated' },
  { value: 'straight-line', label: 'Straight-Line' },
  { value: 'declining-balance', label: 'Declining Balance' },
]

export function methodLabel(method) {
  return DEPRECIATION_METHODS.find((option) => option.value === method)?.label ?? 'Not Depreciated'
}

function yearsElapsed(placedInServiceDate, asOfDate, usefulLifeYears) {
  const placed = new Date(placedInServiceDate).getTime()
  if (Number.isNaN(placed)) return 0
  const elapsed = (asOfDate.getTime() - placed) / MS_PER_YEAR
  return Math.max(0, Math.min(elapsed, usefulLifeYears))
}

// Depreciates a single physical asset from its own cost and in-service date,
// using the product-level policy (method/life/salvage/rate), as of a given
// date (defaults to now). Passing a future asOfDate projects the asset's
// book value forward, which is what the trend chart/schedule use.
export function depreciateAsset({ cost, placedInServiceDate, model, asOfDate = new Date() }) {
  const basisCost = Number(cost) || 0

  if (!model || model.method === 'none') {
    return { accumulatedDepreciation: 0, netBookValue: basisCost }
  }

  const life = Number(model.usefulLifeYears) || 0
  const salvage = Number(model.salvageValue) || 0

  if (life <= 0) {
    return { accumulatedDepreciation: 0, netBookValue: basisCost }
  }

  const years = yearsElapsed(placedInServiceDate, asOfDate, life)

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

// Projects company-wide totals (net book value + accumulated depreciation)
// for each of the next `years` calendar years, summed across every owned
// unit of every product. Year 0 is today. Used for the Finance trend chart
// and schedule table.
export function projectCompanyDepreciation({ products, inventoryItems, years }) {
  const today = new Date()
  const points = []

  for (let offset = 0; offset <= years; offset += 1) {
    const asOfDate = new Date(today)
    asOfDate.setFullYear(today.getFullYear() + offset)

    let netBookValue = 0
    let accumulatedDepreciation = 0
    let grossCost = 0

    products.forEach((product) => {
      const model = product.depreciationModel
      const cost = Number(product.purchasePrice) || 0

      inventoryItems
        .filter((item) => item.productId === product.id)
        .forEach((item) => {
          grossCost += cost
          const result = depreciateAsset({ cost, placedInServiceDate: item.receivedAt, model, asOfDate })
          netBookValue += result.netBookValue
          accumulatedDepreciation += result.accumulatedDepreciation
        })
    })

    points.push({ year: asOfDate.getFullYear(), grossCost, accumulatedDepreciation, netBookValue })
  }

  return points
}

import { useState } from 'react'
import { useAppData } from '../data/AppDataContext.jsx'
import { useCollection } from '../data/useCollection.js'
import DepreciationModelModal from '../components/DepreciationModelModal.jsx'
import FleetDepreciationSummary, { currency } from '../components/FleetDepreciationSummary.jsx'
import { methodLabel, depreciateAsset, projectCompanyDepreciation, projectAssetsDepreciation } from '../data/depreciation.js'

const emptyModel = { method: 'none', usefulLifeYears: '', salvageValue: '', decliningRate: '' }
const PROJECTION_YEARS = 10

const TABS = ['Depreciation']

export default function Finance() {
  const [activeTab, setActiveTab] = useState('Depreciation')

  return (
    <div className="finance-page">
      <h1>Finance</h1>

      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-button${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Depreciation' && <DepreciationTab />}
    </div>
  )
}

function DepreciationTab() {
  return (
    <div className="depreciation-tab">
      <ProductDepreciationSection />
      <VehicleDepreciationSection />
    </div>
  )
}

function ProductDepreciationSection() {
  const { products, inventoryItems, setDepreciationModel } = useAppData()
  const [editingProduct, setEditingProduct] = useState(null)

  const rows = products.map((product) => {
    const model = product.depreciationModel ?? emptyModel
    const cost = Number(product.purchasePrice) || 0
    const units = inventoryItems.filter((item) => item.productId === product.id)

    let grossCost = 0
    let accumulatedDepreciation = 0

    units.forEach((item) => {
      grossCost += cost
      accumulatedDepreciation += depreciateAsset({
        cost,
        placedInServiceDate: item.receivedAt,
        model,
      }).accumulatedDepreciation
    })

    return {
      product,
      model,
      unitsOwned: units.length,
      grossCost,
      accumulatedDepreciation,
      netBookValue: grossCost - accumulatedDepreciation,
    }
  })

  const totals = rows.reduce(
    (acc, row) => ({
      unitsOwned: acc.unitsOwned + row.unitsOwned,
      grossCost: acc.grossCost + row.grossCost,
      accumulatedDepreciation: acc.accumulatedDepreciation + row.accumulatedDepreciation,
      netBookValue: acc.netBookValue + row.netBookValue,
    }),
    { unitsOwned: 0, grossCost: 0, accumulatedDepreciation: 0, netBookValue: 0 },
  )

  const projection = projectCompanyDepreciation({ products, inventoryItems, years: PROJECTION_YEARS })

  return (
    <section className="finance-section">
      <h2>Product Inventory Depreciation</h2>
      <p className="page-subtitle">
        Computed from each owned unit's actual cost and received date — data managed independently from vehicles.
      </p>

      {rows.length === 0 ? (
        <p className="empty-state">No products yet. Add products under Master Data or Admin first.</p>
      ) : (
        <>
          <FleetDepreciationSummary
            unitsLabel="Units Owned"
            totals={totals}
            chartLabel="Projected product inventory net book value over the next 10 years"
            projection={projection}
          />

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Manufacturer</th>
                  <th>Model Number</th>
                  <th>Units Owned</th>
                  <th>Unit Cost</th>
                  <th>Depreciation Method</th>
                  <th>Useful Life</th>
                  <th>Salvage Value (Resell)</th>
                  <th>Gross Cost</th>
                  <th>Accum. Depreciation</th>
                  <th>Net Book Value</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ product, model, unitsOwned, grossCost, accumulatedDepreciation, netBookValue }) => (
                  <tr key={product.id}>
                    <td>{product.manufacturer}</td>
                    <td>{product.modelNumber}</td>
                    <td>{unitsOwned}</td>
                    <td>{currency(product.purchasePrice)}</td>
                    <td>{methodLabel(model.method)}</td>
                    <td>{model.method !== 'none' && model.usefulLifeYears ? `${model.usefulLifeYears} yrs` : '—'}</td>
                    <td>{model.method !== 'none' && model.salvageValue !== '' ? currency(model.salvageValue) : '—'}</td>
                    <td>{currency(grossCost)}</td>
                    <td>{currency(accumulatedDepreciation)}</td>
                    <td>{currency(netBookValue)}</td>
                    <td>
                      <button className="btn-secondary" onClick={() => setEditingProduct(product)}>
                        Edit Model
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingProduct && (
        <DepreciationModelModal
          title={`${editingProduct.manufacturer} ${editingProduct.modelNumber}`}
          initialModel={editingProduct.depreciationModel}
          onSave={(model) => {
            setDepreciationModel(editingProduct.id, model)
            setEditingProduct(null)
          }}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </section>
  )
}

function VehicleDepreciationSection() {
  const { items: vehicles, updateItem } = useCollection('ims_vehicles')
  const [editingVehicle, setEditingVehicle] = useState(null)

  const rows = vehicles.map((vehicle) => {
    const model = vehicle.depreciationModel ?? emptyModel
    const cost = Number(vehicle.purchasePrice) || 0
    const hasCostBasis = vehicle.purchasePrice && vehicle.inServiceDate
    const result = hasCostBasis
      ? depreciateAsset({ cost, placedInServiceDate: vehicle.inServiceDate, model })
      : { accumulatedDepreciation: 0, netBookValue: cost }

    return {
      vehicle,
      model,
      hasCostBasis,
      grossCost: cost,
      accumulatedDepreciation: result.accumulatedDepreciation,
      netBookValue: result.netBookValue,
    }
  })

  const totals = rows.reduce(
    (acc, row) => ({
      unitsOwned: acc.unitsOwned + 1,
      grossCost: acc.grossCost + row.grossCost,
      accumulatedDepreciation: acc.accumulatedDepreciation + row.accumulatedDepreciation,
      netBookValue: acc.netBookValue + row.netBookValue,
    }),
    { unitsOwned: 0, grossCost: 0, accumulatedDepreciation: 0, netBookValue: 0 },
  )

  const assets = rows
    .filter((row) => row.hasCostBasis)
    .map((row) => ({ cost: row.grossCost, placedInServiceDate: row.vehicle.inServiceDate, model: row.model }))
  const projection = projectAssetsDepreciation(assets, PROJECTION_YEARS)

  return (
    <section className="finance-section">
      <h2>Vehicle Fleet Depreciation</h2>
      <p className="page-subtitle">
        Managed separately from product inventory — each vehicle is its own asset, using its own purchase price and
        in-service date from Vehicle Master Data.
      </p>

      {rows.length === 0 ? (
        <p className="empty-state">No vehicles yet. Add vehicles under Master Data → Vehicle Master Data first.</p>
      ) : (
        <>
          <FleetDepreciationSummary
            unitsLabel="Vehicles Owned"
            totals={totals}
            chartLabel="Projected vehicle fleet net book value over the next 10 years"
            projection={projection}
          />

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle Number</th>
                  <th>Manufacturer</th>
                  <th>Model</th>
                  <th>Purchase Price</th>
                  <th>Depreciation Method</th>
                  <th>Useful Life</th>
                  <th>Salvage Value (Resell)</th>
                  <th>Accum. Depreciation</th>
                  <th>Net Book Value</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ vehicle, model, hasCostBasis, accumulatedDepreciation, netBookValue }) => (
                  <tr key={vehicle.id}>
                    <td>{vehicle.vehicleNumber}</td>
                    <td>{vehicle.manufacturer}</td>
                    <td>{vehicle.model}</td>
                    <td>{vehicle.purchasePrice ? currency(vehicle.purchasePrice) : '—'}</td>
                    <td>{hasCostBasis ? methodLabel(model.method) : 'Needs price + in-service date'}</td>
                    <td>{hasCostBasis && model.method !== 'none' && model.usefulLifeYears ? `${model.usefulLifeYears} yrs` : '—'}</td>
                    <td>
                      {hasCostBasis && model.method !== 'none' && model.salvageValue !== '' ? currency(model.salvageValue) : '—'}
                    </td>
                    <td>{currency(accumulatedDepreciation)}</td>
                    <td>{currency(netBookValue)}</td>
                    <td>
                      <button
                        className="btn-secondary"
                        disabled={!hasCostBasis}
                        title={hasCostBasis ? undefined : 'Set Purchase Price and In-Service Date in Vehicle Master Data first'}
                        onClick={() => setEditingVehicle(vehicle)}
                      >
                        Edit Model
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingVehicle && (
        <DepreciationModelModal
          title={`${editingVehicle.vehicleNumber} — ${editingVehicle.manufacturer} ${editingVehicle.model}`}
          initialModel={editingVehicle.depreciationModel}
          onSave={(model) => {
            updateItem(editingVehicle.id, { depreciationModel: model })
            setEditingVehicle(null)
          }}
          onClose={() => setEditingVehicle(null)}
        />
      )}
    </section>
  )
}

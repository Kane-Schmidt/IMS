import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'
import { AppDataProvider } from './data/AppDataContext.jsx'
import NavBar from './components/NavBar.jsx'
import AuthScreen from './pages/auth/AuthScreen.jsx'
import OrganizationSetup from './pages/auth/OrganizationSetup.jsx'
import Home from './pages/Home.jsx'
import PlaceOrder from './pages/PlaceOrder.jsx'
import ReceiveOrder from './pages/ReceiveOrder.jsx'
import Relocate from './pages/Relocate.jsx'
import BundleManagement from './pages/BundleManagement.jsx'
import Inventory from './pages/Inventory.jsx'
import Finance from './pages/Finance.jsx'
import Reports from './pages/Reports.jsx'
import Admin from './pages/Admin.jsx'
import Support from './pages/Support.jsx'
import ProductMasterData from './pages/masterdata/ProductMasterData.jsx'
import LocationMasterData from './pages/masterdata/LocationMasterData.jsx'
import OfficeMasterData from './pages/masterdata/OfficeMasterData.jsx'
import CabinetMasterData from './pages/masterdata/CabinetMasterData.jsx'
import NetworkEquipmentMasterData from './pages/masterdata/NetworkEquipmentMasterData.jsx'
import VehicleMasterData from './pages/masterdata/VehicleMasterData.jsx'
import StockByWarehouse from './pages/StockByWarehouse.jsx'

function AuthGate() {
  const { loading, user, profile } = useAuth()

  if (loading) {
    return (
      <div className="auth-page">
        <p className="empty-state">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  if (!profile) {
    return <OrganizationSetup />
  }

  return (
    <AppDataProvider>
      <BrowserRouter>
        <NavBar />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/place-order" element={<PlaceOrder />} />
            <Route path="/receive-order" element={<ReceiveOrder />} />
            <Route path="/relocate" element={<Relocate />} />
            <Route path="/bundles" element={<BundleManagement />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/inventory/stock-by-warehouse" element={<StockByWarehouse />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/support" element={<Support />} />
            <Route path="/master-data/products" element={<ProductMasterData />} />
            <Route path="/master-data/locations" element={<LocationMasterData />} />
            <Route path="/master-data/offices" element={<OfficeMasterData />} />
            <Route path="/master-data/cabinets" element={<CabinetMasterData />} />
            <Route path="/master-data/network-equipment" element={<NetworkEquipmentMasterData />} />
            <Route path="/master-data/vehicles" element={<VehicleMasterData />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AppDataProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}

export default App

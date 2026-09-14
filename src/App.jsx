import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Inventory from './pages/Inventory.jsx'
import Reports from './pages/Reports.jsx'
import Admin from './pages/Admin.jsx'
import ProductMasterData from './pages/masterdata/ProductMasterData.jsx'
import EmployeeMasterData from './pages/masterdata/EmployeeMasterData.jsx'
import LocationMasterData from './pages/masterdata/LocationMasterData.jsx'
import VehicleMasterData from './pages/masterdata/VehicleMasterData.jsx'

function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <div className="page-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/master-data/products" element={<ProductMasterData />} />
          <Route path="/master-data/employees" element={<EmployeeMasterData />} />
          <Route path="/master-data/locations" element={<LocationMasterData />} />
          <Route path="/master-data/vehicles" element={<VehicleMasterData />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App

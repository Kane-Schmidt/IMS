import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const masterDataLinks = [
  { to: '/master-data/products', label: 'Product Master Data' },
  { to: '/master-data/employees', label: 'Employee Master Data' },
  { to: '/master-data/locations', label: 'Location Master Data' },
  { to: '/master-data/vehicles', label: 'Vehicle Master Data' },
]

function navLinkClass({ isActive }) {
  return isActive ? 'active' : undefined
}

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="navbar">
      <div className="navbar-brand">Schmidt Systems IMS</div>
      <ul className="navbar-links">
        <li>
          <NavLink to="/" end className={navLinkClass}>
            Dashboard
          </NavLink>
        </li>
        <li className="navbar-dropdown" onMouseEnter={() => setMenuOpen(true)} onMouseLeave={() => setMenuOpen(false)}>
          <button type="button" className="navbar-dropdown-toggle" onClick={() => setMenuOpen((open) => !open)}>
            Master Data
          </button>
          {menuOpen && (
            <ul className="navbar-dropdown-menu">
              {masterDataLinks.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} className={navLinkClass} onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </li>
        <li>
          <NavLink to="/inventory" className={navLinkClass}>
            Inventory
          </NavLink>
        </li>
        <li>
          <NavLink to="/reports" className={navLinkClass}>
            Reports
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin" className={navLinkClass}>
            Admin
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}

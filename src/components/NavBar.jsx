import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'

const masterDataLinks = [
  { to: '/master-data/products', label: 'Product Master Data' },
  { to: '/master-data/locations', label: 'Location Master Data' },
  { to: '/master-data/offices', label: 'Office Master Data' },
  { to: '/master-data/vehicles', label: 'Vehicle Master Data' },
]

const primaryLinks = [
  { to: '/inventory', label: 'Inventory' },
  { to: '/finance', label: 'Finance' },
  { to: '/reports', label: 'Reports' },
  { to: '/admin', label: 'Admin' },
  { to: '/support', label: 'Support' },
]

function navLinkClass({ isActive }) {
  return isActive ? 'active' : undefined
}

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const { user, organization, signOut } = useAuth()

  return (
    <nav className="navbar">
      <div className="navbar-brand">Schmidt Systems IMS</div>
      <ul className="navbar-links">
        <li>
          <NavLink to="/" end className={navLinkClass}>
            Home
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
        {primaryLinks.map((link) => (
          <li key={link.to}>
            <NavLink to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div
        className="navbar-dropdown navbar-account"
        onMouseEnter={() => setAccountOpen(true)}
        onMouseLeave={() => setAccountOpen(false)}
      >
        <button type="button" className="navbar-dropdown-toggle" onClick={() => setAccountOpen((open) => !open)}>
          {organization?.name ?? 'Account'}
        </button>
        {accountOpen && (
          <div className="navbar-account-menu">
            <div className="navbar-account-row">
              <span className="navbar-account-label">Signed in as</span>
              <span>{user?.email}</span>
            </div>
            {organization && (
              <div className="navbar-account-row">
                <span className="navbar-account-label">Invite Code</span>
                <span>{organization.invite_code}</span>
              </div>
            )}
            <button type="button" className="btn-secondary navbar-signout" onClick={signOut}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

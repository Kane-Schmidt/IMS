import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="home-page">
      <h1>Welcome to Schmidt Systems IMS</h1>
      <p>
        Head to <Link to="/inventory">Inventory</Link> to place, receive, relocate, or bundle equipment, or manage
        company records under <Link to="/master-data/products">Master Data</Link>.
      </p>
    </div>
  )
}

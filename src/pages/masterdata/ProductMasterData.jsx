import MasterDataPage from '../../components/MasterDataPage.jsx'
import { productFields } from '../../data/fieldConfigs.js'

export default function ProductMasterData() {
  return <MasterDataPage title="Product Master Data" storageKey="ims_products" fields={productFields} />
}

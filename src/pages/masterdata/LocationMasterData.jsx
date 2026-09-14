import MasterDataPage from '../../components/MasterDataPage.jsx'
import { locationFields } from '../../data/fieldConfigs.js'

export default function LocationMasterData() {
  return <MasterDataPage title="Location Master Data" storageKey="ims_locations" fields={locationFields} />
}

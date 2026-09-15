import MasterDataPage from '../../components/MasterDataPage.jsx'
import { officeFields } from '../../data/fieldConfigs.js'

export default function OfficeMasterData() {
  return <MasterDataPage title="Office Master Data" storageKey="ims_offices" fields={officeFields} />
}

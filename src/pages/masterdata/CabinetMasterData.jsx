import MasterDataPage from '../../components/MasterDataPage.jsx'
import { cabinetFields } from '../../data/fieldConfigs.js'

export default function CabinetMasterData() {
  return <MasterDataPage title="Cabinet Master Data" storageKey="ims_cabinets" fields={cabinetFields} />
}

import MasterDataPage from '../../components/MasterDataPage.jsx'
import { networkEquipmentFields } from '../../data/fieldConfigs.js'

export default function NetworkEquipmentMasterData() {
  return <MasterDataPage title="Network Equipment Master Data" storageKey="ims_network_equipment" fields={networkEquipmentFields} />
}

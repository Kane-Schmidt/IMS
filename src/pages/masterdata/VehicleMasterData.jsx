import MasterDataPage from '../../components/MasterDataPage.jsx'
import { vehicleFields } from '../../data/fieldConfigs.js'

export default function VehicleMasterData() {
  return <MasterDataPage title="Vehicle Master Data" storageKey="ims_vehicles" fields={vehicleFields} />
}

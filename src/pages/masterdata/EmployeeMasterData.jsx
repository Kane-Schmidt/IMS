import MasterDataPage from '../../components/MasterDataPage.jsx'
import { employeeFields } from '../../data/fieldConfigs.js'

export default function EmployeeMasterData() {
  return <MasterDataPage title="Employee Master Data" storageKey="ims_employees" fields={employeeFields} />
}

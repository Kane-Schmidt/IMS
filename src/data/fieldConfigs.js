export const employeeFields = [
  { key: 'firstName', label: 'First Name', type: 'text' },
  { key: 'lastName', label: 'Last Name', type: 'text' },
  { key: 'regionAssigned', label: 'Region Assigned', type: 'text' },
  { key: 'truckAssigned', label: 'Truck Assigned', type: 'number' },
  { key: 'homeOfficeLocation', label: 'Home Office Location', type: 'text' },
  { key: 'jobTitle', label: 'Job Title', type: 'text' },
  { key: 'isAdmin', label: 'Admin', type: 'checkbox' },
]

export const locationFields = [
  { key: 'locationName', label: 'Location Name', type: 'text' },
  {
    key: 'locationType',
    label: 'Location Type',
    type: 'select',
    options: ['Warehouse', 'Office', 'Storage Facility', 'Distribution Center', 'Retail Store'],
  },
  { key: 'street', label: 'Street', type: 'text' },
  { key: 'unitNumber', label: 'Unit Number', type: 'text', required: false },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'state', label: 'State', type: 'text' },
  { key: 'zipCode', label: 'Zip Code', type: 'text' },
  { key: 'storageLocations', label: 'Storage Locations', type: 'storageLocations' },
]

export const vehicleFields = [
  { key: 'vehicleNumber', label: 'Vehicle Number', type: 'text' },
  { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
  { key: 'model', label: 'Model', type: 'text' },
  { key: 'year', label: 'Year', type: 'number' },
  { key: 'vin', label: 'VIN', type: 'text' },
  {
    key: 'vehicleType',
    label: 'Vehicle Type',
    type: 'select',
    options: ['Truck', 'Van', 'Sedan', 'SUV', 'Trailer'],
  },
]

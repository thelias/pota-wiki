export const QRM_LABELS = {
  'very-low':  { label: 'Very Low',  cls: 'qrm-very-low'  },
  'low':       { label: 'Low',       cls: 'qrm-low'       },
  'normal':    { label: 'Normal',    cls: 'qrm-normal'     },
  'high':      { label: 'High',      cls: 'qrm-high'       },
  'very-high': { label: 'Very High', cls: 'qrm-very-high'  },
}

export const QRM_NAMES = { 1: 'Very Low', 2: 'Low', 3: 'Normal', 4: 'High', 5: 'Very High' }

export const QRM_NUM = { 'very-low': 1, 'low': 2, 'normal': 3, 'high': 4, 'very-high': 5 }

export const MODES = ['CW', 'FT4', 'FT8', 'SSB', 'DATA', 'PHONE', 'Other']

export const BANDS = ['160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '1.25m', '70cm', '33cm', '23cm']

export const EMPTY_FORM = {
  activation_date: '', cell_service: 'unknown', bathrooms: 'unknown',
  qrm_level: 'normal', parking: '', setup_locations: '', general_comments: '',
  cell_provider: '', antenna: '', mode: [], bands: [], power_watts: '',
  parking_availability: '', busyness: '', time_of_day: '',
}

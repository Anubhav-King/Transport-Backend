// config/backendCharges.js

const BACKEND_CHARGES = {
  'Airport Pickup': { base: 2000 },
  'Airport Drop': { base: 2000 },
  'Local Use': {
    packages: {
      '2H-20K': { base: 500, hours: 2, kms: 20 },
      '4H-40K': { base: 1000, hours: 4, kms: 40 },
      '8H-80K': { base: 1750, hours: 8, kms: 80 },
    },
    extraPerHour: 150,
    extraPerKm: 10,
  },
};

export default BACKEND_CHARGES;

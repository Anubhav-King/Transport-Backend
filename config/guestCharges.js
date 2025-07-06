// config/guestCharges.js

const GUEST_CHARGES = {
  'Airport Pickup': { base: 4000, taxRate: 0.12 },
  'Airport Drop': { base: 4000, taxRate: 0.12 },
  'Local Use': {
    packages: {
      '2H-20K': { base: 1000, hours: 2, kms: 20 },
      '4H-40K': { base: 2000, hours: 4, kms: 40 },
      '8H-80K': { base: 3500, hours: 8, kms: 80 },
    },
    extraPerHour: 300,
    extraPerKm: 15,
    taxRate: 0.12,
  },
};

export default GUEST_CHARGES;

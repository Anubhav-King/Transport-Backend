import Setting from "../models/Setting.js";

// Utility function to safely fetch and parse setting by key
const getSettingValue = async (key) => {
  const setting = await Setting.findOne({ key });
  return setting ? setting.values : null;
};

const calculateCharges = async ({
  dutyType,
  vehicleType,
  packageCode,
  additionalKm = 0,
  additionalHours = 0,
  discountPercentage = 0,
  applyDiscount = false,
  verifiedExpenses = [],
  charges = "Chargeable", // Chargeable, Complimentary, or Part of Package
}) => {
  try {
    let guestCharge = { base: 0, tax: 0, extra: 0, total: 0 };
    let backendCharge = { base: 0, tax: 0, extra: 0, total: 0 };
    let originalGuestCharge = { base: 0, tax: 0, extra: 0, total: 0 };

    const [
      guestChargesMap,
      backendChargesMap,
      guestLocalUseMap,
      backendLocalUseMap,
      guestExtraChargesMap,
      backendExtraChargesMap,
      popChargesMap,
    ] = await Promise.all([
      getSettingValue("guestCharges"),
      getSettingValue("backendCharges"),
      getSettingValue("localUseCharges"),
      getSettingValue("backendLocalUseCharges"),
      getSettingValue("guestExtraCharges"),
      getSettingValue("backendExtraCharges"),
      getSettingValue("popCharges"),
    ]);

    // === Guest Charges ===
    if (charges === "Complimentary") {
      originalGuestCharge = {
        base: 0,
        extra: 0,
        tax: 0,
        total: 0,
      };
      guestCharge = { ...originalGuestCharge };
    } else if (charges === "Part of Package") {
      const popBase = popChargesMap?.[vehicleType]?.[dutyType] || 0;
      originalGuestCharge = {
        base: popBase,
        extra: 0,
        tax: Math.round(popBase * 0.12),
        total: popBase + Math.round(popBase * 0.12),
      };
      guestCharge = { base: 0, extra: 0, tax: 0, total: 0 };
    } else {
      // === Standard Chargeable Flow ===
      if (dutyType === "Local Use") {
        const local = guestLocalUseMap?.[packageCode]?.[vehicleType];
        if (!local) throw new Error("Missing guest local use config");
        originalGuestCharge.base = local.guestCharge;
      } else {
        const guestPrice = guestChargesMap?.[vehicleType]?.[dutyType];
        if (guestPrice == null) throw new Error("Missing guest config");
        originalGuestCharge.base = guestPrice;
      }

      // Guest Extra Charges
      let guestExtra = 0;
      if (dutyType === "Local Use" && (additionalKm > 0 || additionalHours > 0)) {
        const extra = guestExtraChargesMap?.[vehicleType];
        if (extra) {
          const extraKmCharge = additionalKm * (extra.perKm || 0);
          const extraHourCharge = additionalHours * (extra.perHour || 0);
          guestExtra = extraKmCharge + extraHourCharge;
        }
      }
      originalGuestCharge.extra = guestExtra;

      // Tax & Total
      originalGuestCharge.tax = Math.round((originalGuestCharge.base + guestExtra) * 0.12);
      originalGuestCharge.total =
        originalGuestCharge.base + guestExtra + originalGuestCharge.tax;

      // Apply Discount if needed
      if (applyDiscount && discountPercentage > 0) {
        const discountedBase = Math.round(originalGuestCharge.base * (1 - discountPercentage / 100));
        const discountedExtra = Math.round(originalGuestCharge.extra * (1 - discountPercentage / 100));
        const tax = Math.round((discountedBase + discountedExtra) * 0.12);

        guestCharge = {
          base: discountedBase,
          extra: discountedExtra,
          tax,
          total: discountedBase + discountedExtra + tax,
        };
      } else {
        guestCharge = { ...originalGuestCharge };
      }
    }

    // === Backend Charges ===
    if (dutyType === "Local Use") {
      const local = backendLocalUseMap?.[packageCode]?.[vehicleType];
      if (!local) throw new Error("Missing backend local use config");
      backendCharge.base = local.backendCharge;
    } else {
      const backendPrice = backendChargesMap?.[vehicleType]?.[dutyType];
      if (backendPrice == null) throw new Error("Missing backend config");
      backendCharge.base = backendPrice;
    }

    // Backend Extra
    backendCharge.extra = 0;
    if (dutyType === "Local Use" && (additionalKm > 0 || additionalHours > 0)) {
      const extra = backendExtraChargesMap?.[vehicleType];
      if (extra) {
        const extraKmCharge = additionalKm * (extra.perKm || 0);
        const extraHourCharge = additionalHours * (extra.perHour || 0);
        backendCharge.extra = extraKmCharge + extraHourCharge;
      }
    }

    // Backend Tax & Total
    backendCharge.tax = Math.round((backendCharge.base + backendCharge.extra) * 0.12);
    backendCharge.total = backendCharge.base + backendCharge.extra + backendCharge.tax;

    // === Expenses ===
    let guestExpenses = 0;
    let backendExpenses = 0;

    verifiedExpenses?.forEach(({ type, amount }) => {
      if (type === "guest") guestExpenses += amount || 0;
      else if (type === "backend") backendExpenses += amount || 0;
    });

    guestCharge.total += guestExpenses;
    backendCharge.total += backendExpenses;

    return { guestCharge, backendCharge, originalGuestCharge };
  } catch (err) {
    console.error("Charge Calculation Error:", err);
    throw new Error("Charge calculation failed");
  }
};

export default calculateCharges;

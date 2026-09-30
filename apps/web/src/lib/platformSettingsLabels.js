// Shared display strings for the generic platform_setting editor
// (components/SettingEditor.jsx) - one place so AdminCategories.jsx
// (fuel pricing + commission rate, Catalog & Pricing merge) and
// AdminSettings.jsx (whatever's left there) don't drift on wording for a
// key both screens could plausibly show.
export const SETTING_LABEL = {
  fuel_base_fee: 'Fuel/travel base fee (Rs.)',
  fuel_rate_per_km: 'Fuel/travel rate per km (Rs.)',
  commission_rate: 'Platform commission rate',
};

export const SETTING_HELP = {
  fuel_base_fee: "Flat amount added to every new booking's fuel/travel charge, regardless of distance.",
  fuel_rate_per_km:
    "Added per km of distance between the customer's booking address and the assigned worker's saved location.",
  commission_rate:
    "The platform's cut of each completed job's price, deducted from the worker's running balance. Enter as a decimal, not a percentage - e.g. 0.15 for 15%.",
};

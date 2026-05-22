export const CATEGORIES = ["All", "Portrait", "Beauty", "Editorial", "E-commerce", "Color"]

export const systemPresets = [
  {
    id: "natural",
    panel: "retouch",
    name: "Natural",
    icon: "👤",
    description: "Subtle cleanup, everyday portraits",
    categories: ["Portrait"],
    tokenCost: 1,
    payload: {
      mode: "professional",
      tasks: [
        { Plugin: "Heal", Scale: 0, Alpha1: 0.8 },
        { Plugin: "Skin Tone", Scale: 0, Alpha1: 1.0, Alpha2: 1.0 },
        { Plugin: "Eye Vessels", Scale: 0, Alpha1: 1.0 },
      ],
    },
  },
  {
    id: "glam",
    panel: "retouch",
    name: "Glam",
    icon: "💄",
    description: "Bold enhancement for beauty and fashion",
    categories: ["Portrait", "Beauty"],
    tokenCost: 1,
    payload: {
      mode: "professional",
      tasks: [
        { Plugin: "Heal", Scale: 0, Alpha1: 1.0 },
        { Plugin: "Dodge Burn", Scale: 2, Alpha1: 1.0, Alpha2: 0.2 },
        { Plugin: "White Teeth", Scale: 0, Alpha1: 0.5, Alpha2: 0.5 },
        { Plugin: "Eye Brilliance", Scale: 0, Alpha1: 0.85 },
      ],
    },
  },
  {
    id: "fresh",
    panel: "retouch",
    name: "Fresh",
    icon: "🌿",
    description: "Clean and fresh lifestyle look",
    categories: ["Portrait", "Beauty"],
    tokenCost: 1,
    payload: {
      mode: "professional",
      tasks: [
        { Plugin: "Heal", Scale: 0, Alpha1: 0.8 },
        { Plugin: "Mattifier", Scale: 0, Alpha1: 0.5 },
        { Plugin: "Skin Tone", Scale: 0, Alpha1: 0.8, Alpha2: 0.8 },
        { Plugin: "Eye Brilliance", Scale: 0, Alpha1: 0.5 },
      ],
    },
  },
  {
    id: "matte",
    panel: "retouch",
    name: "Matte",
    icon: "🎨",
    description: "Editorial matte finish",
    categories: ["Portrait", "Editorial"],
    tokenCost: 1,
    payload: {
      mode: "professional",
      tasks: [
        { Plugin: "Heal", Scale: 0, Alpha1: 0.9 },
        { Plugin: "Mattifier", Scale: 0, Alpha1: 0.9 },
        { Plugin: "Portrait Volumes", Scale: 0, Alpha1: 0.5 },
        { Plugin: "Skin Tone", Scale: 0, Alpha1: 0.7, Alpha2: 0.7 },
      ],
    },
  },
  {
    id: "sharp",
    panel: "retouch",
    name: "Sharp",
    icon: "⚡",
    description: "Crisp commercial headshot look",
    categories: ["Portrait", "Editorial"],
    tokenCost: 1,
    payload: {
      mode: "professional",
      tasks: [
        { Plugin: "Heal", Scale: 0, Alpha1: 1.0 },
        { Plugin: "Dodge Burn", Scale: 2, Alpha1: 1.0, Alpha2: 0.2 },
        { Plugin: "Portrait Volumes", Scale: 0, Alpha1: 0.5 },
        { Plugin: "Eye Brilliance", Scale: 0, Alpha1: 0.85 },
      ],
    },
  },
  {
    id: "ecommerce",
    panel: "retouch",
    name: "E-commerce",
    icon: "🛍️",
    description: "Product and fabric cleanup",
    categories: ["E-commerce"],
    tokenCost: 1,
    payload: {
      mode: "professional",
      tasks: [
        { Plugin: "Dust", Scale: 3, Alpha1: 1.0 },
        { Plugin: "Clean Backdrop", Scale: 0, Alpha1: 1.0 },
        { Plugin: "Fabric", Scale: 0, Alpha1: 0.75 },
      ],
    },
  },
  {
    id: "color_exposure",
    panel: "retouch",
    name: "Color — Exposure",
    icon: "☀️",
    description: "AI exposure correction only",
    categories: ["Color"],
    tokenCost: 1,
    payload: {
      mode: "professional",
      tasks: [
        {
          Plugin: "Color Correction",
          Layer: 0,
          "User Params": {
            AI: { "Color Correction Mode": "Exposure only" },
            Basic: { "Enable Basic": true },
          },
        },
      ],
    },
  },
  {
    id: "color_exposure_wb",
    panel: "retouch",
    name: "Color — Exposure + WB",
    icon: "🌡️",
    description: "Exposure and white balance correction",
    categories: ["Color"],
    tokenCost: 1,
    payload: {
      mode: "professional",
      tasks: [
        {
          Plugin: "Color Correction",
          Layer: 0,
          "User Params": {
            AI: { "Color Correction Mode": "Exposure & WB" },
            Basic: { "Enable Basic": true },
          },
        },
      ],
    },
  },
  {
    id: "color_full",
    panel: "retouch",
    name: "Color — Full",
    icon: "🌈",
    description: "Complete AI color grade",
    categories: ["Color"],
    tokenCost: 1,
    payload: {
      mode: "professional",
      tasks: [
        {
          Plugin: "Color Correction",
          Layer: 0,
          "User Params": {
            AI: { "Color Correction Mode": "Full" },
            Basic: { "Enable Basic": true },
          },
        },
      ],
    },
  },
]

export function getPresetsByCategory(category) {
  if (category === "All") return systemPresets
  return systemPresets.filter(p => p.categories.includes(category))
}

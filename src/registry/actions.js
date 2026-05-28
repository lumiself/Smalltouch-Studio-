export const actions = [
  {
    id: "quick_enhance",
    panel: "retouch",
    name: "Quick Enhance",
    tokenCost: 1,
    outputType: "flat",
  },
  {
    id: "advanced_edit",
    panel: "retouch",
    name: "Advanced Edit",
    tokenCost: 2,
    outputType: "layered",
  },
  {
    id: "batch_retouch",
    panel: "retouch",
    name: "Batch Retouch",
    tokenCost: 1,
    outputType: "flat",
  },
  {
    id: "bg_remove",
    panel: "background",
    name: "Background Removal",
    tokenCost: 1,
    outputType: "png",
  },
  {
    id: "bg_replace_solid",
    panel: "background",
    name: "Background Replace",
    tokenCost: 1,
    outputType: "flat",
  },
  {
    id: "bg_ai_generate",
    panel: "background",
    name: "AI Background",
    tokenCost: 2,
    outputType: "flat",
  },
  {
    id: "bg_blur",
    panel: "background",
    name: "Background Blur",
    tokenCost: 1,
    outputType: "flat",
  },
  {
    id: "bg_expand",
    panel: "background",
    name: "Smart Expand",
    tokenCost: 2,
    outputType: "flat",
  },
  {
    id: "bg_flux_preset",
    panel: "background",
    name: "Background Preset",
    tokenCost: 2,
    outputType: "flat",
  },
  {
    id: "bg_replace",
    panel: "background",
    name: "Replace Background",
    tokenCost: 2,
    outputType: "flat",
  },
  {
    id: "bg_upscale",
    panel: "background",
    name: "Upscale",
    tokenCost: 1,
    outputType: "flat",
  },
]

export function getAction(id) {
  return actions.find(a => a.id === id)
}

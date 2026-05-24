export const models = [
  {
    id: "retouch4me_portrait",
    provider: "retouch4me",
    model: null,
    actions: ["quick_enhance", "advanced_edit", "batch_retouch"],
    apiBase: "https://retoucher.hz.labs.retouch4.me/api/v1",
  },
  {
    id: "rembg",
    provider: "replicate",
    model: "cjwbw/rembg",
    actions: ["bg_remove"],
    version: "latest",
  },
  {
    id: "sdxl",
    provider: "replicate",
    model: "stability-ai/sdxl",
    actions: ["bg_ai_generate"],
    version: "latest",
  },
  {
    id: "sd_inpainting",
    provider: "replicate",
    model: "stability-ai/stable-diffusion-inpainting",
    actions: ["bg_expand"],
    version: "latest",
  },
  {
    id: "flux_2_max",
    provider: "replicate",
    model: "black-forest-labs/flux-2-max",
    actions: ["bg_flux_preset"],
    endpoint: "https://api.replicate.com/v1/models/black-forest-labs/flux-2-max/predictions",
  },
]

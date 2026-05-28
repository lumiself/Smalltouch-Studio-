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
    id: "nano_banana",
    provider: "replicate",
    model: "google/nano-banana-pro",
    actions: ["bg_flux_preset", "bg_replace"],
    endpoint: "https://api.replicate.com/v1/models/google/nano-banana-pro/predictions",
  },
  {
    id: "gpt_image_2",
    provider: "replicate",
    model: "openai/gpt-image-2",
    actions: ["bg_replace_precise"],
    endpoint: "https://api.replicate.com/v1/models/openai/gpt-image-2/predictions",
  },
]

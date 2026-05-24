# Background Panel — Flux-2-Max Preset Endpoint

## Overview

Uses the `black-forest-labs/flux-2-max` model on Replicate to generate a new background for a portrait image based on a preset prompt. The subject is preserved from the input image via image-to-image conditioning.

---

## POST /api/background/flux-preset

Start a background generation job using a preset.

### Request Headers

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <supabase-jwt>` | Yes |
| `Content-Type` | `application/json` | Yes |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `inputPath` | `string` | Yes | Supabase storage path in the `inputs` bucket (e.g. `{userId}/{jobId}_original.jpg`) |
| `preset` | `object` | Yes | The preset payload object (see Preset Payload below) |

#### Preset Payload Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | `string` | Yes | Background scene description for Flux-2-Max |
| `aspect_ratio` | `string` | No | One of `match_input_image`, `custom`, `1:1`, `16:9`, `3:2`, `2:3`, `4:5`, `5:4`, `9:16`, `3:4`, `4:3`. Default: `match_input_image` |
| `resolution` | `string` | No | One of `match_input_image`, `0.5 MP`, `1 MP`, `2 MP`, `4 MP`. Default: `1 MP` |
| `output_format` | `string` | No | One of `webp`, `jpg`, `png`. Default: `webp` |
| `safety_tolerance` | `integer` | No | 1 (strictest) to 5 (most permissive). Default: `2` |

### Response — Success (200)

```json
{
  "predictionId": "string"
}
```

The `predictionId` is a Replicate prediction ID. Poll `GET /api/background/status?predictionId=<id>` until status is `succeeded` or `failed`.

### Response — Error

| Status | Body | Condition |
|--------|------|-----------|
| `400` | `{ "error": "Missing inputPath or preset.prompt" }` | Required fields absent |
| `401` | `{ "error": "Unauthorized" }` | Invalid or missing JWT |
| `500` | `{ "error": "..." }` | Replicate API error or Supabase storage failure |

---

## GET /api/background/status?predictionId={id}

Poll a Replicate prediction. No auth required (prediction IDs are non-guessable UUIDs).

### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `predictionId` | `string` | Yes | Replicate prediction ID returned by any background POST endpoint |

### Response — Success (200)

```json
{
  "status": "starting | processing | succeeded | failed | canceled",
  "output": "https://... (image URL, present when status is succeeded)",
  "error": null
}
```

`output` is a single string URI (Flux-2-Max returns one image). When `status` is `succeeded`, download the URL and upload to the `outputs` Supabase bucket.

---

## Model Details

| Property | Value |
|----------|-------|
| Provider | Replicate |
| Model ID | `black-forest-labs/flux-2-max` |
| Endpoint | `POST https://api.replicate.com/v1/models/black-forest-labs/flux-2-max/predictions` |
| Auth | `Authorization: Bearer $REPLICATE_API_TOKEN` |
| Async | Yes — predictions start immediately, poll for completion |
| Vercel timeout | Start call well within 10s; client-side polling handles the rest |

### Flux-2-Max Input Fields Used

| Field | Type | Notes |
|-------|------|-------|
| `prompt` | `string` | Background scene description from preset |
| `input_images` | `string[]` | Array of up to 8 URIs; pass the signed input image for subject conditioning |
| `aspect_ratio` | `string` | Default `match_input_image` to preserve original dimensions |
| `resolution` | `string` | Default `1 MP`; up to `4 MP` possible but slower |
| `output_format` | `string` | Default `webp` |
| `safety_tolerance` | `integer` | Default `2` |

---

## Token Requirements

- Action: `bg_flux_preset`
- Cost: **2 tokens** per generation
- Minimum package: `basic`
- Deducted before API call; refunded automatically if the API returns an error

---

## Rate Limits

- Replicate: no published per-minute limit for Flux-2-Max; standard Replicate queue applies
- Vercel: 10s execution limit on Hobby plan — the serverless function only initiates the prediction; client polls via `/api/background/status`

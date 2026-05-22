# Background Studio — API Endpoint Schema

All endpoints are Vercel serverless functions in `/api/background/`.

---

## POST /api/background/remove

Starts a background removal job using Replicate rembg.

### Auth

Required. Bearer token in `Authorization` header (Supabase access token).

### Request Headers

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | Yes | `Bearer <supabase_access_token>` |
| `Content-Type` | Yes | `application/json` |

### Request Body

```json
{
  "inputPath": "user-id/job-id_original.jpg",
  "userId": "uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `inputPath` | string | Yes | Supabase storage path in the `inputs` bucket |
| `userId` | string | Yes | Authenticated user ID (for audit) |

### Response — 200 OK

```json
{ "predictionId": "xyz123abc" }
```

### Response — Error Cases

| Status | Body | When |
|--------|------|------|
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid Bearer token |
| 400 | `{ "error": "Missing inputPath" }` | Required field absent |
| 500 | `{ "error": "Internal server error" }` | Replicate call failed or signed URL generation failed |

### Token Requirement

1 token (`bg_remove`). Deducted client-side before calling this endpoint.

---

## GET /api/background/status

Polls the status of any Replicate prediction.

### Auth

None required. Prediction IDs are unguessable UUIDs.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `predictionId` | string | Yes | Prediction ID from a start endpoint |

### Response — 200 OK

```json
{
  "status": "succeeded",
  "output": "https://replicate.delivery/...result.png",
  "error": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | One of: `starting`, `processing`, `succeeded`, `failed`, `canceled` |
| `output` | string \| string[] \| null | URL or array of URLs when `succeeded`; null otherwise |
| `error` | string \| null | Error message when `failed`; null otherwise |

### Response — Error Cases

| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "Missing predictionId" }` | Query param absent |
| 500 | `{ "error": "Internal server error" }` | Replicate unreachable |

---

## POST /api/background/generate

Starts an AI background generation job using Replicate SDXL.

### Auth

Required. Bearer token in `Authorization` header.

### Request Headers

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | Yes | `Bearer <supabase_access_token>` |
| `Content-Type` | Yes | `application/json` |

### Request Body

```json
{
  "prompt": "soft studio bokeh gradient background, light gray",
  "width": 1024,
  "height": 1024
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | Text description of the background to generate |
| `width` | number | No | Output width in pixels (default 1024, max 1024) |
| `height` | number | No | Output height in pixels (default 1024, max 1024) |

### Response — 200 OK

```json
{ "predictionId": "xyz123abc" }
```

### Response — Error Cases

| Status | Body | When |
|--------|------|------|
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid Bearer token |
| 400 | `{ "error": "Missing prompt" }` | Required field absent |
| 500 | `{ "error": "Internal server error" }` | Replicate call failed |

### Token Requirement

2 tokens (`bg_ai_generate`). Deducted client-side before calling this endpoint.

---

## POST /api/background/expand

Starts a canvas expansion job using Replicate stable-diffusion-inpainting.

### Auth

Required. Bearer token in `Authorization` header.

### Request Headers

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | Yes | `Bearer <supabase_access_token>` |
| `Content-Type` | Yes | `application/json` |

### Request Body

```json
{
  "imageDataUri": "data:image/png;base64,...",
  "maskDataUri": "data:image/png;base64,...",
  "prompt": "seamless studio background"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `imageDataUri` | string | Yes | Base64 data URI of the padded image (subject centered, transparent padding filled with neutral color) |
| `maskDataUri` | string | Yes | Base64 data URI of the mask — white = generate (padded area), black = keep (original subject area) |
| `prompt` | string | Yes | What to generate in the expanded region |

Note: The client must resize the padded image to fit within 512×512 before sending to stay within request size limits.

### Response — 200 OK

```json
{ "predictionId": "xyz123abc" }
```

### Response — Error Cases

| Status | Body | When |
|--------|------|------|
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid Bearer token |
| 400 | `{ "error": "Missing required fields" }` | Required field absent |
| 500 | `{ "error": "Internal server error" }` | Replicate call failed |

### Token Requirement

2 tokens (`bg_expand`). Deducted client-side before calling this endpoint.

---

## Polling Pattern

After receiving a `predictionId`, poll `/api/background/status?predictionId=<id>` every 3 seconds until `status` is `succeeded`, `failed`, or `canceled`.

Output interpretation:
- rembg: `output` is a single string URL to a PNG
- SDXL / inpainting: `output` is an array of URLs — use `output[0]`

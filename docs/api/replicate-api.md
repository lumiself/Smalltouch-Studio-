# Replicate API — Schema Reference

## Base URL

```
https://api.replicate.com/v1
```

## Authentication

All requests require an `Authorization` header:

```
Authorization: Token <REPLICATE_API_KEY>
```

---

## POST /v1/predictions — Create Prediction

Starts an asynchronous AI prediction job.

### Request Headers

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | Yes | `Token <REPLICATE_API_KEY>` |
| `Content-Type` | Yes | `application/json` |

### Request Body

```json
{
  "model": "<owner>/<model-name>",
  "input": {
    "<param>": "<value>"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | Model identifier in `owner/name` format |
| `input` | object | Yes | Model-specific input parameters |

### Response Body (success — HTTP 201)

```json
{
  "id": "xyz123abc",
  "model": "owner/model-name",
  "status": "starting",
  "input": { ... },
  "output": null,
  "error": null,
  "created_at": "2026-05-22T10:00:00Z",
  "urls": {
    "get": "https://api.replicate.com/v1/predictions/xyz123abc",
    "cancel": "https://api.replicate.com/v1/predictions/xyz123abc/cancel"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Prediction ID — use this to poll status |
| `status` | string | Initial status — always `starting` |
| `output` | null | Not available yet |
| `error` | null | Not applicable at creation |

### Response Body (error — HTTP 4xx/5xx)

```json
{
  "detail": "human-readable error message"
}
```

---

## GET /v1/predictions/{id} — Poll Prediction Status

Fetches the current state of a prediction.

### Request Headers

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | Yes | `Token <REPLICATE_API_KEY>` |

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Prediction ID from the create response |

### Response Body (HTTP 200)

```json
{
  "id": "xyz123abc",
  "status": "succeeded",
  "output": "<output value — see below>",
  "error": null,
  "metrics": {
    "predict_time": 3.14
  }
}
```

### Status Values

| Status | Description |
|--------|-------------|
| `starting` | Job accepted, not yet running |
| `processing` | Model is actively running |
| `succeeded` | Job completed — `output` is populated |
| `failed` | Job failed — `error` contains the reason |
| `canceled` | Job was canceled by the caller |

Terminal states (stop polling): `succeeded`, `failed`, `canceled`

---

## Output Formats by Model

### rembg — Background Removal

Model: `cjwbw/rembg`

Input:
```json
{ "image": "<image URL>" }
```

Output: a single URL string (PNG with transparent background)
```json
"https://replicate.delivery/...result.png"
```

### stability-ai/sdxl — Text-to-Image

Model: `stability-ai/sdxl`

Input:
```json
{
  "prompt": "...",
  "width": 1024,
  "height": 1024,
  "num_outputs": 1
}
```

Output: array of URL strings — always use index `[0]`
```json
["https://replicate.delivery/...result.png"]
```

### stability-ai/stable-diffusion-inpainting — Inpainting

Model: `stability-ai/stable-diffusion-inpainting`

Input:
```json
{
  "image": "<base64 data URI or URL>",
  "mask": "<base64 data URI or URL>",
  "prompt": "..."
}
```

Mask convention: white = generate, black = keep original

Output: array of URL strings — always use index `[0]`
```json
["https://replicate.delivery/...result.png"]
```

---

## Rate Limits

- No hard rate limit documented for the API key tier used
- Each prediction is billed per second of GPU compute
- Replicate CDN URLs for outputs expire after 24 hours — download and re-host for permanent storage
- Predictions that remain in `starting` or `processing` for more than 10 minutes should be considered stalled; treat as failed

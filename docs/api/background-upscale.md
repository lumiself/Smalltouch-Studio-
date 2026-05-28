# Background Upscale — API Schema

## Endpoint

`POST /api/background/upscale`

## Auth

Bearer token (Supabase access token) required in `Authorization` header.

## Request Headers

| Header | Value |
|--------|-------|
| Authorization | `Bearer <supabase_access_token>` |
| Content-Type | `application/json` |

## Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| jobId | string (UUID) | yes | Client-generated job ID used to track progress and match webhook |
| inputPath | string | yes | Supabase storage path of the input image (in `inputs` bucket) |
| options | object | yes | Upscale settings (see below) |
| tokenCost | number | no | Tokens to deduct; defaults to 1 |

### options object

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| upscaleMode | `"target"` \| `"factor"` | yes | — | `target` scales to a fixed megapixel count; `factor` multiplies each side |
| targetMp | integer | no | 4 | Target resolution in megapixels (1–128). Used when `upscaleMode` is `"target"` |
| factor | number | no | 2 | Scale multiplier per side (1–8). Used when `upscaleMode` is `"factor"` |
| enhanceDetails | boolean | no | false | Sharpen fine textures and small details |

Fixed values (not configurable by callers):
- `output_format`: `jpg`
- `output_quality`: `80`
- `enhance_realism`: `false`

## Response — Success (200)

```json
{ "jobId": "<uuid>" }
```

The job row is created in the `jobs` table with `status: "processing"`. The client polls the `jobs` table until `status` changes to `"completed"` or `"failed"`.

## Response — Error

| Status | Body | Reason |
|--------|------|--------|
| 400 | `{ "error": "Missing jobId, inputPath, or options" }` | Required fields absent |
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid token |
| 500 | `{ "error": "..." }` | Signed URL creation failed, Replicate API error, or internal error |

## Replicate Model

**Model:** `prunaai/p-image-upscale`  
**Endpoint:** `https://api.replicate.com/v1/models/prunaai/p-image-upscale/predictions`  
**Output:** Single string URI (JPEG)

## Webhook

Replicate notifies `POST /api/webhook/replicate?jobId=<jobId>` on completion.  
The webhook downloads the output image, stores it in the `outputs` bucket, and updates the job to `completed`.  
On failure the job is marked `failed` and the token is refunded.

## Token / Auth Requirements

- 1 token per upscale
- Deducted client-side before the request; refunded automatically on failure

## Rate Limits

Constrained by Replicate's concurrency quota for the `prunaai/p-image-upscale` model.

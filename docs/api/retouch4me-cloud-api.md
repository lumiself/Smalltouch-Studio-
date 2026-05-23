# Retouch4me Cloud AI Retouching API

API schema documentation for the Retouch4me Cloud retouching service.  
Source: Retouch4me Cloud AI Retouching API documentation (official PDF).

---

## General Information

### Base URLs

| Region | Host |
|---|---|
| Primary (Europe) | `https://retoucher.hz.labs.retouch4.me` |
| Alternative (lower latency outside Europe) | `https://cf-retoucher.retouch4.me` |

All routes are prefixed with `/api/v1/`. Full example:

```
https://retoucher.hz.labs.retouch4.me/api/v1/retoucher/getFile/s0me-very-l0ng-1d
```

---

## Authentication

### Retouch Token

All requests that submit or query user work require a valid **Retouch Token**.

- Obtain the token at: `https://retouch4.me/token_page` (requires an authorized and verified Retouch4me account)
- Passed as either the `X-Retouch-Token` header (balance check) or as a `token` form field (task submission)

---

## Common Error Codes

These codes can appear across all endpoints.

| HTTP Status / Code | Meaning |
|---|---|
| `200` | No errors |
| `400` | Unknown error or invalid request parameters |
| `401` | Token is invalid or expired (response includes an explanatory message) |
| `404` | Requested route or object was not found |
| `460` | Token not found |
| `461` | Processing limit reached |
| `462` | Invalid task for retouch server |
| `500` | Internal server error |

---

## General Retouching Pipeline

```
1. POST /retoucher/start       → submit image + payload → receive task {id}
2. GET  /retoucher/status/{id} → poll until state = "completed" or "failed"
3. GET  /retoucher/getFile/{id}→ download result (JPEG or ZIP)
```

---

## Endpoints

---

### 1. Retrieve Balance

**`POST /api/v1/balance`**

Check how many cloud retouch credits remain for the current user before submitting a processing task.

#### Request

| Property | Value |
|---|---|
| Protocol | HTTP |
| Method | `POST` |
| Content-Type | `application/json` |

**Headers**

| Header | Required | Description |
|---|---|---|
| `X-Retouch-Token` | Yes | Valid retouch token for the user |
| `Content-Type` | Yes | `application/json` |

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `modes` | `string[]` | Yes | Array of credit types to query, e.g. `["professional"]` |

**Example Request**

```bash
curl --location --request POST 'https://retoucher.vm.labs.retouch4.me/api/v1/balance' \
  --header 'X-Retouch-Token: reto_x7K2mQ9Lp4Nz8Vb1cR5Ty0Hs' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "modes": ["professional"]
  }'
```

#### Response

**Success (200)**

```json
{
  "status": 200,
  "remaining": {
    "professional": 5
  }
}
```

| Field | Type | Description |
|---|---|---|
| `status` | `number` | `200` |
| `remaining` | `object` | Map of mode → remaining credit count |

**Errors**

| Code | Condition |
|---|---|
| `401` | Token is invalid or expired |

---

### 2. Register Task (Submit Image for Retouching)

**`POST /api/v1/retoucher/start`**

Submits an image file and a JSON task payload for processing. Returns a task ID immediately; processing happens asynchronously.

#### Request

| Property | Value |
|---|---|
| Protocol | HTTP |
| Method | `POST` |
| Content-Type | `multipart/form-data` |

**Form Fields**

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | `File` | Yes | Image file in `jpeg`, `jpg`, or `png` format |
| `token` | `string` | Yes | User retouch token obtained from the token page |
| `payload` | `string` (JSON) | Yes | JSON string describing the retouching task (see Payload Format below) |
| `hook` | `string` | No | Webhook URL for async completion callbacks (domain must be pre-approved — email `relu@retouch4.me`) |

**Example Request (macOS / Linux)**

```bash
curl --location 'https://retoucher.hz.labs.retouch4.me/api/v1/retoucher/start' \
  --form 'file=@"DSC_6229_Sample.jpg"' \
  --form 'token="retoexampletokenvaluex83n4j2k9q7m5p1"' \
  --form-string 'payload={"mode":"professional","tasks":[...]}'
```

#### Processing Flow

1. Task is registered on the server and receives a unique ID
2. User token is verified
3. Task is queued for processing
4. Server returns the task ID immediately

#### Response

**Success (200)**

```json
{
  "status": 200,
  "id": "jpeg-example-job-id",
  "retouchQuota": 999
}
```

| Field | Type | Description |
|---|---|---|
| `status` | `number` | `200` |
| `id` | `string` | Unique task ID — use this for status polling and file download |
| `retouchQuota` | `number` | Remaining retouch attempts for the user for the current day |

**Errors**

| Code | Condition |
|---|---|
| `400` | Missing file: `message = "No file uploaded"` |
| `4xx` | Token validation failure or account authorization failure |
| `500` | Internal server error |

> Note: If the server cannot communicate with the CRM but returns a `200` status, processing still continues.

---

### 3. Check Task Status

**`GET /api/v1/retoucher/status/{id}`**

Poll this endpoint to check the progress of a submitted task.

#### Request

| Property | Value |
|---|---|
| Protocol | HTTP |
| Method | `GET` |
| Auth | None (task ID is the identifier) |

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Task ID returned from `/retoucher/start` |

**Example Request**

```bash
curl --location 'https://retoucher.hz.labs.retouch4.me/api/v1/retoucher/status/jpeg-example-job-id'
```

#### Response

**Success (200) — In Progress**

```json
{
  "status": 200,
  "state": "active",
  "progress": 5,
  "reason": "",
  "attempt": 1,
  "currentStep": "downloading",
  "maxAttempts": 3,
  "pluginName": "",
  "expireDate": "2026-03-18T21:58:47.836Z"
}
```

**Success (200) — Completed**

```json
{
  "status": 200,
  "state": "completed",
  "progress": 100,
  "reason": "",
  "attempt": 1,
  "currentStep": "uploading",
  "maxAttempts": 3,
  "pluginName": "",
  "expireDate": "2026-03-18T21:29:16.144Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `status` | `number` | `200` |
| `state` | `string` | Task state: `completed`, `failed`, `waiting`, `active`, or `delayed` |
| `progress` | `number` | Progress percentage, `0`–`100` |
| `reason` | `string` | Error message when `state = "failed"`; empty otherwise |
| `attempt` | `number` | Current attempt number |
| `currentStep` | `string` | Name of the current processing step (may still show last step name even when completed) |
| `maxAttempts` | `number` | Maximum number of retry attempts |
| `pluginName` | `string` | Active plugin name during processing |
| `expireDate` | `string` (ISO 8601) | When the result file will expire and be deleted |

**State Values**

| State | Meaning |
|---|---|
| `waiting` | Task is queued |
| `active` | Task is being processed |
| `delayed` | Task is delayed |
| `completed` | Task finished successfully — result is ready to download |
| `failed` | An error occurred; see `reason` field |

**Errors**

| Code | Condition |
|---|---|
| `404` | No task found with the given ID |
| `500` | Internal server error |

**Notes**
- Do not poll too frequently — avoid intervals shorter than a few seconds (e.g. do not use a 1-second polling loop)
- Even when `progress = 100`, the result may not yet be saved; only download after `state = "completed"`

---

### 4. Download Retouch Result

**`GET /api/v1/retoucher/getFile/{id}`**

Download the processed result after the task reaches `state = "completed"`.

#### Request

| Property | Value |
|---|---|
| Protocol | HTTP |
| Method | `GET` |
| Auth | None (task ID is the identifier) |

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Task ID returned from `/retoucher/start` |

**Example Requests**

```bash
# Download flat JPEG result
curl --location 'https://retoucher.hz.labs.retouch4.me/api/v1/retoucher/getFile/jpeg-example-job-id' \
  --output DSC_6229_Cloud_Retouch.jpg

# Download layered ZIP archive
curl --location 'https://retoucher.hz.labs.retouch4.me/api/v1/retoucher/getFile/layers-example-job-id' \
  --output DSC_6229_Cloud_Retouch_Layers.zip
```

#### Response

| Payload type | Response content |
|---|---|
| Flattened (`Layer` omitted or `Layer: 0`) | Single retouched image file (JPEG or PNG) |
| Layered (`Layer: 1` on any task) | ZIP archive containing separate PNG layer files + `result.json` |

**Errors**

| Code | Condition |
|---|---|
| `404` | No task found with the given ID, or result has expired |
| `500` | Internal server error |

**Notes**
- Only call this endpoint after `state = "completed"` from the status endpoint
- Results are stored for **24 hours only** — old files cannot be retrieved after expiry
- `progress = 100` alone does not guarantee the file is ready; wait for `state = "completed"`

---

### 5. Get File Limits

**`GET /api/v1/info/limits`**

Returns the allowed file formats and size/resolution limits. Check this before submitting a file.

> **Note:** This endpoint is not yet available in production at the time of writing.

#### Request

| Property | Value |
|---|---|
| Protocol | HTTP |
| Method | `GET` |
| Auth | None |

#### Response

**Success (200)**

```json
{
  "image": {
    "formats": ["png", "jpg", "jpeg"],
    "maxFileSizeInMB": 100,
    "maxMegapixels": 250
  },
  "archive": {
    "formats": ["zip"]
  }
}
```

| Field | Type | Description |
|---|---|---|
| `image.formats` | `string[]` | Accepted image formats |
| `image.maxFileSizeInMB` | `number` | Maximum image file size in megabytes |
| `image.maxMegapixels` | `number` | Maximum image resolution in megapixels |
| `archive.formats` | `string[]` | Accepted archive formats |

---

## Task Payload Format

The `payload` form field in `/retoucher/start` is a JSON string with the following structure.

### Top-Level Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `mode` | `string` | Yes | Processing mode. Currently only `"professional"` is documented |
| `tasks` | `object[]` | Yes | Ordered array of plugin task objects |
| `outputFormat` | `string` | No | Output format hint: `"jpeg"` or `"zip"`. Inferred from tasks if omitted |

### Task Object Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `Plugin` | `string` | Yes | Plugin name (see Supported Plugins below) |
| `Scale` | `number` | Depends on plugin | Processing scale / detail level |
| `Alpha1` | `number` | Depends on plugin | Primary strength parameter (classic Alpha1) |
| `Alpha2` | `number` | Depends on plugin | Secondary strength parameter (classic Alpha2) |
| `Layer` | `number` | No | `0` = flattened output (default), `1` = return as a separate layer in ZIP |
| `User Params` | `object` | Depends on plugin | Extended parameters for certain plugins (e.g. Color Correction) |

> See the official `task.html` reference for the full plugin parameter table (Alpha1/Alpha2 correspondence, scale options, and additional plugin notes).

---

## Supported Plugins

### Face / Person Retouching

| Plugin | Description |
|---|---|
| `Heal` | Blemish cleanup and removal of small skin distractions |
| `Dodge Burn` | Local light and shadow shaping on skin and facial features |
| `Portrait Volumes` | Emphasize shape and volume in the face and portrait contours |
| `Eye Vessels` | Reduce visible veins and redness in the whites of the eyes |
| `Eye Brilliance` | Enhance iris detail and add subtle brightness to the eyes |
| `White Teeth` | Whiten and slightly brighten teeth |
| `Mattifier` | Reduce skin shine / matting effect |
| `Skin Mask` | Generate a skin mask for confining color and texture work to skin areas |
| `Skin Tone` | Unify skin color and reduce uneven tone transitions |
| `Face Lifting` | Reshape face contours, apply beauty lifting, masculinity, and double chin correction |
| `Glasses Anti Glare` | Remove glare from glasses lenses |
| `Face Detection` | Detect and supply face metadata for face-aware plugins (must run first) |

### Product Retouching

| Plugin | Description |
|---|---|
| `Clean Backdrop` | Clean background areas |
| `Dust` | Remove fine dust particles (use `Scale: 3` for the smallest particles) |
| `Fabric` | Soften wrinkles and clean texture on clothing and fabric |

### Color Correction

| Plugin | Description |
|---|---|
| `Color Correction` | AI-powered color correction with configurable mode |

---

## Plugin Parameter Correspondence Table

Complete reference for all plugin parameters with value ranges. **The numerical value of 1 corresponds to 100% in the plugin.**

### Parameter Definitions

- **Alpha1** — Primary strength parameter (cleanup/shaping/enhancement intensity)
- **Alpha2** — Secondary strength parameter (used by plugins like Dodge Burn, White Teeth, Skin Tone)
- **Scale** — Scale of the person in the photo, also can be interpreted as resolution:
  - `0` - Auto detection (standard)
  - `1` - Close-up of the face
  - `2` - Half-body portrait (used by Dodge Burn for more detailed work)
  - `3` - Full-body portrait (used by Dust/Fabric for finest particles)
- **Automask** — (Clean Backdrop only) Protects the person so changes apply only to the background
- **Layer** — `0` = apply directly to flattened output, `1` = return as separate file in ZIP

### Complete Plugin Parameter Reference

| Plugin | Alpha1 | Alpha1 Range | Alpha2 | Alpha2 Range | Default Scale |
|---|---|---|---|---|---|
| Skin Mask | Sensitivity | [0, 2] | — | — | 0 |
| Clean Backdrop | Blend | [0, 1] | — | — | 0 |
| Heal | Sensitivity | [0, 1] | — | — | 0 |
| Fabric | Blend | [0, 2] | — | — | 0 |
| Dust | Blend | [0, 2] | — | — | 0 |
| Eye Vessels | Blend | [0, 1] | — | — | 0 |
| Eye Brilliance | Blend | [0, 2] | — | — | 0 |
| White Teeth | Whiten | [0, 1] | Brighten | [0, 1] | 0 |
| Mattifier | Blend | [0, 1] | — | — | 0 |
| Dodge Burn | Blend | [0, 2] | Warmth | [0, 1] | 0 (use 2 for detail work) |
| Skin Tone | Blend | [0, 2] | Tone Smoothing | [0, 2] | 0 |
| Portrait Volumes | Blend | [0, 2] | — | — | 0 |
| Glasses Anti Glare | Glasses Glare Removal | [0, 1] | — | — | 0 |

---

### Intensity Preset Levels

The three standard intensity levels below map parameter values for commonly-used plugin combinations. Use these as templates when building preset tasks.

| Plugin | Subtle | Normal | Extreme |
|---|---|---|---|
| Heal | Alpha1: 0.2 | Alpha1: 0.6 | Alpha1: 1.0 |
| Dodge Burn | Alpha1: 0.2, Alpha2: 0.05 | Alpha1: 0.6, Alpha2: 0.15 | Alpha1: 1.0, Alpha2: 0.35 |
| Portrait Volumes | Alpha1: 0.1 | Alpha1: 0.3 | Alpha1: 0.9 |
| Eye Vessels | Alpha1: 0.2 | Alpha1: 0.5 | Alpha1: 1.0 |
| Eye Brilliance | Alpha1: 0.2 | Alpha1: 0.5 | Alpha1: 0.85 |
| White Teeth | Alpha1: 0.1, Alpha2: 0.08 | Alpha1: 0.25, Alpha2: 0.25 | Alpha1: 0.65, Alpha2: 0.55 |
| Mattifier | Alpha1: 0.2 | Alpha1: 0.5 | Alpha1: 0.9 |
| Skin Tone | Alpha1: 0.2, Alpha2: 0.2 | Alpha1: 0.5, Alpha2: 0.5 | Alpha1: 1.0, Alpha2: 1.0 |
| Fabric | Alpha1: 0.1 | Alpha1: 0.39 | Alpha1: 0.75 |
| Dust | Alpha1: 0.2 | Alpha1: 0.5 | Alpha1: 1.0 |
| Clean Backdrop | Alpha1: 0.2 | Alpha1: 0.5 | Alpha1: 1.0 |
| Glasses Anti Glare | 0.2 | 0.5 | 1.0 |

---

## Plugin Parameter Details

### Face Detection

No Alpha or Scale parameters. Must be placed **first** in the tasks array when used, so subsequent face-aware plugins can reuse the detected face metadata.

```json
{ "Plugin": "Face Detection" }
```

### Heal

| Parameter | Type | Description |
|---|---|---|
| `Scale` | `number` | Detail level (use `0` for standard) |
| `Alpha1` | `number` | Cleanup strength, range `0.0`–`1.0` |
| `Layer` | `number` | `0` = flatten, `1` = separate layer |

### Dodge Burn

| Parameter | Type | Description |
|---|---|---|
| `Scale` | `number` | `0` = standard, `2` = more detailed work |
| `Alpha1` | `number` | Light shaping strength |
| `Alpha2` | `number` | Shadow shaping strength |
| `Layer` | `number` | `0` = flatten, `1` = separate layer |

Blend mode when layered: **Soft Light**

### Portrait Volumes

| Parameter | Type | Description |
|---|---|---|
| `Scale` | `number` | `0` = standard |
| `Alpha1` | `number` | Shaping strength |
| `Layer` | `number` | `0` = flatten, `1` = separate layer |

Blend mode when layered: **Soft Light**

### Eye Vessels

| Parameter | Type | Description |
|---|---|---|
| `Scale` | `number` | `0` = standard |
| `Alpha1` | `number` | Redness reduction strength |
| `Layer` | `number` | `0` = flatten, `1` = separate layer |

### Eye Brilliance

| Parameter | Type | Description |
|---|---|---|
| `Scale` | `number` | `0` = standard |
| `Alpha1` | `number` | Brightness/detail enhancement strength |
| `Layer` | `number` | `0` = flatten, `1` = separate layer |

### White Teeth

| Parameter | Type | Description |
|---|---|---|
| `Scale` | `number` | `0` = standard |
| `Alpha1` | `number` | Whitening strength |
| `Alpha2` | `number` | Brightening strength |
| `Layer` | `number` | `0` = flatten, `1` = separate layer |

### Mattifier

| Parameter | Type | Description |
|---|---|---|
| `Scale` | `number` | `0` = standard |
| `Alpha1` | `number` | Matte effect strength |
| `Layer` | `number` | `0` = flatten, `1` = separate layer |

### Skin Mask

| Parameter | Type | Description |
|---|---|---|
| `Scale` | `number` | `0` = standard |
| `Alpha1` | `number` | Mask strength |
| `Layer` | `number` | Typically `1` — used as a helper mask layer |

### Skin Tone

| Parameter | Type | Description |
|---|---|---|
| `Scale` | `number` | `0` = standard |
| `Alpha1` | `number` | Color unification strength |
| `Alpha2` | `number` | Tone transition smoothing strength |
| `Layer` | `number` | `0` = flatten, `1` = separate layer |

Blend mode when layered: **Soft Light**

### Fabric

| Parameter | Type | Description |
|---|---|---|
| `Scale` | `number` | `0` = standard |
| `Alpha1` | `number` | Fabric smoothing/wrinkle reduction strength |
| `Layer` | `number` | `0` = flatten, `1` = separate layer |

### Dust

| Parameter | Type | Description |
|---|---|---|
| `Scale` | `number` | Detail level: `3` = finest/smallest particles |
| `Alpha1` | `number` | Removal strength |
| `Layer` | `number` | `0` = flatten, `1` = separate layer |

### Clean Backdrop

| Parameter | Type | Description |
|---|---|---|
| `Scale` | `number` | `0` = standard |
| `Alpha1` | `number` | Cleanup strength |
| `Layer` | `number` | `0` = flatten, `1` = separate layer |

### Face Lifting

| Parameter | Type | Required | Description |
|---|---|---|---|
| `face_lifting_version` | `number` | Recommended | `3` enables beauty lifting + double chin correction |
| `Face Lifting` | `number` | Yes | Overall lifting strength, range `0.0`–`1.0` |
| `Face Masculinity` | `number` | No | Masculinity adjustment, range `0.0`–`1.0` |
| `Double Chin Correction` | `number` | No | Double chin correction strength, range `0.0`–`1.0` |
| `Face Lifting Depth` | `number` | No | Depth of lifting effect, range `0.0`–`1.0` |
| `Flow Smoothing` | `number` | No | Smoothing of the flow/deformation field |
| `Layer` | `number` | No | `0` = flatten, `1` = separate flow layer |

Notes:
- When used before `Glasses Anti Glare`, its depth settings affect the image geometry used to generate the glasses patch, even though the emitted Face Lifting layer remains the flow layer.
- In layered mode the output is a **flow layer** (not a simple pixel layer); compositing requires the flow matrices from `result.json`.

### Glasses Anti Glare

| Parameter | Type | Required | Description |
|---|---|---|---|
| `LayoutMode` | `string` | Yes | `"full"` = full-frame overlay, `"patch"` = packed face patches with placement metadata |
| `Glasses Glare Removal` | `number` | Yes | Glare removal strength, range `0.0`–`1.0` |
| `Layer` | `number` | No | `0` = flatten, `1` = separate layer |

Blend mode when layered: **Linear Light**

**LayoutMode details:**

| Mode | Description |
|---|---|
| `"full"` | Returns a full-frame linear-light overlay. Convenient for direct compositing over the full image. |
| `"patch"` | Returns packed cropped glasses patches. Placement metadata is written to `result.json` under `glassesAntiGlarePatchMatrix`. Use `patchWidth` and `patchHeight` for stored patch size. |

### Color Correction

| Parameter | Type | Required | Description |
|---|---|---|---|
| `Layer` | `number` | Yes | `0` = apply correction directly to output image |
| `User Params` | `object` | Yes | Extended configuration object (see below) |

**`User Params` structure:**

```json
{
  "AI": {
    "Color Correction Mode": "<mode>"
  },
  "Basic": {
    "Enable Basic": true
  }
}
```

**Color Correction Modes (`AI.Color Correction Mode`):**

| Mode | Description |
|---|---|
| `"Exposure only"` | Predicts exposure correction only |
| `"Exposure & WB"` | Predicts exposure + white balance adjustment |
| `"Full"` | Predicts the complete AI color correction set |

---

## Layered Output — result.json

When tasks include `Layer: 1`, the ZIP archive contains a `result.json` file with metadata.

### Top-Level Structure

```json
{
  "jsonVersion": "1",
  "plugins": [
    {
      "pluginName": "...",
      "metadata": { ... },
      "faces": [ { ... } ]
    }
  ]
}
```

### Face Detection Metadata (`metadata.faces[]`)

| Field | Type | Description |
|---|---|---|
| `confidence` | `number` | Detection confidence score |
| `faceAge` | `number` | Estimated age |
| `faceGenderFemale` | `number` | Gender score (female axis) |
| `faceGenderMale` | `number` | Gender score (male axis) |
| `faceGlasses` | `number` | Glasses detection confidence |
| `landmarks` | `object[]` | Array of `{x, y}` normalized landmark coordinates |

### Face Lifting Metadata

| Field | Type | Description |
|---|---|---|
| `flowCount` | `number` | Number of flow matrices (e.g. `5`) |
| `flowMatrices` | `array` | Array of transformation matrices for compositing |

### Glasses Anti Glare — Patch Mode Metadata (`faces[].glassesAntiGlarePatchMatrix`)

| Field | Type | Description |
|---|---|---|
| `glassesAntiGlarePatchMatrix` | `number[][]` | 2×3 affine matrix mapping original-photo coordinates to patch coordinates |
| `patchWidth` | `number` | Stored patch width in pixels |
| `patchHeight` | `number` | Stored patch height in pixels |

**Compositing patch-mode glasses layers (Python example):**

```python
from pathlib import Path
import json
import numpy as np
from PIL import Image

def load_glasses_matrix(result_json_path):
    with result_json_path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    for plugin in data["plugins"]:
        if plugin.get("pluginName") == "Glasses Anti Glare":
            return plugin["faces"][0]["glassesAntiGlarePatchMatrix"]
    raise RuntimeError("Glasses Anti Glare metadata was not found")

def linear_light_blend(base_rgb, overlay_rgba):
    base = np.asarray(base_rgb, dtype=np.float32)
    overlay = np.asarray(overlay_rgba, dtype=np.float32)
    overlay_rgb = overlay[..., :3]
    overlay_alpha = overlay[..., 3:4] / 255.0
    linear_light = np.clip(base + 2.0 * overlay_rgb - 255.0, 0.0, 255.0)
    blended = base * (1.0 - overlay_alpha) + linear_light * overlay_alpha
    return Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8), "RGB")

photo = Image.open("source.jpg").convert("RGB")
patch = Image.open("glasses_patch.png").convert("RGBA")
matrix = load_glasses_matrix(Path("result.json"))

# PIL affine coefficients map output pixels to input pixels.
# The API matrix maps original-photo coordinates to patch coordinates.
coeffs = (
    matrix[0][0], matrix[0][1], matrix[0][2],
    matrix[1][0], matrix[1][1], matrix[1][2],
)
full_size_overlay = patch.transform(
    photo.size,
    Image.Transform.AFFINE,
    coeffs,
    resample=Image.Resampling.BICUBIC,
    fillcolor=(0, 0, 0, 0),
)
result = linear_light_blend(photo, full_size_overlay)
result.save("output.jpg", quality=95)
```

---

## Webhook Integration

An optional `hook` field can be added to the `/retoucher/start` form to receive an async callback when a job completes, instead of relying solely on polling.

- Works for both flat and layered jobs
- **Webhook domains must be pre-approved** — email the list of domains to `relu@retouch4.me` before use

---

## Payload Examples

### Example 1 — All-In-One Retouching (Balanced)

Flat output, moderate preset for a clean commercial result.

```json
{
  "mode": "professional",
  "tasks": [
    { "Plugin": "Heal",             "Scale": 0, "Alpha1": 1.0 },
    { "Plugin": "Fabric",           "Scale": 0, "Alpha1": 0.39 },
    { "Plugin": "Eye Vessels",      "Scale": 0, "Alpha1": 1.0 },
    { "Plugin": "Eye Brilliance",   "Scale": 0, "Alpha1": 0.5 },
    { "Plugin": "White Teeth",      "Scale": 0, "Alpha1": 0.25, "Alpha2": 0.25 },
    { "Plugin": "Dodge Burn",       "Scale": 2, "Alpha1": 1.0,  "Alpha2": 0.2 },
    { "Plugin": "Skin Tone",        "Scale": 0, "Alpha1": 1.0,  "Alpha2": 1.0 },
    { "Plugin": "Portrait Volumes", "Scale": 0, "Alpha1": 0.5 }
  ]
}
```

### Example 1b — All-In-One Retouching (Slight)

Lower values, softer result preserving more original texture.

```json
{
  "mode": "professional",
  "tasks": [
    { "Plugin": "Heal",             "Scale": 0, "Alpha1": 0.8 },
    { "Plugin": "Eye Vessels",      "Scale": 0, "Alpha1": 0.35 },
    { "Plugin": "White Teeth",      "Scale": 0, "Alpha1": 0.1,  "Alpha2": 0.08 },
    { "Plugin": "Dodge Burn",       "Scale": 2, "Alpha1": 0.35, "Alpha2": 0.08 },
    { "Plugin": "Skin Tone",        "Scale": 0, "Alpha1": 0.35, "Alpha2": 0.35 },
    { "Plugin": "Portrait Volumes", "Scale": 0, "Alpha1": 0.18 }
  ]
}
```

### Example 1c — All-In-One Retouching (Heavy)

Higher values for a stronger, more polished look.

```json
{
  "mode": "professional",
  "tasks": [
    { "Plugin": "Heal",             "Scale": 0, "Alpha1": 0.9 },
    { "Plugin": "Fabric",           "Scale": 0, "Alpha1": 0.75 },
    { "Plugin": "Eye Vessels",      "Scale": 0, "Alpha1": 0.9 },
    { "Plugin": "Eye Brilliance",   "Scale": 0, "Alpha1": 0.85 },
    { "Plugin": "White Teeth",      "Scale": 0, "Alpha1": 0.65, "Alpha2": 0.55 },
    { "Plugin": "Dodge Burn",       "Scale": 2, "Alpha1": 1.35, "Alpha2": 0.35 },
    { "Plugin": "Skin Tone",        "Scale": 0, "Alpha1": 1.15, "Alpha2": 1.15 },
    { "Plugin": "Portrait Volumes", "Scale": 0, "Alpha1": 0.9 }
  ]
}
```

### Example 2 — AI Color Correction (Exposure Only)

```json
{
  "mode": "professional",
  "tasks": [
    {
      "Plugin": "Color Correction",
      "Layer": 0,
      "User Params": {
        "AI": { "Color Correction Mode": "Exposure only" },
        "Basic": { "Enable Basic": true }
      }
    }
  ]
}
```

### Example 2b — AI Color Correction (Exposure + WB)

```json
{
  "mode": "professional",
  "tasks": [
    {
      "Plugin": "Color Correction",
      "Layer": 0,
      "User Params": {
        "AI": { "Color Correction Mode": "Exposure & WB" },
        "Basic": { "Enable Basic": true }
      }
    }
  ]
}
```

### Example 2c — AI Color Correction (Full)

```json
{
  "mode": "professional",
  "tasks": [
    {
      "Plugin": "Color Correction",
      "Layer": 0,
      "User Params": {
        "AI": { "Color Correction Mode": "Full" },
        "Basic": { "Enable Basic": true }
      }
    }
  ]
}
```

### Example 3 — Face Lifting + Glasses Anti Glare (Flat)

Face Detection must run first. Dust targets fine particles with Scale: 3.

```json
{
  "mode": "professional",
  "outputFormat": "jpeg",
  "tasks": [
    { "Plugin": "Face Detection" },
    { "Plugin": "Heal",  "Scale": 0, "Alpha1": 1.0 },
    { "Plugin": "Dust",  "Scale": 3, "Alpha1": 1.0 },
    {
      "Plugin": "Face Lifting",
      "face_lifting_version": 3,
      "Face Lifting": 1.0,
      "Face Masculinity": 0.55,
      "Double Chin Correction": 1.0,
      "Face Lifting Depth": 0.6,
      "Flow Smoothing": 0.1
    },
    {
      "Plugin": "Glasses Anti Glare",
      "LayoutMode": "full",
      "Glasses Glare Removal": 1.0
    }
  ]
}
```

### Example 4 — Layered Retouching (ZIP Output)

All tasks use `Layer: 1` — output is a ZIP archive with separate PNG files.

```json
{
  "mode": "professional",
  "tasks": [
    { "Plugin": "Skin Mask",        "Scale": 0, "Alpha1": 1.0,  "Layer": 1 },
    { "Plugin": "Heal",             "Scale": 0, "Alpha1": 1.0,  "Layer": 1 },
    { "Plugin": "Fabric",           "Scale": 0, "Alpha1": 0.39, "Layer": 1 },
    { "Plugin": "Eye Vessels",      "Scale": 0, "Alpha1": 1.0,  "Layer": 1 },
    { "Plugin": "Eye Brilliance",   "Scale": 0, "Alpha1": 0.5,  "Layer": 1 },
    { "Plugin": "White Teeth",      "Scale": 0, "Alpha1": 0.25, "Alpha2": 0.25, "Layer": 1 },
    { "Plugin": "Dodge Burn",       "Scale": 2, "Alpha1": 1.0,  "Alpha2": 0.2,  "Layer": 1 },
    { "Plugin": "Skin Tone",        "Scale": 0, "Alpha1": 1.0,  "Alpha2": 1.0,  "Layer": 1 },
    { "Plugin": "Portrait Volumes", "Scale": 0, "Alpha1": 0.5,  "Layer": 1 }
  ]
}
```

### Example 5 — Heal + Glasses Anti Glare Layers (Full Layout)

```json
{
  "mode": "professional",
  "outputFormat": "zip",
  "tasks": [
    { "Plugin": "Face Detection" },
    { "Plugin": "Heal", "Scale": 0, "Layer": 1, "Alpha1": 1.0 },
    {
      "Plugin": "Glasses Anti Glare",
      "Layer": 1,
      "LayoutMode": "full",
      "Glasses Glare Removal": 1.0
    }
  ]
}
```

Output: `LayoutMode: "full"` returns a full-frame linear-light overlay for direct compositing.

### Example 6 — Heal + Face Lifting + Glasses Anti Glare Layers (Patch Layout)

```json
{
  "mode": "professional",
  "outputFormat": "zip",
  "tasks": [
    { "Plugin": "Face Detection" },
    { "Plugin": "Heal", "Scale": 0, "Layer": 1, "Alpha1": 1.0 },
    {
      "Plugin": "Face Lifting",
      "Layer": 1,
      "face_lifting_version": 3,
      "Face Lifting": 1.0,
      "Face Masculinity": 0.55,
      "Double Chin Correction": 1.0,
      "Face Lifting Depth": 0.6,
      "Flow Smoothing": 0.1
    },
    {
      "Plugin": "Glasses Anti Glare",
      "Layer": 1,
      "LayoutMode": "patch",
      "Glasses Glare Removal": 1.0
    }
  ]
}
```

Output: Patch-mode ZIP contains packed face patches + placement matrices in `result.json`. Face Lifting depth values affect the geometry used to generate the glasses patch, even though the Face Lifting layer itself is the flow layer.

---

## Layered ZIP Archive — Layer Blend Modes Reference

| Plugin | Blend Mode |
|---|---|
| Skin Mask | N/A (use as mask/selection helper) |
| Heal | Normal |
| Fabric | Normal |
| Eye Vessels | Normal |
| Eye Brilliance | Normal |
| White Teeth | Normal |
| Dodge Burn | Soft Light |
| Skin Tone | Soft Light |
| Portrait Volumes | Soft Light |
| Glasses Anti Glare | Linear Light |

---

## FAQ

**How do I get a retouch token?**  
Visit `https://retouch4.me/token_page` with an authorized and verified Retouch4me account.

**How do I submit a retouching task?**  
Send a `multipart/form-data` POST to `/api/v1/retoucher/start` with the source image, token, and JSON payload.

**How do I check processing progress?**  
Poll `GET /api/v1/retoucher/status/{id}` until `state` is `"completed"` or `"failed"`.

**How do I download the result?**  
After `state = "completed"`, download from `GET /api/v1/retoucher/getFile/{id}`.

**Which input formats are supported?**  
`jpeg`, `jpg`, `png` (max 100 MB, max 250 megapixels).

**What does the service return?**  
A flat retouched JPEG/PNG when no `Layer: 1` tasks are used, or a ZIP archive with separate PNG layers when one or more tasks include `Layer: 1`.

**How long are results stored?**  
24 hours. After that the file is deleted and cannot be retrieved.

**How do I use webhooks instead of polling?**  
Add the optional `hook` form field with your callback URL. Email `relu@retouch4.me` with your list of webhook domains first — they must be approved before use.

**What is the recommended polling interval?**  
The docs do not specify a minimum, but explicitly warn against 1-second intervals. A few seconds between polls is appropriate.

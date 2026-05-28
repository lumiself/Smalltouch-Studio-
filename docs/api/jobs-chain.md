# Jobs Chain — API Endpoint Schema

Copies one or more completed job outputs from the `outputs` bucket into the `inputs` bucket so they can be used as the input to a subsequent processing step. This enables multi-step workflows (e.g. retouch → background replace) without the user downloading and re-uploading files.

---

## POST /api/jobs/chain

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
  "outputPaths": ["userId/jobId_result.jpg", "userId/jobId2_result.jpg"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `outputPaths` | `string[]` | Yes | Paths in the `outputs` bucket to copy. Each must start with the authenticated user's ID. |

### Response — 200 OK

```json
{
  "inputPaths": [
    { "originalPath": "userId/jobId_result.jpg", "newInputPath": "userId/newJobId_original.jpg" }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `inputPaths` | `object[]` | One entry per input `outputPath` |
| `inputPaths[].originalPath` | `string` | The source output path that was copied |
| `inputPaths[].newInputPath` | `string` | The new path in the `inputs` bucket, ready to pass to any processing hook |

### Response — 400 Bad Request

```json
{ "error": "outputPaths must be a non-empty array" }
```

### Response — 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

### Response — 403 Forbidden

```json
{ "error": "Access denied" }
```

Returned when any path in `outputPaths` does not begin with the authenticated user's ID.

### Response — 500 Internal Server Error

```json
{ "error": "Failed to copy file: <message>" }
```

### Notes

- Paths are verified to belong to the requesting user before any copy is attempted.
- The copy is performed server-side (service role) — no file data passes through the client browser.
- The new input path format is `{userId}/{newJobId}_original.{ext}` where `newJobId` is a fresh UUID.
- Token costs: none. Chaining is free; tokens are charged only by the subsequent processing step.
- Rate limits: subject to Supabase storage bandwidth limits (5 GB/month on free tier). Typical portrait JPEGs are 2–5 MB each.

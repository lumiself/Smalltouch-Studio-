# Admin Preset Endpoints

Manage the `system_presets` table — the preset library shown in One Click Enhance.
All endpoints require an admin-authenticated Bearer token.

---

## GET /api/admin/presets

Returns all system presets (active and hidden) ordered by `sort_order`.

### Request

**Headers**
```
Authorization: Bearer <supabase_access_token>
```

### Response — 200 OK

```json
{
  "presets": [
    {
      "id": "uuid",
      "preset_key": "natural",
      "panel": "retouch",
      "name": "Natural",
      "icon": "👤",
      "description": "Subtle cleanup, everyday portraits",
      "categories": ["Portrait"],
      "token_cost": 1,
      "payload": { "mode": "professional", "tasks": [...] },
      "before_image_url": "https://...",
      "after_image_url": "https://...",
      "status": "active",
      "sort_order": 0,
      "created_at": "2026-05-22T00:00:00Z",
      "updated_at": "2026-05-22T00:00:00Z"
    }
  ]
}
```

### Response — 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

---

## POST /api/admin/presets

Creates a new system preset.

### Request

**Headers**
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `preset_key` | string | yes | Short identifier, unique e.g. `natural` |
| `panel` | string | yes | Always `retouch` for now |
| `name` | string | yes | Display name |
| `icon` | string | yes | Emoji character |
| `description` | string | yes | One-line description |
| `categories` | string[] | yes | Subset of `[Portrait, Beauty, Editorial, E-commerce, Color]` |
| `token_cost` | integer | yes | Tokens deducted per use |
| `payload` | object | yes | Retouch4me API payload |
| `before_image_url` | string | no | Public URL for before demo image |
| `after_image_url` | string | no | Public URL for after demo image |
| `status` | string | no | `"active"` (default) or `"hidden"` |
| `sort_order` | integer | no | Display order, ascending (default 0) |

### Response — 201 Created

```json
{ "preset": { ...created_row } }
```

### Response — 400 Bad Request

```json
{ "error": "Missing required field: preset_key" }
```

---

## PATCH /api/admin/presets

Updates an existing system preset by `id`.

### Request

**Headers**
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | uuid | yes | The preset row id |
| Any updatable field | varies | no | Same fields as POST minus `preset_key` (immutable after creation) |

### Response — 200 OK

```json
{ "preset": { ...updated_row } }
```

### Response — 404 Not Found

```json
{ "error": "Preset not found" }
```

---

## DELETE /api/admin/presets

Deletes a system preset by `id`.

### Request

**Headers**
```
Authorization: Bearer <supabase_access_token>
```

**Query params**

| Param | Type | Required |
|-------|------|----------|
| `id` | uuid | yes |

### Response — 200 OK

```json
{ "ok": true }
```

### Response — 404 Not Found

```json
{ "error": "Preset not found" }
```

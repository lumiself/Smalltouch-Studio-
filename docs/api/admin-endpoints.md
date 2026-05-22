# Admin API Endpoints

All admin endpoints require:
- `Authorization: Bearer <supabase_access_token>` header
- The authenticated user's email must match the `ADMIN_EMAIL` environment variable
- Server-side validation using `SUPABASE_SERVICE_ROLE_KEY`

---

## POST /api/tokens/generate

Generate a batch of token voucher codes tied to a specific package.

### Request Headers
| Header | Value |
|--------|-------|
| Authorization | `Bearer <access_token>` |
| Content-Type | `application/json` |

### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| quantity | integer | yes | Number of codes to generate (1–500) |
| packageId | string | yes | Package tier: `starter`, `basic`, `standard`, `pro`, `studio` |
| value | integer | yes | Token value of each code (must match package token count) |

### Response — 200 OK
```json
{
  "codes": ["SMTCH-AB3D-EF7G", "SMTCH-HJ9K-LM2N"],
  "count": 2
}
```

### Response — Error Cases
| Status | Error | Cause |
|--------|-------|-------|
| 400 | Invalid parameters | Missing fields or quantity out of range |
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | User is not the admin |
| 500 | Failed to generate codes | Database insert error |

---

## GET /api/admin/users

List all registered users with their current package and token balance.

### Request Headers
| Header | Value |
|--------|-------|
| Authorization | `Bearer <access_token>` |

### Response — 200 OK
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "token_balance": 42,
      "package_id": "basic",
      "package_set_at": "2026-05-01T12:00:00Z",
      "created_at": "2026-04-15T09:30:00Z"
    }
  ]
}
```

### Response — Error Cases
| Status | Error | Cause |
|--------|-------|-------|
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | User is not the admin |
| 405 | Method not allowed | Non-GET request |
| 500 | Failed to fetch users | Database error |

---

## POST /api/admin/update-package

Manually assign or upgrade a user's package tier.

### Request Headers
| Header | Value |
|--------|-------|
| Authorization | `Bearer <access_token>` |
| Content-Type | `application/json` |

### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string (uuid) | yes | Target user's Supabase auth ID |
| packageId | string | yes | New package tier to assign |

### Response — 200 OK
```json
{ "success": true }
```

### Response — Error Cases
| Status | Error | Cause |
|--------|-------|-------|
| 400 | Missing userId or packageId | Required fields absent |
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | User is not the admin |
| 500 | Failed to update package | Database error |

---

## GET /api/admin/codes

List all voucher codes with their redemption status. Returns the 200 most recent codes.

### Request Headers
| Header | Value |
|--------|-------|
| Authorization | `Bearer <access_token>` |

### Query Parameters
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| used | boolean | (all) | Filter to only used (`true`) or unused (`false`) codes |

### Response — 200 OK
```json
{
  "codes": [
    {
      "id": "uuid",
      "code": "SMTCH-AB3D-EF7G",
      "package_id": "basic",
      "value": 50,
      "is_used": false,
      "used_by": null,
      "used_at": null,
      "created_at": "2026-05-01T10:00:00Z"
    }
  ]
}
```

### Response — Error Cases
| Status | Error | Cause |
|--------|-------|-------|
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | User is not the admin |
| 405 | Method not allowed | Non-GET request |
| 500 | Failed to fetch codes | Database error |

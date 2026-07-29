# PNW POTA Wiki — Public API


All endpoints are open to cross-origin requests and require no authentication.

## Rate Limiting

Requests are limited to **10 per minute per IP address**. Exceeding this returns a `429 Too Many Requests` response:

```json
{ "error": "Too many requests, please try again later." }
```

---

## GET `/api/parks/list`

Returns all parks in the database.

**Query Parameters**

| Parameter | Type | Description |
|---|---|---|
| `has_activation_report` | `true` \| `false` | Filter to parks that have (or don't have) at least one activation report |

**Example Requests**

```
GET /api/parks/list
GET /api/parks/list?has_activation_report=true
GET /api/parks/list?has_activation_report=false
```

**Response**

```json
{
  "total": 312,
  "parks": [
    { "reference": "K-0123", "has_activation_report": true },
    { "reference": "K-0456", "has_activation_report": false }
  ]
}
```

---

## GET `/api/:callsign/parks`

Returns the unique parks a callsign has written activation reports for, along with how many reports they've written per park.

**Path Parameters**

| Parameter | Description |
|---|---|
| `callsign` | Amateur radio callsign (case-insensitive) |

**Example Request**

```
GET /api/KK7KKT/parks
```

**Response**

```json
{
  "callsign": "KK7KKT",
  "total": 3,
  "parks": [
    { "reference": "K-0123", "report_count": 2 },
    { "reference": "K-0456", "report_count": 1 },
    { "reference": "K-0789", "report_count": 1 }
  ]
}
```

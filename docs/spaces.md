# Spaces & Room Designer API Documentation

Base URL: `/api/spaces`

---

## 1. Create Room Space Design

* **Method**: `POST`
* **URL**: `/api/spaces`
* **Auth**: Required

### Request Body
```json
{
  "name": "Minimalist Master Suite",
  "roomType": "Bedroom",
  "style": "Japandi",
  "budget": 120000,
  "products": [
    { "product": "66bc891f21a4f001b2a9f550", "quantity": 1 }
  ]
}
```

### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "_id": "66bc891f21a4f001b2a9f880",
    "name": "Minimalist Master Suite",
    "shareToken": "a8f192b0c11d",
    "estimatedTotal": 89000,
    "budget": 120000
  }
}
```

---

## 2. Access Public Shared Space

* **Method**: `GET`
* **URL**: `/api/spaces/shared/:token`
* **Auth**: None (Public)

### Response (200 OK)
Returns sanitized space without creator user identity details.
```json
{
  "success": true,
  "data": {
    "name": "Minimalist Master Suite",
    "roomType": "Bedroom",
    "style": "Japandi",
    "products": [...],
    "estimatedTotal": 89000
  }
}
```

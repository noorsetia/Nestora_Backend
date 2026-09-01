# Product Catalog API Documentation

Base URL: `/api/products`

---

## 1. List Products (Paginated & Filtered)

* **Method**: `GET`
* **URL**: `/api/products`
* **Query Parameters**:
  * `page` (default: 1)
  * `limit` (default: 12)
  * `category` (slug/name filter)
  * `room` (e.g., Living Room)
  * `style` (e.g., Modern)
  * `minPrice`, `maxPrice`
  * `sort` (`price_asc`, `price_desc`, `rating`, `newest`, `popular`)
  * `search` (keyword search)

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "66bc891f21a4f001b2a9f550",
        "name": "Kiyomi Velvet Curved Sofa",
        "slug": "kiyomi-velvet-curved-sofa",
        "sku": "SOFA-KIY-001",
        "price": 89000,
        "rating": 4.9,
        "reviewCount": 18,
        "image": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc",
        "inStock": true,
        "stock": 14
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "totalProducts": 45,
      "totalPages": 4
    }
  }
}
```

---

## 2. Get Product Details by Slug

* **Method**: `GET`
* **URL**: `/api/products/:slug`
* **Auth**: None (Public)

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "_id": "66bc891f21a4f001b2a9f550",
    "name": "Kiyomi Velvet Curved Sofa",
    "slug": "kiyomi-velvet-curved-sofa",
    "description": "Architectural curved seating upholstered in Italian velvet.",
    "price": 89000,
    "dimensions": { "width": "220", "height": "85", "depth": "95", "unit": "cm" },
    "stock": 14
  }
}
```

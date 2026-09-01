# Orders & Tracking API Documentation

Base URL: `/api/orders`

---

## 1. List User Orders

* **Method**: `GET`
* **URL**: `/api/orders`
* **Auth**: Required
* **Role**: `user` | `admin` | `superadmin`

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "_id": "66bc891f21a4f001b2a9f770",
      "orderNumber": "NST-20260813-4819",
      "total": 94000,
      "orderStatus": "confirmed",
      "payment": { "status": "paid", "provider": "razorpay" },
      "createdAt": "2026-08-13T10:00:00.000Z"
    }
  ]
}
```

---

## 2. Cancel Order

* **Method**: `POST`
* **URL**: `/api/orders/:id/cancel`
* **Auth**: Required
* **Role**: Order Owner

### Request Body
```json
{
  "reason": "Changed my interior design plan."
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "orderNumber": "NST-20260813-4819",
    "orderStatus": "cancelled"
  }
}
```

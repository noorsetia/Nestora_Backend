# Admin Operations & Analytics API Documentation

Base URL: `/api/admin`

---

## 🔒 RBAC Access Control Matrix

* **Admin Operations**: Requires `role: "admin"` or `role: "superadmin"`.
* **Role Modifications**: Requires `role: "superadmin"`.

---

## 1. Get Analytics & Metrics Overview

* **Method**: `GET`
* **URL**: `/api/admin/analytics`
* **Auth**: Required (`admin` / `superadmin`)

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "kpis": {
      "totalRevenue": 2450000,
      "totalOrders": 128,
      "totalProducts": 45,
      "totalUsers": 210
    },
    "recentOrders": [...]
  }
}
```

---

## 2. Update User Administrative Role

* **Method**: `PUT`
* **URL**: `/api/admin/users/:id/role`
* **Auth**: Required (`superadmin` only)

### Request Body
```json
{
  "role": "admin"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "User role updated to admin.",
  "data": {
    "_id": "66bc891f21a4f001b2a9f1a2",
    "email": "elena@example.com",
    "role": "admin"
  }
}
```

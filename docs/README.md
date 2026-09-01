# Nestora REST API Reference Documentation

Welcome to the **Nestora Architectural Living REST API** documentation.

The Nestora backend is built with **Node.js, Express, and MongoDB (Mongoose)**, following a clean layer architecture (Routes → Middleware → Controllers → Services → Models).

---

## 📚 API Modules

| Module | Base Path | Description |
| :--- | :--- | :--- |
| [Authentication](./authentication.md) | `/api/auth` | Registration, Login, Google OAuth, Session, Verification |
| [Products](./products.md) | `/api/products` | Catalog listing, search, filters, product details, inventory |
| [Categories](./categories.md) | `/api/categories` | Architectural hierarchy & category management |
| [Orders](./orders.md) | `/api/orders` | Order creation, tracking, cancellation, history |
| [Payments](./payments.md) | `/api/payments` | Razorpay order generation & HMAC signature verification |
| [Reviews](./reviews.md) | `/api/products/:id/reviews` | Verified buyer reviews, rating calculation |
| [Coupons](./coupons.md) | `/api/coupons` | Promo code validation & usage tracking |
| [Spaces & Room Designer](./spaces.md) | `/api/spaces` | Custom room design creation, estimation, public share links |
| [Recommendations](./recommendations.md) | `/api/recommendations` | Budget builder, complete-the-look bundles, picked-for-you |
| [Admin Operations](./admin.md) | `/api/admin` | RBAC admin dashboard, analytics, audit logs, user management |

---

## 🔒 Authentication & Headers

All protected endpoints require either:
1. **HttpOnly Cookie**: `token=<JWT_TOKEN>` (sent automatically by browser with `credentials: true`)
2. **Bearer Token Header**: `Authorization: Bearer <JWT_TOKEN>`

Every API response also includes a unique request correlation header:
`X-Request-ID: req_82ab12`

---

## 🏥 Health & Operational Status

* `GET /api/health`: General system and database status.
* `GET /api/health/ready`: Kubernetes / PaaS readiness probe (returns 503 if DB disconnected).
* `GET /api/health/live`: Liveness check for Node process.

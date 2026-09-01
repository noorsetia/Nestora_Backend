# Payments API Documentation

Base URL: `/api/payments`

---

## 1. Create Razorpay Payment Order

* **Method**: `POST`
* **URL**: `/api/payments/create-order`
* **Auth**: Required
* **Role**: Authenticated User

### Request Body
```json
{
  "cartItems": [
    { "product": "66bc891f21a4f001b2a9f550", "quantity": 1 }
  ],
  "deliveryMethod": "standard",
  "promoCode": "NESTORA10"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Payment order created successfully",
  "data": {
    "razorpayOrderId": "order_N1928371293",
    "amount": 8010000,
    "currency": "INR",
    "keyId": "rzp_test_nestora_id",
    "calculation": {
      "subtotal": 89000,
      "discount": 8900,
      "shippingFee": 0,
      "total": 80100
    }
  }
}
```

---

## 2. Verify Payment & Create Order

* **Method**: `POST`
* **URL**: `/api/payments/verify`
* **Auth**: Required

### Request Body
```json
{
  "razorpayOrderId": "order_N1928371293",
  "razorpayPaymentId": "pay_P8192837192",
  "razorpaySignature": "4a7b...",
  "cartItems": [
    { "product": "66bc891f21a4f001b2a9f550", "quantity": 1 }
  ],
  "shippingAddress": {
    "fullName": "Elena Rostova",
    "addressLine1": "45 Park Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001",
    "country": "India"
  }
}
```

### Response (201 Created)
```json
{
  "success": true,
  "message": "Payment verified and order created successfully",
  "data": {
    "order": {
      "orderNumber": "NST-20260813-9128",
      "total": 80100,
      "orderStatus": "confirmed"
    }
  }
}
```

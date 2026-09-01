# Authentication API Documentation

Base URL: `/api/auth`

---

## 1. Register User

* **Method**: `POST`
* **URL**: `/api/auth/register`
* **Auth**: None (Public)
* **Role**: Guest

### Request Body
```json
{
  "firstName": "Elena",
  "lastName": "Rostova",
  "email": "elena@example.com",
  "password": "Password123!"
}
```

### Response (201 Created)
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "_id": "66bc891f21a4f001b2a9f1a2",
      "firstName": "Elena",
      "lastName": "Rostova",
      "email": "elena@example.com",
      "role": "user",
      "isEmailVerified": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 2. Login User

* **Method**: `POST`
* **URL**: `/api/auth/login`
* **Auth**: None (Public)
* **Role**: Guest

### Request Body
```json
{
  "email": "elena@example.com",
  "password": "Password123!"
}
```

### Response (200 OK)
Sets HttpOnly cookie `token` and returns user details and token string.
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "66bc891f21a4f001b2a9f1a2",
      "firstName": "Elena",
      "lastName": "Rostova",
      "email": "elena@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1Ni..."
  }
}
```

---

## 3. Get Current User Profile

* **Method**: `GET`
* **URL**: `/api/auth/me`
* **Auth**: Required
* **Role**: `user` | `admin` | `superadmin`

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "66bc891f21a4f001b2a9f1a2",
      "firstName": "Elena",
      "lastName": "Rostova",
      "email": "elena@example.com",
      "role": "user"
    }
  }
}
```

---

## 4. Logout User

* **Method**: `POST`
* **URL**: `/api/auth/logout`
* **Auth**: Optional
* **Role**: Any

### Response (200 OK)
Clears `token` cookie.
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

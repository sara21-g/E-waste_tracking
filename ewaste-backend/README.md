# ♻️ EWaste Platform — Backend API

Smart E-Waste Pickup & Carbon Credit Incentive Platform built with **Node.js**, **Express.js**, and **MongoDB**.

---

## 📁 Project Structure

```
ewaste-backend/
├── src/
│   ├── app.js                  # Express app entry point
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js   # Register, login, tokens
│   │   ├── pickupController.js # Pickup scheduling & lifecycle
│   │   └── carbonController.js # Carbon points & rewards
│   ├── middleware/
│   │   ├── auth.js             # JWT protect & role authorization
│   │   ├── errorHandler.js     # Global error handler
│   │   ├── upload.js           # Multer file uploads
│   │   └── validate.js         # express-validator results
│   ├── models/
│   │   ├── User.js             # User schema (all roles)
│   │   ├── Pickup.js           # Pickup request schema
│   │   ├── Recycler.js         # Certified recycler schema
│   │   ├── NGO.js              # NGO partner schema
│   │   └── index.js            # WasteType, CarbonCredit, Reward, Notification
│   ├── routes/
│   │   ├── auth.js             # /api/auth/*
│   │   ├── users.js            # /api/users/*
│   │   ├── pickups.js          # /api/pickups/*
│   │   ├── recyclers.js        # /api/recyclers/*
│   │   ├── ngos.js             # /api/ngos/*
│   │   ├── carbon.js           # /api/carbon/*
│   │   ├── waste.js            # /api/waste/*
│   │   ├── admin.js            # /api/admin/*
│   │   └── notifications.js    # /api/notifications/*
│   ├── services/
│   │   ├── carbonService.js    # CO₂ calculation, gamification
│   │   ├── emailService.js     # Nodemailer templates
│   │   └── notificationService.js
│   └── utils/
│       └── logger.js           # Winston logger
├── tests/
│   └── api.test.js
├── .env.example
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.x
- MongoDB (local or Atlas)

### Installation

```bash
# Clone or unzip the project
cd ewaste-backend

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secrets, SMTP credentials

# Start development server
npm run dev

# Start production server
npm start
```

---

## 🔑 User Roles

| Role        | Description                            |
|-------------|----------------------------------------|
| `household` | Regular user who schedules pickups     |
| `recycler`  | Verified certified recycler            |
| `ngo`       | Verified NGO partner                   |
| `admin`     | Platform administrator                 |

---

## 📡 API Endpoints

### Authentication — `/api/auth`
| Method | Endpoint                     | Description              | Auth |
|--------|------------------------------|--------------------------|------|
| POST   | `/register`                  | Register new user        | ❌   |
| POST   | `/login`                     | Login                    | ❌   |
| POST   | `/refresh-token`             | Refresh access token     | ❌   |
| GET    | `/verify-email/:token`       | Verify email             | ❌   |
| POST   | `/forgot-password`           | Send reset email         | ❌   |
| PUT    | `/reset-password/:token`     | Reset password           | ❌   |
| GET    | `/me`                        | Get current user         | ✅   |
| POST   | `/logout`                    | Logout                   | ✅   |

### Pickups — `/api/pickups`
| Method | Endpoint                     | Description                       | Role            |
|--------|------------------------------|-----------------------------------|-----------------|
| POST   | `/`                          | Schedule pickup                   | household       |
| GET    | `/`                          | Get own pickups                   | household       |
| GET    | `/:id`                       | Get single pickup                 | owner/admin     |
| DELETE | `/:id`                       | Cancel pickup                     | household       |
| PATCH  | `/:id/status`                | Update status                     | recycler/ngo/admin |
| POST   | `/:id/rate`                  | Rate completed pickup             | household       |
| GET    | `/:id/otp`                   | Get pickup OTP                    | household       |
| POST   | `/:id/verify-otp`            | Verify OTP at collection          | any             |
| POST   | `/:id/images`                | Upload item images                | household       |
| GET    | `/admin/all`                 | Get all pickups                   | admin           |

### Carbon Credits — `/api/carbon`
| Method | Endpoint           | Description                     | Auth |
|--------|--------------------|---------------------------------|------|
| GET    | `/summary`         | Points balance & stats          | ✅   |
| GET    | `/history`         | Transaction history             | ✅   |
| GET    | `/rewards`         | Available rewards catalog       | ✅   |
| POST   | `/redeem`          | Redeem points for reward        | ✅   |
| GET    | `/leaderboard`     | Top earners leaderboard         | ✅   |
| POST   | `/estimate`        | Estimate points before pickup   | ✅   |

### Recyclers — `/api/recyclers`
| Method | Endpoint             | Description                  | Role        |
|--------|----------------------|------------------------------|-------------|
| POST   | `/register`          | Create recycler profile      | recycler    |
| GET    | `/profile`           | Get own profile              | recycler    |
| PUT    | `/profile`           | Update profile               | recycler    |
| POST   | `/documents`         | Upload certifications        | recycler    |
| GET    | `/pickups`           | Get assigned pickups         | recycler    |
| GET    | `/`                  | List verified recyclers      | public      |
| GET    | `/:id`               | Get recycler details         | public      |
| PATCH  | `/:id/verify`        | Approve/reject recycler      | admin       |

### NGOs — `/api/ngos`
| Method | Endpoint                  | Description               | Role   |
|--------|---------------------------|---------------------------|--------|
| POST   | `/register`               | Create NGO profile        | ngo    |
| GET    | `/profile`                | Get own profile           | ngo    |
| PUT    | `/profile`                | Update profile            | ngo    |
| POST   | `/documents`              | Upload documents          | ngo    |
| GET    | `/pickups`                | Get assigned pickups      | ngo    |
| POST   | `/partner-recyclers`      | Add partner recycler      | ngo    |
| GET    | `/`                       | List verified NGOs        | public |
| PATCH  | `/:id/verify`             | Approve/reject NGO        | admin  |

### Admin — `/api/admin`
| Method | Endpoint                        | Description               |
|--------|---------------------------------|---------------------------|
| GET    | `/dashboard`                    | Platform overview         |
| GET    | `/analytics/pickups`            | Monthly trends            |
| GET    | `/analytics/waste-categories`   | Waste breakdown           |
| GET    | `/analytics/geography`          | City-wise distribution    |
| PATCH  | `/pickups/:id/assign`           | Manually assign pickup    |
| POST   | `/seed/waste-types`             | Seed default waste types  |

---

## ♻️ Carbon Credit Flow

```
User schedules pickup
        ↓
Recycler/NGO collects & enters actual weights
        ↓
Status set to "processed"
        ↓
carbonService.calculateAndAwardPoints()
  → CO₂ reduced = weight × carbonEmissionFactor (per waste type)
  → Points = weight × pointsPerKg
  → Bonus multiplier for >10kg, >25kg loads
        ↓
User's carbonPoints balance updated
CarbonCredit transaction logged
Notification sent
Certificate generated
```

## 🏆 Gamification Levels

| Points        | Level            | Badge |
|---------------|------------------|-------|
| 0 – 99        | Eco Starter      | 🌱    |
| 100 – 499     | Green Warrior    | ♻️    |
| 500 – 1499    | Earth Defender   | 🌍    |
| 1500 – 4999   | Climate Champion | ⚡    |
| 5000+         | Planet Guardian  | 🏆    |

---

## 🛡️ Security Features
- JWT access + refresh token rotation
- bcrypt password hashing (12 rounds)
- Role-based access control (RBAC)
- Rate limiting (100 req/15min; 10 auth/15min)
- Helmet HTTP headers
- Input validation via express-validator
- OTP-based pickup verification

## 🧪 Testing

```bash
npm test
```

---

## 📬 Contact
For support or contributions, raise an issue or contact the platform team.

# Fee Dashboard

**Simple Academy Fee Management** — A focused, reliable web application for teachers to track monthly student fees.

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 16 (or Docker)

### Option A — With Docker Compose (Recommended)

```bash
docker compose up --build
```

Then visit:
- **App**: http://localhost:5173
- **API**: http://localhost:3001/api/health

---

### Option B — Manual Setup

#### 1. Start PostgreSQL

Make sure PostgreSQL is running with a database named `feedashboard`.

Or use Docker just for the database:

```bash
docker run -d --name feedashboard-db \
  -e POSTGRES_DB=feedashboard \
  -e POSTGRES_USER=feedashboard \
  -e POSTGRES_PASSWORD=feedashboard123 \
  -p 5432:5432 \
  postgres:16-alpine
```

#### 2. Backend Setup

```bash
cd backend
npm install
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev
```

Backend runs on: http://localhost:3001

#### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:5173

---

## 🔑 Demo Credentials

| Role      | Identifier              | Password / PIN |
|-----------|-------------------------|----------------|
| Admin     | admin@feedashboard.local| ChangeMe123!   |
| Teacher A | TCH-001                 | 1234           |
| Teacher B | TCH-002                 | 5678           |

---

## 📁 Project Structure

```
fee-dashboard/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.js            # Demo data seeding
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.js        # JWT verification, role guards
│   │   │   └── teacherOwnership.js  # Data isolation enforcement
│   │   ├── routes/
│   │   │   ├── auth.js        # Login / logout
│   │   │   ├── teachers.js    # Admin: manage teachers
│   │   │   ├── students.js    # Teacher: manage students
│   │   │   └── fees.js        # Teacher: manage monthly fees
│   │   └── index.js           # Express server
│   ├── .env                   # Local environment config
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/axios.js       # Axios instance with auth interceptors
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ToastContext.jsx
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── ConfirmDialog.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx              # Teacher / Admin login
│   │   │   ├── TeacherDashboard.jsx   # Student list + CRUD
│   │   │   ├── StudentDetail.jsx      # Fee history + CRUD
│   │   │   ├── AdminDashboard.jsx     # Teacher management
│   │   │   └── AdminTeacherDetail.jsx # View teacher's students
│   │   ├── index.css          # Design system
│   │   ├── App.jsx            # Router + auth guards
│   │   └── main.jsx
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## 🗄️ Database Schema

### Teachers
| Column | Type | Notes |
|--------|------|-------|
| id | int | Primary key |
| teacher_code | varchar | Unique (e.g. TCH-001) |
| name | varchar | Teacher's name |
| pin_hash | varchar | bcrypt hash — never stored in plain text |
| status | varchar | active \| inactive |

### Students
| Column | Type | Notes |
|--------|------|-------|
| id | int | Primary key |
| teacher_id | int | FK → teachers.id |
| name | varchar | Required |
| monthly_fee | decimal | Required |
| phone | varchar | Optional |
| class | varchar | Optional |
| notes | text | Optional |

### Monthly Fees
| Column | Type | Notes |
|--------|------|-------|
| id | int | Primary key |
| student_id | int | FK → students.id (cascade delete) |
| teacher_id | int | FK → teachers.id |
| month | int | 1–12 |
| year | int | e.g. 2026 |
| fee_amount | decimal | Fee paid this month |
| created_at | timestamp | When record was first created |
| updated_at | timestamp | Last updated (auto-managed) |

**Unique constraint**: `(student_id, month, year)` — prevents duplicate monthly records.

---

## 🔒 Security Design

- Teacher PINs are hashed with **bcrypt** (10 rounds) — never stored as plain text
- **JWT tokens** (8h expiry) for session management
- Every student/fee API call verifies `student.teacher_id === req.user.id` at the backend
- Admin has a separate role flag; teacher routes reject admin tokens

---

## 📡 API Reference

### Authentication
```
POST /api/auth/teacher/login   { teacherCode, pin }
POST /api/auth/admin/login     { email, password }
POST /api/auth/logout
```

### Students (Teacher-scoped)
```
GET    /api/students             → teacher's students only
POST   /api/students
GET    /api/students/:id         → ownership verified
PUT    /api/students/:id         → ownership verified
DELETE /api/students/:id         → cascades fee records
```

### Monthly Fees
```
GET    /api/students/:id/fees              → last 6 months by default
PUT    /api/students/:id/fees/:year/:month → upsert (create or update)
DELETE /api/students/:id/fees/:year/:month
```

### Teachers (Admin only)
```
GET    /api/teachers
POST   /api/teachers
GET    /api/teachers/:id
PUT    /api/teachers/:id
DELETE /api/teachers/:id   → soft delete (status = inactive)
```

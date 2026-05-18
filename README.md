# GML Operations Portal

A modern logistics operations and dispatch management portal built for trucking and dispatching companies.

This system is designed to manage:

- Staff & Employees
- Companies
- Trucks
- Drivers
- Invoice Generation
- Salary Slips
- Load Reports
- Dispatch Operations
- History & Reporting

---

# Features

## Staff Management
- Create and manage office staff
- Dispatcher and sales employee support
- Fixed salary and commission structure
- CNIC support
- Employee salary history
- Editable employee profiles

---

## Company Management
- Manage trucking companies
- MC Number & DOT Number support
- Fixed rate and percentage-based dispatch billing
- Company-wise invoice management

---

## Truck & Driver Management
- Trucks attached to companies
- Drivers attached to trucks
- Team driver support
- Editable driver/truck profiles

---

## Invoice Generator
- Percentage-based invoices
- Flat-rate monthly invoices
- Auto load calculations
- Auto dispatch amount calculation
- Printable invoice view
- Invoice history support

---

## Salary Slip Generator
- Fixed salary and commission support
- Bonus support
- Printable salary slips
- Salary history
- Employee-specific access

---

## Load Reports
- Auto-fetch loads from invoices
- Manual load entry
- Manual no-load reason entry
- Editable fetched loads
- RPM & gross calculations
- Working day calculations
- Expected gross calculations
- Printable load reports

---

# Tech Stack

## Frontend
- React.js
- Axios
- React Router
- CSS

## Backend
- Node.js
- Express.js
- Prisma ORM

## Database
- PostgreSQL / SQLite (development)

---

# Project Structure

```bash
gml-operations-portal/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── prisma/
│   ├── src/
│   └── package.json
│
└── README.md
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/gml-operations-portal.git
cd gml-operations-portal
```

---

# Backend Setup

```bash
cd backend
npm install
```

Create `.env`

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your_secret"
PORT=5000
```

Run Prisma:

```bash
npx prisma migrate dev
npx prisma generate
```

Start backend:

```bash
npm run dev
```

Backend runs on:

```bash
http://localhost:5000
```

---

# Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```bash
http://localhost:5173
```

---

# Main Modules

| Module | Description |
|---|---|
| Staff | Office employees & dispatchers |
| Companies | Trucking companies |
| Trucks | Trucks linked with companies |
| Drivers | Drivers linked with trucks |
| Invoices | Dispatch invoice generator |
| Salary Slips | Employee payroll system |
| Load Reports | Load analytics & reports |
| History | Invoice/salary history |

---

# Current Functionalities

- Authentication
- Role-based access
- Invoice history
- Salary history
- Printable reports
- Dynamic calculations
- Editable reports
- Auto load storage
- Company/truck/driver linking

---

# Future Improvements

- PDF export
- Email sending
- Cloud storage
- Notification system
- Dashboard analytics
- Fuel tracking
- Expense management
- Broker management
- Driver settlement system

---

# Deployment

## Recommended Deployment

| Service | Purpose |
|---|---|
| Vercel / Netlify | Frontend |
| Render / Railway | Backend |
| PostgreSQL | Production database |

---

---

# Development Status

This project is currently under active development.

Current focus:
- Deployment setup
- Environment configuration
- Production database connection
- Load report history
- Frontend/backend production build support

# Author

Developed for logistics and dispatch operations management.

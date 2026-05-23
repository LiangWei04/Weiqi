# TourneysHub CCA Management System

This project is a PostgreSQL-backed CCA management web application for DBSP Project 1.

## Run

```powershell
cd react-user-dashboard
npm install
npm run build

cd backend
npm install
npm start
```

Open:

```text
http://localhost:3000
```

Default captain account:

```text
admin@example.com
admin123
```

## Notes

- The React app is built into `react-user-dashboard/dist` and served by Express on port `3000`.
- The old backend `public` frontend has been removed to avoid duplicate frontends.
- Authentication follows the BED CA2 middleware pattern: controller validation, bcrypt password middleware, JWT middleware, and `res.locals`.
- Database schema is documented in `DDL.sql` and `backend/DDL.sql`.

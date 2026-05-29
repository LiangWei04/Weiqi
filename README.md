# TourneyHub - Weiqi CCA Event & Competition Management System

TourneyHub is a full-stack web application for managing a Weiqi CCA. It supports member registration, event signups, competition management, attendance tracking, tournament pairings, notifications, announcements, and analytics dashboards.

The project was built for a database-focused assignment, so the system emphasises relational data design, entity granularity, role-based workflows, and meaningful analytics over a simple static CRUD demo.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Chart.js |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JWT, bcrypt, Google OAuth, email verification |
| Email | Nodemailer with SMTP |
| Build/Serving | React production build served by Express on port `3000` |

## Main Features

### Authentication

- Register and login with username or email.
- Passwords are hashed using bcrypt.
- JWT is used to protect backend routes.
- Email verification is supported through SMTP.
- Forgot-password flow sends a reset code by email.
- Google OAuth login is supported when OAuth credentials are configured.
- Users can deactivate their own account.

### Role-Based Access Control

The system uses a single authoritative role field in the `users` table.

| Role | Main Permissions |
| --- | --- |
| Captain | Full access: users, roles, events, competitions, approvals, attendance, settings, announcements |
| Vice-Captain | Create/edit events and competitions, manage drafts, use tournament engine, mark attendance |
| Secretary | Manage member participation and registration approval workflows |
| Member | View/register for events and competitions, view own activity stats, comment/react to events |

Frontend navigation and backend middleware both enforce role permissions.

### Event Management

- Create, edit, publish, pin, archive, cancel, and delete events.
- Draft events are hidden from members until published.
- Published events support capacity limits and registration deadlines.
- Events can require approval before registration is confirmed.
- Members can register for events before the event is full or closed.
- Event discussions allow comments, short edit/delete window, and Exco moderation.
- Event reactions work similarly to lightweight chat reactions.
- Past events are automatically treated as archived.

### Competition Management

- Create competitions with venue, dates, registration deadline, rules, and categories.
- Draft competitions are separate from published competitions.
- Categories can define capacity, fee, age limits, rank type, and rank range.
- Members can register for only one category per competition.
- Registration closes when the deadline passes, capacity is full, or tournament pairing starts.
- Pending registrations can be approved or rejected by authorised Exco users.
- Closed/full activities can auto-reject pending requests.

### Tournament Engine

- Supports competition rounds, matches, pairings, table numbers, byes, and match results.
- Weiqi has no draw result in this implementation.
- Next round generation is blocked until current round matches are completed.
- Ranking history is stored using MMS/SOS/SOSOS-style records.
- Member dashboards can show personal competition performance and achievement history.

### Attendance Management

- Attendance is activity-first: Excos choose an event or competition, then mark participants.
- Bulk mark-present is available for faster attendance taking.
- Attendance is prioritised by today's activities, then closest upcoming activities.
- Attendance is not marked by default.
- Late attendance changes after the activity date require captain approval.
- Attendance change requests are stored separately for auditability.

### Notifications and Announcements

- Notification bell is shown beside logout.
- Users receive updates for activities they are related to.
- Excos can make announcements to all users or specific event/competition participants.
- Notifications can target events or competitions through explicit foreign keys.

### Dashboards and Analytics

The dashboard is designed to support operational and engagement analysis.

Exco dashboard includes:

- Total users, active members, events, competitions, approvals, and attendance rate.
- Registration trend and workflow state.
- Capacity pressure and category demand.
- Attendance quality and event popularity.
- Role breakdown and engagement analytics.
- Dormant member and participation pattern insights.

Member dashboard includes:

- Personal attendance summary.
- Upcoming and registered activities.
- Competition win/loss history.
- Recent match history.
- Achievement records such as top placements.

## Project Structure

```text
react-nodejs-project1-LiangWei04/
├── backend/
│   ├── DDL.sql
│   ├── package.json
│   ├── server.js
│   └── src/
│       ├── app.js
│       ├── configs/
│       │   ├── initTables.js
│       │   ├── seedDemoMembers.js
│       │   └── seedCompletedCompetitions.js
│       ├── controllers/
│       ├── middlewares/
│       ├── models/
│       ├── routes/
│       └── services/
├── react-user-dashboard/
│   ├── package.json
│   ├── src/
│   │   ├── components/
│   │   ├── types/
│   │   └── utils/
│   └── dist/                  # generated after npm run build
├── docs/
└── README.md
```

## Database Overview

The schema is documented in `backend/DDL.sql` and initialised through `backend/src/configs/initTables.js`.

Important entity groups:

- Account: `users`, `user_settings`, `player_profiles`
- Venues: `venues`
- Events: `events`, `event_registrations`, `event_comments`, `event_reactions`
- Competitions: `competitions`, `competition_categories`, `competition_settings`, `competition_registrations`
- Tournament engine: `competition_rounds`, `competition_matches`, `competition_ranking_records`
- Workflow: `notifications`, `attendance_change_requests`
- Lookup: `tournament_formats`, `scoring_systems`

Data integrity is enforced using:

- Primary keys for all major entities.
- Foreign keys for user, event, venue, competition, category, round, match, and notification relationships.
- Unique constraints for duplicate prevention.
- Check constraints for role, status, capacity, rank type, attendance request, and match result values.
- Cascade deletion for dependent records.
- Set-null behaviour for optional historical references.

## Prerequisites

Install these before running the project:

- Node.js
- npm
- PostgreSQL

Make sure PostgreSQL is running locally before starting the backend.

## Environment Variables

The backend uses environment variables from `backend/.env`.

Create your own file from the example:

```powershell
cd backend
copy .env.example .env
```

Then edit `backend/.env`.

Important variables:

```env
DB_USER=postgres
DB_PASSWORD=your-postgres-password
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=project1
DB_CONNECTION_LIMIT=10

PORT=3000
APP_BASE_URL=http://localhost:3000
FRONTEND_BASE_URL=http://localhost:3000

JWT_SECRET_KEY=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
JWT_ALGORITHM=HS256

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=your-google-app-password
EMAIL_FROM="Weiqi CCA <yourgmail@gmail.com>"
```


## Installation

Install frontend dependencies:

```powershell
cd react-user-dashboard
npm install
```

Install backend dependencies:

```powershell
cd ../backend
npm install
```

## Running the Project

This project is intended to run from the backend on port `3000`.

Build the React frontend first:

```powershell
cd react-user-dashboard
npm run build
```

Initialise database tables:

```powershell
cd ../backend
npm run init_tables
```

Start the backend:

```powershell
npm start
```

Open the website:

```text
http://localhost:3000
```

The backend serves:

- API routes under `http://localhost:3000/api/...`
- React pages such as `/login`, `/dashboard`, `/events`, `/competitions`, and `/settings`

## Development Mode

For backend development with automatic restart:

```powershell
cd backend
npm run dev
```

This uses nodemon. You can type:

```text
rs
```

to manually restart the backend process.

The React folder does not currently use a normal `npm run dev` workflow in this project. Build React with `npm run build`, then refresh the backend-served site on `localhost:3000`.

## Seeding Demo Data

Initialise base tables only:

```powershell
cd backend
npm run init_tables
```

Seed demo members:

```powershell
npm run seed_demo
```

Seed demo members and completed competition history:

```powershell
npm run seed_completed
```

Demo accounts:

| Account | Login |
| --- | --- |
| Captain | `admin@example.com` / `admin123` |
| Demo members | `demo_member_01` to `demo_member_30` / `member123` |

Demo member emails use:

```text
demo.member01@example.com
demo.member02@example.com
...
demo.member30@example.com
```

## Useful Commands

Frontend:

```powershell
cd react-user-dashboard
npm run build
npm run lint
```

Backend:

```powershell
cd backend
npm run init_tables
npm run seed_demo
npm run seed_completed
npm start
npm run dev
```

## API Summary

All backend routes are mounted under `/api`.

### Authentication

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register new account |
| POST | `/api/auth/login` | Login with username/email and password |
| GET | `/api/auth/google` | Start Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/forgot-password` | Send password reset code |
| POST | `/api/auth/reset-password` | Reset password using code |
| POST | `/api/auth/verify-email` | Verify email token |
| GET | `/api/auth/me` | Get current logged-in user |

### Users and Settings

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/users/me/settings` | Read own settings |
| PUT | `/api/users/me/settings` | Update own settings |
| PUT | `/api/users/me/profile` | Update own profile |
| PUT | `/api/users/me/password` | Change password |
| POST | `/api/users/me/resend-verification` | Resend verification email |
| PUT | `/api/users/me/deactivate` | Deactivate own account |
| GET | `/api/users` | Captain user list |
| PUT | `/api/users/:user_id/role` | Captain changes user role |

### Events

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/events` | List events |
| POST | `/api/events` | Create event |
| PUT | `/api/events/:event_id` | Update event |
| DELETE | `/api/events/:event_id` | Delete/cancel event |
| POST | `/api/events/:event_id/register` | Register for event |
| GET | `/api/events/:event_id/comments` | Read event comments |
| POST | `/api/events/:event_id/comments` | Add event comment |
| PUT | `/api/events/comments/:comment_id` | Edit comment |
| DELETE | `/api/events/comments/:comment_id` | Delete comment |
| PUT | `/api/events/:event_id/reaction` | Add/update reaction |
| DELETE | `/api/events/:event_id/reaction` | Remove reaction |

### Competitions

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/competitions` | List competitions |
| GET | `/api/competitions/options` | Read venue/format/scoring options |
| POST | `/api/competitions` | Create competition |
| GET | `/api/competitions/:competition_id` | Read competition detail |
| PUT | `/api/competitions/:competition_id` | Update competition |
| DELETE | `/api/competitions/:competition_id` | Delete/cancel competition |
| POST | `/api/competitions/:competition_id/categories` | Create category |
| PUT | `/api/competitions/categories/:category_id` | Update category |
| POST | `/api/competitions/categories/:category_id/register` | Register for category |
| GET | `/api/competitions/:competition_id/tournament` | Read tournament engine data |
| POST | `/api/competitions/:competition_id/categories/:category_id/rounds/generate` | Generate next round |
| PUT | `/api/competitions/matches/:match_id/result` | Update match result |

### Attendance, Registrations, Notifications

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/registrations` | Read event registration queue |
| PUT | `/api/registrations/:registration_id/approve` | Approve event registration |
| PUT | `/api/registrations/:registration_id/reject` | Reject event registration |
| PUT | `/api/registrations/:registration_id/attendance` | Mark event attendance |
| GET | `/api/competitions/registrations` | Read competition registration queue |
| PUT | `/api/competitions/registrations/:registration_id/status` | Update competition registration status |
| PUT | `/api/competitions/registrations/:registration_id/attendance` | Mark competition attendance |
| GET | `/api/attendance-requests` | Captain reads pending late attendance requests |
| POST | `/api/attendance-requests/events/:registration_id` | Request late event attendance change |
| POST | `/api/attendance-requests/competitions/:registration_id` | Request late competition attendance change |
| PUT | `/api/attendance-requests/:request_id/approve` | Captain approves late attendance request |
| PUT | `/api/attendance-requests/:request_id/reject` | Captain rejects late attendance request |
| GET | `/api/notifications` | Read own notifications |
| PUT | `/api/notifications/:notification_id/read` | Mark notification read |
| POST | `/api/notifications/announcements` | Create announcement |
| GET | `/api/notifications/my-activities` | Read own upcoming/registered activities |

## Frontend Pages

| Route | Purpose |
| --- | --- |
| `/login` | Login page |
| `/signup` | Registration page |
| `/forgot-password` | Forgot-password flow |
| `/verify-email` | Email verification result page |
| `/dashboard` | Analytics dashboard |
| `/events` | Event list, event registration, event discussion |
| `/my-events` | Hidden page for user's registered activities |
| `/events/create` | Create event |
| `/competitions` | Competition list and details |
| `/competitions/create` | Create competition |
| `/drafts` | Hidden manager page for event/competition drafts |
| `/attendance` | Activity-first attendance management |
| `/members` | Hidden member participation management page |
| `/users` | Captain user management |
| `/settings` | Account settings and preferences |

## Notes for Marking

- The frontend is React, but the final app is served through Express on port `3000`.
- The old backend `public` frontend was removed to avoid duplicate frontend implementations.
- `backend/DDL.sql` is the cleaner schema reference for marking.
- `backend/src/configs/initTables.js` is the executable initialisation/migration script.
- The project uses Tailwind CSS and custom CSS for the dark dashboard interface.
- Demo seed scripts are provided so analytics, registrations, and competition history can be tested with realistic data.

## Troubleshooting

### `React build not found`

Run:

```powershell
cd react-user-dashboard
npm run build
```

Then restart or refresh the backend site.

### `Could not connect to PostgreSQL`

Check that:

- PostgreSQL is running.
- `backend/.env` contains the correct database username/password.
- `DB_HOST`, `DB_PORT`, and `DB_DATABASE` are correct.

Then run:

```powershell
cd backend
npm run init_tables
```

### Google OAuth redirect mismatch

In Google Cloud Console, make sure the authorised redirect URI matches:

```text
http://localhost:3000/api/auth/google/callback
```

Also check:

```env
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### Email verification does not send

Check:

- SMTP variables in `backend/.env`.
- Gmail App Password is used instead of a normal Gmail password.
- `EMAIL_USER`, `EMAIL_PASS`, and `EMAIL_FROM` are correct.

## Security Notes

- Never commit `.env` files.
- Never commit real SMTP passwords or Google OAuth client secrets.
- Rotate exposed secrets before pushing to GitHub if they were previously shared.
- Use strong JWT secrets in production.

## Author

Liang Wei

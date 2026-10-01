# Public demo

The demo is an isolated coursework showcase with fictional data. It is not an
operational club service. `DEMO_MODE=true` restricts the backend; build the frontend
with `VITE_PUBLIC_DEMO=true` for its matching visitor interface.

## Database boundary

Create a **new, empty database** named `tourney_demo` in the dedicated Neon Free
project. Use its direct (not pooled) connection string. Set `DEMO_DATABASE_NAME`
to that exact database and `DATABASE_SSL=true`. Do not reuse coursework data.
Setup refuses databases with application tables in the public schema.

Run `npm run demo:setup --prefix backend` explicitly with those variables and a
random `JWT_SECRET_KEY` of at least 32 characters. Server startup only validates
the database and cleans expired registered sandboxes; it never runs legacy DDL.
Each sandbox's DDL, fixtures and registry record are committed atomically.

All model queries use the database adapter. It validates the server-side session,
acquires a shared session lock, assigns the checked-out connection's search path,
and resets it before pool reuse. Reset/cleanup acquire exclusive locks. They only
drop schemas registered in `demo_control.sessions` matching the generated name
format. Keep every database access behind this adapter when adding features.

Sessions last one hour. At most ten sandboxes may exist. Creation/reset is limited
to five per IP per rolling hour; only a keyed hash is stored, then removed after
one hour. Render's forwarded address is trusted for one proxy hop; update that
setting only when deployment topology changes. Do not place another proxy in front
of this service without revisiting that assumption.

## Verification

Use a separate local PostgreSQL cluster with trust authentication bound only to
127.0.0.1, on a non-default port, with role `attendance_test` and databases
`attendance_test` and `tourney_demo_test`. Never point these tests at hosted data.

- Set `DEMO_TEST_PORT` and run `npm run test:demo --prefix backend`.
- Set `ATTENDANCE_TEST_PORT` and run `npm test --prefix backend`.
- Build the demo frontend, start the backend against a separate disposable database
  named `tourney_demo_browser` (not the integration-test database),
  and run `npm run test:demo --prefix react-user-dashboard`.
- Browser tests use real API workflows and a mocked capacity error for the error UI.
  Screenshots/traces are generated under `react-user-dashboard/test-results`.
- Tests do not reset the browser server's IP counter. Restart with a fresh test
  database when repeating sessions beyond the configured limit.

## Release

`render.yaml` specifies Render Free in Singapore. Keep automatic deployments off.
Check workspace billing has no payment method or chargeable overage enabled.
The build explicitly initializes the dedicated demo database, then the start
command serves React and the API together. No SMTP or OAuth credentials belong
in this deployment. Email delivery is forcibly disabled in demo mode.

Smoke-test HTTPS, all three workflows, two isolated visitors, reset and account
route denial on the hosted URL. Only then add the live link to the portfolio.
Keep the screenshot walkthrough available during free-tier cold starts/capacity
limits. Do not deploy an older Git revision that lacks the demo restrictions.

To withdraw the release, remove the portfolio demo link and suspend the Render
service. Do not switch the same service to ordinary authentication with demo data.

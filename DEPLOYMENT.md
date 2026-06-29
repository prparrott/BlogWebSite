# Deploying To Render With Turso

This app runs as one Render Web Service: Express serves the API and the built Vite frontend from `dist/`.

## Turso

Create a Turso database and copy these values:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

## Render

Create a new Web Service from this GitHub repo.

Use these settings:

- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Plan: Free

Add these environment variables in Render:

- `NODE_VERSION`: `22`
- `TURSO_DATABASE_URL`: your Turso database URL
- `TURSO_AUTH_TOKEN`: your Turso auth token

The server runs migrations on startup, so the Turso tables are created automatically on first deploy.

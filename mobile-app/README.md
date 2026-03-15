# Pulmo Mobile App Starter

This folder contains a mobile app design starter for your current Pulmo system using Expo + React Native.

## Included screens

- Login
- Dashboard
- Products
- Customers
- Invoices
- More (account + settings)

## How to run

1. Open terminal at `mobile-app`
2. Install dependencies:

```bash
npm install
```

This also installs `@react-native-async-storage/async-storage` used for persistent login sessions.

3. Update API base URL in `src/lib/api.js`:

```js
const API_BASE_URL = "http://YOUR_LOCAL_IP:5000/api";
```

Use your computer LAN IP (not localhost) so your phone can reach the backend.

Alternative: set env var and avoid editing code each time:

```bash
set EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:5000/api
```

4. Start app:

```bash
npm run start
```

5. Scan QR with Expo Go app.

If LAN mode fails on your network, use tunnel mode:

```bash
npm run start:tunnel
```

## VS Code Mobile Preview Extension

If you want preview in `Mobile Preview - Phone & Tablet Simulator` extension:

1. Run web preview server:

```bash
npm run preview:web
```

2. Open the shown URL (usually `http://localhost:19006`) inside the extension.

Note: this is a web simulation of the app, not full native Android/iOS runtime behavior.

## Notes

- This is a mobile-first UI design and functional starter.
- Dashboard, Products, Customers, and Invoices are already wired to live API calls.
- Backend API used by this app: `/auth`, `/dashboard/summary`, `/products`, `/customers`, `/invoices`.
- Role-based access is included (`admin`, `manager`, `user`) following web rules:
  - `admin`: full access
  - `manager`: all except Users management
  - `user`: dashboard/products/customers/invoices and user-safe modules only

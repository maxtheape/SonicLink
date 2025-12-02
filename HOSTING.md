# Hosting the Signaling Server

This project uses **WebRTC** facilitated by **PeerJS** to connect the Source (phone) and Display (computer). A "Signaling Server" is required to help these devices find each other on the internet before they establish a direct peer-to-peer connection.

## 1. Default Behavior (Development)

By default, this application connects to the **PeerJS Cloud** (hosted at `0.peerjs.com`). This service is free, open-source, and maintained by the community.

**Pros:**
*   Zero configuration required.
*   Excellent for prototyping, hackathons, and personal demos.

**Cons:**
*   **No Uptime Guarantee:** The service provides no SLA and may go down for maintenance at any time.
*   **Connection Limits:** High traffic may result in throttling or rejected connections.
*   **Shared Resources:** Bandwidth is shared with thousands of other developers globally.

## 2. Self-Hosting (Recommended for Production)

If you plan to publish this app for real users, you should host your own PeerServer instance to ensure reliability.

### Step A: Deploy the Backend

PeerJS provides a lightweight Node.js server. You can deploy this easily to services like Render, Heroku, Railway, or DigitalOcean.

1.  **Initialize a Node project**:
    ```bash
    mkdir my-peer-server
    cd my-peer-server
    npm init -y
    npm install peer
    ```

2.  **Create `index.js`**:
    ```javascript
    const { PeerServer } = require('peer');

    const port = process.env.PORT || 9000;

    const peerServer = PeerServer({
      port: port,
      path: '/soniclink', // You can choose any path
      allow_discovery: true
    });

    console.log(`PeerServer running on port ${port}`);
    ```

3.  **Deploy**: Push this code to your preferred hosting provider.

### Step B: Update Frontend Configuration

Once your server is live (e.g., `https://my-app.onrender.com`), update the `initializePeer` function in `App.tsx` to point to it.

**File:** `App.tsx`

```typescript
const initializePeer = (newMode: AppMode) => {
  // Replace the default initialization:
  // const peer = new window.Peer(null, { debug: 1 });

  // With your custom server configuration:
  const peer = new window.Peer(null, {
    host: 'my-app.onrender.com', // Your server domain (exclude https://)
    port: 443,                   // Standard SSL port
    secure: true,                // Use SSL (https)
    path: '/soniclink',          // Must match the path in your index.js
    debug: 1,
  });

  // ... rest of the logic
};
```

## Troubleshooting

*   **Firewalls:** If users are on strict corporate or university networks, standard P2P connections might fail. In a commercial production environment, you may also need to provide a **TURN server** (relay server) in the `config` object passed to `new Peer()`.

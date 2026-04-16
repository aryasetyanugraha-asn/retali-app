# Project Progress & Roadmap

This document summarizes the current state of the Mitra Retali CRM & Lead Generation system, separating completed features from those pending or in progress.

## Current State & Architecture
The system employs a serverless architecture based primarily on Firebase, using React with Vite for the frontend and a mix of Cloud Functions (v1 & v2) for backend services. Role-Based Access Control (RBAC) via Firebase Custom Claims structures access hierarchically: `PUSAT` (Admin) > `CABANG` (Branch) > `MITRA` (Partner).

### Tech Stack
*   **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide React
*   **Backend:** Firebase Auth, Firestore, Cloud Functions (Node.js)
*   **Deployment:** Managed by Firebase (Functions and likely Hosting)
*   **External Integrations:** Meta Platforms (Facebook, Instagram, WhatsApp), TikTok (OAuth), Google Gemini AI

## Completed Features

### Core App & Navigation
*   **Routing & Layout:** Fully functional setup with `react-router-dom`, featuring a dashboard layout with desktop sidebar and mobile sticky navigation (`MobileBottomNav`). Theme correctly aligned to the "Mitra Retali" emerald green (`emerald-600`) branding.
*   **Authentication:** `LoginPage` functional with Firebase Auth (Email/Password & Google Sign In via `react-firebase-hooks` logic pattern implemented manually). Protected routes implemented via `ProtectedRoute`.
*   **RBAC Context:** `RoleContext` implemented allowing role switching in UI (for testing/admin), supported by strict backend `firestore.rules`. User profiles and custom claims (`PUSAT`, `CABANG`, `MITRA`) managed via backend triggers (`setCustomUserClaims`).

### Dashboards & Views
*   **Dashboard (`/dashboard`):** Real-time monitoring metrics, lead growth charts (Recharts), and personalized welcome/profile completion banners for new `MITRA` users.
*   **Leads CRM (`/leads`):** View, add, and update leads. Real-time updates wired up via `dbService.subscribeToCollection`. Status tracking (Hot, Warm, Cold).
*   **Data Mitra (`/mitra`):** Searchable table interface available to `PUSAT` and `CABANG` to view and manage partners (phone, bank details, social status).
*   **Settings (`/settings`):** User profile management and `SocialConnect` integration UI.

### Communications (Unified Inbox)
*   **Unified Inbox (`/inbox`):** Responsive master-detail layout combining chat sessions. Dynamic text flow adjustments (e.g., `break-words`, appropriate padding) for mobile screens implemented.
*   **Webhooks:** Firebase v2 HTTP functions (`catchLeadWebhook`, `whatsappWebhook`) implemented to handle incoming data from Meta Lead Ads and WhatsApp Cloud API.
*   **Messaging:** Firebase callable function (`sendWhatsAppMessage`) implemented to send outbound messages.

### AI & Content Generation
*   **Content Generator (`/content`):** Interface to request AI-generated topics and visuals for posts.
*   **AI Backend:** Cloud Function (`generateContent`) utilizing Google Gemini (`gemini-3-flash-preview`) to generate text. Backgrounds resized with `sharp` (1080x1350) and logos overlaid, utilizing `loremflickr.com` for dynamic Unsplash alternatives.

### Publishing & Scheduling
*   **Schedule View (`/schedule`):** `SchedulePage` displaying queued social media content via `ScheduledPostsList`.
*   **Background Jobs:** A CRON triggered Firebase Function (`processScheduledPosts`) running every 10 minutes checks `scheduledPosts` and invokes `postToSocial` to publish content based on tokens stored in `users/{uid}/integrations/{platform}`.

### Integrations
*   **Facebook & Instagram:** Integrated via `react-facebook-login` handling specific required scopes (`instagram_content_publish`, `pages_manage_posts`, etc.). Required configurations for Javascript SDK detailed in `SOCIAL_MEDIA_SETUP.md`.
*   **TikTok:** Direct OAuth redirect flow implemented with PKCE validation. Handled by backend `exchangeTikTokToken` Firebase function.

## Pending / Future Roadmap

*   **Deeper Analytics:** Expanding the dashboard to include real historical comparisons and conversion funnels, rather than placeholder `+0%` values.
*   **Comprehensive Logging:** Adding more robust error logging and monitoring for AI failures and social media posting failures on the backend.
*   **Production Move:** Migrating away from development testing modes (like the local HTTPS proxy setup required by Vite `basic-ssl`) and solidifying the live production environment.
*   **Refinement of Notifications:** The `NotificationDropdown` currently utilizes static/mock data. This needs to be wired to a real-time Firestore feed of user-specific notifications.
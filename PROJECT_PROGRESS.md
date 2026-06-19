# Project Progress & Roadmap

This document summarizes the current state of the Mitra Retali CRM & Lead Generation system, separating completed features from those pending or in progress.

## Current State & Architecture
The system employs a serverless architecture based primarily on Firebase, using React with Vite for the frontend and a mix of Cloud Functions (v1 & v2) for backend services. Role-Based Access Control (RBAC) via Firebase Custom Claims structures access hierarchically: `PUSAT` (Admin) > `CABANG` (Branch) > `MITRA` (Partner).

### Tech Stack
*   **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide React
*   **Backend:** Firebase Auth, Firestore, Cloud Functions (Node.js)
*   **Deployment:** Managed by Firebase (Functions and likely Hosting)
*   **External Integrations:** Meta Platforms (Facebook, Instagram, WhatsApp), TikTok (OAuth), Google Gemini AI, Google Vertex AI (Imagen), Veo 3.1, Google News RSS

## Completed Features

### Core App & Navigation
*   **Routing & Layout:** Fully functional setup with `react-router-dom`, featuring a dashboard layout with desktop sidebar and mobile sticky navigation (`MobileBottomNav`). Theme correctly aligned to the "Mitra Retali" emerald green (`emerald-600`) branding.
*   **Authentication:** `LoginPage` functional with Firebase Auth (Email/Password & Google Sign In via `react-firebase-hooks` logic pattern implemented manually). Protected routes implemented via `ProtectedRoute`.
*   **RBAC Context:** `RoleContext` implemented allowing role switching in UI (for testing/admin), supported by strict backend `firestore.rules`. User profiles and custom claims (`PUSAT`, `CABANG`, `MITRA`) managed via backend triggers (`setCustomUserClaims`).

### Dashboards & Views
*   **Dashboard (`/dashboard`):** Real-time monitoring metrics, lead growth charts (Recharts), and personalized welcome/profile completion banners for new `MITRA` users.
*   **Leads CRM (`/leads`):** View, add, and update leads. Real-time updates wired up via `dbService.subscribeToCollection`. Status tracking (Hot, Warm, Cold).
*   **Jamaah Aktif (`/jamaah-aktif`):** A view for active pilgrims (leads with status `WON`), managing operational fields like `package_schedule`, `payment_status`, and `documents` directly attached to lead documents.
*   **Data Mitra (`/mitra`):** Searchable table interface available to `PUSAT` and `CABANG` to view and manage partners (phone, bank details, social status).
*   **Settings (`/settings`):** User profile management and `SocialConnect` integration UI.

### Campaigns & Planning
*   **Campaign Planner (`/campaigns`):** Features a Budgeting & Estimation module powered by AI (`generateCampaignOptions`). Provides ad spend, estimated leads, and CPL metrics with frontend capabilities for manual budget overrides.

### Communications (Unified Inbox)
*   **Unified Inbox (`/inbox`):** Responsive master-detail layout combining chat sessions. Includes an AI-powered 'Sparkles' button calling `generateAiReply` for drafting responses based on chat history.
*   **Webhooks:** Firebase v2 HTTP functions (`metaSocialWebhook`, `whatsapp`) to handle incoming data from Meta Lead Ads, Direct Messages, and WhatsApp Cloud API, automating CRM lead creation and keyword-based scoring.
*   **Messaging:** Firebase callable functions (`sendWhatsAppMessage`, `replyToMetaMessage`) implemented to send outbound messages.

### AI & Content Generation
*   **Content Generator (`/content`):** Advanced interface featuring multiple AI generation modes:
    *   **SCRATCH Mode:** Utilizes Vertex AI Imagen for base image generation, Veo 3.1 for optional video generation, and `sharp` for dynamic asset compositing (overlaid logos, texts) in backend (`imageService.ts`).
    *   **LAYOUT Mode:** Interactive 'Mini-Canva' implemented with `react-konva` (`LayoutEditor.tsx`), allowing dragging, resizing, and exporting base64 canvas compositions.
    *   **VIDEO_WATERMARK Mode:** FFmpeg-based backend processing for applying logo watermarks.
*   **Media Library (`/media`):** Centralized repository for brand assets (photos, videos, components, logos) stored in Firebase Storage, managed by PUSAT users.

### Publishing & Scheduling
*   **Schedule View (`/schedule`):** `SchedulePage` displaying queued social media content via `ScheduledPostsList`.
*   **Background Jobs:** A CRON triggered Firebase Function (`schedule.ts`) checks `scheduledPosts` and invokes `postToSocial` to publish content based on tokens stored in `users/{uid}/integrations/{platform}`. Supports single image and multi-image Carousel publishing.

### Insights & Crawling
*   **Market Insights (`/insights`):** Displays latest market news. Powered by backend data crawler (`crawlerCron.ts`, `crawlerManual.ts`) utilizing `rss-parser` to aggregate Umrah/Haji news from Google News into Firestore (`market_insights`).

### Integrations
*   **Facebook & Instagram:** Meta Graph API integration with advanced scope requirements (`pages_show_list,pages_manage_posts,instagram_basic,instagram_content_publish...`). Handles cross-origin messaging, carousel publishing, and webhooks. Detailed in `SOCIAL_MEDIA_SETUP.md`.
*   **WhatsApp:** WhatsApp session authentication via `@whiskeysockets/baileys` (`whatsappBaileysService.ts`) with custom Firestore-backed Auth State.
*   **TikTok (Virtual Live):** Virtual Live UI (`/virtuallive`) prepared for TikTok Auto-Live Studio RTMP stream configurations.

## Pending / Future Roadmap

*   **Deeper Analytics:** Expanding the dashboard to include real historical comparisons and conversion funnels, rather than placeholder `+0%` values.
*   **Comprehensive Logging:** Adding more robust error logging and monitoring for AI failures and social media posting failures on the backend.
*   **Production Move:** Migrating away from development testing modes (like the local HTTPS proxy setup required by Vite `basic-ssl`) and solidifying the live production environment.
*   **Refinement of Notifications:** The `NotificationDropdown` currently utilizes static/mock data. This needs to be wired to a real-time Firestore feed of user-specific notifications.

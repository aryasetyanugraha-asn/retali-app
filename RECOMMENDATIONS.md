# LeadGen Pro System - Technical Recommendations & Analysis

## Overview
This document outlines the technical path to converting the current **LeadGen Pro Prototype** into a fully functional production system. The system is designed to be a multi-level Lead Generator and CRM tailored for travel/Umrah agencies.

## 1. System Architecture
### Frontend
- **Framework**: React + Vite (Current).
- **Styling**: Tailwind CSS (Current).
- **State Management**: Context API (Current) is sufficient for MVP. For complex data sync, consider TanStack Query (React Query).

### Backend
- **Platform**: Firebase (Recommended) or Supabase.
  - **Auth**: Firebase Auth (Handles Email/Password, Google, etc.).
  - **Database**: Firestore (NoSQL) is perfect for the hierarchical data (Pusat -> Cabang -> Mitra) and flexible Lead schemas.
  - **Functions**: Cloud Functions for server-side logic (AI generation, API proxies).

## 2. Feature Implementation Guide

### A. Unified Inbox (Chat Terpusat)
**The Challenge**: Integrating WhatsApp, Instagram, and Facebook into one UI.
**Solution**:
1.  **Official Meta Graph API**:
    - **Instagram/Facebook**: Use the [Messenger Platform API](https://developers.facebook.com/docs/messenger-platform).
    - **WhatsApp**: Use the [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api).
2.  **Setup Requirements**:
    - Verified Meta Business Manager account.
    - Webhooks setup in Cloud Functions to receive incoming messages (`webhooks/meta`).
    - Long-lived Access Tokens stored securely (Secret Manager).

### B. Content Generator (AI Simulasi)
**The Challenge**: Generating relevant captions and hashtags.
**Solution**:
1.  **AI Engine**: Integrate OpenAI (GPT-4o) or Anthropic (Claude 3.5 Sonnet).
2.  **Implementation**:
    - **Do not** call OpenAI directly from the frontend (exposes API keys).
    - Create a Cloud Function `generateContent` that takes `{ topic, platform }`.
    - Prompt Engineering: Create specific system prompts like:
      *"You are an expert social media manager for an Umrah travel agency. Write a {platform} post about {topic}. Include emojis and 5-10 relevant hashtags."*

### C. Leads CRM & Role System
**The Challenge**: Data isolation between HQ, Branches, and Partners.
**Solution**:
1.  **Database Schema (Firestore)**:
    ```json
    users/
      {userId}/
        role: "CABANG"
        parentId: "hq_id"
    leads/
      {leadId}/
        assignedTo: "{userId}"
        branchId: "{branchId}"
        status: "HOT"
    ```
2.  **Security Rules**:
    - **Pusat**: Read all leads.
    - **Cabang**: Read leads where `branchId == auth.uid`.
    - **Mitra**: Read leads where `assignedTo == auth.uid`.

### D. Automated Scraping (Lead Discovery)
**Warning**: The user asked for "Systematic Lead Generation".
**Risks**: Scraping public profiles (e.g., searching for "minat umrah" on IG) violates TOS and gets IPs banned.
**Recommendation**:
1.  **Ad-Based Lead Gen**: Connect Facebook Lead Ads directly to the CRM via Webhooks. This is the safest, most scalable method.
2.  **Hashtag Monitoring**: Use official Instagram API to track *your own* hashtags or mentions, rather than scraping strangers.

## 3. Deployment Strategy
- **Frontend**: Deploy to **Firebase Hosting** (simple integration) or **Vercel**.
- **Backend**: **Firebase Cloud Functions** (Node.js/Python).
- **Domain**: Map to `app.youragency.com`.

## 4. Next Steps for Development
1.  **Setup Firebase Project**: Enable Auth and Firestore.
2.  **Meta Developer Account**: Register the app to get App ID and Secret.
3.  **Backend Proxy**: Build the `api/sendMessage` and `api/receiveWebhook` endpoints.
4.  **Replace Mocks**: Swap the current `MOCK_DATA` constants with `useEffect(() => db.collection('leads').onSnapshot(...))` calls.

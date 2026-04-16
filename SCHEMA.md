# Database Schema (Firestore)

This document outlines the NoSQL database schema used in the Mitra Retali CRM & Lead Generation system. The database is hosted on Cloud Firestore.

## Collections

### 1. `users`
Stores user profile data, access control, and integration configurations.

```json
{
  "uid": "string (Document ID)",
  "email": "string",
  "displayName": "string",
  "photoURL": "string (optional)",
  "role": "string ('PUSAT', 'CABANG', 'MITRA')",
  "parentId": "string (optional, ID of manager/supervisor)",
  "branchId": "string (reference to Branch)",
  "partnerId": "string (reference to Partner/Mitra)",
  "feeAchievement": "number",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### Subcollections under `users/{userId}`:
- **`integrations`**: Stores third-party authentication tokens.
  - Document ID: `platform_name` (e.g., `instagram`, `tiktok`, `facebook`)
  ```json
  {
    "accessToken": "string",
    "refreshToken": "string (optional)",
    "expiresAt": "timestamp (optional)",
    "updatedAt": "timestamp",
    // other platform-specific token data
  }
  ```

### 2. `leads`
Stores prospective customer data. Access is governed by RBAC (Role-Based Access Control).

```json
{
  "id": "string (Document ID)",
  "name": "string",
  "phone": "string",
  "email": "string (optional)",
  "source": "string ('IG_ADS', 'MANUAL', 'REFERRAL', etc.)",
  "status": "string ('NEW', 'HOT', 'WARM', 'COLD', 'FOLLOW_UP', 'CLOSING', 'LOST')",
  "assignedTo": "string (ID of Mitra/Sales user)",
  "branchId": "string (ID of Cabang user/branch)",
  "partnerId": "string (ID of Mitra user)",
  "notes": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 3. `content_requests`
Stores history of AI generated content requests.

```json
{
  "id": "string (Document ID)",
  "userId": "string (ID of user who requested)",
  "topic": "string",
  "platform": "string",
  "status": "string ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')",
  "generatedContent": {
    "caption": "string",
    "hashtags": ["string"],
    "imageUrl": "string"
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 4. `posts`
Stores content created by the user (general posts).

```json
{
  "id": "string (Document ID)",
  "userId": "string (ID of user)",
  "content": "string",
  "mediaUrls": ["string"],
  "platform": "string",
  "createdAt": "timestamp"
}
```

### 5. `scheduledPosts`
Queue for automated post publishing to social platforms via backend CRON jobs.

```json
{
  "id": "string (Document ID)",
  "userId": "string",
  "branchId": "string (for RBAC)",
  "partnerId": "string (for RBAC)",
  "platform": "string ('instagram', 'facebook', 'tiktok')",
  "content": {
    "caption": "string",
    "imageUrl": "string (optional)",
    "videoUrl": "string (optional)"
  },
  "status": "string ('PENDING', 'PUBLISHED', 'FAILED')",
  "scheduledAt": "timestamp",
  "publishedAt": "timestamp (optional)",
  "error": "string (optional)",
  "createdAt": "timestamp"
}
```

### 6. `conversations`
Unified Inbox structure mapping chat sessions across Meta/WhatsApp platforms.

```json
{
  "id": "string (Document ID)",
  "platform": "string ('whatsapp', 'instagram', 'messenger')",
  "participantId": "string (Customer's ID/phone number)",
  "participantName": "string",
  "participantAvatar": "string (optional)",
  "branchId": "string (for RBAC)",
  "partnerId": "string (for RBAC)",
  "lastMessage": "string",
  "lastMessageAt": "timestamp",
  "unreadCount": "number",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### Subcollections under `conversations/{conversationId}`:
- **`messages`**: Individual messages within a chat.
  ```json
  {
    "id": "string (Document ID)",
    "text": "string",
    "senderId": "string ('agent' or customer's ID)",
    "senderRole": "string ('agent', 'customer')",
    "messageType": "string ('text', 'image', 'video', 'document')",
    "mediaUrl": "string (optional)",
    "timestamp": "timestamp",
    "status": "string ('sent', 'delivered', 'read')"
  }
  ```

---

## Security Model (RBAC)
Access to `leads`, `scheduledPosts`, and `conversations` is restricted via custom user claims.
- **PUSAT (Admin)**: Can read and write all documents.
- **CABANG (Branch)**: Restricted to documents where `branchId` matches their token claim. Can also read user documents of MITRA under them.
- **MITRA (Partner)**: Restricted to documents where `partnerId` matches their token claim or `userId` matches their UID.

*Refer to `firestore.rules` for exact implementation details.*
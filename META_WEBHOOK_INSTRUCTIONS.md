# Meta Webhook Instructions

After deploying your Firebase Functions, you will need to provide Meta with the Webhook URL and the Verify Token.

1.  **Deploy your functions:**
    ```bash
    cd functions
    npm run build
    npm run deploy
    ```

2.  **Get your Webhook URL:**
    The URL will look like this:
    `https://catchleadwebhook-<your-project-hash>-uc.a.run.app` (for Cloud Run / Firebase v2)
    or
    `https://asia-southeast2-<your-project-id>.cloudfunctions.net/catchLeadWebhook`

    You can find the exact URL in your Firebase Console under **Build > Functions**, look for the function named `catchLeadWebhook`.

3.  **Set your Verify Token:**
    In your Meta Developer Dashboard, set the **Verify Token** to match the value you have set for `META_WEBHOOK_VERIFY_TOKEN` in your Firebase Environment Variables.

    For Firebase Functions v2 to read `process.env.META_WEBHOOK_VERIFY_TOKEN`, you should define it in a `.env` file in your `functions` directory before deploying:

    ```bash
    # functions/.env
    META_WEBHOOK_VERIFY_TOKEN=YOUR_TOKEN_HERE
    ```

    If you prefer to use Google Cloud Secret Manager (`firebase functions:secrets:set META_WEBHOOK_VERIFY_TOKEN`), you will need to update the function definition in `functions/src/triggers/webhooks.ts` to bind the secret:
    ```typescript
    export const catchLeadWebhook = onRequest({
      region: "asia-southeast2",
      cors: true,
      secrets: ["META_WEBHOOK_VERIFY_TOKEN"] // Add this line
    }, ...
    ```

4.  **Subscribe to the 'leadgen' field:**
    In the Meta Developer Dashboard, make sure to subscribe your webhook to the `leadgen` field.

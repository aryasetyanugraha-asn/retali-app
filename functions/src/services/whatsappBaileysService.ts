import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import makeWASocket, { DisconnectReason, AuthenticationState, BufferJSON, initAuthCreds, proto } from "@whiskeysockets/baileys";
import * as QRCode from "qrcode";
import pino from "pino";

// Implement custom Auth State to use Firestore
const useFirestoreAuthState = async (userId: string): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> => {
    const db = admin.firestore();
    const sessionDocRef = db.collection("whatsapp_sessions").doc(userId);

    const readData = async (key: string) => {
        try {
            const doc = await sessionDocRef.collection("data").doc(key).get();
            if (doc.exists) {
                const data = doc.data()?.data;
                return JSON.parse(data, BufferJSON.reviver);
            }
            return null;
        } catch (error) {
            logger.error(`Error reading ${key} from Firestore:`, error);
            return null;
        }
    };

    const writeData = async (data: any, key: string) => {
        try {
            const parsedData = JSON.stringify(data, BufferJSON.replacer);
            await sessionDocRef.collection("data").doc(key).set({ data: parsedData });
        } catch (error) {
            logger.error(`Error writing ${key} to Firestore:`, error);
        }
    };

    const removeData = async (key: string) => {
        try {
            await sessionDocRef.collection("data").doc(key).delete();
        } catch (error) {
            logger.error(`Error removing ${key} from Firestore:`, error);
        }
    };

    const credsStr = await readData("creds");
    const creds = credsStr || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data: { [_: string]: any } = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === "app-state-sync-key" && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks: Promise<void>[] = [];
                    for (const category in data) {
                        for (const id in data[category as keyof typeof data] || {}) {
                            const value = (data[category as keyof typeof data] as any)?.[id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(value, key));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => writeData(creds, "creds")
    };
};

// Global cache to keep track of sockets
const sockets = new Map<string, ReturnType<typeof makeWASocket>>();

export const generateWhatsAppQR = onCall({
    cors: true,
    region: "asia-southeast2",
    timeoutSeconds: 120 // allow time for QR generation
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const userId = request.auth.uid;
    const db = admin.firestore();

    // If socket already exists, we might need to handle it or clean it up.
    // For this implementation, let's close existing to force a new QR
    if (sockets.has(userId)) {
        const existingSocket = sockets.get(userId);
        existingSocket?.ws.close();
        sockets.delete(userId);
    }

    try {
        const { state, saveCreds } = await useFirestoreAuthState(userId);

        // We wrap the socket connection in a Promise to return the QR code
        const qrCodeDataUrl = await new Promise<string>((resolve, reject) => {
            // Setup a timeout
            const timeout = setTimeout(() => {
                reject(new Error("Timeout waiting for QR code"));
            }, 60000); // 60s timeout

            const sock = makeWASocket({
                auth: state,
                logger: pino({ level: 'silent' }) as any, // Silent logger to avoid noise
                printQRInTerminal: false,
                browser: ['Multi-Tenant SaaS', 'Chrome', '1.0.0']
            });

            sockets.set(userId, sock);

            sock.ev.on("creds.update", saveCreds);

            sock.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    try {
                        const dataUrl = await QRCode.toDataURL(qr);
                        clearTimeout(timeout);
                        resolve(dataUrl);
                    } catch (err) {
                        clearTimeout(timeout);
                        reject(err);
                    }
                }

                if (connection === "close") {
                    const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
                    logger.info(`Connection closed for ${userId}, reconnecting: ${shouldReconnect}`);

                    // If logged out, remove session data
                    if (!shouldReconnect) {
                        sockets.delete(userId);
                        // Optional: cleanup firestore collection here if desired
                        await db.collection('users').doc(userId).collection('integrations').doc('whatsapp').delete().catch(() => {});
                    }

                    // Note: Reconnect logic could be handled here or by a separate worker/cron depending on requirements
                } else if (connection === "open") {
                    logger.info(`WhatsApp connected for user ${userId}`);
                    clearTimeout(timeout);

                    // Update user integrations
                    await db.collection("users").doc(userId).collection("integrations").doc("whatsapp").set({
                        status: "connected",
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        id: sock.user?.id || "unknown", // save WA id
                        name: sock.user?.name || "WhatsApp Account"
                    }, { merge: true });

                    // We don't resolve here, we only resolve when QR is generated.
                    // If connection is already open (no QR needed), we return early.
                    resolve("already_connected");
                }
            });
        });

        if (qrCodeDataUrl === "already_connected") {
            return { status: "connected", qrCode: null };
        }

        return { status: "qr_ready", qrCode: qrCodeDataUrl };

    } catch (error: any) {
        logger.error(`Error generating WhatsApp QR for ${userId}:`, error);
        throw new HttpsError("internal", error.message || "Failed to generate QR code");
    }
});

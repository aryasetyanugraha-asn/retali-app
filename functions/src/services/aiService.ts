import * as functions from "firebase-functions";
// import OpenAI from "openai";

// Initialize OpenAI client (make sure to set config: firebase functions:config:set openai.key="...")
// const openai = new OpenAI({ apiKey: functions.config().openai.key });

interface ContentRequest {
    topic: string;
    platform: 'INSTAGRAM' | 'FACEBOOK' | 'WHATSAPP';
}

export const generateContent = async (data: ContentRequest, context: functions.https.CallableContext) => {
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'The function must be called while authenticated.'
        );
    }

    const { topic, platform } = data;

    // 2. Validate Input
    if (!topic || !platform) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'The function must be called with one arguments "topic" and "platform".'
        );
    }

    try {
        // 3. Call AI API (Simulation for now)
        // const completion = await openai.chat.completions.create({...});

        // Mock Response
        const mockResponse = `[SIMULATED AI] Caption for ${platform} about ${topic}. #Travel #Umrah`;

        return {
            success: true,
            content: mockResponse,
            generatedAt: new Date().toISOString()
        };

    } catch (error) {
        console.error("AI Generation Error", error);
        throw new functions.https.HttpsError(
            'internal',
            'Unable to generate content',
            error
        );
    }
};

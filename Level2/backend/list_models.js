require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No API key found in .env');
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey); // Initialize without model first

    try {
        // The SDK doesn't have a direct 'listModels' method exposed on the main class in all versions,
        // but we can try to use a different approach or just test a few common ones.
        // Actually, let's try to just Instantiate a model and run a test.
        // If we want to LIST models, we might need to use the REST API manually if the SDK doesn't expose it easily in this version.

        // Let's rely on the error message which told us "Call ListModels to see the list..."
        // We can do this via a simple fetch/axios if SDK is tricky.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log('Available Models:');
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name} (Display: ${m.displayName})`);
                }
            });
        } else {
            console.log('No models list returned:', data);
        }

    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();

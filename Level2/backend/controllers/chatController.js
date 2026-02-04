const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const Streak = require('../models/Streak');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// @desc    Ask AI a question about user's habits (RAG)
// @route   POST /api/chat/ask
// @access  Private
const askQuestion = async (req, res) => {
    try {
        const { question: query } = req.body;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a question'
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY is not set');
            return res.status(500).json({
                success: false,
                message: 'Internal server configuration error'
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // 1. RETRIEVAL (Service Logic)
        // ═══════════════════════════════════════════════════════════════
        const userId = req.user._id;
        const habits = await Habit.find({ userId }).lean();
        const habitIds = habits.map(h => h._id);

        // Fetch context data
        const streaks = await Streak.find({ habitId: { $in: habitIds }, userId }).lean();

        // Build Data Context
        const habitContext = habits.map(h => {
            const streak = streaks.find(s => s.habitId.toString() === h._id.toString());
            return `- ${h.title} (Status: ${streak?.currentStreak || 0} day streak, Category: ${h.category})`;
        }).join('\n');

        // ═══════════════════════════════════════════════════════════════
        // 2. PROMPT ENGINEERING (RAG)
        // ═══════════════════════════════════════════════════════════════
        const prompt = `User query: ${query}
Habits:
${habitContext || 'No habits found.'}

Please answer the user's question based on the habits listed above. Be helpful, concise, and friendly.`;

        // ═══════════════════════════════════════════════════════════════
        // 3. GENERATION (Using Google GenAI SDK)
        // ═══════════════════════════════════════════════════════════════
        const genAI = new GoogleGenerativeAI(apiKey);

        // Use the verified available model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiResponse = response.text();

        res.json({
            success: true,
            data: {
                query,
                answer: aiResponse
            }
        });

    } catch (error) {
        console.error('AI Generation Error:', error);

        // Handle SDK specific error structures
        let errorMessage = 'Failed to generate response';
        let statusCode = 500;

        if (error.message && error.message.includes('429')) {
            statusCode = 429;
            errorMessage = 'AI rate limit exceeded. Please try again later.';
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = { askQuestion };

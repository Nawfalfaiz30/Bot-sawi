const { OpenAI } = require('openai');
require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY;
let openai = null;

if (apiKey && apiKey !== 'masukkan_api_key_ai_di_sini') {
    openai = new OpenAI({ apiKey: apiKey });
}

const MODEL_NAME = 'gpt-4o-mini';

// 🟢 Menyiapkan penyimpanan memori lokal untuk riwayat chat per user
const chatHistory = new Map();

module.exports = {
    /**
     * Meminta AI untuk menjawab pertanyaan teks biasa dengan memori & Persona
     */
    askAI: async (prompt, userId) => {
        if (!openai) return '❌ API Key OpenAI belum diatur di dalam file `.env`!';
        
        try {
            // Jika user belum punya riwayat, buatkan yang baru beserta system prompt (Persona)
            if (!chatHistory.has(userId)) {
                chatHistory.set(userId, [
                    { 
                        role: 'system', 
                        content: `Namamu adalah Intania Pertiwi, tapi kamu lebih suka dipanggil Sawi. Kamu adalah bot Discord perempuan yang ramah, asyik, suportif, dan santai untuk komunitas JAKA (JAPANESE NAKAMA). 
                        
Informasi penting tentang JAKA yang harus kamu tahu:
- JAKA adalah ekosistem kreatif yang mewadahi penggemar hiburan Japanese (wibu) untuk menyalurkan minat bakat menjadi karya.
- JAKA bukan sekadar komunitas biasa, tapi bertujuan menjadi Production House.
- Misi JAKA adalah membantu para kreator (seperti cosplayer, artis, dll) mengatasi 'Creative Anxiety' (takut dihakimi) karena 82% dari mereka sebenarnya ingin berkarya tetapi ragu.
- JAKA berfokus pada talenta lokal, khususnya di Surabaya dan sekitarnya, dengan prinsip "Issho ni tsukurou" (Mari buat bersama-sama).

Gaya bahasamu:
- Gunakan bahasa Indonesia yang luwes, santai, dan gaul selayaknya teman (Nakama) di Discord.
- Jangan terlalu kaku. Gunakan sapaan yang hangat.
- Jangan pernah menggunakan format embed atau markdown yang berlebihan. Jawablah layaknya orang yang sedang chatting biasa.` 
                    }
                ]);
            }

            const userHistory = chatHistory.get(userId);

            // Masukkan pesan terbaru pengguna ke memori
            userHistory.push({ role: 'user', content: prompt });

            // Membatasi memori agar tidak terlalu panjang (11 = 1 system + 10 pesan user/AI)
            if (userHistory.length > 11) {
                userHistory.splice(1, 2); 
            }

            const response = await openai.chat.completions.create({
                model: MODEL_NAME,
                max_tokens: 1024,
                messages: userHistory
            });
            
            const answer = response.choices[0].message.content;

            // Masukkan jawaban AI ke memori
            userHistory.push({ role: 'assistant', content: answer });
            
            return answer;
        } catch (error) {
            console.error('[ERROR AI]', error);
            return '❌ Maaf, otak AI Sawi sedang mengalami gangguan saat ini.';
        }
    },

    /**
     * Meminta AI untuk menghasilkan data terstruktur dalam bentuk JSON
     */
    generateJSON: async (formatInstruction, prompt) => {
        if (!openai) {
            console.error('[ERROR AI] API Key belum diatur!');
            return null;
        }

        try {
            const fullPrompt = `${formatInstruction}\n\nTopik/Permintaan: ${prompt}`;
            
            const response = await openai.chat.completions.create({
                model: MODEL_NAME,
                max_tokens: 2000,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: 'You are a helpful assistant designed to output purely valid JSON.' },
                    { role: 'user', content: fullPrompt }
                ]
            });
            
            const textResponse = response.choices[0].message.content;
            return JSON.parse(textResponse);
        } catch (error) {
            console.error('[ERROR AI JSON]', error);
            return null;
        }
    }
};
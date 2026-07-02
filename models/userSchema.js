const mongoose = require('mongoose');

// 1. Buat Schema-nya terlebih dahulu
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    birthday: { type: String, default: null },
    afk: {
        isAfk: { type: Boolean, default: false },
        reason: String,
        time: Number,
        mentions: { type: [{ type: Object }], default: [] } // ✅ UBAH JADI SEPERTI INI
    }
});

// 2. Tambahkan index SETELAH variabel userSchema dibuat
userSchema.index({ level: -1, xp: -1 });

// 3. Ekspor modelnya
module.exports = mongoose.model('User', userSchema);
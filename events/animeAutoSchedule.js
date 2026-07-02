const cron = require('node-cron');
const { getAiringAnime } = require('../helpers/malService');
const { baseEmbed } = require('../helpers/embed');

const ANIME_CHANNEL_ID = '1411333728743063582';

module.exports = (client) => {
    console.log("[ANIME] Auto Scheduler diaktifkan");
    setTimeout(() => runScan(client, true), 15000);

    cron.schedule('44 22 * * *', () => runScan(client, true), { timezone: 'Asia/Jakarta' });
};

async function runScan(client, sendList = false) {
    try {
        const channel = await client.channels.fetch(ANIME_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        const animeList = await getAiringAnime();
        console.log(`[ANIME] Total anime dari cache/API: ${animeList.length}`);

        const now = Date.now();
        const next24h = now + 24*60*60*1000;

        const upcoming = animeList
            .map(anime => {
                const ts = buildAiringWIB(anime.broadcast);
                return ts ? { anime, ts } : null;
            })
            .filter(item => item && item.ts >= now - 7200000 && item.ts <= next24h) // toleransi 2 jam
            .sort((a, b) => a.ts - b.ts);

        console.log(`[ANIME] Ditemukan ${upcoming.length} anime dalam 24 jam`);

        if (sendList && upcoming.length > 0) {
            const embed = baseEmbed('📺 Jadwal Anime 24 Jam', `Ditemukan **${upcoming.length}** anime`, '#6B46C1');

            upcoming.slice(0, 10).forEach(({anime, ts}) => {
                const waktu = new Date(ts).toLocaleString('id-ID', { 
                    weekday:'short', hour:'2-digit', minute:'2-digit', timeZone:'Asia/Jakarta'
                });
                embed.addFields({ name: anime.title, value: `🕒 **${waktu} WIB**`, inline: false });
            });

            await channel.send({ embeds: [embed] });
        }
    } catch (e) {
        console.error("[ANIME] Error:", e.message);
    }
}

function buildAiringWIB(broadcast) {
    if (!broadcast?.day || !broadcast?.time) return null;

    const dayMap = { Sundays:0, Mondays:1, Tuesdays:2, Wednesdays:3, Thursdays:4, Fridays:5, Saturdays:6 };
    const targetDay = dayMap[broadcast.day];
    if (targetDay === undefined) return null;

    const [hour, minute] = broadcast.time.split(':').map(Number);
    const date = new Date();
    const diff = (targetDay - date.getDay() + 7) % 7;
    date.setDate(date.getDate() + diff);
    date.setHours(hour - 2, minute, 0, 0);

    return date.getTime();
}
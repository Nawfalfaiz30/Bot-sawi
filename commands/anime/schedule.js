const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { baseEmbed, errorEmbed } = require('../../helpers/embed.js');
const { getAiringAnime } = require('../../helpers/malService.js');

const PER_PAGE = 5;

module.exports = {
    name: 'schedule',
    data: new SlashCommandBuilder()
        .setName('schedule')
        .setDescription('📺 Menampilkan jadwal anime yang sedang tayang')
        .addStringOption(opt =>
            opt.setName('periode')
                .setDescription('Rentang waktu')
                .setRequired(true)
                .addChoices(
                    { name: '24 Jam ke depan', value: 'hari' },
                    { name: '7 Hari ke depan', value: 'minggu' }
                )
        ),

    async executeSlash(interaction) {
        await interaction.deferReply();
        const periode = interaction.options.getString('periode');
        await this.showSchedule(interaction, periode, true);
    },

    async executePrefix(message, args) {
        const periode = args[0]?.toLowerCase();
        if (!['hari', 'minggu'].includes(periode)) {
            return message.reply({
                embeds: [errorEmbed('Format Salah', '`sawi!schedule hari` atau `sawi!schedule minggu`')]
            });
        }
        const waitMsg = await message.reply('⏳ Mengambil jadwal anime...');
        await this.showSchedule(message, periode, false, waitMsg);
    },

        async showSchedule(context, periode, isSlash, waitMsg = null) {
        try {
            const animeList = await getAiringAnime();

            const now = Date.now();
            const range = periode === 'hari' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
            const end = now + range;

            let filtered = animeList
                .map(anime => {
                    const ts = this.buildAiringWIB(anime.broadcast);
                    return ts ? { anime, ts } : null;
                })
                .filter(Boolean)
                .filter(a => {
                    const { anime, ts } = a;

                    // Anime harus dalam range waktu yang diminta
                    if (ts < now || ts > end) return false;

                    // Anime harus sudah mulai tayang atau sedang tayang
                    if (anime.aired_from) {
                        const start = new Date(anime.aired_from).getTime();
                        if (start > now + (3 * 24 * 60 * 60 * 1000)) return false; // toleransi 3 hari
                    }

                    // Jika ada tanggal tamat, jangan tampilkan yang sudah tamat
                    if (anime.aired_to) {
                        const endAired = new Date(anime.aired_to).getTime();
                        if (endAired < now - (2 * 24 * 60 * 60 * 1000)) return false;
                    }

                    return true;
                })
                .sort((a, b) => a.ts - b.ts);

            if (filtered.length === 0) {
                const embed = errorEmbed('📭 Tidak Ada Jadwal', 'Tidak ada anime yang tayang dalam periode ini.');
                return isSlash ? context.editReply({ embeds: [embed] }) : waitMsg.edit({ embeds: [embed] });
            }

            // ... (bagian pagination dan embed tetap sama seperti sebelumnya)

            const pages = [];
            for (let i = 0; i < filtered.length; i += PER_PAGE) {
                pages.push(filtered.slice(i, i + PER_PAGE));
            }

            let currentPage = 0;

            const generateEmbed = () => {
                const embed = new EmbedBuilder()
                    .setColor('#6B46C1')
                    .setTitle(`📺 Jadwal Anime ${periode === 'hari' ? '24 Jam' : '7 Hari'} ke Depan`)
                    .setDescription(`Menampilkan **${filtered.length}** anime yang sedang tayang.`)
                    .setThumbnail(context.client.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setFooter({ 
                        text: 'Data dari MyAnimeList • WIB Timezone',
                        iconURL: context.client.user.displayAvatarURL()
                    })
                    .setTimestamp();

                pages[currentPage].forEach((item, index) => {
                    const { anime, ts } = item;
                    const date = new Date(ts);

                    const timeStr = date.toLocaleTimeString('id-ID', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        timeZone: 'Asia/Jakarta'
                    });

                    const dateStr = date.toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                    });

                    embed.addFields({
                        name: `${index + 1}. ${anime.title}`,
                        value: `🕒 **${timeStr} WIB** • ${dateStr}\n` +
                               `⭐ **${anime.score || 'N/A'}** | 📺 Ep ${anime.episode || '?'}\n` +
                               `🏢 ${anime.studios?.[0] || 'Unknown'}\n` +
                               `🎭 ${anime.genres?.slice(0, 3).join(', ') || '—'}`,
                        inline: false
                    });
                });

                return embed;
            };

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('next').setEmoji('➡️').setStyle(ButtonStyle.Secondary).setDisabled(pages.length <= 1)
            );

            const msg = isSlash 
                ? await context.editReply({ embeds: [generateEmbed()], components: [row] })
                : await waitMsg.edit({ embeds: [generateEmbed()], components: [row] });

            const collector = msg.createMessageComponentCollector({ time: 180000 });

            collector.on('collect', async i => {
                if (i.user.id !== (isSlash ? context.user.id : context.author.id)) {
                    return i.reply({ content: '❌ Bukan untukmu!', ephemeral: true });
                }

                if (i.customId === 'next') currentPage++;
                if (i.customId === 'prev') currentPage--;

                currentPage = Math.max(0, Math.min(currentPage, pages.length - 1));

                row.components[0].setDisabled(currentPage === 0);
                row.components[1].setDisabled(currentPage === pages.length - 1);

                await i.update({ embeds: [generateEmbed()], components: [row] });
            });

        } catch (error) {
            console.error('[SCHEDULE ERROR]', error);
            const errEmbed = errorEmbed('❌ Gagal Mengambil Jadwal', 'Terjadi kesalahan saat menghubungi MyAnimeList.');
            isSlash ? context.editReply({ embeds: [errEmbed] }) : waitMsg.edit({ embeds: [errEmbed] });
        }
    },

    // Helper dari JLS Gaming (sudah disesuaikan)
    buildAiringWIB(broadcast) {
        if (!broadcast?.day || !broadcast?.time) return null;

        const dayMap = {
            Sundays: 0, Mondays: 1, Tuesdays: 2, Wednesdays: 3,
            Thursdays: 4, Fridays: 5, Saturdays: 6
        };

        const targetDay = dayMap[broadcast.day];
        if (targetDay === undefined) return null;

        const now = new Date();
        const date = new Date(now);

        const diff = (targetDay - date.getDay() + 7) % 7;
        date.setDate(date.getDate() + diff);

        let [hour, minute] = broadcast.time.split(':').map(Number);

        // JST → WIB
        hour -= 2;
        if (hour < 0) {
            hour += 24;
            date.setDate(date.getDate() - 1);
        }

        date.setHours(hour, minute, 0, 0);
        return date.getTime();
    }
};
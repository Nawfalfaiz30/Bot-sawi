const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { baseEmbed, errorEmbed, successEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'rules',
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription('🛡️ [ADMIN] Mengirimkan peraturan resmi JAKA (Japan Nakama)')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async executeSlash(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                embeds: [errorEmbed('Akses Ditolak', 'Hanya Administrator yang berwenang!')], 
                ephemeral: true 
            });
        }
        await this.deployRules(interaction, true);
    },

    async executePrefix(message) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ 
                embeds: [errorEmbed('Akses Ditolak', 'Hanya Administrator yang berwenang!')] 
            });
        }
        await this.deployRules(message, false);
    },

    async deployRules(context, isSlash) {
        const rulesEmbed = baseEmbed(
            `🌸 PERATURAN RESMI JAKA`,
            `**Japan Nakama** — Komunitas Pecinta Budaya Jepang\n\n` +
            `Untuk menjaga suasana nyaman, menyenangkan, dan penuh rasa hormat, ` +
            `setiap member wajib mematuhi peraturan berikut:`
        )
        .setColor('#E91E63')
        .setThumbnail(context.guild.iconURL({ dynamic: true, size: 512 }))
        .setFooter({ 
            text: `🌸 Japan Nakama • Patuhi peraturan demi kebaikan bersama`, 
            iconURL: context.guild.iconURL() 
        })
        .setTimestamp();

        rulesEmbed.addFields(
            {
                name: '🤝 1. Sikap & Etika',
                value: 'Saling menghormati, tidak bullying, hate speech, rasisme, SARA, atau toxic behavior.',
                inline: false
            },
            {
                name: '🎌 2. Bahasa Komunikasi',
                value: 'Bahasa utama **Indonesia**. Diperbolehkan menggunakan English atau Japanese jika diperlukan.',
                inline: false
            },
            {
                name: '📺 3. Spoiler Anime & Manga',
                value: 'Wajib menggunakan spoiler tag (`||text||`) untuk anime, manga, atau game yang masih ongoing.',
                inline: false
            },
            {
                name: '🔞 4. Konten NSFW',
                value: 'Dilarang keras menyebarkan konten dewasa di semua channel kecuali channel NSFW khusus.',
                inline: false
            },
            {
                name: '🎵 5. Voice Channel',
                value: 'Dilarang earrape, voice changer berisik, memutar suara mengganggu, atau mengganggu member lain.',
                inline: false
            },
            {
                name: '🔗 6. Sharing & Link',
                value: 'Hanya boleh membagikan link resmi/legal (YouTube, Streaming resmi, situs resmi Jepang). Link mencurigakan akan dihapus.',
                inline: false
            },
            {
                name: '📍 7. Penggunaan Channel',
                value: 'Gunakan setiap channel sesuai fungsinya. Hindari off-topic berlebihan.',
                inline: false
            },
            {
                name: '🚫 8. Menjaga Harmoni Komunitas',
                value: 'Dilarang memprovokasi drama, membawa isu luar server, atau membentuk klik yang merugikan suasana server.',
                inline: false
            },
            {
                name: '⚖️ 9. Sistem Sanksi',
                value: '• Ringan : Teguran / Warn\n• Sedang : Timeout / Mute\n• Berat : Kick / Ban Permanen',
                inline: false
            },
            {
                name: '🌸 10. Semangat Nakama',
                value: 'Mari menjaga server ini sebagai tempat yang positif, saling menghargai, dan penuh cinta akan budaya Jepang.',
                inline: false
            }
        );

        try {
            await context.channel.send({ embeds: [rulesEmbed] });

            const confirm = successEmbed(
                '✅ Peraturan Berhasil Dipasang',
                'Papan peraturan resmi **Japan Nakama** telah dikirim.'
            );

            if (isSlash) {
                await context.reply({ embeds: [confirm], ephemeral: true });
            } else {
                const msg = await context.reply({ embeds: [confirm] });
                setTimeout(() => msg.delete().catch(() => {}), 4000);
            }
        } catch (error) {
            console.error('[ERROR RULES]', error);
            const err = errorEmbed('Gagal Mengirim', 'Pastikan bot memiliki izin **Send Messages** di channel ini.');
            return isSlash 
                ? context.reply({ embeds: [err], ephemeral: true }) 
                : context.reply({ embeds: [err] });
        }
    }
};
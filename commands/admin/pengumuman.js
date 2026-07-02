const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { baseEmbed, errorEmbed, successEmbed } = require('../../helpers/embed.js');

module.exports = {
    name: 'pengumuman',
    data: new SlashCommandBuilder()
        .setName('pengumuman')
        .setDescription('🛡️ [ADMIN] Membuat pengumuman resmi dengan tampilan rapi')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Pilih channel tujuan')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option => 
            option.setName('judul')
                .setDescription('Judul pengumuman')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('isi')
                .setDescription('Isi pengumuman (gunakan \\n untuk baris baru)')
                .setRequired(true)
        )
        .addRoleOption(option => 
            option.setName('mention')
                .setDescription('Role yang ingin di-mention')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('ping')
                .setDescription('Jenis ping')
                .setRequired(false)
                .addChoices(
                    { name: '@everyone', value: 'everyone' },
                    { name: '@here', value: 'here' }
                )
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async executeSlash(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [errorEmbed('Akses Ditolak', 'Hanya Administrator!')], ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('judul');
        const rawContent = interaction.options.getString('isi');
        const content = rawContent.replace(/\\n/g, '\n').replace(/\n\s*\n/g, '\n\n'); // Perbaikan double newline
        const role = interaction.options.getRole('mention');
        const pingType = interaction.options.getString('ping');

        await this.sendAnnouncement(interaction, channel, title, content, role, pingType, true);
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ embeds: [errorEmbed('Akses Ditolak', 'Hanya Administrator!')] });
        }

        const channel = message.mentions.channels.first();
        if (!channel) return message.reply({ embeds: [errorEmbed('Format Salah', 'Tag channel tujuan!')] });

        const textRaw = args.slice(1).join(' ');
        if (!textRaw.includes('|')) {
            return message.reply({ embeds: [errorEmbed('Format Salah', 'Gunakan `|` → Judul | Isi')] });
        }

        const [title, rawContent] = textRaw.split('|').map(s => s.trim());
        const content = rawContent.replace(/\\n/g, '\n');

        await this.sendAnnouncement(message, channel, title, content, null, null, false);
    },

    async sendAnnouncement(context, channel, title, content, role, pingType, isSlash) {
        try {
            const announceEmbed = baseEmbed(
                `🌸 ${title}`,
                content,
                '#FF1493'
            )
            .setThumbnail(context.guild.iconURL({ dynamic: true, size: 128 }))
            .setFooter({ 
                text: `Japan Nakama • Pengumuman Resmi`, 
                iconURL: context.guild.iconURL({ dynamic: true }) 
            })
            .setTimestamp();

            let pingText = '';
            if (pingType === 'everyone') pingText = '@everyone';
            else if (pingType === 'here') pingText = '@here';
            else if (role) pingText = `<@&${role.id}>`;

            if (pingText) {
                await channel.send({ content: pingText, embeds: [announceEmbed] });
            } else {
                await channel.send({ embeds: [announceEmbed] });
            }

            const success = successEmbed('✅ Berhasil', `Pengumuman telah dikirim ke ${channel}`);
            if (isSlash) {
                await context.reply({ embeds: [success], ephemeral: true });
            } else {
                const msg = await context.reply({ embeds: [success] });
                setTimeout(() => msg.delete().catch(() => {}), 4000);
            }
        } catch (error) {
            console.error('[ERROR PENGUMUMAN]', error);
            const err = errorEmbed('Gagal', 'Cek izin bot di channel tersebut.');
            return isSlash ? context.reply({ embeds: [err], ephemeral: true }) : context.reply({ embeds: [err] });
        }
    }
};
const { Events, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, EmbedBuilder } = require('discord.js');
const { baseEmbed } = require('../helpers/embed.js');
const Guild = require('../models/guildSchema.js');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction, client) {
        
        // 1. HANDLER UNTUK TOMBOL
        if (interaction.isButton()) {
            
            // ==========================================
            // A. LOGIKA: MEMBUKA TIKET
            // ==========================================
            if (interaction.customId === 'open_ticket') {
                try {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                } catch (error) { return; }

                const { guild, member } = interaction;
                const channelName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

                const existingChannel = guild.channels.cache.find(c => c.name === channelName);
                if (existingChannel) {
                    return interaction.editReply({ content: `❌ Kamu sudah memiliki tiket yang terbuka di <#${existingChannel.id}>` });
                }

                try {
                    const guildData = await Guild.findOne({ guildId: guild.id });
                    const categoryId = guildData?.ticketCategory;

                    const channelOptions = {
                        name: channelName,
                        type: ChannelType.GuildText,
                        permissionOverwrites: [
                            { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                            { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                        ],
                    };

                    if (categoryId) channelOptions.parent = categoryId;

                    const ticketChannel = await guild.channels.create(channelOptions);
                    
                    const closeBtn = new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('🔒 Tutup Tiket')
                        .setStyle(ButtonStyle.Danger);

                    const row = new ActionRowBuilder().addComponents(closeBtn);
                    
                    const welcomeEmbed = baseEmbed(
                        '🎫 Tiket Terbuka', 
                        `Halo <@${member.id}>! Mohon jelaskan detail masalahmu di sini. Tim kami akan segera membantu.`, 
                        '#57F287'
                    );
                    
                    await ticketChannel.send({ 
                        content: `<@${member.id}>`, 
                        embeds: [welcomeEmbed], 
                        components: [row] 
                    });

                    return interaction.editReply({ content: `✅ Tiket berhasil dibuat di <#${ticketChannel.id}>` });
                } catch (error) {
                    console.error('[TICKET ERROR]', error);
                    return interaction.editReply({ content: '❌ Gagal membuat tiket. Pastikan bot memiliki izin Manage Channels.' });
                }
            }

            // ==========================================
            // B. LOGIKA: MENUTUP TIKET
            // ==========================================
            if (interaction.customId === 'close_ticket') {
                if (interaction.replied || interaction.deferred) return;

                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    return interaction.reply({ 
                        content: '❌ Hanya staf yang bisa menutup tiket!', 
                        flags: [MessageFlags.Ephemeral] 
                    }).catch(() => {});
                }

                try {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

                    const closeEmbed = baseEmbed(
                        '🔒 Tiket Sedang Ditutup',
                        'Tiket ini akan dihapus dalam **5 detik**.\nTerima kasih telah menggunakan layanan kami!',
                        '#FF0000'
                    );

                    await interaction.channel.send({ embeds: [closeEmbed] });

                    setTimeout(async () => {
                        try {
                            await interaction.channel.delete('Tiket ditutup oleh staf');
                        } catch (error) {
                            console.error('[DELETE TICKET ERROR]', error);
                        }
                    }, 5000);

                } catch (error) {
                    console.error('[CLOSE TICKET ERROR]', error);
                }
                return;
            }

            // ==========================================
            // C. LOGIKA: VERIFIKASI MEMBER
            // ==========================================
            if (interaction.customId.startsWith('verify_role_')) {
                if (interaction.replied || interaction.deferred) return;

                const roleId = interaction.customId.split('verify_role_')[1];
                const role = interaction.guild.roles.cache.get(roleId);
                
                if (!role) return interaction.reply({ content: '❌ Role tidak ditemukan.', flags: [MessageFlags.Ephemeral] });
                if (interaction.member.roles.cache.has(roleId)) return interaction.reply({ content: '✅ Sudah diverifikasi.', flags: [MessageFlags.Ephemeral] });

                try {
                    await interaction.member.roles.add(role);
                    return interaction.reply({ content: `🎉 Berhasil! Kamu mendapatkan role **${role.name}**.`, flags: [MessageFlags.Ephemeral] });
                } catch (error) {
                    return interaction.reply({ content: '❌ Gagal verifikasi. Cek posisi role bot.', flags: [MessageFlags.Ephemeral] });
                }
            }

            // ==========================================
            // D. LOGIKA CONFESS: MEMBUKA RUANGAN
            // ==========================================
            if (interaction.customId === 'open_confess') {
                try {
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                } catch (error) { return; }

                const { guild, member } = interaction;
                const channelName = `confess-${member.id}`;

                const existingChannel = guild.channels.cache.find(c => c.name === channelName);
                if (existingChannel) {
                    return interaction.editReply({
                        content: `❌ Kamu sudah memiliki ruang confess aktif di <#${existingChannel.id}>`
                    });
                }

                try {
                    const guildData = await Guild.findOne({ guildId: guild.id });
                    const categoryId = guildData?.confessCategory;

                    const channelOptions = {
                        name: channelName,
                        type: ChannelType.GuildText,
                        permissionOverwrites: [
                            { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                            { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                        ]
                    };

                    if (categoryId) channelOptions.parent = categoryId;

                    const confessChannel = await guild.channels.create(channelOptions);

                    const message = [
                        `Halo <@${member.id}>!`,
                        `Silakan kirim isi confess kamu di sini.`,
                        ``,
                        `⚠️ **Perhatian:**`,
                        `• Pesan akan dibuat preview terlebih dahulu`,
                        `• Kamu bisa mengirim, menulis ulang, atau membatalkan`,
                        `• Channel akan otomatis dihapus dalam **5 menit**`
                    ].join('\n');

                    const welcomeEmbed = baseEmbed('🤫 Ruang Confess Privat', message, '#9B59B6');

                    const deleteRoomBtn = new ButtonBuilder()
                        .setCustomId('delete_confess_room')
                        .setLabel('🗑 Hapus Ruangan')
                        .setStyle(ButtonStyle.Danger);

                    const row = new ActionRowBuilder().addComponents(deleteRoomBtn);

                    await confessChannel.send({
                        content: `<@${member.id}>`,
                        embeds: [welcomeEmbed],
                        components: [row]
                    });

                    setTimeout(async () => {
                        await confessChannel.delete().catch(() => {});
                    }, 300000);

                    return interaction.editReply({
                        content: `✅ Silahkan confess (klik channel berikut) <#${confessChannel.id}>`
                    });

                } catch (error) {
                    console.error('[OPEN CONFESS ERROR]', error);
                    return interaction.editReply({ content: '❌ Gagal membuat ruang confess.' });
                }
            }

            // ==========================================
            // E. LOGIKA CONFESS: KIRIM / REWRITE / CANCEL
            // ==========================================
            if (['send_confess', 'rewrite_confess', 'cancel_confess'].includes(interaction.customId)) {
                if (interaction.replied || interaction.deferred) return;

                // CANCEL CONFESS
                if (interaction.customId === 'cancel_confess') {
                    await interaction.reply({
                        content: '⚠️ Confess dibatalkan. Channel ini akan dihapus dalam **5 detik**...'
                    });
                    setTimeout(async () => {
                        await interaction.channel?.delete().catch(() => {});
                    }, 5000);
                    return;
                }

                // REWRITE CONFESS
                if (interaction.customId === 'rewrite_confess') {
                    await interaction.reply({
                        content: '✍️ Silakan kirim ulang isi confess baru kamu di channel ini.'
                    });
                    await interaction.message.delete().catch(() => {});
                    return;
                }

                // ==================== SEND CONFESS + LOGGING ====================
                if (interaction.customId === 'send_confess') {
                    await interaction.deferReply();

                    const previewEmbed = interaction.message.embeds[0];
                    if (!previewEmbed) {
                        return interaction.editReply({ content: '❌ Preview confess tidak ditemukan.' });
                    }

                    const confessContent = previewEmbed.description;
                    const guildData = await Guild.findOne({ guildId: interaction.guild.id });

                    if (!guildData?.confessChannel) {
                        return interaction.editReply({ content: '❌ Admin belum mengatur channel confess publik.' });
                    }

                    const targetChannel = interaction.guild.channels.cache.get(guildData.confessChannel);
                    if (!targetChannel) {
                        return interaction.editReply({ content: '❌ Channel confess publik tidak ditemukan.' });
                    }

                    // Kirim ke channel publik (Anonim)
                    const finalConfessEmbed = new EmbedBuilder()
                        .setColor('#130073')
                        .setAuthor({
                            name: '💌 Pesan Rahasia Baru Masuk!',
                            iconURL: 'https://cdn-icons-png.flaticon.com/512/9344/9344849.png'
                        })
                        .setDescription(confessContent)
                        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3237/3237472.png')
                        .setFooter({
                            text: '🔒 Identitas Terjamin 100% Anonim',
                            iconURL: client.user.displayAvatarURL()
                        })
                        .setTimestamp();

                    const confessMsg = await targetChannel.send({ embeds: [finalConfessEmbed] });

                    // Buat thread
                    const cleanContent = confessContent.replace(/[#>*`]/g, '').replace(/\n/g, ' ').trim();
                    const threadName = cleanContent.length > 50 ? `${cleanContent.slice(0, 47)}...` : cleanContent;
                    await confessMsg.startThread({ name: `💬 ${threadName}`, autoArchiveDuration: 1440 });

                    // ====================== CONFESS LOG (ADMIN ONLY) ======================
                    if (guildData.confessLogChannel) {
                        const logChannel = interaction.guild.channels.cache.get(guildData.confessLogChannel);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setColor('#b21010')
                                .setTitle('📋 Confess Log — Admin Only')
                                .setAuthor({
                                    name: 'Sistem Confess Anonim',
                                    iconURL: 'https://cdn-icons-png.flaticon.com/512/3237/3237472.png'
                                })
                                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
                                .setDescription(`**Pesan Confess:**\n${confessContent}`)
                                .addFields(
                                    {
                                        name: '👤 Pengirim Asli',
                                        value: `<@${interaction.user.id}> \n\`ID: ${interaction.user.id}\``,
                                        inline: true
                                    },
                                    {
                                        name: '🕒 Waktu Pengiriman',
                                        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                                        inline: true
                                    },
                                    {
                                        name: '📍 Channel Publik',
                                        value: `<#${targetChannel.id}>`,
                                        inline: false
                                    }
                                )
                                .setFooter({
                                    text: 'Hanya Admin yang bisa melihat',
                                    iconURL: client.user.displayAvatarURL()
                                })
                                .setTimestamp();

                            await logChannel.send({ embeds: [logEmbed] });
                        }
                    }

                    await interaction.editReply({
                        content: '✅ Confess berhasil dikirim secara anonim! Channel ini akan dihapus dalam **5 detik**...'
                    });

                    setTimeout(async () => {
                        await interaction.channel?.delete().catch(() => {});
                    }, 5000);
                }
            }

            // ==========================================
            // F. LOGIKA HAPUS RUANG CONFESS MANUAL
            // ==========================================
            if (interaction.customId === 'delete_confess_room') {
                if (interaction.replied || interaction.deferred) return;

                await interaction.reply({
                    content: '🗑 Ruangan confess akan dihapus dalam **5 detik**...'
                });

                setTimeout(async () => {
                    await interaction.channel?.delete().catch(() => {});
                }, 5000);
            }
        } 
        
        // 2. HANDLER UNTUK SLASH COMMAND
        else if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            
            try {
                await command.executeSlash(interaction, client);
            } catch (error) {
                console.error(`[SLASH ERROR] ${interaction.commandName}:`, error);
                const errorMsg = { content: '❌ Terjadi kesalahan internal.', flags: [MessageFlags.Ephemeral] };
                
                if (interaction.replied || interaction.deferred) await interaction.followUp(errorMsg);
                else await interaction.reply(errorMsg);
            }
        }
    }
};
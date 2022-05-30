const discord = require('discord.js');
const { Client, Intents} = discord;
const client = new Client({ intents:
        [Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS, Intents.FLAGS.GUILD_INVITES,
            Intents.FLAGS.GUILD_BANS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.GUILD_INTEGRATIONS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
            Intents.FLAGS.GUILD_MESSAGE_TYPING, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_VOICE_STATES,
            Intents.FLAGS.GUILD_WEBHOOKS, Intents.FLAGS.GUILDS]
});
const config = require('./config.json');
const express = require('express');
const app = express();
const port = 8094;
const generateImages = require('./GenerateImages');

client.login(config.token);
const Datastore = require('nedb')
    , db = new Datastore({filename: 'data', autoload: true});

// run setinterval here to update
setInterval(async function updateUserActivity() {
    const guilds = await client.guilds.fetch();
    const allMembers = await Promise.all(guilds.map(async val => {
        const guild = await val.fetch();
        return await guild.members.fetch();
    }));
    for(const guildMembers of allMembers) {
        for(const member of [...guildMembers]) {
            db.findOne({id: member.id}, (err, res) => {
                const id = member[1].id;
                const username = member[1].user.username;
                const discriminator = member[1].user.discriminator;
                const avatarUrl = member[1].user.avatarURL({format: "png"});
                if(member[1].presence === null) {
                    const memberActivity = {
                        id,
                        username,
                        discriminator,
                        avatarUrl
                    };
                    if (res) {
                        db.update({id: id}, memberActivity, {}, function (err, numReplaced) {});
                    } else {
                        db.insert(memberActivity);
                    }
                }
                else {
                    const status = member[1].presence.status;
                    const activities = member[1].presence.activities;
                    const customStatus = activities.find(s => s.id === 'custom');
                    const currentActivity = activities.find(s => s.id !== 'custom');
                    const largeImageUrl = currentActivity?.assets?.largeImageURL();
                    const smallImageUrl = currentActivity?.assets?.smallImageURL();
                    const smallText = currentActivity?.assets?.smallText;
                    const largeText = currentActivity?.assets?.largeText;

                    const memberActivity = {
                        id,
                        username,
                        discriminator,
                        avatarUrl,
                        customStatus: customStatus?.state,
                        currentStatus: status,
                        currentActivityName: currentActivity?.name,
                        currentActivityType: currentActivity?.type,
                        currentActivityDetails: currentActivity?.details,
                        currentActivityAssets: {
                            largeText,
                            smallText,
                            largeImageUrl,
                            smallImageUrl
                        },
                        timestamp: Date.now()
                    };
                    if (res) {
                        db.update({id: id}, memberActivity, {}, function (err, numReplaced) {});
                    } else {
                        db.insert(memberActivity);
                    }
                }
            });
        }
    }
    db.persistence.compactDatafile();
}, 5000);

// implement presenceUpdate to record the history of discord activity for a user
client.on("presenceUpdate", (oldMember, newMember) => {
    // if the custom status has changed or the user now has a custom status update it
    // if the currentActivity name, type, description, icon change update it
    // if the new activity is different than the old activity set the timestamps from the old activity
    //persist the user if they have not been persisted before
});

app.listen(port, () => {
    console.log(`App listening at port: ${port}`);
})

app.get('/getDiscordStatus/:id',async (req, res) => {
    res.contentType('image/svg+xml')
    res.send(await generateImages.generateDiscordStatusImg(db, req.params.id));
});

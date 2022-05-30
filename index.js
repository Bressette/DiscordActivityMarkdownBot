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

//updates user info username / avatar every 5 minutes
setInterval(async function updateUserActivity() {
    const guilds = await client.guilds.fetch();
    const allMembers = await Promise.all(guilds.map(async val => {
        const guild = await val.fetch();
        return await guild.members.fetch();
    }));
    for(const guildMembers of allMembers) {
        for(const member of [...guildMembers]) {
            updateUserPresenceInfo(member[1]);
        }
    }
    db.persistence.compactDatafile();
}, 300000);

function updateUserPresenceInfo(member) {
    const id = member.id;
    const username = member.user.username;
    const discriminator = member.user.discriminator;
    const avatarUrl = member.user.avatarURL({format: "png"});
    if(member.presence === null) {
        const memberActivity = {
            id,
            username,
            discriminator,
            avatarUrl
        };
        db.update({id: id}, memberActivity, {upsert: true}, function (err, numReplaced) {});
    }
    else {
        const status = member.presence.status;
        const activities = member.presence.activities;
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
        db.update({id: id}, memberActivity, {upsert: true}, function (err, numReplaced) {});
    }
}

// updates user status info custom status, status, and activity
// and persists a record of an activity session if it has a start and end timestamp
function updateUserStatus(userId, status, activities) {
    const customStatus = activities.find(s => s.id === 'custom');
    const currentActivity = activities.find(s => s.id !== 'custom');
    const largeImageUrl = currentActivity?.assets?.largeImageURL();
    const smallImageUrl = currentActivity?.assets?.smallImageURL();
    const smallText = currentActivity?.assets?.smallText;
    const largeText = currentActivity?.assets?.largeText;
    const statusInfo = {
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
    };
    db.update({id: userId}, statusInfo, {}, function (err, numReplaced) {});
    if (currentActivity?.timestamps?.end !== undefined) {
        const userActivitySession = {
            id: userId,
            currentActivityName: currentActivity?.name,
            currentActivityType: currentActivity?.type,
            currentActivityDetails: currentActivity?.details,
            currentActivityAssets: {
                largeText,
                smallText,
                largeImageUrl,
                smallImageUrl
            },
            timestamps: {
                startTime: currentActivity.timestamps.start,
                endTime: currentActivity.timestamps.end
            }
        };
        db.insert(userActivitySession);
    }
}

// implement presenceUpdate to record the history of discord activity for a user
client.on("presenceUpdate", (oldMember, newMember) => {
    updateUserStatus(newMember.userId, newMember.status, newMember.activities);
});

app.listen(port, () => {
    console.log(`App listening at port: ${port}`);
})

app.get('/getDiscordStatus/:id',async (req, res) => {
    res.contentType('image/svg+xml')
    res.send(await generateImages.generateDiscordStatusImg(db, req.params.id));
});

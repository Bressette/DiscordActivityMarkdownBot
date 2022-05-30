const { createCanvas, loadImage, registerFont } = require('canvas');
registerFont('assets/HelveticaNeue.ttf', { family: 'Helvetica' });

// returns the stream of img data for the drawn canvas
async function generateDiscordStatusImg(db, discordId) {
    return await new Promise((resolve, reject) => {
        db.findOne({id: discordId}, async (err, res) => {
            const canvas = createCanvas(38, 38, 'svg');
            const ctx = canvas.getContext('2d');
            const avatarUrl = res.avatarUrl;
            const usernameDiscriminator = `${res.username}#${res.discriminator}`
            const status = res.currentStatus;
            let statusImage;
            switch(status) {
                case 'online':
                    statusImage = await loadImage('assets/onlineIcon.png');
                    break;
                case 'offline':
                    statusImage = await loadImage('assets/offlineIcon.png');
                    break;
                case 'dnd':
                    statusImage = await loadImage('assets/dnd.png');
                    break;
                case 'idle':
                    statusImage = await loadImage('assets/idleIcon.png');
            }
            const avatarImage = await loadImage(avatarUrl);

            const circle = {
                x: 19,
                y: 19,
                radius: 14
            };

            ctx.beginPath();
            ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            const aspect = avatarImage.height / avatarImage.width;
            const hsx = circle.radius * Math.max(1.0 / aspect, 1.0);
            const hsy = circle.radius * Math.max(aspect, 1.0);
            ctx.drawImage(avatarImage, circle.x - hsx, circle.y - hsy, hsx * 2, hsy * 2);
            // ctx.drawImage(avatarImage, 0, 0, 25, 25);
            ctx.drawImage(statusImage, circle.x - hsx + 18, circle.y - hsy + 18, 8, 8);
            const finalCanvas = createCanvas(200, 40, 'svg');
            const finalContext = finalCanvas.getContext('2d');
            finalContext.drawImage(canvas, 5, 5);
            finalContext.fillStyle = 'white';
            finalContext.fillText(usernameDiscriminator, 45, 27);
            resolve(finalCanvas.toBuffer());
        });
    });
}

module.exports = {
    generateDiscordStatusImg
}

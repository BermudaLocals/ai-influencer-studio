const sendDM = async (platform,recipientId,message) => { return { success: true, queued: true }; };
const processDMQueue = async () => { return { processed: 0 }; };
module.exports = { sendDM, processDMQueue };
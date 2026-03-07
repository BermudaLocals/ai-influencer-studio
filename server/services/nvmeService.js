const syncToNvme = async (content) => { return { success: true, queued: true }; };
const getNvmeStats = async (creatorId) => { return { viewers: 0, coins: 0, revenue: 0 }; };
module.exports = { syncToNvme, getNvmeStats };
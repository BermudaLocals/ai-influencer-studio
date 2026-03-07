const scrapeLeads = async (location,niche,limit=50) => { return { success: true, leads: [], queued: true }; };
const scrapeTrends = async (platform) => { return { success: true, trends: [] }; };
module.exports = { scrapeLeads, scrapeTrends };
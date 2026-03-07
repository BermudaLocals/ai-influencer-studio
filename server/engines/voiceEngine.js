const generateVoice = async (text,voiceId='default') => { return { success: true, audioUrl: null, queued: true }; };
const getVoiceList = async () => { return { voices: [] }; };
module.exports = { generateVoice, getVoiceList };
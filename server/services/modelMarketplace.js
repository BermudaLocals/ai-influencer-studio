// AI Model Marketplace — browse and select generation models
const MODELS = [
  { id: 'sdxl', name: 'Stable Diffusion XL', category: 'photorealistic', provider: 'stability', free: false, description: 'Best for photorealistic influencer content', rating: 4.8, uses: 'portraits, fashion, lifestyle' },
  { id: 'pollinations', name: 'Pollinations Free', category: 'general', provider: 'pollinations', free: true, description: 'Free unlimited generation — great for drafts', rating: 4.2, uses: 'drafts, concepts, social posts' },
  { id: 'flux-schnell', name: 'FLUX Schnell', category: 'fast', provider: 'replicate', free: false, description: 'Ultra-fast generation, 4 steps', rating: 4.6, uses: 'quick content, batch generation' },
  { id: 'flux-pro', name: 'FLUX Pro', category: 'premium', provider: 'replicate', free: false, description: 'Highest quality, photorealistic results', rating: 4.9, uses: 'hero shots, brand campaigns' },
  { id: 'realvisxl', name: 'RealVisXL', category: 'photorealistic', provider: 'replicate', free: false, description: 'Ultra realistic humans, best for AI influencers', rating: 4.9, uses: 'AI influencer photos, portraits' },
  { id: 'animagine', name: 'Animagine XL', category: 'anime', provider: 'replicate', free: false, description: 'Anime/manga style for diverse content', rating: 4.5, uses: 'anime content, gaming niches' },
  { id: 'dreamshaper', name: 'DreamShaper XL', category: 'artistic', provider: 'replicate', free: false, description: 'Artistic, painterly style', rating: 4.4, uses: 'artistic content, fantasy, creative' },
  { id: 'epicrealism', name: 'epiCRealism', category: 'photorealistic', provider: 'replicate', free: false, description: 'Cinematic realism for premium content', rating: 4.7, uses: 'cinematic shots, luxury content' }
];

function listModels(filters = {}) {
  let models = [...MODELS];
  if (filters.category) models = models.filter(m => m.category === filters.category);
  if (filters.free !== undefined) models = models.filter(m => m.free === filters.free);
  if (filters.search) models = models.filter(m => 
    m.name.toLowerCase().includes(filters.search.toLowerCase()) ||
    m.uses.toLowerCase().includes(filters.search.toLowerCase())
  );
  return models;
}

function getModel(id) {
  return MODELS.find(m => m.id === id);
}

const CATEGORIES = ['photorealistic', 'general', 'fast', 'premium', 'anime', 'artistic'];

module.exports = { listModels, getModel, MODELS, CATEGORIES };

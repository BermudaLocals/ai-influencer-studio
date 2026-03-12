const { generateImage } = require('./imageEngine');

// Generate multiple images in parallel with concurrency control
async function bulkGenerate({ prompts, concurrency = 3, onProgress }) {
  const results = [];
  const errors = [];
  
  for (let i = 0; i < prompts.length; i += concurrency) {
    const batch = prompts.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (item, idx) => {
        const result = await generateImage(item.prompt, item.options || {});
        if (onProgress) onProgress({ completed: i + idx + 1, total: prompts.length, result });
        return { prompt: item.prompt, path: result, status: 'success' };
      })
    );
    batchResults.forEach(r => {
      if (r.status === 'fulfilled') results.push(r.value);
      else errors.push({ error: r.reason.message });
    });
  }
  return { results, errors, total: prompts.length, succeeded: results.length };
}

// Generate variations of a single prompt
async function generateVariations({ basePrompt, count = 6, styleVariants }) {
  const variants = styleVariants || [
    'photorealistic, studio lighting',
    'cinematic, golden hour',
    'editorial fashion photography',
    'vibrant, high contrast',
    'soft natural light, lifestyle',
    'dramatic, moody atmosphere'
  ];
  
  const prompts = Array.from({ length: count }, (_, i) => ({
    prompt: `${basePrompt}, ${variants[i % variants.length]}`,
    options: {}
  }));
  
  return bulkGenerate({ prompts, concurrency: 3 });
}

module.exports = { bulkGenerate, generateVariations };

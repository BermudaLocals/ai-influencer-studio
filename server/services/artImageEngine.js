/**
 * ART IMAGE ENGINE — AI Art Generation Platform
 * Multi-model support: FLUX, Stable Diffusion XL, DALL-E 3, Leonardo AI
 * Features: Text-to-Image, Image-to-Image, Inpainting, Upscaling, Style Transfer
 */
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const FormData = require('form-data');
const fs = require('fs');

// ── SUPPORTED MODELS ──────────────────────────────────────────────
const MODELS = {
  'flux-schnell': {
    provider: 'replicate',
    model: 'black-forest-labs/flux-schnell',
    maxResolution: 1440,
    defaultResolution: { width: 1024, height: 1024 },
    supportsImg2Img: false,
    costPerGen: 0.003
  },
  'flux-dev': {
    provider: 'replicate',
    model: 'black-forest-labs/flux-dev',
    maxResolution: 1440,
    defaultResolution: { width: 1024, height: 1024 },
    supportsImg2Img: true,
    costPerGen: 0.015
  },
  'sdxl': {
    provider: 'replicate',
    model: 'stability-ai/stable-diffusion-xl-base-1.0',
    maxResolution: 1024,
    defaultResolution: { width: 1024, height: 1024 },
    supportsImg2Img: true,
    supportsControlNet: true,
    costPerGen: 0.008
  },
  'sdxl-lightning': {
    provider: 'replicate',
    model: 'bytedance/sdxl-lightning-4step',
    maxResolution: 1024,
    defaultResolution: { width: 1024, height: 1024 },
    supportsImg2Img: true,
    costPerGen: 0.002
  },
  'dalle-3': {
    provider: 'openai',
    model: 'dall-e-3',
    maxResolution: 1024,
    defaultResolution: { width: 1024, height: 1024 },
    supportsImg2Img: false,
    costPerGen: 0.04
  },
  'leonardo': {
    provider: 'leonardo',
    model: '6b645e3a-d64f-4341-a6d8-7a3690fbf042',
    maxResolution: 1024,
    defaultResolution: { width: 1024, height: 1024 },
    supportsImg2Img: true,
    costPerGen: 0.015
  },
  'realistic-vision': {
    provider: 'replicate',
    model: 'lucataco/realistic-vision-v5.1',
    maxResolution: 768,
    defaultResolution: { width: 512, height: 768 },
    supportsImg2Img: true,
    costPerGen: 0.005
  },
  'anime': {
    provider: 'replicate',
    model: 'cjwbw/anything-v5',
    maxResolution: 768,
    defaultResolution: { width: 512, height: 768 },
    supportsImg2Img: true,
    costPerGen: 0.005
  }
};

// ── TEXT TO IMAGE ─────────────────────────────────────────────────
async function generateTextToImage({ prompt, negativePrompt = '', model = 'flux-dev', width, height, seed, cfg = 7.5, steps = 30, style = null }) {
  const modelConfig = MODELS[model] || MODELS['flux-dev'];
  const finalWidth = width || modelConfig.defaultResolution.width;
  const finalHeight = height || modelConfig.defaultResolution.height;

  switch (modelConfig.provider) {
    case 'replicate':
      return await generateReplicate({ model: modelConfig.model, prompt, negativePrompt, width: finalWidth, height: finalHeight, seed, cfg, steps });
    case 'openai':
      return await generateOpenAI({ prompt, width: finalWidth, height: finalHeight, style });
    case 'leonardo':
      return await generateLeonardo({ prompt, negativePrompt, width: finalWidth, height: finalHeight, seed, cfg });
    default:
      throw new Error(`Unknown provider: ${modelConfig.provider}`);
  }
}

// ── IMAGE TO IMAGE ────────────────────────────────────────────────
async function generateImageToImage({ prompt, imageUrl, strength = 0.7, model = 'sdxl', width, height }) {
  const modelConfig = MODELS[model];
  if (!modelConfig || !modelConfig.supportsImg2Img) {
    throw new Error(`Model ${model} does not support image-to-image`);
  }

  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) throw new Error('REPLICATE_API_TOKEN not set');

  const input = {
    prompt,
    image: imageUrl,
    strength,
    width: width || modelConfig.defaultResolution.width,
    height: height || modelConfig.defaultResolution.height,
    num_outputs: 1
  };

  return await callReplicate(modelConfig.model, input);
}

// ── INPAINTING ────────────────────────────────────────────────────
async function generateInpainting({ prompt, imageUrl, maskUrl, model = 'sdxl' }) {
  const modelConfig = MODELS[model];
  const apiToken = process.env.REPLICATE_API_TOKEN;
  
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`
    },
    body: JSON.stringify({
      version: '95b7223104132402a9ae91ccddd9a7825d7d1868aee3f4f2b9c17b99b3b2967f',
      input: {
        prompt,
        image: imageUrl,
        mask: maskUrl,
        num_outputs: 1
      }
    })
  });

  const prediction = await res.json();
  if (!res.ok) throw new Error(prediction.detail || 'Inpainting failed');
  
  return await pollReplicateResult(prediction.id, apiToken);
}

// ── UPSCALING ─────────────────────────────────────────────────────
async function upscaleImage({ imageUrl, scale = 2, model = 'real-esrgan' }) {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  
  const upscaleModels = {
    'real-esrgan': 'nightmareai/real-esrgan:42fed1c4974146d62d3f0f09410b32b755ee97281c7911f4094eb5b0f78b8f50',
    'esrgan': 'xinntao/realesrgan:fb92a952c12c76c1a535a6dc94e8c4d4f11ff77cad3a0c7f1d1bdda98ad0d63e'
  };

  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`
    },
    body: JSON.stringify({
      version: upscaleModels[model] || upscaleModels['real-esrgan'],
      input: {
        image: imageUrl,
        scale
      }
    })
  });

  const prediction = await res.json();
  if (!res.ok) throw new Error(prediction.detail || 'Upscaling failed');
  
  return await pollReplicateResult(prediction.id, apiToken);
}

// ── STYLE TRANSFER ───────────────────────────────────────────────
async function styleTransfer({ contentImage, styleImage, styleStrength = 0.8 }) {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`
    },
    body: JSON.stringify({
      version: 'a00d0e9bffb1aa5e0e17b5b7463b5c2e2b5d2d3e2e7f8a9b0c1d2e3f4a5b6c7d',
      input: {
        content_image: contentImage,
        style_image: styleImage,
        style_strength: styleStrength,
        num_outputs: 1
      }
    })
  });

  const prediction = await res.json();
  if (!res.ok) throw new Error(prediction.detail || 'Style transfer failed');
  
  return await pollReplicateResult(prediction.id, apiToken);
}

// ── CONTROLNET (Pose/Structure) ───────────────────────────────────
async function generateControlNet({ prompt, controlImage, controlType = 'pose', model = 'sdxl' }) {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  
  const controlModel = controlType === 'pose' 
    ? 'thomasmol/controlnet-sdxl-openpose'
    : 'thomasmol/controlnet-sdxl-depth';

  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`
    },
    body: JSON.stringify({
      version: 'd55b9f2d4e703685c28f1b68dcff3b7be01e8f1f9f0a7e2e9b2b6c8a4f2e5d8',
      input: {
        prompt,
        image: controlImage,
        structure: controlType,
        num_outputs: 1
      }
    })
  });

  const prediction = await res.json();
  if (!res.ok) throw new Error(prediction.detail || 'ControlNet failed');
  
  return await pollReplicateResult(prediction.id, apiToken);
}

// ── PROVIDER HELPERS ──────────────────────────────────────────────
async function generateReplicate({ model, prompt, negativePrompt, width, height, seed, cfg = 7.5, steps = 30 }) {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) throw new Error('REPLICATE_API_TOKEN not set');

  const input = {
    prompt,
    width,
    height,
    num_outputs: 1,
    guidance_scale: cfg,
    num_inference_steps: steps
  };

  if (negativePrompt) input.negative_prompt = negativePrompt;
  if (seed) input.seed = seed;

  return await callReplicate(model, input);
}

async function callReplicate(model, input) {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  
  const res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`
    },
    body: JSON.stringify({ input })
  });

  const prediction = await res.json();
  if (!res.ok) throw new Error(prediction.detail || 'Replicate API error');

  return await pollReplicateResult(prediction.id, apiToken);
}

async function pollReplicateResult(predictionId, apiToken) {
  // Poll for result with progressive wait
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, i < 10 ? 1000 : 2000));
    
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });
    
    const result = await poll.json();
    
    if (result.status === 'succeeded') {
      return {
        imageUrl: Array.isArray(result.output) ? result.output[0] : result.output,
        seed: result.input?.seed,
        model: result.model,
        generationTime: result.metrics?.predict_time
      };
    }
    if (result.status === 'failed') throw new Error(`Generation failed: ${result.error}`);
    if (result.status === 'canceled') throw new Error('Generation was canceled');
  }
  
  throw new Error('Generation timed out');
}

async function generateOpenAI({ prompt, width = 1024, height = 1024, style = 'vivid' }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const sizes = { '1024x1024': '1024x1024', '1792x1024': '1792x1024', '1024x1792': '1024x1792' };
  const size = sizes[`${width}x${height}`] || '1024x1024';

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      size,
      style,
      n: 1,
      response_format: 'url'
    })
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error?.message || 'DALL-E error');

  return {
    imageUrl: result.data[0].url,
    revisedPrompt: result.data[0].revised_prompt
  };
}

async function generateLeonardo({ prompt, negativePrompt, width, height, seed, cfg }) {
  const apiKey = process.env.LEONARDO_API_KEY;
  if (!apiKey) throw new Error('LEONARDO_API_KEY not set');

  // Create generation
  const res = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: negativePrompt,
      width,
      height,
      seed,
      guidance_scale: cfg,
      modelId: '6b645e3a-d64f-4341-a6d8-7a3690fbf042'
    })
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Leonardo API error');

  // Poll for result
  const generationId = result.sdGenerationJob.generationId;
  
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    
    const poll = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    const pollResult = await poll.json();
    const generations = pollResult.generations_by_pk?.generated_images;
    
    if (generations && generations.length > 0) {
      return {
        imageUrl: generations[0].url,
        seed: generations[0].seed
      };
    }
  }
  
  throw new Error('Leonardo generation timed out');
}

// ── EXPORTS ───────────────────────────────────────────────────────
module.exports = {
  MODELS,
  generateTextToImage,
  generateImageToImage,
  generateInpainting,
  upscaleImage,
  styleTransfer,
  generateControlNet
};

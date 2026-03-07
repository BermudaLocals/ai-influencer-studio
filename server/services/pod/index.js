const axios = require('axios');
const FormData = require('form-data');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PODService {
  constructor() {
    this.stabilityApiKey = process.env.STABILITY_API_KEY;
    this.printfulApiKey = process.env.PRINTFUL_API_KEY;
    this.printifyApiKey = process.env.PRINTIFY_API_KEY;
  }

  // Generate image using Stability AI
  async generateImage(prompt, style = 'photographic') {
    try {
      const response = await axios.post(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
        {
          text_prompts: [
            {
              text: prompt,
              weight: 1
            }
          ],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          samples: 1,
          steps: 30,
          style_preset: style
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.stabilityApiKey}`
          }
        }
      );

      // Convert base64 to URL (in production, upload to S3/CDN)
      const imageBase64 = response.data.artifacts[0].base64;
      const imageUrl = `data:image/png;base64,${imageBase64}`;
      
      return imageUrl;
    } catch (error) {
      console.error('Stability AI error:', error.response?.data || error.message);
      throw new Error('Failed to generate image');
    }
  }

  // Create products on Printful
  async createProductsOnPrintful(imageUrl, products, title) {
    try {
      const createdProducts = [];

      // Printful product variant IDs
      const productVariants = {
        tshirt: 71,      // Bella + Canvas 3001 Unisex T-Shirt
        hoodie: 146,     // Gildan 18500 Unisex Hoodie
        mug: 19,         // White Glossy Mug
        poster: 1,       // Poster
        phonecase: 1042, // iPhone Case
        totebag: 307     // Tote Bag
      };

      for (const product of products) {
        const variantId = productVariants[product];
        if (!variantId) continue;

        const productData = {
          sync_product: {
            name: title,
            thumbnail: imageUrl
          },
          sync_variants: [
            {
              variant_id: variantId,
              files: [
                {
                  url: imageUrl
                }
              ]
            }
          ]
        };

        const response = await axios.post(
          'https://api.printful.com/store/products',
          productData,
          {
            headers: {
              'Authorization': `Bearer ${this.printfulApiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        createdProducts.push({
          type: product,
          printfulId: response.data.result.id,
          url: `https://www.printful.com/dashboard/products/${response.data.result.id}`
        });
      }

      return createdProducts;
    } catch (error) {
      console.error('Printful error:', error.response?.data || error.message);
      throw new Error('Failed to create products on Printful');
    }
  }

  // Create products on Printify
  async createProductsOnPrintify(imageUrl, products, title) {
    try {
      const createdProducts = [];

      // Printify blueprint IDs
      const blueprintIds = {
        tshirt: 5,
        hoodie: 6,
        mug: 26,
        poster: 2,
        phonecase: 380,
        totebag: 71
      };

      for (const product of products) {
        const blueprintId = blueprintIds[product];
        if (!blueprintId) continue;

        const productData = {
          title: title,
          description: `Custom ${product} design`,
          blueprint_id: blueprintId,
          print_provider_id: 1,
          variants: [
            {
              id: 1,
              price: 2000, // $20.00
              is_enabled: true
            }
          ],
          print_areas: [
            {
              variant_ids: [1],
              placeholders: [
                {
                  position: 'front',
                  images: [
                    {
                      id: imageUrl,
                      x: 0.5,
                      y: 0.5,
                      scale: 1,
                      angle: 0
                    }
                  ]
                }
              ]
            }
          ]
        };

        const response = await axios.post(
          'https://api.printify.com/v1/shops/{shop_id}/products.json',
          productData,
          {
            headers: {
              'Authorization': `Bearer ${this.printifyApiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        createdProducts.push({
          type: product,
          printifyId: response.data.id,
          url: `https://printify.com/app/products/${response.data.id}`
        });
      }

      return createdProducts;
    } catch (error) {
      console.error('Printify error:', error.response?.data || error.message);
      throw new Error('Failed to create products on Printify');
    }
  }

  // Main method to create products
  async createProducts({ userId, imageUrl, products, title, platform, pricing }) {
    try {
      let createdProducts = [];

      // Create products on selected platform
      if (platform === 'printful') {
        createdProducts = await this.createProductsOnPrintful(imageUrl, products, title);
      } else if (platform === 'printify') {
        createdProducts = await this.createProductsOnPrintify(imageUrl, products, title);
      } else {
        // For other platforms, create mock data
        createdProducts = products.map(product => ({
          type: product,
          platform: platform,
          url: `https://${platform}.com/products/mock-${Date.now()}`
        }));
      }

      // Save to database
      const savedProduct = await prisma.podProduct.create({
        data: {
          userId,
          title,
          imageUrl,
          platform,
          pricing,
          products: createdProducts,
          status: 'published'
        }
      });

      return {
        productId: savedProduct.id,
        products: createdProducts,
        message: `Successfully created ${createdProducts.length} products on ${platform}`
      };
    } catch (error) {
      console.error('Create products error:', error);
      throw error;
    }
  }

  // Create WordPress site
  async createWordPressSite({ userId, name, type, theme, domain, description }) {
    try {
      // In production, integrate with WordPress.com API or hosting provider
      // For now, create mock site data
      
      const site = await prisma.wordPressSite.create({
        data: {
          userId,
          name,
          type,
          theme,
          domain,
          description,
          url: `https://${domain}`,
          status: 'active'
        }
      });

      return {
        siteId: site.id,
        url: `https://${domain}`,
        adminUrl: `https://${domain}/wp-admin`,
        message: `WordPress site created successfully! Visit ${domain}`
      };
    } catch (error) {
      console.error('WordPress creation error:', error);
      throw new Error('Failed to create WordPress site');
    }
  }

  // Get user's POD products
  async getUserProducts(userId) {
    try {
      const products = await prisma.podProduct.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      return products;
    } catch (error) {
      console.error('Get products error:', error);
      throw error;
    }
  }

  // Get user's WordPress sites
  async getUserWordPressSites(userId) {
    try {
      const sites = await prisma.wordPressSite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      return sites;
    } catch (error) {
      console.error('Get sites error:', error);
      throw error;
    }
  }
}

module.exports = new PODService();

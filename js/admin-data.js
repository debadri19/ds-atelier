(function () {
  var STORAGE_KEY = "ds-atelier-admin-demo";
  var CATEGORY_SEED = [
    { id: "anime", name: "Anime", slug: "anime", description: "Bold graphic art for tees and oversized blanks.", image: "assets/images/categories/cat-tee.svg", productCount: 4, displayOrder: 1, status: "active", updated: "2026-03-12" },
    { id: "gaming", name: "Gaming", slug: "gaming", description: "Arcade marks, jerseys and merch drops.", image: "assets/images/categories/cat-jersey.svg", productCount: 3, displayOrder: 2, status: "active", updated: "2026-03-11" },
    { id: "streetwear", name: "Streetwear", slug: "streetwear", description: "Heavy block graphics for oversized cotton.", image: "assets/images/categories/cat-oversize.svg", productCount: 5, displayOrder: 3, status: "active", updated: "2026-03-10" },
    { id: "typography", name: "Typography", slug: "typography", description: "Large-letter layouts for hoodies and polos.", image: "assets/images/categories/cat-hoodie.svg", productCount: 2, displayOrder: 4, status: "active", updated: "2026-03-08" },
    { id: "cyberpunk", name: "Cyberpunk", slug: "cyberpunk", description: "High-contrast grid and signal artwork.", image: "assets/images/categories/cat-sub.svg", productCount: 2, displayOrder: 5, status: "active", updated: "2026-03-07" },
    { id: "minimal", name: "Minimal", slug: "minimal", description: "Quiet studio marks for everyday apparel.", image: "assets/images/categories/cat-polo.svg", productCount: 3, displayOrder: 6, status: "active", updated: "2026-03-06" },
    { id: "studio", name: "Studio", slug: "studio", description: "In-house press graphics and brand runs.", image: "assets/images/hero/print-studio.svg", productCount: 2, displayOrder: 7, status: "active", updated: "2026-03-04" },
    { id: "custom-art", name: "Custom Art", slug: "custom-art", description: "Ink-led artwork for gifts and short runs.", image: "assets/images/categories/cat-gift.svg", productCount: 1, displayOrder: 8, status: "inactive", updated: "2026-02-28" }
  ];
  var PRODUCT_SEED = [
    { id: "anime-graphic-tee", name: "Anime Graphic T-Shirt", slug: "anime-graphic-tee", sku: "DSA-AGT-001", categoryId: "anime", description: "Studio graphic tee cut for everyday wear. Printed in-house after you choose print type, colour and artwork.", shortDescription: "Bold anime graphic on a heavyweight cotton tee.", productType: "T-Shirt", printType: "DTF", regularPrice: 1299, salePrice: 899, status: "active", featured: true, image: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg", createdAt: "2026-02-18", updatedAt: "2026-03-12" },
    { id: "oversized-graphic-tee", name: "Oversized Graphic Tee", slug: "oversized-graphic-tee", sku: "DSA-OGT-001", categoryId: "streetwear", description: "Relaxed oversized tee cut for layering. Printed in-house after you choose print type, color and artwork.", shortDescription: "Heavyweight oversized blank, printed in-house.", productType: "Oversized T-Shirt", printType: "DTF", regularPrice: 1199, salePrice: 799, status: "active", featured: true, image: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg", createdAt: "2026-02-20", updatedAt: "2026-03-12" },
    { id: "motivational-hoodie", name: "Motivational Hoodie", slug: "motivational-hoodie", sku: "DSA-MHD-001", categoryId: "typography", description: "Relaxed hoodie blank for studio typography and graphic prints. Printed in-house after configuration.", shortDescription: "Heavyweight hoodie for large typography prints.", productType: "Hoodie", printType: "DTF", regularPrice: 1999, salePrice: 1499, status: "draft", featured: false, image: "assets/images/products/motivational-hoodie/mockups/default/charcoal/product-hoodie.svg", createdAt: "2026-02-22", updatedAt: "2026-03-11" },
    { id: "minimal-hoodie", name: "Minimal Hoodie", slug: "minimal-hoodie", sku: "DSA-MNH-001", categoryId: "minimal", description: "Minimal hoodie cut for everyday wear. Printed in-house after you choose print type, colour and artwork.", shortDescription: "Clean hoodie blank for studio prints.", productType: "Hoodie", printType: "DTF", regularPrice: 1999, salePrice: 1499, status: "active", featured: false, image: "assets/images/products/motivational-hoodie/mockups/default/charcoal/product-hoodie.svg", createdAt: "2026-02-22", updatedAt: "2026-03-10" },
    { id: "custom-sports-jersey", name: "Custom Sports Jersey", slug: "custom-sports-jersey", sku: "DSA-CSJ-001", categoryId: "gaming", description: "Sports jersey made to order. Printed in-house after you choose print type, colour and artwork.", shortDescription: "Team jersey blank for names, numbers and crests.", productType: "Jersey", printType: "Sublimation", regularPrice: 1799, salePrice: 1299, status: "active", featured: true, image: "assets/images/products/custom-sports-jersey/mockups/default/red/product-jersey.svg", createdAt: "2026-02-24", updatedAt: "2026-03-10" },
    { id: "polo-tshirt", name: "Polo T-Shirt", slug: "polo-tshirt", sku: "DSA-PLO-001", categoryId: "studio", description: "Studio polo blank for crests and marks. Printed in-house after configuration.", shortDescription: "Cotton polo for logos and small-run branding.", productType: "Polo", printType: "DTF", regularPrice: 1399, salePrice: 999, status: "active", featured: false, image: "assets/images/products/polo-tshirt/mockups/default/navy/product-polo.svg", createdAt: "2026-02-25", updatedAt: "2026-03-09" },
    { id: "sublimation-tshirt", name: "Sublimation T-Shirt", slug: "sublimation-tshirt", sku: "DSA-SUB-001", categoryId: "cyberpunk", description: "Sublimation-ready blank for edge-to-edge colour. Printed in-house after you choose colour and artwork.", shortDescription: "Polyester tee for all-over dye-infused colour.", productType: "T-Shirt", printType: "Sublimation", regularPrice: 1499, salePrice: 999, status: "active", featured: true, image: "assets/images/products/sublimation-tshirt/mockups/default/white/product-sub.svg", createdAt: "2026-02-26", updatedAt: "2026-03-09" },
    { id: "dtf-print", name: "DTF Print", slug: "dtf-print", sku: "DSA-DTF-001", categoryId: "studio", description: "DTF transfer sheet for studio press work. Artwork is reviewed before print.", shortDescription: "Ready-to-press DTF transfer.", productType: "Accessories", printType: "DTF", regularPrice: 499, salePrice: 349, status: "active", featured: false, image: "assets/images/products/dtf-print/mockups/default/white/product-dtf.svg", createdAt: "2026-02-27", updatedAt: "2026-03-08" },
    { id: "custom-tote-bag", name: "Custom Tote Bag", slug: "custom-tote-bag", sku: "DSA-TOT-001", categoryId: "custom-art", description: "Studio tote blank for custom print. Printed in-house after configuration.", shortDescription: "Canvas tote for marks, art and gifting.", productType: "Tote Bag", printType: "DTF", regularPrice: 799, salePrice: 499, status: "active", featured: true, image: "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg", createdAt: "2026-02-28", updatedAt: "2026-03-08" },
    { id: "corporate-tshirt", name: "Corporate T-Shirt", slug: "corporate-tshirt", sku: "DSA-CRP-001", categoryId: "studio", description: "Corporate tee made to order. Printed in-house after you choose print type, colour and artwork.", shortDescription: "Uniform tee for teams and brands.", productType: "T-Shirt", printType: "DTF", regularPrice: 1199, salePrice: 849, status: "active", featured: false, image: "assets/images/products/corporate-tshirt/mockups/default/white/product-corporate.svg", createdAt: "2026-03-01", updatedAt: "2026-03-07" },
    { id: "kids-tshirt", name: "Kids T-Shirt", slug: "kids-tshirt", sku: "DSA-KID-001", categoryId: "anime", description: "Kids tee printed in-house after configuration.", shortDescription: "Kids cotton tee for small-run prints.", productType: "T-Shirt", printType: "DTF", regularPrice: 899, salePrice: 599, status: "active", featured: false, image: "assets/images/products/kids-tshirt/mockups/default/navy/product-kids.svg", createdAt: "2026-03-02", updatedAt: "2026-03-07" },
    { id: "caps", name: "Caps", slug: "caps", sku: "DSA-CAP-001", categoryId: "custom-art", description: "Studio cap blank for DTF marks. Printed in-house after configuration.", shortDescription: "Custom cap for marks and short runs.", productType: "Accessories", printType: "DTF", regularPrice: 699, salePrice: 449, status: "active", featured: false, image: "assets/images/products/caps/mockups/default/black/product-cap.svg", createdAt: "2026-03-03", updatedAt: "2026-03-06" },
    { id: "sublimation-cushion", name: "Sublimation Cushion", slug: "sublimation-cushion", sku: "DSA-CSH-001", categoryId: "cyberpunk", description: "Sublimation cushion blank for gifts and short runs. Printed in-house after configuration.", shortDescription: "Cushion cover for dye-infused artwork.", productType: "Accessories", printType: "Sublimation", regularPrice: 999, salePrice: 699, status: "draft", featured: false, image: "assets/images/products/sublimation-cushion/mockups/default/white/product-cushion.svg", createdAt: "2026-03-04", updatedAt: "2026-03-05" }
  ];
  var SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "One Size"];
  var COLOR_PRESETS = [
    { name: "Black", hex: "#111111" },
    { name: "White", hex: "#F4F4F4" },
    { name: "Navy", hex: "#1B2A4A" },
    { name: "Red", hex: "#C81E1E" },
    { name: "Cream", hex: "#E8D9C0" },
    { name: "Charcoal", hex: "#3A3A3A" }
  ];
  var VARIANT_DEMOS = {
    "anime-graphic-tee": {
      options: {
        colors: [
          { id: "agt-black", name: "Black", hex: "#111111", image: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg" },
          { id: "agt-white", name: "White", hex: "#F4F4F4" },
          { id: "agt-navy", name: "Navy", hex: "#1B2A4A" }
        ],
        sizes: [
          { id: "s", label: "S" },
          { id: "m", label: "M" },
          { id: "l", label: "L" },
          { id: "xl", label: "XL" }
        ]
      },
      variants: [
        { id: "agt-black-s", colorId: "agt-black", sizeId: "s", sku: "DSA-AGT-001-BLK-S", regularPrice: null, salePrice: null, status: "active" },
        { id: "agt-black-m", colorId: "agt-black", sizeId: "m", sku: "DSA-AGT-001-BLK-M", regularPrice: null, salePrice: null, status: "active" },
        { id: "agt-black-l", colorId: "agt-black", sizeId: "l", sku: "DSA-AGT-001-BLK-L", regularPrice: null, salePrice: null, status: "active" },
        { id: "agt-black-xl", colorId: "agt-black", sizeId: "xl", sku: "DSA-AGT-001-BLK-XL", regularPrice: null, salePrice: 849, status: "active" },
        { id: "agt-white-s", colorId: "agt-white", sizeId: "s", sku: "DSA-AGT-001-WHT-S", regularPrice: null, salePrice: null, status: "active" },
        { id: "agt-white-m", colorId: "agt-white", sizeId: "m", sku: "DSA-AGT-001-WHT-M", regularPrice: null, salePrice: null, status: "active" },
        { id: "agt-white-l", colorId: "agt-white", sizeId: "l", sku: "DSA-AGT-001-WHT-L", regularPrice: null, salePrice: null, status: "inactive" },
        { id: "agt-navy-m", colorId: "agt-navy", sizeId: "m", sku: "DSA-AGT-001-NVY-M", regularPrice: 1399, salePrice: 999, status: "active" },
        { id: "agt-navy-l", colorId: "agt-navy", sizeId: "l", sku: "DSA-AGT-001-NVY-L", regularPrice: 1399, salePrice: null, status: "active" }
      ]
    },
    "oversized-graphic-tee": {
      options: {
        colors: [
          { id: "ogt-cream", name: "Cream", hex: "#E8D9C0", image: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg" },
          { id: "ogt-black", name: "Black", hex: "#111111" }
        ],
        sizes: [
          { id: "m", label: "M" },
          { id: "l", label: "L" },
          { id: "xl", label: "XL" },
          { id: "xxl", label: "XXL" }
        ]
      },
      variants: [
        { id: "ogt-cream-m", colorId: "ogt-cream", sizeId: "m", sku: "DSA-OGT-001-CRM-M", regularPrice: null, salePrice: null, status: "active" },
        { id: "ogt-cream-l", colorId: "ogt-cream", sizeId: "l", sku: "DSA-OGT-001-CRM-L", regularPrice: null, salePrice: null, status: "active" },
        { id: "ogt-cream-xl", colorId: "ogt-cream", sizeId: "xl", sku: "DSA-OGT-001-CRM-XL", regularPrice: null, salePrice: null, status: "active" },
        { id: "ogt-cream-xxl", colorId: "ogt-cream", sizeId: "xxl", sku: "DSA-OGT-001-CRM-XXL", regularPrice: 1299, salePrice: 899, status: "active" },
        { id: "ogt-black-l", colorId: "ogt-black", sizeId: "l", sku: "DSA-OGT-001-BLK-L", regularPrice: null, salePrice: null, status: "active" },
        { id: "ogt-black-xl", colorId: "ogt-black", sizeId: "xl", sku: "DSA-OGT-001-BLK-XL", regularPrice: null, salePrice: null, status: "inactive" }
      ]
    },
    "custom-sports-jersey": {
      options: {
        colors: [
          { id: "csj-red", name: "Red", hex: "#C81E1E", image: "assets/images/products/custom-sports-jersey/mockups/default/red/product-jersey.svg" },
          { id: "csj-black", name: "Black", hex: "#111111" }
        ],
        sizes: [
          { id: "xs", label: "XS" },
          { id: "s", label: "S" },
          { id: "m", label: "M" },
          { id: "l", label: "L" }
        ]
      },
      variants: [
        { id: "csj-red-s", colorId: "csj-red", sizeId: "s", sku: "DSA-CSJ-001-RED-S", regularPrice: null, salePrice: null, status: "active" },
        { id: "csj-red-m", colorId: "csj-red", sizeId: "m", sku: "DSA-CSJ-001-RED-M", regularPrice: null, salePrice: null, status: "active" },
        { id: "csj-red-l", colorId: "csj-red", sizeId: "l", sku: "DSA-CSJ-001-RED-L", regularPrice: null, salePrice: null, status: "active" },
        { id: "csj-black-m", colorId: "csj-black", sizeId: "m", sku: "DSA-CSJ-001-BLK-M", regularPrice: null, salePrice: null, status: "active" }
      ]
    },
    "custom-tote-bag": {
      options: {
        colors: [
          { id: "tot-cream", name: "Cream", hex: "#E8D9C0", image: "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg" }
        ],
        sizes: [
          { id: "one-size", label: "One Size" }
        ]
      },
      variants: [
        { id: "tot-cream-one", colorId: "tot-cream", sizeId: "one-size", sku: "DSA-TOT-001-CRM-OS", regularPrice: null, salePrice: null, status: "active" }
      ]
    },
    "caps": {
      options: {
        colors: [
          { id: "cap-black", name: "Black", hex: "#111111", image: "assets/images/products/caps/mockups/default/black/product-cap.svg" },
          { id: "cap-navy", name: "Navy", hex: "#1B2A4A" }
        ],
        sizes: [
          { id: "one-size", label: "One Size" }
        ]
      },
      variants: [
        { id: "cap-black-one", colorId: "cap-black", sizeId: "one-size", sku: "DSA-CAP-001-BLK-OS", regularPrice: null, salePrice: null, status: "active" },
        { id: "cap-navy-one", colorId: "cap-navy", sizeId: "one-size", sku: "DSA-CAP-001-NVY-OS", regularPrice: 749, salePrice: 499, status: "active" }
      ]
    }
  };
  var ARTWORK_SEED = [
    { id: "anime-tiger", name: "Anime Tiger", slug: "anime-tiger", category: "anime", description: "Bold tiger graphic cut for dark and light tees. High-contrast linework for DTF.", thumbnail: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg", preview: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg", tags: ["anime", "gaming"], availableProducts: ["anime-graphic-tee", "oversized-graphic-tee"], status: "active", createdAt: "2026-02-18", updatedAt: "2026-03-12" },
    { id: "neon-ronin", name: "Neon Ronin", slug: "neon-ronin", category: "anime", description: "Night-city ronin mark with sharp edges and a studio-ready silhouette.", thumbnail: "assets/images/categories/cat-tee.svg", preview: "assets/images/categories/cat-tee.svg", tags: ["anime", "cyberpunk"], availableProducts: ["oversized-graphic-tee", "dtf-print"], status: "active", createdAt: "2026-02-19", updatedAt: "2026-03-11" },
    { id: "pixel-quest", name: "Pixel Quest", slug: "pixel-quest", category: "gaming", description: "Retro quest badge for jerseys, tees and short-run merch drops.", thumbnail: "assets/images/products/custom-sports-jersey/mockups/default/red/product-jersey.svg", preview: "assets/images/products/custom-sports-jersey/mockups/default/red/product-jersey.svg", tags: ["gaming", "streetwear"], availableProducts: ["custom-sports-jersey", "oversized-graphic-tee"], status: "active", createdAt: "2026-02-20", updatedAt: "2026-03-11" },
    { id: "arcade-pulse", name: "Arcade Pulse", slug: "arcade-pulse", category: "gaming", description: "Arcade-type energy mark. Built for oversized blanks and DTF transfers.", thumbnail: "assets/images/categories/cat-oversize.svg", preview: "assets/images/categories/cat-oversize.svg", tags: ["gaming", "typography"], availableProducts: ["oversized-graphic-tee", "dtf-print"], status: "active", createdAt: "2026-02-21", updatedAt: "2026-03-10" },
    { id: "block-mark", name: "Block Mark", slug: "block-mark", category: "streetwear", description: "Heavy block graphic for oversized cotton and hoodie drops.", thumbnail: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg", preview: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg", tags: ["streetwear", "minimal"], availableProducts: ["oversized-graphic-tee", "minimal-hoodie"], status: "active", createdAt: "2026-02-22", updatedAt: "2026-03-10" },
    { id: "city-drop", name: "City Drop", slug: "city-drop", category: "streetwear", description: "Urban drop graphic with quiet type and a wide print area.", thumbnail: "assets/images/products/motivational-hoodie/mockups/default/charcoal/product-hoodie.svg", preview: "assets/images/products/motivational-hoodie/mockups/default/charcoal/product-hoodie.svg", tags: ["streetwear", "typography"], availableProducts: ["motivational-hoodie", "caps"], status: "active", createdAt: "2026-02-23", updatedAt: "2026-03-09" },
    { id: "bold-type", name: "Bold Type", slug: "bold-type", category: "typography", description: "Large-letter typography for hoodies and statement tees.", thumbnail: "assets/images/categories/cat-hoodie.svg", preview: "assets/images/categories/cat-hoodie.svg", tags: ["typography", "streetwear"], availableProducts: ["motivational-hoodie", "oversized-graphic-tee"], status: "active", createdAt: "2026-02-24", updatedAt: "2026-03-09" },
    { id: "studio-word", name: "Studio Word", slug: "studio-word", category: "typography", description: "Clean wordmark layout for polos, uniforms and small-run branding.", thumbnail: "assets/images/products/polo-tshirt/mockups/default/navy/product-polo.svg", preview: "assets/images/products/polo-tshirt/mockups/default/navy/product-polo.svg", tags: ["typography", "studio"], availableProducts: ["polo-tshirt", "corporate-tshirt"], status: "active", createdAt: "2026-02-25", updatedAt: "2026-03-08" },
    { id: "night-grid", name: "Night Grid", slug: "night-grid", category: "cyberpunk", description: "Grid-and-signal artwork for all-over colour and dark-garment DTF.", thumbnail: "assets/images/products/sublimation-tshirt/mockups/default/white/product-sub.svg", preview: "assets/images/products/sublimation-tshirt/mockups/default/white/product-sub.svg", tags: ["cyberpunk", "gaming"], availableProducts: ["sublimation-tshirt", "dtf-print"], status: "active", createdAt: "2026-02-26", updatedAt: "2026-03-08" },
    { id: "signal-run", name: "Signal Run", slug: "signal-run", category: "cyberpunk", description: "High-contrast signal graphic. Ready for transfer film and tees.", thumbnail: "assets/images/products/dtf-print/mockups/default/white/product-dtf.svg", preview: "assets/images/products/dtf-print/mockups/default/white/product-dtf.svg", tags: ["cyberpunk", "studio"], availableProducts: ["dtf-print", "anime-graphic-tee"], status: "active", createdAt: "2026-02-27", updatedAt: "2026-03-07" },
    { id: "quiet-line", name: "Quiet Line", slug: "quiet-line", category: "minimal", description: "Single-line studio mark. Quiet enough for everyday hoodies.", thumbnail: "assets/images/products/corporate-tshirt/mockups/default/white/product-corporate.svg", preview: "assets/images/products/corporate-tshirt/mockups/default/white/product-corporate.svg", tags: ["minimal", "studio"], availableProducts: ["minimal-hoodie", "corporate-tshirt"], status: "active", createdAt: "2026-02-28", updatedAt: "2026-03-07" },
    { id: "soft-mark", name: "Soft Mark", slug: "soft-mark", category: "minimal", description: "Reduced crest for gifts, totes and clean apparel runs.", thumbnail: "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg", preview: "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg", tags: ["minimal", "custom-art"], availableProducts: ["custom-tote-bag", "caps"], status: "active", createdAt: "2026-03-01", updatedAt: "2026-03-06" },
    { id: "press-room", name: "Press Room", slug: "press-room", category: "studio", description: "In-house press graphic for DTF sheets and studio merch.", thumbnail: "assets/images/services/dtf.svg", preview: "assets/images/services/dtf.svg", tags: ["studio", "typography"], availableProducts: ["dtf-print", "polo-tshirt"], status: "active", createdAt: "2026-03-02", updatedAt: "2026-03-06" },
    { id: "atelier-crest", name: "Atelier Crest", slug: "atelier-crest", category: "studio", description: "Studio crest layout for uniforms, polos and brand runs.", thumbnail: "assets/images/hero/print-studio.svg", preview: "assets/images/hero/print-studio.svg", tags: ["studio", "minimal"], availableProducts: ["polo-tshirt", "corporate-tshirt"], status: "active", createdAt: "2026-03-03", updatedAt: "2026-03-05" },
    { id: "hand-ink", name: "Hand Ink", slug: "hand-ink", category: "custom-art", description: "Ink-led artwork for totes, gifts and short custom runs.", thumbnail: "assets/images/categories/cat-gift.svg", preview: "assets/images/categories/cat-gift.svg", tags: ["custom-art", "studio"], availableProducts: ["custom-tote-bag", "sublimation-cushion"], status: "active", createdAt: "2026-03-04", updatedAt: "2026-03-05" },
    { id: "origin-sketch", name: "Origin Sketch", slug: "origin-sketch", category: "custom-art", description: "Sketch-first artwork for kids tees, gifts and one-off prints.", thumbnail: "assets/images/products/kids-tshirt/mockups/default/navy/product-kids.svg", preview: "assets/images/products/kids-tshirt/mockups/default/navy/product-kids.svg", tags: ["custom-art", "anime"], availableProducts: ["kids-tshirt", "custom-tote-bag"], status: "active", createdAt: "2026-03-05", updatedAt: "2026-03-04" }
  ];
  var ARTWORK_CATEGORIES = [
    { id: "anime", label: "Anime" },
    { id: "gaming", label: "Gaming" },
    { id: "streetwear", label: "Streetwear" },
    { id: "typography", label: "Typography" },
    { id: "cyberpunk", label: "Cyberpunk" },
    { id: "minimal", label: "Minimal" },
    { id: "studio", label: "Studio" },
    { id: "custom-art", label: "Custom Art" }
  ];
  var MEDIA_TYPES = [
    { id: "product-image", label: "Product Image" },
    { id: "product-mockup", label: "Product Mockup" },
    { id: "artwork-reference", label: "Artwork Reference" },
    { id: "front-design", label: "Front Design" },
    { id: "back-design", label: "Back Design" },
    { id: "other", label: "Other" }
  ];
  var KNOWN_ASSETS = [
    "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg",
    "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg",
    "assets/images/products/motivational-hoodie/mockups/default/charcoal/product-hoodie.svg",
    "assets/images/products/custom-sports-jersey/mockups/default/red/product-jersey.svg",
    "assets/images/products/polo-tshirt/mockups/default/navy/product-polo.svg",
    "assets/images/products/sublimation-tshirt/mockups/default/white/product-sub.svg",
    "assets/images/products/dtf-print/mockups/default/white/product-dtf.svg",
    "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg",
    "assets/images/products/corporate-tshirt/mockups/default/white/product-corporate.svg",
    "assets/images/products/kids-tshirt/mockups/default/navy/product-kids.svg",
    "assets/images/products/caps/mockups/default/black/product-cap.svg",
    "assets/images/products/sublimation-cushion/mockups/default/white/product-cushion.svg",
    "assets/images/categories/cat-tee.svg",
    "assets/images/categories/cat-oversize.svg",
    "assets/images/categories/cat-hoodie.svg",
    "assets/images/categories/cat-jersey.svg",
    "assets/images/categories/cat-polo.svg",
    "assets/images/categories/cat-sub.svg",
    "assets/images/categories/cat-dtf.svg",
    "assets/images/categories/cat-gift.svg",
    "assets/images/hero/print-studio.svg",
    "assets/images/hero/hero.svg",
    "assets/images/services/dtf.svg",
    "assets/images/services/sublimation.svg",
    "assets/images/services/bulk.svg"
  ];
  var GALLERY_EXTRAS = {
    "anime-graphic-tee": [
      { src: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg", alt: "Cream oversized graphic t-shirt" },
      { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed tees" },
      { src: "assets/images/categories/cat-oversize.svg", alt: "Oversized t-shirt on a studio backdrop" }
    ],
    "oversized-graphic-tee": [
      { src: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg", alt: "Black oversized graphic t-shirt" },
      { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed tees" },
      { src: "assets/images/categories/cat-oversize.svg", alt: "Oversized t-shirt on a studio backdrop" }
    ],
    "motivational-hoodie": [
      { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed garments" },
      { src: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg", alt: "Cream oversized graphic t-shirt" },
      { src: "assets/images/categories/cat-oversize.svg", alt: "Studio garment on a backdrop" }
    ],
    "minimal-hoodie": [
      { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed garments" },
      { src: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg", alt: "Black oversized graphic t-shirt" },
      { src: "assets/images/categories/cat-oversize.svg", alt: "Studio garment on a backdrop" }
    ],
    "custom-sports-jersey": [
      { src: "assets/images/products/sublimation-tshirt/mockups/default/white/product-sub.svg", alt: "All-over sublimation printed t-shirt" },
      { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed garments" },
      { src: "assets/images/products/polo-tshirt/mockups/default/navy/product-polo.svg", alt: "Navy custom polo t-shirt" }
    ],
    "polo-tshirt": [
      { src: "assets/images/products/corporate-tshirt/mockups/default/white/product-corporate.svg", alt: "White corporate t-shirt with studio mark" },
      { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed tees" },
      { src: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg", alt: "Cream oversized graphic t-shirt" }
    ],
    "sublimation-tshirt": [
      { src: "assets/images/products/sublimation-cushion/mockups/default/white/product-cushion.svg", alt: "Sublimation printed cushion" },
      { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed tees" },
      { src: "assets/images/products/custom-sports-jersey/mockups/default/red/product-jersey.svg", alt: "Orange and black custom sports jersey" }
    ],
    "dtf-print": [
      { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed tees" },
      { src: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg", alt: "Black oversized t-shirt with bold anime graphic print" },
      { src: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg", alt: "Cream oversized graphic t-shirt" }
    ],
    "custom-tote-bag": [
      { src: "assets/images/products/sublimation-cushion/mockups/default/white/product-cushion.svg", alt: "Sublimation printed cushion" },
      { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed goods" },
      { src: "assets/images/products/caps/mockups/default/black/product-cap.svg", alt: "Black custom printed cap" }
    ],
    "corporate-tshirt": [
      { src: "assets/images/products/polo-tshirt/mockups/default/navy/product-polo.svg", alt: "Navy custom polo t-shirt" },
      { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed tees" },
      { src: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg", alt: "Cream oversized graphic t-shirt" }
    ],
    "kids-tshirt": [
      { src: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg", alt: "Black oversized t-shirt with bold anime graphic print" },
      { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed tees" },
      { src: "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg", alt: "Canvas tote bag with custom print" }
    ],
    "caps": [
      { src: "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg", alt: "Canvas tote bag with custom print" },
      { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed goods" },
      { src: "assets/images/products/motivational-hoodie/mockups/default/charcoal/product-hoodie.svg", alt: "Charcoal hoodie with large typography print" }
    ],
    "sublimation-cushion": [
      { src: "assets/images/products/sublimation-tshirt/mockups/default/white/product-sub.svg", alt: "All-over sublimation printed t-shirt" },
      { src: "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg", alt: "Canvas tote bag with custom print" },
      { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed goods" }
    ]
  };

  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length < 2) m = "0" + m;
    if (day.length < 2) day = "0" + day;
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function cloneCategory(item) {
    item = item || {};
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description || "",
      image: item.image || "",
      productCount: Number(item.productCount) || 0,
      displayOrder: Number(item.displayOrder) || 1,
      status: item.status === "inactive" ? "inactive" : "active",
      updated: item.updated || today()
    };
  }

  function slugToken(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);
  }

  function normalizeHex(value) {
    var hex = String(value || "").trim();
    if (hex.charAt(0) !== "#") hex = "#" + hex;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex.toUpperCase();
    if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
      return ("#" + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2) + hex.charAt(3) + hex.charAt(3)).toUpperCase();
    }
    return "#111111";
  }

  function cloneColor(item, index) {
    item = item || {};
    return {
      id: item.id || ("color-" + (index + 1)),
      name: String(item.name || "Color").trim() || "Color",
      hex: normalizeHex(item.hex),
      image: normalizeAssetPath(item.image || "")
    };
  }

  function cloneSize(item, index) {
    item = item || {};
    var label = String(item.label || item.name || "").trim() || ("Size " + (index + 1));
    return {
      id: item.id || slugToken(label) || ("size-" + (index + 1)),
      label: label
    };
  }

  function cloneVariant(item, index) {
    item = item || {};
    var regular = item.regularPrice == null || item.regularPrice === "" ? null : Number(item.regularPrice);
    var sale = item.salePrice == null || item.salePrice === "" ? null : Number(item.salePrice);
    if (regular != null && !Number.isFinite(regular)) regular = null;
    if (sale != null && !Number.isFinite(sale)) sale = null;
    return {
      id: item.id || ("variant-" + (index + 1)),
      colorId: item.colorId || "",
      sizeId: item.sizeId || "",
      sku: String(item.sku || "").trim(),
      regularPrice: regular,
      salePrice: sale,
      status: item.status === "inactive" ? "inactive" : "active",
      image: normalizeAssetPath(item.image || "")
    };
  }

  function cloneOptions(options) {
    options = options || {};
    var colors = Array.isArray(options.colors) ? options.colors : [];
    var sizes = Array.isArray(options.sizes) ? options.sizes : [];
    return {
      colors: colors.map(cloneColor),
      sizes: sizes.map(cloneSize)
    };
  }

  function uniqueProductIds(ids) {
    var seen = {};
    var next = [];
    var i;
    var id;
    if (!Array.isArray(ids)) return next;
    for (i = 0; i < ids.length; i += 1) {
      id = String(ids[i] || "").trim();
      if (!id || seen[id]) continue;
      seen[id] = true;
      next.push(id);
    }
    return next;
  }

  function isTemporarySrc(src) {
    src = String(src || "").trim().toLowerCase();
    return src.indexOf("blob:") === 0 || src.indexOf("data:") === 0;
  }

  function normalizeAssetPath(src) {
    src = String(src || "").trim();
    if (!src) return "";
    if (isTemporarySrc(src)) return "";
    if (src.indexOf("http") === 0) return src;
    src = src.replace(/^\.\.\//, "").replace(/^\.\//, "");
    if (src.indexOf("assets/") !== 0 && src.indexOf("/") === -1) src = "assets/images/" + src;
    return src;
  }

  function assetFileName(src) {
    var path = normalizeAssetPath(src);
    var parts = path.split("/");
    return parts[parts.length - 1] || path;
  }

  function knownAsset(src) {
    var path = normalizeAssetPath(src);
    var i;
    for (i = 0; i < KNOWN_ASSETS.length; i += 1) {
      if (KNOWN_ASSETS[i] === path) return true;
    }
    return false;
  }

  function mediaTypeLabel(id) {
    var i;
    for (i = 0; i < MEDIA_TYPES.length; i += 1) {
      if (MEDIA_TYPES[i].id === id) return MEDIA_TYPES[i].label;
    }
    return "Other";
  }

  function cloneGalleryItem(item, index) {
    item = item || {};
    var src = normalizeAssetPath(item.src || item.image || item.path || "");
    return {
      id: item.id || ("gallery-" + (index + 1)),
      src: src,
      alt: String(item.alt || "").trim(),
      primary: Boolean(item.primary)
    };
  }

  function cloneGallery(list) {
    var next = [];
    var i;
    var item;
    var seen = {};
    if (!Array.isArray(list)) return next;
    for (i = 0; i < list.length; i += 1) {
      item = cloneGalleryItem(list[i], i);
      if (!item.src || seen[item.src + "::" + item.alt]) continue;
      seen[item.src + "::" + item.alt] = true;
      next.push(item);
    }
    if (next.length) {
      var hasPrimary = next.some(function (entry) { return entry.primary; });
      if (!hasPrimary) next[0].primary = true;
    }
    return next;
  }

  function defaultGallery(item) {
    var extras = GALLERY_EXTRAS[item.id] || [];
    var list = [];
    if (item.image) {
      list.push({
        id: item.id + "-primary",
        src: item.image,
        alt: item.name || "Product image",
        primary: true
      });
    }
    extras.forEach(function (entry, index) {
      if (entry.src === item.image) return;
      list.push({
        id: item.id + "-extra-" + (index + 1),
        src: entry.src,
        alt: entry.alt || item.name || "",
        primary: false
      });
    });
    return cloneGallery(list);
  }

  function cloneMedia(item) {
    item = item || {};
    var src = normalizeAssetPath(item.src || item.path || item.image || "");
    var type = item.type || "other";
    var known = false;
    var i;
    for (i = 0; i < MEDIA_TYPES.length; i += 1) {
      if (MEDIA_TYPES[i].id === type) {
        known = true;
        break;
      }
    }
    if (!known) type = "other";
    return {
      id: item.id,
      src: src,
      type: type,
      alt: String(item.alt || "").trim(),
      productId: item.productId || "",
      colorId: item.colorId || "",
      artworkId: item.artworkId || "",
      createdAt: item.createdAt || today(),
      updatedAt: item.updatedAt || today()
    };
  }

  function cloneArtwork(item) {
    item = item || {};
    var preview = item.preview || item.thumbnail || "";
    return {
      id: item.id,
      name: item.name,
      slug: item.slug || item.id,
      category: item.category || "studio",
      description: item.description || "",
      thumbnail: item.thumbnail || preview,
      preview: preview,
      tags: Array.isArray(item.tags) ? item.tags.map(function (tag) { return String(tag || "").trim(); }).filter(Boolean) : [],
      availableProducts: uniqueProductIds(item.availableProducts),
      status: item.status === "inactive" ? "inactive" : "active",
      createdAt: item.createdAt || today(),
      updatedAt: item.updatedAt || today()
    };
  }

  function cloneProduct(item) {
    item = item || {};
    var gallery = Array.isArray(item.gallery)
      ? cloneGallery(item.gallery)
      : defaultGallery(item);
    var primary = "";
    var i;
    for (i = 0; i < gallery.length; i += 1) {
      if (gallery[i].primary) {
        primary = gallery[i].src;
        break;
      }
    }
    if (!primary && gallery.length) primary = gallery[0].src;
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      sku: item.sku,
      categoryId: item.categoryId,
      description: item.description || "",
      shortDescription: item.shortDescription || "",
      productType: item.productType || "T-Shirt",
      printType: item.printType || "DTF",
      regularPrice: Number(item.regularPrice) || 0,
      salePrice: item.salePrice == null || item.salePrice === "" ? null : Number(item.salePrice),
      status: item.status === "draft" ? "draft" : "active",
      featured: Boolean(item.featured),
      image: normalizeAssetPath(primary || item.image || ""),
      gallery: gallery,
      frontDesign: normalizeAssetPath(item.frontDesign || ""),
      backDesign: normalizeAssetPath(item.backDesign || ""),
      createdAt: item.createdAt || today(),
      updatedAt: item.updatedAt || today(),
      options: cloneOptions(item.options),
      variants: Array.isArray(item.variants) ? item.variants.map(cloneVariant) : []
    };
  }

  function usable(list, cloneFn) {
    if (!Array.isArray(list)) return null;
    var next = [];
    var i;
    for (i = 0; i < list.length; i += 1) {
      if (!list[i] || !list[i].id) return null;
      next.push(cloneFn(list[i]));
    }
    return next;
  }

  function readStore() {
    try {
      var raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      var cats = usable(parsed.categories, cloneCategory);
      var prods = usable(parsed.products, cloneProduct);
      if (!cats || !prods) return null;
      var arts = usable(parsed.artworks, cloneArtwork);
      var meds = usable(parsed.media, cloneMedia);
      if (meds) {
        meds = meds.filter(function (item) { return item && item.src; });
      }
      return { categories: cats, products: prods, artworks: arts, media: meds };
    } catch (e) {
      return null;
    }
  }

  function writeStore() {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        categories: categories,
        products: products,
        artworks: artworks,
        media: media
      }));
    } catch (e) {}
  }

  function applyVariantDemos(list) {
    return list.map(function (item) {
      var demo = VARIANT_DEMOS[item.id];
      if (!demo) return item;
      var next = {};
      var key;
      for (key in item) {
        if (Object.prototype.hasOwnProperty.call(item, key)) next[key] = item[key];
      }
      next.options = demo.options;
      next.variants = demo.variants;
      return next;
    });
  }

  function mediaId(prefix, src, extra) {
    var token = slugToken(assetFileName(src) || prefix) || prefix;
    var extraToken = extra ? "-" + slugToken(extra) : "";
    return prefix + "-" + token + extraToken;
  }

  function uniqueMediaId(base, list) {
    var next = base || "media";
    var i = 2;
    while (list.some(function (item) { return item.id === next; })) {
      next = base + "-" + i;
      i += 1;
    }
    return next;
  }

  function pushMedia(list, seen, item) {
    var cloned = cloneMedia(item);
    if (!cloned.src) return;
    var key = cloned.type + "::" + cloned.src + "::" + (cloned.productId || "") + "::" + (cloned.colorId || "") + "::" + (cloned.artworkId || "");
    if (seen[key]) return;
    seen[key] = true;
    if (!cloned.id || list.some(function (entry) { return entry.id === cloned.id; })) {
      cloned.id = uniqueMediaId(mediaId(cloned.type, cloned.src, cloned.productId || cloned.artworkId || cloned.colorId), list);
    }
    list.push(cloned);
  }

  function seedMediaFromCatalog(prods, arts) {
    var list = [];
    var seen = {};
    var i;
    var j;
    var product;
    var galleryItem;
    var color;
    var artwork;
    (prods || []).forEach(function (item) {
      product = item;
      if (product.image) {
        pushMedia(list, seen, {
          id: mediaId("img", product.image, product.id),
          src: product.image,
          type: "product-image",
          alt: product.name || "Product image",
          productId: product.id
        });
      }
      (product.gallery || []).forEach(function (entry, index) {
        galleryItem = entry;
        pushMedia(list, seen, {
          id: galleryItem.id || mediaId("gal", galleryItem.src, product.id + "-" + index),
          src: galleryItem.src,
          type: "product-image",
          alt: galleryItem.alt || product.name || "Product gallery image",
          productId: product.id
        });
      });
      ((product.options && product.options.colors) || []).forEach(function (entry) {
        color = entry;
        if (!color.image) return;
        pushMedia(list, seen, {
          id: mediaId("mock", color.image, product.id + "-" + color.id),
          src: color.image,
          type: "product-mockup",
          alt: (color.name || "Color") + " mockup",
          productId: product.id,
          colorId: color.id
        });
      });
      if (product.frontDesign) {
        pushMedia(list, seen, {
          id: mediaId("front", product.frontDesign, product.id),
          src: product.frontDesign,
          type: "front-design",
          alt: product.name + " front design",
          productId: product.id
        });
      }
      if (product.backDesign) {
        pushMedia(list, seen, {
          id: mediaId("back", product.backDesign, product.id),
          src: product.backDesign,
          type: "back-design",
          alt: product.name + " back design",
          productId: product.id
        });
      }
    });
    (arts || []).forEach(function (item) {
      artwork = item;
      if (!artwork.preview && !artwork.thumbnail) return;
      pushMedia(list, seen, {
        id: mediaId("art", artwork.preview || artwork.thumbnail, artwork.id),
        src: artwork.preview || artwork.thumbnail,
        type: "artwork-reference",
        alt: artwork.name || "Artwork",
        artworkId: artwork.id
      });
    });
    return list;
  }

  var stored = readStore();
  var categories = stored ? stored.categories : CATEGORY_SEED.map(cloneCategory);
  var products = stored ? stored.products : applyVariantDemos(PRODUCT_SEED).map(cloneProduct);
  var artworks = stored && stored.artworks ? stored.artworks : ARTWORK_SEED.map(cloneArtwork);
  var media = stored && stored.media ? stored.media : seedMediaFromCatalog(products, artworks);
  if (!stored || !stored.artworks || !stored.media) writeStore();

  function persist() {
    writeStore();
  }

  function setCategories(next) {
    var cloned = usable(next, cloneCategory);
    if (cloned) categories = cloned;
    persist();
    document.dispatchEvent(new CustomEvent("ds-admin-categories", { detail: { categories: categories } }));
    return categories;
  }

  function pruneArtworkMappings() {
    var productIds = {};
    var i;
    var j;
    var next;
    var changed = false;
    for (i = 0; i < products.length; i += 1) productIds[products[i].id] = true;
    for (i = 0; i < artworks.length; i += 1) {
      next = [];
      for (j = 0; j < artworks[i].availableProducts.length; j += 1) {
        if (productIds[artworks[i].availableProducts[j]]) next.push(artworks[i].availableProducts[j]);
        else changed = true;
      }
      artworks[i].availableProducts = next;
    }
    return changed;
  }

  function pruneMediaRefs() {
    var productIds = {};
    var artworkIds = {};
    var i;
    var item;
    var colors;
    var colorOk;
    for (i = 0; i < products.length; i += 1) productIds[products[i].id] = true;
    for (i = 0; i < artworks.length; i += 1) artworkIds[artworks[i].id] = true;
    for (i = 0; i < media.length; i += 1) {
      item = media[i];
      if (item.productId && !productIds[item.productId]) item.productId = "";
      if (item.artworkId && !artworkIds[item.artworkId]) item.artworkId = "";
      if (item.colorId && item.productId) {
        colors = (findProduct(item.productId) && findProduct(item.productId).options && findProduct(item.productId).options.colors) || [];
        colorOk = colors.some(function (color) { return color.id === item.colorId; });
        if (!colorOk) item.colorId = "";
      }
    }
  }

  function mediaKey(item) {
    item = item || {};
    return [item.type || "", item.src || "", item.productId || "", item.colorId || "", item.artworkId || ""].join("::");
  }

  function syncDerivedMedia() {
    var derived = seedMediaFromCatalog(products, artworks);
    var existingByKey = {};
    var next = [];
    var seen = {};
    var i;
    var item;
    var key;
    var prev;
    for (i = 0; i < media.length; i += 1) {
      item = media[i];
      existingByKey[mediaKey(item)] = item;
    }
    for (i = 0; i < derived.length; i += 1) {
      item = derived[i];
      key = mediaKey(item);
      prev = existingByKey[key];
      if (prev) {
        item.id = prev.id || item.id;
        if (prev.alt) item.alt = prev.alt;
        item.createdAt = prev.createdAt || item.createdAt;
      }
      seen[key] = true;
      next.push(item);
    }
    for (i = 0; i < media.length; i += 1) {
      item = media[i];
      key = mediaKey(item);
      if (seen[key] || !item.src) continue;
      seen[key] = true;
      next.push(item);
    }
    media = next;
  }

  function setProducts(next) {
    var cloned = usable(next, cloneProduct);
    if (cloned) products = cloned;
    pruneArtworkMappings();
    syncDerivedMedia();
    pruneMediaRefs();
    persist();
    document.dispatchEvent(new CustomEvent("ds-admin-products", { detail: { products: products } }));
    document.dispatchEvent(new CustomEvent("ds-admin-artworks", { detail: { artworks: artworks } }));
    document.dispatchEvent(new CustomEvent("ds-admin-media", { detail: { media: media } }));
    return products;
  }

  function setArtworks(next) {
    var cloned = usable(next, cloneArtwork);
    if (cloned) artworks = cloned;
    pruneArtworkMappings();
    syncDerivedMedia();
    pruneMediaRefs();
    persist();
    document.dispatchEvent(new CustomEvent("ds-admin-artworks", { detail: { artworks: artworks } }));
    document.dispatchEvent(new CustomEvent("ds-admin-media", { detail: { media: media } }));
    return artworks;
  }

  function setMedia(next) {
    var cloned = usable(next, cloneMedia);
    if (cloned) media = cloned.filter(function (item) { return item && item.src; });
    pruneMediaRefs();
    persist();
    document.dispatchEvent(new CustomEvent("ds-admin-media", { detail: { media: media } }));
    return media;
  }

  function findMedia(id) {
    var i;
    for (i = 0; i < media.length; i += 1) {
      if (media[i].id === id) return media[i];
    }
    return null;
  }

  function variantImage(product, variant) {
    if (variant && variant.image) return variant.image;
    if (!product || !variant || !variant.colorId) return product ? product.image : "";
    var colors = product.options && product.options.colors ? product.options.colors : [];
    var i;
    for (i = 0; i < colors.length; i += 1) {
      if (colors[i].id === variant.colorId && colors[i].image) return colors[i].image;
    }
    return product.image || "";
  }

  function publicGallery(item) {
    var gallery = item && Array.isArray(item.gallery) ? item.gallery : [];
    var list = gallery.map(function (entry) {
      return { src: entry.src, alt: entry.alt || (item && item.name) || "" };
    }).filter(function (entry) { return entry.src; });
    if (!list.length && item && item.image) {
      list.push({ src: item.image, alt: item.name || "Product image" });
    }
    return list;
  }

  function findCategory(id) {
    var i;
    for (i = 0; i < categories.length; i += 1) {
      if (categories[i].id === id) return categories[i];
    }
    return null;
  }

  function findProduct(id) {
    var i;
    for (i = 0; i < products.length; i += 1) {
      if (products[i].id === id) return products[i];
    }
    return null;
  }

  function findArtwork(id) {
    var i;
    for (i = 0; i < artworks.length; i += 1) {
      if (artworks[i].id === id) return artworks[i];
    }
    return null;
  }

  function artworkCategoryLabel(id) {
    var i;
    for (i = 0; i < ARTWORK_CATEGORIES.length; i += 1) {
      if (ARTWORK_CATEGORIES[i].id === id) return ARTWORK_CATEGORIES[i].label;
    }
    var cat = findCategory(id);
    return cat ? cat.name : id;
  }

  function linkedProductCount(item) {
    var ids = item && item.availableProducts ? item.availableProducts : [];
    var count = 0;
    var i;
    for (i = 0; i < ids.length; i += 1) {
      if (findProduct(ids[i])) count += 1;
    }
    return count;
  }

  function publicArtwork(item) {
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      category: item.category,
      description: item.description,
      thumbnail: item.thumbnail || item.preview,
      preview: item.preview || item.thumbnail,
      tags: item.tags.slice(),
      availableProducts: item.availableProducts.filter(function (id) {
        var product = findProduct(id);
        return product && product.status === "active";
      }),
      status: item.status
    };
  }

  function countByCategory(id) {
    var count = 0;
    var i;
    for (i = 0; i < products.length; i += 1) {
      if (products[i].categoryId === id) count += 1;
    }
    return count;
  }

  function categoryName(id) {
    var item = findCategory(id);
    return item ? item.name : "Unassigned";
  }

  function imageUrl(src) {
    src = src || "assets/images/categories/cat-tee.svg";
    if (src.indexOf("http") === 0 || src.indexOf("../") === 0) return src;
    return "../" + src.replace(/^\.\//, "");
  }

  function displayPrice(item) {
    if (item && item.salePrice != null && Number.isFinite(item.salePrice)) return item.salePrice;
    return item ? item.regularPrice : 0;
  }

  function formatPrice(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
  }

  function skuCode(value) {
    var token = slugToken(value).replace(/-/g, "").toUpperCase();
    return token.slice(0, 4) || "OPT";
  }

  function suggestVariantSku(productSku, colorName, sizeLabel) {
    var parts = [String(productSku || "DSA").trim() || "DSA"];
    if (colorName) parts.push(skuCode(colorName));
    if (sizeLabel) parts.push(skuCode(sizeLabel));
    return parts.join("-");
  }

  function variantEffectiveRegular(product, variant) {
    if (variant && variant.regularPrice != null && Number.isFinite(variant.regularPrice)) return variant.regularPrice;
    return product ? Number(product.regularPrice) || 0 : 0;
  }

  function variantEffectiveSale(product, variant) {
    if (variant && variant.salePrice != null && Number.isFinite(variant.salePrice)) return variant.salePrice;
    if (product && product.salePrice != null && Number.isFinite(product.salePrice) && variant && (variant.regularPrice == null || !Number.isFinite(variant.regularPrice))) {
      return product.salePrice;
    }
    return null;
  }

  function variantSummary(item) {
    var options = item && item.options ? item.options : { colors: [], sizes: [] };
    var variants = item && Array.isArray(item.variants) ? item.variants : [];
    return {
      colors: options.colors ? options.colors.length : 0,
      sizes: options.sizes ? options.sizes.length : 0,
      variants: variants.length,
      active: variants.filter(function (entry) { return entry.status !== "inactive"; }).length
    };
  }

  function collectSkus(skipProductId, skipVariantId) {
    var seen = [];
    var i;
    var j;
    var product;
    var sku;
    for (i = 0; i < products.length; i += 1) {
      product = products[i];
      if (product.id !== skipProductId) {
        sku = String(product.sku || "").toLowerCase();
        if (sku) seen.push(sku);
      }
      if (product.variants) {
        for (j = 0; j < product.variants.length; j += 1) {
          if (product.id === skipProductId && product.variants[j].id === skipVariantId) continue;
          sku = String(product.variants[j].sku || "").toLowerCase();
          if (sku) seen.push(sku);
        }
      }
    }
    return seen;
  }

  function skuTaken(value, skipProductId, skipVariantId) {
    var sku = String(value || "").trim().toLowerCase();
    if (!sku) return false;
    return collectSkus(skipProductId, skipVariantId).indexOf(sku) !== -1;
  }

  window.DSAtelier = window.DSAtelier || {};
  window.DSAtelier.admin = window.DSAtelier.admin || {};
  window.DSAtelier.admin.data = {
    getCategories: function () { return categories; },
    getProducts: function () { return products; },
    getArtworks: function () { return artworks; },
    getMedia: function () { return media; },
    setCategories: setCategories,
    setProducts: setProducts,
    setArtworks: setArtworks,
    setMedia: setMedia,
    persist: persist,
    findCategory: findCategory,
    findProduct: findProduct,
    findArtwork: findArtwork,
    findMedia: findMedia,
    countByCategory: countByCategory,
    categoryName: categoryName,
    artworkCategoryLabel: artworkCategoryLabel,
    linkedProductCount: linkedProductCount,
    publicArtwork: publicArtwork,
    imageUrl: imageUrl,
    displayPrice: displayPrice,
    formatPrice: formatPrice,
    today: today,
    sizePresets: SIZE_PRESETS.slice(),
    colorPresets: COLOR_PRESETS.map(function (item) { return { name: item.name, hex: item.hex }; }),
    artworkCategories: ARTWORK_CATEGORIES.slice(),
    mediaTypes: MEDIA_TYPES.slice(),
    knownAssets: KNOWN_ASSETS.slice(),
    normalizeAssetPath: normalizeAssetPath,
    assetFileName: assetFileName,
    knownAsset: knownAsset,
    isTemporarySrc: isTemporarySrc,
    mediaTypeLabel: mediaTypeLabel,
    variantImage: variantImage,
    publicGallery: publicGallery,
    seedMediaFromCatalog: function () { return seedMediaFromCatalog(products, artworks); },
    normalizeHex: normalizeHex,
    slugToken: slugToken,
    suggestVariantSku: suggestVariantSku,
    variantEffectiveRegular: variantEffectiveRegular,
    variantEffectiveSale: variantEffectiveSale,
    variantSummary: variantSummary,
    skuTaken: skuTaken
  };
})();

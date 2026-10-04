(function (global) {
  var DEFAULT_ID = "oversized-graphic-tee";
  var FEATURED_IDS = [
    "anime-graphic-tee",
    "oversized-graphic-tee",
    "motivational-hoodie",
    "custom-sports-jersey",
    "sublimation-tshirt",
    "custom-tote-bag"
  ];

  var products = [
    {
      id: "anime-graphic-tee",
      sku: "DSA-AGT-001",
      name: "Anime Graphic T-Shirt",
      price: 899,
      mrp: 1299,
      rating: 4.8,
      reviews: 98,
      badge: "Bestseller",
      image: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg",
      alt: "Black oversized t-shirt with bold anime graphic print",
      category: "Custom T-Shirts",
      sizes: ["S", "M", "L", "XL"],
      color: "Black",
      colors: ["Black", "White", "Navy", "Red"],
      material: "Cotton",
      availability: "In stock",
      popular: 98,
      weight: 200,
      gsm: "180–220",
      printTypes: ["DTF", "Sublimation"],
      lead: "Bold anime graphic on a heavyweight cotton tee. Choose print type, colour and size, then upload artwork. Configuration is required before Add to Cart.",
      details: "Studio graphic tee cut for everyday wear. Printed in-house after you choose print type, colour and artwork. Mock product for frontend presentation only.",
      images: [
        { src: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg", alt: "Black oversized t-shirt with bold anime graphic print" },
        { src: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg", alt: "Cream oversized graphic t-shirt" },
        { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed tees" },
        { src: "assets/images/categories/cat-oversize.svg", alt: "Oversized t-shirt on a studio backdrop" }
      ]
    },
    {
      id: "oversized-graphic-tee",
      sku: "DSA-OGT-001",
      name: "Oversized Graphic Tee",
      price: 799,
      mrp: 1199,
      rating: 4.7,
      reviews: 128,
      badge: "New",
      image: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg",
      alt: "Cream oversized graphic t-shirt",
      category: "Oversized T-Shirts",
      sizes: ["M", "L", "XL", "XXL"],
      color: "Cream",
      colors: ["Cream", "Black", "White", "Navy", "Red"],
      material: "Cotton",
      availability: "In stock",
      popular: 86,
      weight: 220,
      gsm: "180–220",
      printTypes: ["DTF", "Sublimation"],
      lead: "Heavyweight oversized blank, printed in-house. Choose print type, garment color and size, then upload artwork. Configuration is required before Add to Cart.",
      details: "Relaxed oversized tee cut for layering. Printed in-house after you choose print type, color and artwork. Mock product for frontend presentation only.",
      images: [
        { src: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg", alt: "Cream oversized graphic t-shirt front" },
        { src: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg", alt: "Black oversized graphic t-shirt" },
        { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed tees" },
        { src: "assets/images/categories/cat-oversize.svg", alt: "Oversized t-shirt on a studio backdrop" }
      ]
    },
    {
      id: "motivational-hoodie",
      sku: "DSA-MHD-001",
      name: "Motivational Hoodie",
      price: 1499,
      mrp: 1999,
      rating: 4.9,
      reviews: 90,
      badge: "Hot",
      image: "assets/images/products/motivational-hoodie/mockups/default/charcoal/product-hoodie.svg",
      alt: "Charcoal hoodie with large typography print",
      category: "Hoodies",
      sizes: ["S", "M", "L", "XL", "XXL"],
      color: "Charcoal",
      colors: ["Charcoal", "Black", "White", "Navy", "Red"],
      material: "Blend",
      availability: "In stock",
      popular: 90,
      inShop: false,
      weight: 420,
      gsm: "320–350",
      printTypes: ["DTF", "Sublimation"],
      lead: "Heavyweight hoodie for large typography prints. Choose print type, colour and size, then upload artwork. Configuration is required before Add to Cart.",
      details: "Relaxed hoodie blank for studio typography and graphic prints. Printed in-house after configuration. Mock product for frontend presentation only.",
      images: [
        { src: "assets/images/products/motivational-hoodie/mockups/default/charcoal/product-hoodie.svg", alt: "Charcoal hoodie with large typography print" },
        { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed garments" },
        { src: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg", alt: "Cream oversized graphic t-shirt" },
        { src: "assets/images/categories/cat-oversize.svg", alt: "Studio garment on a backdrop" }
      ]
    },
    {
      id: "minimal-hoodie",
      sku: "DSA-MNH-001",
      name: "Minimal Hoodie",
      price: 1499,
      mrp: 1999,
      rating: 4.9,
      reviews: 94,
      badge: "Hot",
      image: "assets/images/products/motivational-hoodie/mockups/default/charcoal/product-hoodie.svg",
      alt: "Charcoal hoodie with large typography print",
      category: "Hoodies",
      sizes: ["S", "M", "L", "XL", "XXL"],
      color: "Charcoal",
      colors: ["Charcoal", "Black", "White", "Navy", "Red"],
      material: "Blend",
      availability: "In stock",
      popular: 94,
      weight: 420,
      gsm: "320–350",
      printTypes: ["DTF", "Sublimation"],
      lead: "Clean hoodie blank for studio prints. Choose print type, colour and size, then upload artwork. Configuration is required before Add to Cart.",
      details: "Minimal hoodie cut for everyday wear. Printed in-house after you choose print type, colour and artwork. Mock product for frontend presentation only.",
      images: [
        { src: "assets/images/products/motivational-hoodie/mockups/default/charcoal/product-hoodie.svg", alt: "Charcoal hoodie with large typography print" },
        { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed garments" },
        { src: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg", alt: "Black oversized graphic t-shirt" },
        { src: "assets/images/categories/cat-oversize.svg", alt: "Studio garment on a backdrop" }
      ]
    },
    {
      id: "custom-sports-jersey",
      sku: "DSA-CSJ-001",
      name: "Custom Sports Jersey",
      price: 1299,
      mrp: 1799,
      rating: 4.6,
      reviews: 81,
      badge: "Custom",
      image: "assets/images/products/custom-sports-jersey/mockups/default/red/product-jersey.svg",
      alt: "Orange and black custom sports jersey",
      category: "Sports Jerseys",
      sizes: ["XS", "S", "M", "L", "XL"],
      color: "Red",
      colors: ["Black", "White", "Navy", "Red"],
      material: "Polyester",
      availability: "Made to order",
      popular: 81,
      weight: 180,
      gsm: "140–160",
      printTypes: ["DTF", "Sublimation"],
      lead: "Team jersey blank for names, numbers and crests. Choose print type, colour and size, then upload artwork. Configuration is required before Add to Cart.",
      details: "Sports jersey made to order. Printed in-house after you choose print type, colour and artwork. Mock product for frontend presentation only.",
      images: [
        { src: "assets/images/products/custom-sports-jersey/mockups/default/red/product-jersey.svg", alt: "Orange and black custom sports jersey" },
        { src: "assets/images/products/sublimation-tshirt/mockups/default/white/product-sub.svg", alt: "All-over sublimation printed t-shirt" },
        { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed garments" },
        { src: "assets/images/products/polo-tshirt/mockups/default/navy/product-polo.svg", alt: "Navy custom polo t-shirt" }
      ]
    },
    {
      id: "polo-tshirt",
      sku: "DSA-PLO-001",
      name: "Polo T-Shirt",
      price: 999,
      mrp: 1399,
      rating: 4.5,
      reviews: 72,
      badge: "Studio",
      image: "assets/images/products/polo-tshirt/mockups/default/navy/product-polo.svg",
      alt: "Navy custom polo t-shirt",
      category: "Polo T-Shirts",
      sizes: ["S", "M", "L", "XL"],
      color: "Navy",
      colors: ["Black", "White", "Navy", "Red"],
      material: "Cotton",
      availability: "In stock",
      popular: 72,
      weight: 210,
      gsm: "180–220",
      printTypes: ["DTF", "Sublimation"],
      lead: "Cotton polo for logos and small-run branding. Choose print type, colour and size, then upload artwork. Configuration is required before Add to Cart.",
      details: "Studio polo blank for crests and marks. Printed in-house after configuration. Mock product for frontend presentation only.",
      images: [
        { src: "assets/images/products/polo-tshirt/mockups/default/navy/product-polo.svg", alt: "Navy custom polo t-shirt" },
        { src: "assets/images/products/corporate-tshirt/mockups/default/white/product-corporate.svg", alt: "White corporate t-shirt with studio mark" },
        { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed tees" },
        { src: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg", alt: "Cream oversized graphic t-shirt" }
      ]
    },
    {
      id: "sublimation-tshirt",
      sku: "DSA-SUB-001",
      name: "Sublimation T-Shirt",
      price: 999,
      mrp: 1499,
      rating: 4.8,
      reviews: 88,
      badge: "All-over",
      image: "assets/images/products/sublimation-tshirt/mockups/default/white/product-sub.svg",
      alt: "All-over sublimation printed t-shirt",
      category: "Sublimation",
      sizes: ["S", "M", "L", "XL"],
      color: "White",
      colors: ["White", "Black", "Navy", "Red"],
      material: "Polyester",
      availability: "Made to order",
      popular: 88,
      weight: 160,
      gsm: "140–160",
      printTypes: ["Sublimation"],
      lead: "Polyester tee for all-over dye-infused colour. Choose colour and size, then upload artwork. Configuration is required before Add to Cart.",
      details: "Sublimation-ready blank for edge-to-edge colour. Printed in-house after you choose colour and artwork. Mock product for frontend presentation only.",
      images: [
        { src: "assets/images/products/sublimation-tshirt/mockups/default/white/product-sub.svg", alt: "All-over sublimation printed t-shirt" },
        { src: "assets/images/products/sublimation-cushion/mockups/default/white/product-cushion.svg", alt: "Sublimation printed cushion" },
        { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed tees" },
        { src: "assets/images/products/custom-sports-jersey/mockups/default/red/product-jersey.svg", alt: "Orange and black custom sports jersey" }
      ]
    },
    {
      id: "dtf-print",
      sku: "DSA-DTF-001",
      name: "DTF Print",
      price: 349,
      mrp: 499,
      rating: 4.6,
      reviews: 76,
      badge: "Transfer",
      image: "assets/images/products/dtf-print/mockups/default/white/product-dtf.svg",
      alt: "DTF transfer sheet ready for press",
      category: "DTF Prints",
      sizes: ["M"],
      color: "White",
      colors: ["White", "Black"],
      material: "Polyester",
      availability: "In stock",
      popular: 76,
      weight: 40,
      gsm: "Transfer film",
      printTypes: ["DTF"],
      lead: "Ready-to-press DTF transfer. Choose colour, then upload artwork. Configuration is required before Add to Cart.",
      details: "DTF transfer sheet for studio press work. Artwork is reviewed before print. Mock product for frontend presentation only.",
      images: [
        { src: "assets/images/products/dtf-print/mockups/default/white/product-dtf.svg", alt: "DTF transfer sheet ready for press" },
        { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed tees" },
        { src: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg", alt: "Black oversized t-shirt with bold anime graphic print" },
        { src: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg", alt: "Cream oversized graphic t-shirt" }
      ]
    },
    {
      id: "custom-tote-bag",
      sku: "DSA-TOT-001",
      name: "Custom Tote Bag",
      price: 499,
      mrp: 799,
      rating: 4.5,
      reviews: 69,
      badge: "Gift",
      image: "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg",
      alt: "Canvas tote bag with custom print",
      category: "Custom Gifts",
      sizes: ["M"],
      color: "Cream",
      colors: ["Cream", "Black", "White", "Navy", "Red"],
      material: "Canvas",
      availability: "In stock",
      popular: 69,
      weight: 150,
      gsm: "Canvas",
      printTypes: ["DTF", "Sublimation"],
      lead: "Canvas tote for marks, art and gifting. Choose print type and colour, then upload artwork. Configuration is required before Add to Cart.",
      details: "Studio tote blank for custom print. Printed in-house after configuration. Mock product for frontend presentation only.",
      images: [
        { src: "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg", alt: "Canvas tote bag with custom print" },
        { src: "assets/images/products/sublimation-cushion/mockups/default/white/product-cushion.svg", alt: "Sublimation printed cushion" },
        { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed goods" },
        { src: "assets/images/products/caps/mockups/default/black/product-cap.svg", alt: "Black custom printed cap" }
      ]
    },
    {
      id: "corporate-tshirt",
      sku: "DSA-CRP-001",
      name: "Corporate T-Shirt",
      price: 849,
      mrp: 1199,
      rating: 4.4,
      reviews: 64,
      badge: "Bulk",
      image: "assets/images/products/corporate-tshirt/mockups/default/white/product-corporate.svg",
      alt: "White corporate t-shirt with studio mark",
      category: "Custom T-Shirts",
      sizes: ["S", "M", "L", "XL", "XXL"],
      color: "White",
      colors: ["Black", "White", "Navy", "Red"],
      material: "Cotton",
      availability: "Made to order",
      popular: 64,
      weight: 190,
      gsm: "180–220",
      printTypes: ["DTF", "Sublimation"],
      lead: "Uniform tee for teams and brands. Choose print type, colour and size, then upload artwork. Configuration is required before Add to Cart.",
      details: "Corporate tee made to order. Printed in-house after you choose print type, colour and artwork. Mock product for frontend presentation only.",
      images: [
        { src: "assets/images/products/corporate-tshirt/mockups/default/white/product-corporate.svg", alt: "White corporate t-shirt with studio mark" },
        { src: "assets/images/products/polo-tshirt/mockups/default/navy/product-polo.svg", alt: "Navy custom polo t-shirt" },
        { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed tees" },
        { src: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg", alt: "Cream oversized graphic t-shirt" }
      ]
    },
    {
      id: "kids-tshirt",
      sku: "DSA-KID-001",
      name: "Kids T-Shirt",
      price: 599,
      mrp: 899,
      rating: 4.7,
      reviews: 71,
      badge: "Kids",
      image: "assets/images/products/kids-tshirt/mockups/default/navy/product-kids.svg",
      alt: "Kids t-shirt with custom print",
      category: "Custom T-Shirts",
      sizes: ["XS", "S", "M"],
      color: "Navy",
      colors: ["Black", "White", "Navy", "Red"],
      material: "Cotton",
      availability: "In stock",
      popular: 71,
      weight: 140,
      gsm: "160–180",
      printTypes: ["DTF", "Sublimation"],
      lead: "Kids cotton tee for small-run prints. Choose print type, colour and size, then upload artwork. Configuration is required before Add to Cart.",
      details: "Kids tee printed in-house after configuration. Mock product for frontend presentation only.",
      images: [
        { src: "assets/images/products/kids-tshirt/mockups/default/navy/product-kids.svg", alt: "Kids t-shirt with custom print" },
        { src: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg", alt: "Black oversized t-shirt with bold anime graphic print" },
        { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed tees" },
        { src: "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg", alt: "Canvas tote bag with custom print" }
      ]
    },
    {
      id: "caps",
      sku: "DSA-CAP-001",
      name: "Caps",
      price: 449,
      mrp: 699,
      rating: 4.3,
      reviews: 58,
      badge: "New",
      image: "assets/images/products/caps/mockups/default/black/product-cap.svg",
      alt: "Black custom printed cap",
      category: "Custom Gifts",
      sizes: ["M", "L"],
      color: "Black",
      colors: ["Black", "White", "Navy", "Red"],
      material: "Blend",
      availability: "In stock",
      popular: 58,
      weight: 90,
      gsm: "Blend",
      printTypes: ["DTF"],
      lead: "Custom cap for marks and short runs. Choose colour and size, then upload artwork. Configuration is required before Add to Cart.",
      details: "Studio cap blank for DTF marks. Printed in-house after configuration. Mock product for frontend presentation only.",
      images: [
        { src: "assets/images/products/caps/mockups/default/black/product-cap.svg", alt: "Black custom printed cap" },
        { src: "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg", alt: "Canvas tote bag with custom print" },
        { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed goods" },
        { src: "assets/images/products/motivational-hoodie/mockups/default/charcoal/product-hoodie.svg", alt: "Charcoal hoodie with large typography print" }
      ]
    },
    {
      id: "sublimation-cushion",
      sku: "DSA-CSH-001",
      name: "Sublimation Cushion",
      price: 699,
      mrp: 999,
      rating: 4.6,
      reviews: 61,
      badge: "Gift",
      image: "assets/images/products/sublimation-cushion/mockups/default/white/product-cushion.svg",
      alt: "Sublimation printed cushion",
      category: "Sublimation",
      sizes: ["M"],
      color: "White",
      colors: ["White", "Black"],
      material: "Polyester",
      availability: "In stock",
      popular: 61,
      weight: 280,
      gsm: "Polyester",
      printTypes: ["Sublimation"],
      lead: "Cushion cover for dye-infused artwork. Choose colour, then upload artwork. Configuration is required before Add to Cart.",
      details: "Sublimation cushion blank for gifts and short runs. Printed in-house after configuration. Mock product for frontend presentation only.",
      images: [
        { src: "assets/images/products/sublimation-cushion/mockups/default/white/product-cushion.svg", alt: "Sublimation printed cushion" },
        { src: "assets/images/products/sublimation-tshirt/mockups/default/white/product-sub.svg", alt: "All-over sublimation printed t-shirt" },
        { src: "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg", alt: "Canvas tote bag with custom print" },
        { src: "assets/images/hero/print-studio.svg", alt: "Studio rack with custom printed goods" }
      ]
    }
  ];

  var byId = {};
  products.forEach(function (item) {
    byId[item.id] = item;
  });

  function getById(id) {
    if (!id) return null;
    return byId[id] || null;
  }

  function getAll() {
    return products.filter(function (item) {
      return item.inShop !== false;
    });
  }

  function getFeatured() {
    return FEATURED_IDS.map(getById).filter(Boolean);
  }

  function getRelated(id, limit) {
    var max = limit || 4;
    var current = getById(id);
    var others = getAll().filter(function (item) {
      return item.id !== id;
    });
    others.sort(function (a, b) {
      var ac = current && a.category === current.category ? 0 : 1;
      var bc = current && b.category === current.category ? 0 : 1;
      if (ac !== bc) return ac - bc;
      return b.popular - a.popular;
    });
    return others.slice(0, max);
  }

  function productUrl(id) {
    return "product.html?id=" + encodeURIComponent(id);
  }

  function resolve(id) {
    return getById(id) || getById(DEFAULT_ID);
  }

  function searchTags(item) {
    if (!item) return "";
    var parts = [item.name, item.category, item.color, item.material, item.availability, item.badge, item.sku];
    if (item.colors) parts = parts.concat(item.colors);
    if (item.printTypes) parts = parts.concat(item.printTypes);
    return parts.filter(Boolean).join(" ").toLowerCase();
  }

  function search(query, limit) {
    var q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    var terms = q.split(/\s+/).filter(Boolean);
    var max = typeof limit === "number" ? limit : 8;
    var results = [];

    getAll().forEach(function (item) {
      var haystack = searchTags(item);
      var name = item.name.toLowerCase();
      var matched = terms.every(function (term) {
        return haystack.indexOf(term) !== -1;
      });
      if (!matched) return;
      var score = 0;
      if (name.indexOf(q) === 0) score += 4;
      else if (name.indexOf(q) !== -1) score += 2;
      terms.forEach(function (term) {
        if (name.indexOf(term) !== -1) score += 1;
      });
      results.push({ item: item, score: score });
    });

    results.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return (b.item.popular || 0) - (a.item.popular || 0);
    });

    return results.slice(0, max).map(function (entry) {
      return entry.item;
    });
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.catalog = {
    DEFAULT_ID: DEFAULT_ID,
    products: products,
    getAll: getAll,
    getById: getById,
    getFeatured: getFeatured,
    getRelated: getRelated,
    productUrl: productUrl,
    resolve: resolve,
    searchTags: searchTags,
    search: search
  };
})(window);

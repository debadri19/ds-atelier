(function (global) {
  var CATEGORIES = [
    { id: "all", label: "All" },
    { id: "anime", label: "Anime" },
    { id: "gaming", label: "Gaming" },
    { id: "streetwear", label: "Streetwear" },
    { id: "typography", label: "Typography" },
    { id: "cyberpunk", label: "Cyberpunk" },
    { id: "minimal", label: "Minimal" },
    { id: "studio", label: "Studio" },
    { id: "custom-art", label: "Custom Art" }
  ];

  var artworks = [
    {
      id: "anime-tiger",
      name: "Anime Tiger",
      slug: "anime-tiger",
      category: "anime",
      description: "Bold tiger graphic cut for dark and light tees. High-contrast linework for DTF.",
      thumbnail: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg",
      preview: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg",
      tags: ["anime", "gaming"],
      availableProducts: ["anime-graphic-tee", "oversized-graphic-tee"]
    },
    {
      id: "neon-ronin",
      name: "Neon Ronin",
      slug: "neon-ronin",
      category: "anime",
      description: "Night-city ronin mark with sharp edges and a studio-ready silhouette.",
      thumbnail: "assets/images/categories/cat-tee.svg",
      preview: "assets/images/categories/cat-tee.svg",
      tags: ["anime", "cyberpunk"],
      availableProducts: ["oversized-graphic-tee", "dtf-print"]
    },
    {
      id: "pixel-quest",
      name: "Pixel Quest",
      slug: "pixel-quest",
      category: "gaming",
      description: "Retro quest badge for jerseys, tees and short-run merch drops.",
      thumbnail: "assets/images/products/custom-sports-jersey/mockups/default/red/product-jersey.svg",
      preview: "assets/images/products/custom-sports-jersey/mockups/default/red/product-jersey.svg",
      tags: ["gaming", "streetwear"],
      availableProducts: ["custom-sports-jersey", "oversized-graphic-tee"]
    },
    {
      id: "arcade-pulse",
      name: "Arcade Pulse",
      slug: "arcade-pulse",
      category: "gaming",
      description: "Arcade-type energy mark. Built for oversized blanks and DTF transfers.",
      thumbnail: "assets/images/categories/cat-oversize.svg",
      preview: "assets/images/categories/cat-oversize.svg",
      tags: ["gaming", "typography"],
      availableProducts: ["oversized-graphic-tee", "dtf-print"]
    },
    {
      id: "block-mark",
      name: "Block Mark",
      slug: "block-mark",
      category: "streetwear",
      description: "Heavy block graphic for oversized cotton and hoodie drops.",
      thumbnail: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg",
      preview: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg",
      tags: ["streetwear", "minimal"],
      availableProducts: ["oversized-graphic-tee", "minimal-hoodie"]
    },
    {
      id: "city-drop",
      name: "City Drop",
      slug: "city-drop",
      category: "streetwear",
      description: "Urban drop graphic with quiet type and a wide print area.",
      thumbnail: "assets/images/products/motivational-hoodie/mockups/default/charcoal/product-hoodie.svg",
      preview: "assets/images/products/motivational-hoodie/mockups/default/charcoal/product-hoodie.svg",
      tags: ["streetwear", "typography"],
      availableProducts: ["motivational-hoodie", "caps"]
    },
    {
      id: "bold-type",
      name: "Bold Type",
      slug: "bold-type",
      category: "typography",
      description: "Large-letter typography for hoodies and statement tees.",
      thumbnail: "assets/images/categories/cat-hoodie.svg",
      preview: "assets/images/categories/cat-hoodie.svg",
      tags: ["typography", "streetwear"],
      availableProducts: ["motivational-hoodie", "oversized-graphic-tee"]
    },
    {
      id: "studio-word",
      name: "Studio Word",
      slug: "studio-word",
      category: "typography",
      description: "Clean wordmark layout for polos, uniforms and small-run branding.",
      thumbnail: "assets/images/products/polo-tshirt/mockups/default/navy/product-polo.svg",
      preview: "assets/images/products/polo-tshirt/mockups/default/navy/product-polo.svg",
      tags: ["typography", "studio"],
      availableProducts: ["polo-tshirt", "corporate-tshirt"]
    },
    {
      id: "night-grid",
      name: "Night Grid",
      slug: "night-grid",
      category: "cyberpunk",
      description: "Grid-and-signal artwork for all-over colour and dark-garment DTF.",
      thumbnail: "assets/images/products/sublimation-tshirt/mockups/default/white/product-sub.svg",
      preview: "assets/images/products/sublimation-tshirt/mockups/default/white/product-sub.svg",
      tags: ["cyberpunk", "gaming"],
      availableProducts: ["sublimation-tshirt", "dtf-print"]
    },
    {
      id: "signal-run",
      name: "Signal Run",
      slug: "signal-run",
      category: "cyberpunk",
      description: "High-contrast signal graphic. Ready for transfer film and tees.",
      thumbnail: "assets/images/products/dtf-print/mockups/default/white/product-dtf.svg",
      preview: "assets/images/products/dtf-print/mockups/default/white/product-dtf.svg",
      tags: ["cyberpunk", "studio"],
      availableProducts: ["dtf-print", "anime-graphic-tee"]
    },
    {
      id: "quiet-line",
      name: "Quiet Line",
      slug: "quiet-line",
      category: "minimal",
      description: "Single-line studio mark. Quiet enough for everyday hoodies.",
      thumbnail: "assets/images/products/corporate-tshirt/mockups/default/white/product-corporate.svg",
      preview: "assets/images/products/corporate-tshirt/mockups/default/white/product-corporate.svg",
      tags: ["minimal", "studio"],
      availableProducts: ["minimal-hoodie", "corporate-tshirt"]
    },
    {
      id: "soft-mark",
      name: "Soft Mark",
      slug: "soft-mark",
      category: "minimal",
      description: "Reduced crest for gifts, totes and clean apparel runs.",
      thumbnail: "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg",
      preview: "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg",
      tags: ["minimal", "custom-art"],
      availableProducts: ["custom-tote-bag", "caps"]
    },
    {
      id: "press-room",
      name: "Press Room",
      slug: "press-room",
      category: "studio",
      description: "In-house press graphic for DTF sheets and studio merch.",
      thumbnail: "assets/images/services/dtf.svg",
      preview: "assets/images/services/dtf.svg",
      tags: ["studio", "typography"],
      availableProducts: ["dtf-print", "polo-tshirt"]
    },
    {
      id: "atelier-crest",
      name: "Atelier Crest",
      slug: "atelier-crest",
      category: "studio",
      description: "Studio crest layout for uniforms, polos and brand runs.",
      thumbnail: "assets/images/hero/print-studio.svg",
      preview: "assets/images/hero/print-studio.svg",
      tags: ["studio", "minimal"],
      availableProducts: ["polo-tshirt", "corporate-tshirt"]
    },
    {
      id: "hand-ink",
      name: "Hand Ink",
      slug: "hand-ink",
      category: "custom-art",
      description: "Ink-led artwork for totes, gifts and short custom runs.",
      thumbnail: "assets/images/categories/cat-gift.svg",
      preview: "assets/images/categories/cat-gift.svg",
      tags: ["custom-art", "studio"],
      availableProducts: ["custom-tote-bag", "sublimation-cushion"]
    },
    {
      id: "origin-sketch",
      name: "Origin Sketch",
      slug: "origin-sketch",
      category: "custom-art",
      description: "Sketch-first artwork for kids tees, gifts and one-off prints.",
      thumbnail: "assets/images/products/kids-tshirt/mockups/default/navy/product-kids.svg",
      preview: "assets/images/products/kids-tshirt/mockups/default/navy/product-kids.svg",
      tags: ["custom-art", "anime"],
      availableProducts: ["kids-tshirt", "custom-tote-bag"]
    }
  ];

  var byId = {};

  function storefrontSrc(src) {
    src = String(src || "");
    if (src.indexOf("../") === 0) return src.replace(/^\.\.\//, "");
    return src;
  }

  function rebuildIndex() {
    byId = {};
    artworks.forEach(function (item) {
      byId[item.id] = item;
    });
  }

  function overlayFromAdmin() {
    try {
      var raw = window.sessionStorage.getItem("ds-atelier-admin-demo");
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.artworks)) return;
      var activeProducts = {};
      if (Array.isArray(parsed.products)) {
        parsed.products.forEach(function (product) {
          if (product && product.id && product.status === "active") activeProducts[product.id] = true;
        });
      }
      var next = [];
      parsed.artworks.forEach(function (item) {
        if (!item || !item.id || item.status === "inactive") return;
        var preview = storefrontSrc(item.preview || item.thumbnail || "");
        var mapped = Array.isArray(item.availableProducts) ? item.availableProducts.filter(function (id) {
          return !Object.keys(activeProducts).length || activeProducts[id];
        }) : [];
        next.push({
          id: item.id,
          name: item.name,
          slug: item.slug || item.id,
          category: item.category || "studio",
          description: item.description || "",
          thumbnail: storefrontSrc(item.thumbnail || preview),
          preview: preview,
          tags: Array.isArray(item.tags) ? item.tags.slice() : [],
          availableProducts: mapped
        });
      });
      artworks = next;
    } catch (e) {}
  }

  overlayFromAdmin();
  rebuildIndex();

  function getById(id) {
    if (!id) return null;
    return byId[id] || null;
  }

  function getAll() {
    return artworks.slice();
  }

  function categoryLabel(id) {
    var match = CATEGORIES.filter(function (item) {
      return item.id === id;
    })[0];
    return match ? match.label : id;
  }

  function normalizeCategory(value) {
    var raw = String(value || "").trim().toLowerCase();
    if (!raw || raw === "all") return "all";
    var found = CATEGORIES.filter(function (item) {
      return item.id === raw || item.label.toLowerCase() === raw;
    })[0];
    return found ? found.id : "all";
  }

  function getByCategory(category) {
    var id = normalizeCategory(category);
    if (id === "all") return getAll();
    return artworks.filter(function (item) {
      return item.category === id;
    });
  }

  function artworkUrl(id) {
    return "design.html?id=" + encodeURIComponent(id);
  }

  function productUrl(productId, artworkId) {
    var url = "product.html?id=" + encodeURIComponent(productId);
    if (artworkId) url += "&design=" + encodeURIComponent(artworkId);
    return url;
  }

  function designsCategoryUrl(category) {
    var id = normalizeCategory(category);
    if (id === "all") return "designs.html";
    return "designs.html?category=" + encodeURIComponent(id);
  }

  function searchTags(item) {
    if (!item) return "";
    var parts = [item.name, item.slug, item.category, categoryLabel(item.category), item.description];
    if (item.tags) parts = parts.concat(item.tags);
    return parts.filter(Boolean).join(" ").toLowerCase();
  }

  function search(query, limit) {
    var q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    var terms = q.split(/\s+/).filter(Boolean);
    var max = typeof limit === "number" ? limit : 4;
    var results = [];

    getAll().forEach(function (item) {
      var name = String(item.name || "").toLowerCase();
      var slug = String(item.slug || item.id || "").toLowerCase();
      var categoryId = String(item.category || "").toLowerCase();
      var categoryName = String(categoryLabel(item.category) || "").toLowerCase();
      var tags = (item.tags || []).map(function (tag) {
        return String(tag || "").toLowerCase();
      });
      var description = String(item.description || "").toLowerCase();
      var core = [name, slug, categoryId, categoryName].concat(tags).join(" ");
      var matched = terms.every(function (term) {
        return core.indexOf(term) !== -1;
      });
      if (!matched) return;

      var score = 0;
      var strength = "related";
      if (name === q || slug === q) {
        score += 10;
        strength = "name";
      } else if (name.indexOf(q) === 0 || slug.indexOf(q) === 0) {
        score += 8;
        strength = "name";
      } else if (name.indexOf(q) !== -1) {
        score += 6;
        strength = "name";
      }

      if (categoryId === q || categoryName === q) {
        score += 5;
        if (strength !== "name") strength = "category";
      } else if (categoryId.indexOf(q) === 0 || categoryName.indexOf(q) === 0) {
        score += 4;
        if (strength !== "name") strength = "category";
      } else if (categoryId.indexOf(q) !== -1 || categoryName.indexOf(q) !== -1) {
        score += 3;
        if (strength !== "name") strength = "category";
      }

      tags.forEach(function (tag) {
        if (!tag) return;
        if (tag === q) {
          score += 4;
          if (strength === "related") strength = "tag";
        } else if (tag.indexOf(q) === 0) {
          score += 3;
          if (strength === "related") strength = "tag";
        } else if (tag.indexOf(q) !== -1) {
          score += 2;
          if (strength === "related") strength = "tag";
        }
      });

      terms.forEach(function (term) {
        if (name.indexOf(term) !== -1) score += 2;
        else if (categoryId.indexOf(term) !== -1 || categoryName.indexOf(term) !== -1) score += 1;
        else if (tags.some(function (tag) { return tag.indexOf(term) !== -1; })) score += 1;
      });

      if (description.indexOf(q) !== -1) score += 1;
      results.push({ item: item, score: score, strength: strength });
    });

    var strong = results.filter(function (entry) {
      return entry.strength !== "related";
    });
    if (strong.length) results = strong;

    results.sort(function (a, b) {
      var rank = { name: 0, category: 1, tag: 2, related: 3 };
      var aRank = rank[a.strength] != null ? rank[a.strength] : 4;
      var bRank = rank[b.strength] != null ? rank[b.strength] : 4;
      if (aRank !== bRank) return aRank - bRank;
      if (b.score !== a.score) return b.score - a.score;
      return String(a.item.name).localeCompare(String(b.item.name));
    });

    var seen = {};
    return results.filter(function (entry) {
      var id = entry.item && entry.item.id;
      if (!id || seen[id]) return false;
      seen[id] = true;
      return true;
    }).slice(0, max).map(function (entry) {
      return entry.item;
    });
  }

  function categories() {
    return CATEGORIES.slice();
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.artworks = {
    CATEGORIES: CATEGORIES,
    items: artworks,
    getAll: getAll,
    getById: getById,
    getByCategory: getByCategory,
    categoryLabel: categoryLabel,
    normalizeCategory: normalizeCategory,
    artworkUrl: artworkUrl,
    productUrl: productUrl,
    designsCategoryUrl: designsCategoryUrl,
    searchTags: searchTags,
    search: search,
    categories: categories
  };
})(window);

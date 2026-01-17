/**
 * Property Listing - Home Page Controller
 * Optimized for performance and maintainability
 */

// ===== Configuration =====
const CONFIG = {
  STORAGE_KEY: 'realestateProperties',
  DATA_URL: './data/properties.json',
  ANIMATION_DELAY: 50,
};

// ===== Default Fallback Data =====
const DEFAULT_PROPERTIES = [
  { id: 1, location: "Bristol BS7", address: "14 Amis Walk, Bristol BS7", beds: 4, baths: 2, rent: 2500, deposit: 2884, contract: "3 to 5 Years", availability: "Available Now!", description: "We are delighted to offer this four bedroom fully furnished property in Horfield, Bristol.", images: "BS7" },
  { id: 2, location: "London E7", address: "London E7", beds: 7, baths: 3, rent: 6249, deposit: 7500, contract: "3 to 5 Years", availability: "Available Now!", description: "Stunning 7 bedroom property in East London, perfect for HMO investment.", images: "E7(1)" },
  { id: 3, location: "London E1", address: "London E1", beds: 5, baths: 2, rent: 6000, deposit: 7000, contract: "3 to 5 Years", availability: "Available Now!", description: "Beautiful 5 bedroom property in the heart of East London.", images: "E1" },
  { id: 4, location: "Birmingham, B18", address: "Birmingham B18", beds: 5, baths: 3, rent: 1800, deposit: 2100, contract: "3 to 5 Years", availability: "Available Now!", description: "Spacious 5 bedroom property in Birmingham.", images: "B18" },
  { id: 5, location: "High Wycombe HP12", address: "High Wycombe HP12", beds: 4, baths: 1, rent: 2400, deposit: 2800, contract: "3 to 5 Years", availability: "Available Now!", description: "4 bedroom property with excellent transport links to London.", images: "HP12" },
  { id: 6, location: "Leicester LE2", address: "Leicester LE2", beds: 5, baths: 2, rent: 1400, deposit: 1600, contract: "3 to 5 Years", availability: "Available Now!", description: "Affordable 5 bedroom property. Perfect for student lets.", images: "LE2" },
  { id: 7, location: "Birmingham B14", address: "Birmingham B14", beds: 3, baths: 1, rent: 1500, deposit: 1750, contract: "3 to 5 Years", availability: "Available Now!", description: "Cozy 3 bedroom property in Birmingham B14 area.", images: "B14)" },
  { id: 8, location: "Berkshire SL2", address: "Berkshire SL2", beds: 6, baths: 3, rent: 6500, deposit: 7500, contract: "3 to 5 Years", availability: "Available Now!", description: "Luxurious 6 bedroom property in Berkshire.", images: "SL2" },
  { id: 9, location: "Berkshire SL1", address: "Berkshire SL1", beds: 6, baths: 6, rent: 7000, deposit: 8000, contract: "3 to 5 Years", availability: "Available Now!", description: "Premium 6 bedroom, 6 bathroom property.", images: "SL1" },
  { id: 10, location: "Luton LU2", address: "Luton LU2", beds: 5, baths: 4, rent: 3100, deposit: 3600, contract: "3 to 5 Years", availability: "Available Now!", description: "Modern 5 bedroom property with 4 bathrooms.", images: "LU2" },
];

// ===== State Management =====
class PropertyStore {
  constructor() {
    this.properties = [];
    this.currentSort = 'default';
  }

  async load() {
    try {
      // Try to fetch from JSON file
      const response = await fetch(CONFIG.DATA_URL);
      if (!response.ok) throw new Error('Failed to fetch properties');
      this.properties = await response.json();
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.properties));
    } catch (e) {
      console.warn('Failed to fetch properties.json:', e);
      // Fallback to localStorage
      const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (stored) {
        this.properties = JSON.parse(stored);
      } else {
        // Use hardcoded defaults as last resort
        console.warn('Using default properties');
        this.properties = DEFAULT_PROPERTIES;
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.properties));
      }
    }
    return this.properties;
  }

  getAll() {
    return [...this.properties];
  }

  sort(order) {
    this.currentSort = order;
    const sorted = [...this.properties];
    
    switch (order) {
      case 'lowToHigh':
        sorted.sort((a, b) => a.rent - b.rent);
        break;
      case 'highToLow':
        sorted.sort((a, b) => b.rent - a.rent);
        break;
      default:
        sorted.reverse(); // Latest first
    }
    
    return sorted;
  }
}

// ===== DOM Controller =====
class PropertyUI {
  constructor(store) {
    this.store = store;
    this.elements = {};
  }

  async init() {
    this.cacheElements();
    this.bindEvents();
    await this.render();
  }

  cacheElements() {
    this.elements = {
      grid: document.getElementById('propertyList'),
      loading: document.getElementById('loading'),
      empty: document.getElementById('emptyState'),
      count: document.getElementById('propertyCount'),
      filterToggle: document.getElementById('filterToggle'),
      filterDropdown: document.getElementById('filterOptions'),
      filterOptions: document.querySelectorAll('.filter-option'),
    };
  }

  bindEvents() {
    // Filter toggle
    this.elements.filterToggle?.addEventListener('click', () => this.toggleFilter());
    
    // Filter options
    this.elements.filterOptions.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleSort(e));
    });

    // Close filter on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-group')) {
        this.closeFilter();
      }
    });

    // Property card click (event delegation)
    this.elements.grid?.addEventListener('click', (e) => {
      const card = e.target.closest('.property-card');
      if (card) {
        const id = card.dataset.id;
        window.open(`property.html?id=${id}`, '_blank');
      }
    });

    // Keyboard navigation for cards
    this.elements.grid?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.property-card');
        if (card) {
          e.preventDefault();
          const id = card.dataset.id;
          window.open(`property.html?id=${id}`, '_blank');
        }
      }
    });
  }

  toggleFilter() {
    const isOpen = this.elements.filterDropdown.classList.contains('show');
    this.elements.filterDropdown.classList.toggle('show');
    this.elements.filterToggle.setAttribute('aria-expanded', !isOpen);
  }

  closeFilter() {
    this.elements.filterDropdown?.classList.remove('show');
    this.elements.filterToggle?.setAttribute('aria-expanded', 'false');
  }

  handleSort(e) {
    const sortType = e.currentTarget.dataset.sort;
    
    // Update active state
    this.elements.filterOptions.forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    // Close dropdown
    this.closeFilter();
    
    // Re-render with sorted data
    const sorted = this.store.sort(sortType);
    this.renderProperties(sorted);
  }

  async render() {
    this.showLoading(true);
    
    // Fetch properties from JSON file
    await this.store.load();
    
    const properties = this.store.sort('default');
    this.renderProperties(properties);
    this.showLoading(false);
  }

  renderProperties(properties) {
    const grid = this.elements.grid;
    if (!grid) return;

    // Update count
    this.elements.count.textContent = properties.length;

    // Check empty state
    if (properties.length === 0) {
      grid.innerHTML = '';
      this.elements.empty.hidden = false;
      return;
    }

    this.elements.empty.hidden = true;

    // Create document fragment for better performance
    const fragment = document.createDocumentFragment();

    properties.forEach((property, index) => {
      const card = this.createPropertyCard(property, index);
      fragment.appendChild(card);
    });

    // Clear and append all at once
    grid.innerHTML = '';
    grid.appendChild(fragment);
  }

  createPropertyCard(property, index) {
    const card = document.createElement('article');
    card.className = 'property-card';
    card.dataset.id = property.id;
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');
    card.style.animationDelay = `${index * CONFIG.ANIMATION_DELAY}ms`;

    const bathLabel = property.baths === 1 ? 'bath' : 'baths';
    const bedLabel = property.beds === 1 ? 'bed' : 'beds';

    card.innerHTML = `
      <div class="property-content">
        <h3 class="property-location">
          <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
          ${this.escapeHtml(property.location)}
        </h3>
        <div class="property-details">
          <span class="property-detail">
            <i class="fa-solid fa-bed" aria-hidden="true"></i>
            ${property.beds} ${bedLabel}
          </span>
          <span class="property-detail">
            <i class="fa-solid fa-bath" aria-hidden="true"></i>
            ${property.baths} ${bathLabel}
          </span>
        </div>
        <div class="property-price">
          £${property.rent.toLocaleString()} <span>pcm</span>
        </div>
      </div>
    `;

    return card;
  }

  showLoading(show) {
    if (this.elements.loading) {
      this.elements.loading.hidden = !show;
    }
    if (this.elements.grid) {
      this.elements.grid.style.display = show ? 'none' : 'grid';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ===== Initialize Application =====
document.addEventListener('DOMContentLoaded', async () => {
  const store = new PropertyStore();
  const ui = new PropertyUI(store);
  await ui.init();
});

// ===== Add CSS Animation for Cards =====
const style = document.createElement('style');
style.textContent = `
  .property-card {
    opacity: 0;
    animation: cardFadeIn 0.4s ease forwards;
  }
  
  @keyframes cardFadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);

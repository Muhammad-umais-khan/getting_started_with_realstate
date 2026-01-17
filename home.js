/**
 * Property Listing - Home Page Controller
 * Optimized for performance and maintainability
 */

// ===== Configuration =====
const CONFIG = {
  STORAGE_KEY: 'realestateProperties',
  DATA_URL: 'data/properties.json',
  ANIMATION_DELAY: 50,
};

// ===== State Management =====
class PropertyStore {
  constructor() {
    this.properties = [];
    this.currentSort = 'default';
  }

  async load() {
    try {
      // Always fetch from JSON file for consistent data across all users
      const response = await fetch(CONFIG.DATA_URL);
      if (!response.ok) throw new Error('Failed to fetch properties');
      this.properties = await response.json();
      
      // Also save to localStorage for property.js to use
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.properties));
    } catch (e) {
      console.warn('Failed to fetch properties.json, checking localStorage');
      // Fallback to localStorage if fetch fails
      const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (stored) {
        this.properties = JSON.parse(stored);
      } else {
        console.error('No property data available');
        this.properties = [];
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
document.addEventListener('DOMContentLoaded', () => {
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

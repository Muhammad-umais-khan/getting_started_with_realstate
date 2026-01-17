/**
 * Property Details Page - Dynamic Property Loader
 * Loads property data based on URL parameter (?id=X)
 */

// ===== Configuration =====
const CONFIG = {
  STORAGE_KEY: 'realestateProperties',
  DATA_URL: 'data/properties.json',
  DEFAULT_IMAGES: 12,
};

// ===== Property Data Store =====
class PropertyStore {
  static async getAll() {
    try {
      // Try to fetch from JSON file first
      const response = await fetch(CONFIG.DATA_URL);
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Failed to fetch properties.json, using localStorage');
    }
    
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading properties:', e);
    }
    
    return [];
  }

  static async getById(id) {
    const properties = await this.getAll();
    const numId = parseInt(id, 10);
    return properties.find(p => p.id === numId);
  }
}

// ===== Get Property ID from URL =====
function getPropertyIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// ===== UI Controller =====
class PropertyUI {
  constructor() {
    this.elements = {};
    this.swiper = null;
  }

  async init() {
    this.cacheElements();
    await this.loadProperty();
  }

  cacheElements() {
    this.elements = {
      loading: document.getElementById('loadingState'),
      error: document.getElementById('errorState'),
      content: document.getElementById('propertyContent'),
      swiperWrapper: document.getElementById('swiperWrapper'),
      price: document.getElementById('propertyPrice'),
      location: document.getElementById('propertyLocation'),
      beds: document.getElementById('propertyBeds'),
      baths: document.getElementById('propertyBaths'),
      availability: document.getElementById('propertyAvailability'),
      deposit: document.getElementById('propertyDeposit'),
      contract: document.getElementById('propertyContract'),
      description: document.getElementById('propertyDescription'),
    };
  }

  async loadProperty() {
    const propertyId = getPropertyIdFromUrl();
    
    if (!propertyId) {
      this.showError();
      return;
    }

    const property = await PropertyStore.getById(propertyId);
    
    if (!property) {
      this.showError();
      return;
    }

    document.title = `${property.location} | Getting Started in Property`;
    this.renderProperty(property);
  }

  renderProperty(property) {
    this.elements.price.textContent = `£${property.rent.toLocaleString()} pcm`;
    this.elements.location.textContent = property.address || property.location;
    this.elements.beds.textContent = `${property.beds} bed${property.beds > 1 ? 's' : ''}`;
    this.elements.baths.textContent = `${property.baths} bath${property.baths > 1 ? 's' : ''}`;
    this.elements.availability.textContent = property.availability || 'Available Now!';
    this.elements.deposit.textContent = `£${(property.deposit || 0).toLocaleString()}`;
    this.elements.contract.textContent = property.contract || '3 to 5 Years';
    this.elements.description.textContent = property.description || 'Contact us for more details.';

    this.loadImages(property.images);
    this.showContent();
  }

  loadImages(imageFolder) {
    const wrapper = this.elements.swiperWrapper;
    wrapper.innerHTML = '';

    if (!imageFolder) {
      wrapper.innerHTML = `<div class="swiper-slide"><div class="no-image"><i class="fa-solid fa-image"></i><p>No images</p></div></div>`;
      this.initSwiper();
      return;
    }

    const validImages = [];
    let checked = 0;
    const maxImages = CONFIG.DEFAULT_IMAGES;
    const extensions = ['jpg', 'webp', 'jpeg', 'png'];

    for (let i = 1; i <= maxImages; i++) {
      let found = false;
      let extIndex = 0;

      const tryNextExtension = () => {
        if (extIndex >= extensions.length) {
          // No valid extension found for this image number
          checked++;
          if (checked === maxImages) this.renderImages(validImages);
          return;
        }

        const ext = extensions[extIndex];
        const src = `assets/${imageFolder}/pic${i}.${ext}`;
        const img = new Image();

        img.onload = () => {
          if (!found) {
            found = true;
            validImages.push({ index: i, src });
          }
          checked++;
          if (checked === maxImages) this.renderImages(validImages);
        };

        img.onerror = () => {
          extIndex++;
          tryNextExtension();
        };

        img.src = src;
      };

      tryNextExtension();
    }
  }

  renderImages(validImages) {
    const wrapper = this.elements.swiperWrapper;
    validImages.sort((a, b) => a.index - b.index);
    
    if (validImages.length === 0) {
      wrapper.innerHTML = `<div class="swiper-slide"><div class="no-image"><i class="fa-solid fa-image"></i><p>No images</p></div></div>`;
    } else {
      wrapper.innerHTML = validImages.map(({ src }) => 
        `<div class="swiper-slide"><img src="${src}" alt="Property" loading="lazy" /></div>`
      ).join('');
    }
    
    this.initSwiper();
  }

  initSwiper() {
    if (this.swiper) this.swiper.destroy();

    this.swiper = new Swiper('.mySwiper', {
      loop: true,
      effect: 'coverflow',
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: 'auto',
      coverflowEffect: { rotate: 10, stretch: 0, depth: 700, modifier: 1, slideShadows: true },
      pagination: { el: '.swiper-pagination', clickable: true, renderBullet: (i, c) => `<span class="${c}">${i + 1}</span>` },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      keyboard: { enabled: true },
    });
  }

  showContent() {
    this.elements.loading.classList.add('hidden');
    this.elements.error.classList.add('hidden');
    this.elements.content.classList.remove('hidden');
  }

  showError() {
    this.elements.loading.classList.add('hidden');
    this.elements.error.classList.remove('hidden');
    this.elements.content.classList.add('hidden');
  }
}

// ===== Action Functions =====
function reserveDeal() {
  window.open('https://buy.stripe.com/8wM6ry343bX06aY28h', '_blank');
}

function requestCallback() {
  const name = prompt('Please enter your name:');
  if (!name) return;
  const phone = prompt('Please enter your contact number:');
  if (!phone) return;

  const body = encodeURIComponent(`Name: ${name}\nPhone: ${phone}\nProperty: ${window.location.href}`);
  window.location.href = `mailto:sales@gettingstartedinproperty.co.uk?subject=Callback Request&body=${body}`;
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => new PropertyUI().init());

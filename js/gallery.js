const DOM = {
  /* Gallery */
  grid:        document.getElementById('gallery'),
  cards:       () => document.querySelectorAll('.gallery-card'),
  emptyState:  document.getElementById('emptyState'),

  filterBtns:  () => document.querySelectorAll('.filter-btn'),

  lightbox:    document.getElementById('lightbox'),
  backdrop:    document.getElementById('lightboxBackdrop'),

  /* Lightbox controls */
  lbClose:     document.getElementById('lbClose'),
  lbPrev:      document.getElementById('lbPrev'),
  lbNext:      document.getElementById('lbNext'),

  /* Lightbox content */
  lbImage:     document.getElementById('lbImage'),
  lbCounter:   document.getElementById('lbCounter'),
  lbTitle:     document.getElementById('lbTitle'),
  lbLocation:  document.getElementById('lbLocationText'),
};


/* STATE */

const state = {
  currentCategory: 'all',
  currentIndex: 0,
  visibleImages: [],
  isLightboxOpen: false,
  previousFocus: null,
};


/* UTILITY HELPERS */

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 *
 * @param {number} index
 * @param {number} length
 * @returns {number}
 */
function wrapIndex(index, length) {
  return ((index % length) + length) % length;
}

/**
 *
 * @returns {NodeList → Array<Element>}
 */
function getVisibleCards() {
  return Array.from(DOM.cards()).filter(card => !card.classList.contains('hidden'));
}

/**
 *
 * @param {Element} card
 * @returns {{ src: string, alt: string, title: string, location: string }}
 */
function getCardData(card) {
  const img = card.querySelector('img');
  return {
    src:      img ? img.src  : '',
    alt:      img ? img.alt  : '',
    title:    card.dataset.title    || 'Untitled',
    location: card.dataset.location || '',
  };
}


/* CARD INDEX REGISTRATION */

function assignCardIndices() {
  DOM.cards().forEach((card, i) => {
    card.style.setProperty('--card-index', i);
  });
}


/* FILTER SYSTEM */

/**
 *
 * @param {string}
 */
function filterGallery(category) {
  state.currentCategory = category;

  DOM.filterBtns().forEach(btn => {
    const isActive = btn.dataset.filter === category;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  const allCards = Array.from(DOM.cards());
  let visibleCount = 0;

  allCards.forEach((card, i) => {
    const matches = category === 'all' || card.dataset.category === category;

    if (matches) {
      card.classList.remove('hidden');
      card.style.setProperty('--card-index', visibleCount);

      card.classList.remove('entering');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          card.classList.add('entering');
        });
      });

      visibleCount++;
    } else {
      card.classList.add('hidden');
      card.classList.remove('entering');
    }
  });

  const isEmpty = visibleCount === 0;
  DOM.emptyState.hidden = !isEmpty;
  DOM.grid.style.display = isEmpty ? 'none' : '';
}


/* OPEN / CLOSE */

/**
 *
 * @param {number} index
 */
function openLightbox(index) {
  state.visibleImages = getVisibleCards();

  if (state.visibleImages.length === 0) return;

  state.currentIndex = clamp(index, 0, state.visibleImages.length - 1);
  state.isLightboxOpen = true;

  state.previousFocus = document.activeElement;

  updateLightboxContent(state.currentIndex);

  DOM.lightbox.classList.add('is-open');
  DOM.lightbox.setAttribute('aria-hidden', 'false');

  document.body.style.overflow = 'hidden';

  DOM.lbClose.focus();
}

function closeLightbox() {
  if (!state.isLightboxOpen) return;

  state.isLightboxOpen = false;

  DOM.lightbox.classList.remove('is-open');
  DOM.lightbox.setAttribute('aria-hidden', 'true');

  document.body.style.overflow = '';

  if (state.previousFocus) {
    state.previousFocus.focus();
    state.previousFocus = null;
  }

  setTimeout(() => {
    DOM.lbImage.src = '';
    DOM.lbImage.alt = '';
  }, 300);  /* matches --dur-base */
}


/* LIGHTBOX — CONTENT UPDATE */

/**
 *
 * @param {number} index
 */
function updateLightboxContent(index) {
  const card = state.visibleImages[index];
  if (!card) return;

  const data = getCardData(card);
  const total = state.visibleImages.length;

  DOM.lbImage.classList.remove('fade-swap');
  DOM.lbImage.src = data.src;
  DOM.lbImage.alt = data.alt;

  void DOM.lbImage.offsetWidth;
  DOM.lbImage.style.animation = 'none';
  requestAnimationFrame(() => {
    DOM.lbImage.style.animation = '';
  });

  DOM.lbCounter.textContent = `${index + 1} / ${total}`;

  DOM.lbTitle.textContent    = data.title;
  DOM.lbLocation.textContent = data.location;

  DOM.lbPrev.disabled = false;
  DOM.lbNext.disabled = false;
}


/* LIGHTBOX — NAVIGATION */

/**
 * @param {number} direction
 */
function navigateLightbox(direction) {
  if (!state.isLightboxOpen || state.visibleImages.length === 0) return;

  state.currentIndex = wrapIndex(
    state.currentIndex + direction,
    state.visibleImages.length
  );

  updateLightboxContent(state.currentIndex);
}


/* KEYBOARD HANDLER */

/**
 * @param {KeyboardEvent} e
 */
function handleKeyboard(e) {
  switch (e.key) {

    case 'Escape':
      if (state.isLightboxOpen) {
        e.preventDefault();
        closeLightbox();
      }
      break;

    case 'ArrowLeft':
      if (state.isLightboxOpen) {
        e.preventDefault();
        navigateLightbox(-1);
      }
      break;

    case 'ArrowRight':
      if (state.isLightboxOpen) {
        e.preventDefault();
        navigateLightbox(+1);
      }
      break;

    default:
      break;
  }
}


/* EVENT LISTENER SETUP */

function initGallery() {

  assignCardIndices();

  DOM.filterBtns().forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.filter;
      if (category) filterGallery(category);
    });
  });

  const emptyShowAll = DOM.emptyState.querySelector('.filter-btn');
  if (emptyShowAll) {
    emptyShowAll.addEventListener('click', () => filterGallery('all'));
  }

  /* ── 10c. Gallery card clicks ── */

  DOM.grid.addEventListener('click', (e) => {
    const card = e.target.closest('.gallery-card');
    if (!card || card.classList.contains('hidden')) return;

    const visible = getVisibleCards();
    const index = visible.indexOf(card);
    if (index !== -1) openLightbox(index);
  });

  DOM.grid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.gallery-card');
    if (!card || card.classList.contains('hidden')) return;

    e.preventDefault();
    const visible = getVisibleCards();
    const index = visible.indexOf(card);
    if (index !== -1) openLightbox(index);
  });

  DOM.lbClose.addEventListener('click',   closeLightbox);
  DOM.backdrop.addEventListener('click',  closeLightbox);
  DOM.lbPrev.addEventListener('click',   () => navigateLightbox(-1));
  DOM.lbNext.addEventListener('click',   () => navigateLightbox(+1));

  document.querySelector('.lightbox-dialog').addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('keydown', handleKeyboard);

  DOM.lightbox.addEventListener('keydown', (e) => {
    if (!state.isLightboxOpen || e.key !== 'Tab') return;

    const focusable = Array.from(
      DOM.lightbox.querySelectorAll(
      )
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  let touchStartX = null;
  const SWIPE_THRESHOLD = 50;
  DOM.lightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  DOM.lightbox.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;

    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      navigateLightbox(deltaX < 0 ? +1 : -1);
    }
    touchStartX = null;
  }, { passive: true });

  DOM.cards().forEach(card => {
    const img = card.querySelector('img');
    if (!img) return;
    img.addEventListener('error', () => {
      img.style.opacity = '0';
      card.querySelector('.card-image-wrap').style.background =
        'linear-gradient(135deg, #EBF5FF 0%, #E2E8F0 100%)';
    });
  });

}

/* BOOTSTRAP*/

document.addEventListener('DOMContentLoaded', initGallery);
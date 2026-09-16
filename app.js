/* ===================================================================
   Fengtao Wang Portfolio - Interactive Client Logic (app.js)
   - Scroll-triggered carousel animation
   - Carousel navigation & gestures
   - Resume modal viewer
   - 4K rhythm game initialization
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Navbar Scroll State
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  // 2. Scroll-Triggered Carousel Reveal
  // "On scroll down pop up a carrasole populated with a relevent background linking to my github projects"
  const projectsSection = document.getElementById('projects-section');
  
  const revealCarouselObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        projectsSection.classList.add('revealed');
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  if (projectsSection) {
    revealCarouselObserver.observe(projectsSection);
  }

  // Also check if user clicked the hero chevron
  const scrollIndicator = document.getElementById('scrollIndicator');
  if (scrollIndicator) {
    scrollIndicator.addEventListener('click', (e) => {
      e.preventDefault();
      projectsSection.scrollIntoView({ behavior: 'smooth' });
      // Guarantee reveal immediately on click
      projectsSection.classList.add('revealed');
    });
  }

  // 3. Carousel Component Implementation
  const track = document.getElementById('carouselTrack');
  const cards = document.querySelectorAll('.project-card');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');
  const indicatorsContainer = document.getElementById('carouselIndicators');
  
  let currentIndex = 0;
  let cardsPerView = getCardsPerView();
  let maxIndex = Math.max(0, cards.length - cardsPerView);

  function getCardsPerView() {
    return window.innerWidth <= 960 ? 1 : 2;
  }

  // Create dot indicators
  function createIndicators() {
    indicatorsContainer.innerHTML = '';
    cardsPerView = getCardsPerView();
    maxIndex = Math.max(0, cards.length - cardsPerView);
    const totalDots = maxIndex + 1;

    for (let i = 0; i < totalDots; i++) {
      const dot = document.createElement('div');
      dot.className = `carousel-dot ${i === currentIndex ? 'active' : ''}`;
      dot.addEventListener('click', () => goToSlide(i));
      indicatorsContainer.appendChild(dot);
    }
  }

  function updateSlidePosition() {
    if (cards.length === 0) return;
    const cardWidth = cards[0].getBoundingClientRect().width;
    const gap = 28.8; // 1.8rem gap in pixels
    const offset = currentIndex * (cardWidth + gap);
    track.style.transform = `translateX(-${offset}px)`;

    // Update dots
    const dots = document.querySelectorAll('.carousel-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentIndex);
    });
  }

  function goToSlide(index) {
    cardsPerView = getCardsPerView();
    maxIndex = Math.max(0, cards.length - cardsPerView);
    currentIndex = Math.max(0, Math.min(index, maxIndex));
    updateSlidePosition();
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        goToSlide(currentIndex - 1);
      } else {
        goToSlide(maxIndex); // Loop back
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentIndex < maxIndex) {
        goToSlide(currentIndex + 1);
      } else {
        goToSlide(0); // Loop to start
      }
    });
  }

  // Touch & Drag Support for Carousel
  let startX = 0;
  let isDragging = false;

  track.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    if (diff > 50) {
      nextBtn.click();
    } else if (diff < -50) {
      prevBtn.click();
    }
    isDragging = false;
  }, { passive: true });

  // Handle Resize
  window.addEventListener('resize', () => {
    createIndicators();
    updateSlidePosition();
  });

  createIndicators();
  updateSlidePosition();

  // 4. Resume Modal Handler
  const resumeModal = document.getElementById('resumeModal');
  const openModalBtns = document.querySelectorAll('.open-resume-modal');
  const closeModalBtn = document.getElementById('closeResumeModal');

  openModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (resumeModal) resumeModal.classList.add('open');
    });
  });

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      resumeModal.classList.remove('open');
    });
  }

  if (resumeModal) {
    resumeModal.addEventListener('click', (e) => {
      if (e.target === resumeModal) {
        resumeModal.classList.remove('open');
      }
    });
  }
});

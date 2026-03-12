// K8525 Photo Essay - Refactored Implementation
(function() {
    const initK8525PhotoEssay = () => {
        const entrance = document.getElementById('k8525-entrance');
        const photoEssay = document.getElementById('k8525-photo-essay');
        const slides = document.querySelectorAll('.k8525-slide');
        const backToTopBtn = document.querySelector('.back-to-top-btn');
        const railwayGallery = document.getElementById('railway-gallery');
        
        if (!entrance || !photoEssay || slides.length === 0) return;
        
        let isInPhotoEssay = false;
        let essayContainer = null;
        let textLayer = null;
        let backgroundLayer = null;
        let blackOverlay = null;
        let currentIndex = 0;
        let lastScrollTop = 0;
        let isAnimating = false;
        let originalScrollPosition = 0;
        let originalBackToTopHTML = backToTopBtn ? backToTopBtn.innerHTML : '';
        let originalBackToTopHref = backToTopBtn ? backToTopBtn.getAttribute('href') : '';
        let originalBackToTopTitle = backToTopBtn ? backToTopBtn.getAttribute('title') : '';
        let exitTriggered = false;
        
        // Create the black overlay
        const createBlackOverlay = () => {
            blackOverlay = document.createElement('div');
            blackOverlay.className = 'k8525-black-overlay';
            document.body.appendChild(blackOverlay);
        };
        
        // Create the essay container
        const createEssayContainer = () => {
            // Create black overlay first
            if (!blackOverlay) {
                createBlackOverlay();
            }
            
            // Create main container
            essayContainer = document.createElement('div');
            essayContainer.className = 'k8525-essay-container';
            
            // Create background layer
            backgroundLayer = document.createElement('div');
            backgroundLayer.className = 'k8525-background';
            
            // Create text layer
            textLayer = document.createElement('div');
            textLayer.className = 'k8525-text-layer';
            
            // Add extra scroll space at the bottom for exit gesture
            const scrollSpacer = document.createElement('div');
            scrollSpacer.className = 'k8525-scroll-spacer';
            
            // Populate background layer with images
            slides.forEach((slide, index) => {
                const imageUrl = slide.getAttribute('data-image');
                
                // Create background image item
                const backgroundItem = document.createElement('div');
                backgroundItem.className = 'k8525-background-item';
                backgroundItem.style.backgroundImage = `url('${imageUrl}')`;
                
                // Add to background layer
                backgroundLayer.appendChild(backgroundItem);
                
                // Create text section
                const textSection = document.createElement('div');
                textSection.className = 'k8525-text-section';
                
                // Create text content
                const textContent = document.createElement('div');
                textContent.className = 'k8525-text-content enter-bottom';
                
                // Get text from original slide
                const slideText = slide.querySelector('.k8525-slide-text').innerHTML;
                textContent.innerHTML = slideText;
                
                // Add to text section
                textSection.appendChild(textContent);
                textLayer.appendChild(textSection);
            });
            
            // Add scroll spacer at the end
            textLayer.appendChild(scrollSpacer);
            
            // Assemble container
            essayContainer.appendChild(backgroundLayer);
            essayContainer.appendChild(textLayer);
            
            // Add to body
            document.body.appendChild(essayContainer);
            
            // Set up scroll listener
            setupScrollListener();
        };
        
        // Set up scroll listener to detect direction
        const setupScrollListener = () => {
            textLayer.addEventListener('scroll', (e) => {
                if (isAnimating || exitTriggered) return;
                
                const scrollTop = textLayer.scrollTop;
                const direction = scrollTop > lastScrollTop ? 'down' : 'up';
                
                // Check if we're at the last slide
                const maxIndex = slides.length - 1;
                const windowHeight = textLayer.clientHeight;
                const currentSectionIndex = Math.floor(scrollTop / windowHeight);
                
                // Update current index based on scroll position
                if (currentSectionIndex !== currentIndex && currentSectionIndex <= maxIndex) {
                    updateContentWithDirection(currentSectionIndex, direction);
                }
                
                // Check for exit condition: at last slide and scrolling down near bottom
                if (direction === 'down' && currentIndex === maxIndex) {
                    // Calculate how far we've scrolled past the last slide
                    const lastSlidePosition = maxIndex * windowHeight;
                    const scrolledPastLastSlide = scrollTop - lastSlidePosition;
                    
                    // If scrolled more than 30% of viewport past the last slide, exit
                    if (scrolledPastLastSlide > windowHeight * 0.3) {
                        exitTriggered = true;
                        exitPhotoEssay();
                        return;
                    }
                }
                
                lastScrollTop = scrollTop;
            }, { passive: true });
        };
        
        // Update content based on scroll direction
        const updateContentWithDirection = (newIndex, direction) => {
            if (newIndex === currentIndex) return;
            
            isAnimating = true;
            
            const textContents = textLayer.querySelectorAll('.k8525-text-content');
            const backgroundItems = backgroundLayer.querySelectorAll('.k8525-background-item');
            
            // Reset all text content classes
            textContents.forEach(content => {
                content.className = 'k8525-text-content';
            });
            
            if (direction === 'down') {
                // Scrolling down - text enters from bottom
                if (newIndex < textContents.length) {
                    textContents[newIndex].className = 'k8525-text-content enter-bottom';
                    
                    // Add exit animation to previous content
                    if (currentIndex >= 0 && currentIndex < textContents.length) {
                        textContents[currentIndex].className = 'k8525-text-content exit-up';
                    }
                }
            } else {
                // Scrolling up - text enters from top
                if (newIndex >= 0) {
                    textContents[newIndex].className = 'k8525-text-content enter-top';
                    
                    // Add exit animation to previous content
                    if (currentIndex >= 0 && currentIndex < textContents.length) {
                        textContents[currentIndex].className = 'k8525-text-content exit-down';
                    }
                }
            }
            
            // Update background image
            backgroundItems.forEach((item, i) => {
                if (i === newIndex) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
            
            currentIndex = newIndex;
            
            // Re-trigger animations
            setTimeout(() => {
                if (newIndex >= 0 && newIndex < textContents.length) {
                    textContents[newIndex].classList.add('visible');
                }
                isAnimating = false;
            }, 50);
        };
        
        // Exit photo essay with fade out animation
        const exitPhotoEssay = () => {
            if (!isInPhotoEssay) return;
            
            isAnimating = true;
            
            // Fade out essay container first
            essayContainer.style.transition = 'opacity 0.5s ease, visibility 0.5s ease';
            essayContainer.style.opacity = '0';
            essayContainer.style.visibility = 'hidden';
            
            // Then fade out black overlay
            if (blackOverlay) {
                blackOverlay.classList.remove('active');
            }
            
            // Restore back to top button
            restoreBackToTopButton();
            
            // Add rise fade in animation to railway gallery
            if (railwayGallery) {
                railwayGallery.classList.remove('sink-fade-out');
                railwayGallery.classList.add('rise-fade-in');
                
                // Trigger the animation
                setTimeout(() => {
                    railwayGallery.classList.add('active');
                }, 10);
            }
            
            // After animation completes
            setTimeout(() => {
                // Remove photo essay from DOM
                if (essayContainer && essayContainer.parentNode) {
                    essayContainer.parentNode.removeChild(essayContainer);
                    essayContainer = null;
                    textLayer = null;
                    backgroundLayer = null;
                }
                
                // Remove black overlay from DOM
                if (blackOverlay && blackOverlay.parentNode) {
                    blackOverlay.parentNode.removeChild(blackOverlay);
                    blackOverlay = null;
                }
                
                // Restore page state
                photoEssay.classList.remove('active');
                isInPhotoEssay = false;
                exitTriggered = false;
                document.body.style.overflow = '';
                
                // Restore scroll position
                window.scrollTo(0, originalScrollPosition);
                
                isAnimating = false;
            }, 500);
        };
        
        // Convert back to top button to close button
        const convertToCloseButton = () => {
            if (!backToTopBtn) return;
            
            // Store original state
            originalBackToTopHTML = backToTopBtn.innerHTML;
            originalBackToTopHref = backToTopBtn.getAttribute('href');
            originalBackToTopTitle = backToTopBtn.getAttribute('title');
            
            // Update to close button
            backToTopBtn.innerHTML = '<i class="bi bi-x"></i>';
            backToTopBtn.setAttribute('href', '#');
            backToTopBtn.setAttribute('title', '关闭');
            backToTopBtn.style.color = 'red';
            
            // Remove existing click handler and add close handler
            backToTopBtn.removeEventListener('click', handleCloseButtonClick);
            backToTopBtn.addEventListener('click', handleCloseButtonClick);
        };
        
        // Restore back to top button
        const restoreBackToTopButton = () => {
            if (!backToTopBtn) return;
            
            // Restore original state
            backToTopBtn.innerHTML = originalBackToTopHTML;
            backToTopBtn.setAttribute('href', originalBackToTopHref);
            backToTopBtn.setAttribute('title', originalBackToTopTitle);
            backToTopBtn.style.color = '';
            
            // Remove close handler
            backToTopBtn.removeEventListener('click', handleCloseButtonClick);
        };
        
        // Handle close button click
        const handleCloseButtonClick = (e) => {
            e.preventDefault();
            if (isInPhotoEssay) {
                exitPhotoEssay();
            }
        };
        
        // Open K8525 Photo Essay
        const openK8525PhotoEssay = () => {
            if (!entrance || !photoEssay) return;
            
            if (!essayContainer) {
                createEssayContainer();
            }
            
            photoEssay.classList.add('active');
            
            // Entering photo essay
            isInPhotoEssay = true;
            exitTriggered = false;
            
            // Store original scroll position
            originalScrollPosition = window.scrollY;
            
            // Hide body scrollbar
            document.body.style.overflow = 'hidden';
            
            // Show black overlay first (slightly before essay container)
            if (blackOverlay) {
                blackOverlay.classList.add('active');
            }
            
            // Add sink fade out animation to railway gallery
            if (railwayGallery) {
                railwayGallery.classList.remove('rise-fade-in');
                railwayGallery.classList.remove('active');
                railwayGallery.classList.add('sink-fade-out');
            }
            
            // Show essay container after a short delay
            setTimeout(() => {
                essayContainer.style.opacity = '0';
                essayContainer.style.visibility = 'visible';
                essayContainer.classList.add('active');
                
                // Fade in animation
                setTimeout(() => {
                    essayContainer.style.transition = 'opacity 0.5s ease';
                    essayContainer.style.opacity = '1';
                }, 50);
            }, 100);
            
            // Convert back to top button to close button
            convertToCloseButton();
            
            // Reset to first slide
            currentIndex = 0;
            lastScrollTop = 0;
            
            // Scroll to top
            textLayer.scrollTop = 0;
            
            // Reset text content classes
            const textContents = textLayer.querySelectorAll('.k8525-text-content');
            textContents.forEach((content, index) => {
                content.className = 'k8525-text-content enter-bottom';
                if (index === 0) {
                    content.classList.add('visible');
                }
            });
            
            // Reset background images
            const backgroundItems = backgroundLayer.querySelectorAll('.k8525-background-item');
            backgroundItems.forEach((item, i) => {
                if (i === 0) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        };
        
        // Entrance click handler
        entrance.addEventListener('click', () => {
            openK8525PhotoEssay();
        });
        
        // Direct link click handler
        const directLink = document.querySelector('.k8525-direct-link');
        if (directLink) {
            directLink.addEventListener('click', () => {
                openK8525PhotoEssay();
            });
        }
        
        // Handle keyboard navigation
        const handleKeyDown = (e) => {
            if (!isInPhotoEssay) return;
            
            if (e.key === 'Escape') {
                exitPhotoEssay();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initK8525PhotoEssay);
    } else {
        initK8525PhotoEssay();
    }
})();

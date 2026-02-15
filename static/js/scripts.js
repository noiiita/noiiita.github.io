

const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['home', 'publications', 'gallery']


window.addEventListener('DOMContentLoaded', event => {

    // Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            offset: 74,
        });
    };

    // Fade out hero name on scroll
    const heroName = document.querySelector('.hero-name');
    if (heroName) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            // Fade from 0 to 150px scroll distance (faster)
            // From 100% opacity to 0% opacity
            const fadeStart = 0;
            const maxScroll = 150;
            
            let opacity = 1;
            if (scrollY > fadeStart) {
                opacity = Math.max(0, 1 - (scrollY - fadeStart) / maxScroll);
            }
            
            heroName.style.opacity = opacity;
            heroName.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
        });
    }

    // Avatar reveal: slide up and fade in as user scrolls down (reversible)
    const avatar = document.getElementById('avatar');
    if (avatar) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            // start revealing after small scroll, finish by 200px
            const start = 50;
            const range = 200;
            const t = Math.min(Math.max((scrollY - start) / range, 0), 1);

            // translate from 40px -> 0, opacity from 0 -> 1
            const translateY = (1 - t) * 40; // px
            const opacity = t;
            avatar.style.transform = `translateY(${translateY}px)`;
            avatar.style.opacity = String(opacity);
        });
    }

    // Initialize nanogallery2 for Scientific Visualization
    const scivizContainer = document.getElementById('sciviz-gallery');
    if (scivizContainer && window.jQuery && window.jQuery.fn && !window.jQuery.fn.nanogallery2) {
        // nanogallery2 not loaded or jQuery not available
        console.warn('nanogallery2 or jQuery not available');
    }
    if (scivizContainer && window.jQuery && window.jQuery.fn && window.jQuery.fn.nanogallery2) {
        // Try to load a local list.json describing images
        fetch('static/assets/gallery/sciviz/list.json')
            .then(r => r.json())
            .then(items => {
                // items should be an array of {src: '...', srct: '...', title: '...'}
                jQuery('#sciviz-gallery').nanogallery2({
                    items: items,
                    // Justified layout with 2 rows per page
                    thumbnailHeight: '280',
                    thumbnailWidth: 'auto',
                    galleryDisplayMode: 'pagination',
                    galleryMaxRows: 2,
                    gallerySorting: 'random',
                    thumbnailAlignment: 'fillWidth',
                    thumbnailL1GutterWidth: 20,
                    thumbnailL1GutterHeight: 20,
                    thumbnailBorderHorizontal: 0,
                    thumbnailBorderVertical: 0,

                    // Hide all labels/titles, keep toolbar only
                    thumbnailL1Label: { display: false },
                    thumbnailToolbarImage :  { topLeft: '', bottomRight : 'display,download,info' },

                    // Display animation
                    thumbnailDisplayTransition: 'flipUp',
                    thumbnailDisplayTransitionDuration: 400,
                    thumbnailDisplayInterval: 200,
                    thumbnailDisplayOrder: 'rowByRow',

                    // Hover: show toolbar only (no label)
                    thumbnailHoverEffect2: 'toolsSlideUp',
                    touchAnimation: true,
                    touchAutoOpenDelay: -1,

                    // Theme: no borders, clean look
                    galleryTheme : {
                        thumbnail: { titleShadow : 'none', descriptionShadow : 'none', borderColor: 'transparent' },
                        navigationPagination :  { background: 'transparent', color: '#fff', colorHover: '#aaa', borderRadius: '4px' }
                    },

                    // popup info callback (empty title/content)
                    fnPopupMediaInfo: function(item, title, content){
                        return {title: '', content: ''};
                    },

                    // Deep linking disabled
                    locationHash: false
                });
            })
            .catch(err => console.log('No sciviz list found', err));
    }

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });


    // Yaml
    fetch(content_dir + config_file)
        .then(response => response.text())
        .then(text => {
            const yml = jsyaml.load(text);
            Object.keys(yml).forEach(key => {
                try {
                    document.getElementById(key).innerHTML = yml[key];
                } catch {
                    console.log("Unknown id and value: " + key + "," + yml[key].toString())
                }

            })
        })
        .catch(error => console.log(error));


    // Marked
    marked.use({ mangle: false, headerIds: false })
    section_names.forEach((name, idx) => {
        fetch(content_dir + name + '.md')
            .then(response => response.text())
            .then(markdown => {
                const html = marked.parse(markdown);
                document.getElementById(name + '-md').innerHTML = html;
            }).then(() => {
                // MathJax
                MathJax.typeset();
            })
            .catch(error => console.log(error));
    })

    // Simple custom lightbox implementation
    const lightbox = {
        items: [],
        currentIndex: 0,
        el: document.getElementById('lightbox'),
        img: null,
        caption: null,

        init() {
            this.img = this.el.querySelector('.lightbox-img');
            this.caption = this.el.querySelector('.lightbox-caption');
            
            // Close button
            this.el.querySelector('.lightbox-close').addEventListener('click', () => this.close());
            
            // Click outside to close
            this.el.addEventListener('click', (e) => {
                if (e.target === this.el) this.close();
            });
            
            // Navigation
            document.getElementById('lightbox-prev').addEventListener('click', () => this.prev());
            document.getElementById('lightbox-next').addEventListener('click', () => this.next());
            
            // Keyboard support
            document.addEventListener('keydown', (e) => {
                if (!this.el.classList.contains('active')) return;
                if (e.key === 'Escape') this.close();
                if (e.key === 'ArrowLeft') this.prev();
                if (e.key === 'ArrowRight') this.next();
            });
        },

        open(items, index) {
            this.items = items;
            this.currentIndex = index;
            this.show();
            this.el.classList.add('active');
        },

        close() {
            this.el.classList.remove('active');
        },

        show() {
            const item = this.items[this.currentIndex];
            this.img.src = item.src;
            this.img.alt = item.title || '';
            this.caption.textContent = item.title || '';
            this.caption.textContent += ` (${this.currentIndex + 1}/${this.items.length})`;
        },

        next() {
            this.currentIndex = (this.currentIndex + 1) % this.items.length;
            this.show();
        },

        prev() {
            this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
            this.show();
        }
    };

    // Initialize lightbox
    lightbox.init();

    // Initialize galleries for Railway and Plants
    const initGallery = (galleryId, jsonFile) => {
        const galleryEl = document.getElementById(galleryId);
        if (!galleryEl) {
            console.log(`Gallery element not found: ${galleryId}`);
            return;
        }

        // Only apply fixed width for Plants gallery
        const isPlants = galleryId === 'plants-gallery';
        const imgWidth = isPlants ? '180px' : 'auto';
        const imgHeight = isPlants ? '180px' : 'auto';

        fetch(jsonFile)
            .then(r => r.json())
            .then(items => {
                items.forEach((item, idx) => {
                    const a = document.createElement('a');
                    a.className = 'pswp-image';
                    a.style.display = 'inline-block';
                    a.style.overflow = 'hidden';
                    a.style.borderRadius = '8px';
                    a.style.cursor = 'pointer';
                    
                    // Only set explicit dimensions for Plants gallery
                    if (isPlants) {
                        a.style.width = imgWidth;
                        a.style.height = imgHeight;
                    }
                    
                    const img = document.createElement('img');
                    img.src = item.src;
                    img.alt = item.title || '';
                    img.style.objectFit = 'cover';
                    img.style.width = '100%';
                    img.style.height = '100%';
                    
                    a.appendChild(img);
                    
                    // Click handler
                    a.addEventListener('click', (e) => {
                        e.preventDefault();
                        lightbox.open(items, idx);
                    });
                    
                    galleryEl.appendChild(a);
                });
                console.log(`Loaded ${items.length} images for ${galleryId}`);
            })
            .catch(err => console.error(`Error loading gallery ${galleryId}:`, err));
    };

    // Load galleries
    initGallery('railway-gallery', 'static/assets/gallery/railway/list.json');
    initGallery('plants-gallery', 'static/assets/gallery/plants/list.json');

}); 

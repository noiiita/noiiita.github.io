const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['home', 'publications', 'gallery']


window.addEventListener('DOMContentLoaded', event => {

    // Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            offset: 200,
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

    // Dynamic navbar style change on scroll
    const scrollThreshold = 600; // pixels to scroll before changing style
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > scrollThreshold) {
            mainNav.classList.add('scrolled');
        } else {
            mainNav.classList.remove('scrolled');
        }
    });

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

    // Auto-collapse navbar after 3 seconds on mobile - with smooth animations
    let navbarAutoCollapseTimer = null;
    let isAnimating = false;
    
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('#navbarResponsive');
    
    if (navbarToggler && navbarCollapse) {
        // Handle navbar toggle button click
        navbarToggler.addEventListener('click', function() {
            // Prevent multiple rapid clicks
            if (isAnimating) return;
            
            isAnimating = true;
            
            // Clear any existing timer
            if (navbarAutoCollapseTimer) {
                clearTimeout(navbarAutoCollapseTimer);
                navbarAutoCollapseTimer = null;
            }
            
            const isExpanded = navbarCollapse.classList.contains('show');
            
            if (!isExpanded) {
                // Navbar is being opened - set auto-collapse timer
                // Use setTimeout to ensure CSS transition has time to trigger
                setTimeout(() => {
                    navbarAutoCollapseTimer = setTimeout(function() {
                        if (navbarCollapse.classList.contains('show') && !isAnimating) {
                            collapseNavbar();
                        }
                    }, 3000);
                }, 100);
            }
            
            // Reset animation flag after transition
            setTimeout(() => {
                isAnimating = false;
            }, 350);
        });
        
        // Function to collapse navbar with animation
        function collapseNavbar() {
            if (isAnimating) return;
            isAnimating = true;
            
            const navLinks = navbarCollapse.querySelectorAll('.nav-link');
            
            // Apply fade out animation to all links
            navLinks.forEach((link, index) => {
                setTimeout(() => {
                    link.style.animation = 'fadeOut 0.2s ease forwards';
                }, index * 30); // Faster staggered animation
            });
            
            // Collapse after animations complete
            setTimeout(() => {
                navbarToggler.click(); // Trigger Bootstrap collapse
                isAnimating = false;
                
                // Clear animation styles after collapse
                setTimeout(() => {
                    navLinks.forEach(link => {
                        link.style.animation = '';
                    });
                }, 300);
            }, 250);
        }
        
        // Handle individual nav link clicks
        const navLinks = navbarCollapse.querySelectorAll('.nav-link');
        //navLinks.forEach(link => {
        //    link.addEventListener('click', function() {
        //        if (window.getComputedStyle(navbarToggler).display !== 'none') {
        //           collapseNavbar();
        //       }
        //   });
        
    }

    // Collapse responsive navbar when toggler is visible
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                // Add fade out animation
                //responsiveNavItem.style.animation = 'fadeOut 0.3s ease forwards';
                
                // Collapse navbar after short delay
                setTimeout(() => {
                    navbarToggler.click();
                }, 200);
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
        touchStartX: 0,
        touchEndX: 0,

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
            
            // Mouse wheel support
            document.addEventListener('wheel', (e) => {
                if (!this.el.classList.contains('active')) return;
                e.preventDefault();
                if (e.deltaY > 0) {
                    this.next();
                } else {
                    this.prev();
                }
            }, { passive: false });
            
            // Touch gesture support
            this.el.addEventListener('touchstart', (e) => {
                this.touchStartX = e.changedTouches[0].screenX;
            });
            
            this.el.addEventListener('touchend', (e) => {
                this.touchEndX = e.changedTouches[0].screenX;
                this.handleSwipe();
            });
        },

        handleSwipe() {
            const swipeThreshold = 50;
            const diff = this.touchStartX - this.touchEndX;
            
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    // Swipe left - next
                    this.next();
                } else {
                    // Swipe right - prev
                    this.prev();
                }
            }
        },

        open(items, index) {
            this.items = items;
            this.currentIndex = index;
            this.show();
            
            // Show lightbox first (display: flex)
            this.el.style.display = 'flex';
            
            // Then trigger fade in animation
            setTimeout(() => {
                this.el.classList.add('active');
            }, 10);
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        },

        close() {
            // Trigger fade out animation
            this.el.classList.remove('active');
            
            // Wait for fade out to complete, then hide
            setTimeout(() => {
                this.el.style.display = 'none';
                
                // Restore body scroll
                document.body.style.overflow = '';
            }, 400);
        },

        show() {
            const item = this.items[this.currentIndex];
            
            // Direct image switch without fade animation
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

    // Initialize galleries for Railway, Plants, and Sciviz
    const initGallery = (galleryId, jsonFile, options = {}) => {
        const galleryEl = document.getElementById(galleryId);
        if (!galleryEl) {
            console.log(`Gallery element not found: ${galleryId}`);
            return;
        }

        const isPlants = galleryId === 'plants-gallery';
        const isSciviz = galleryId === 'sciviz-gallery';
        const imgWidth = isPlants ? '180px' : 'auto';
        const imgHeight = isPlants ? '180px' : 'auto';

        fetch(jsonFile)
            .then(r => r.json())
            .then(items => {
                let sortedItems = [...items];
                let firstItem = null;
                
                // For sciviz: sciviz-01.jpg and sciviz-02.jpg always first, others random
                if (isSciviz) {
                    const firstItem = items.find(item => item.src && item.src.includes('sciviz-01.jpg'));
                    const secondItem = items.find(item => item.src && item.src.includes('sciviz-02.jpg'));
                    const otherItems = items.filter(item => !(item.src && (item.src.includes('sciviz-01.jpg') || item.src.includes('sciviz-02.jpg'))));
                    // Shuffle other items randomly
                    for (let i = otherItems.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [otherItems[i], otherItems[j]] = [otherItems[j], otherItems[i]];
                    }
                    // Create sorted array with first and second items at the beginning
                    sortedItems = [];
                    if (firstItem) sortedItems.push(firstItem);
                    if (secondItem) sortedItems.push(secondItem);
                    sortedItems = [...sortedItems, ...otherItems];
                    
                    // Create first image container separately (outside masonry)
                    if (firstItem) {
                        const firstContainer = document.getElementById('sciviz-first-image');
                        if (firstContainer) {
                            const a = document.createElement('a');
                            a.className = 'pswp-image sciviz-first-item';
                            a.style.display = 'block';
                            a.style.width = '100%';
                            a.style.borderRadius = '12px';
                            a.style.overflow = 'hidden';
                            a.style.cursor = 'pointer';
                            a.style.marginBottom = '20px';
                            
                            const img = document.createElement('img');
                            img.src = firstItem.src;
                            img.alt = firstItem.title || '';
                            img.style.width = '100%';
                            img.style.height = 'auto';
                            img.style.display = 'block';
                            
                            a.appendChild(img);
                            
                            if (firstItem.title) {
                                const caption = document.createElement('div');
                                caption.className = 'gallery-caption';
                                caption.textContent = firstItem.title;
                                a.appendChild(caption);
                            }
                            
                            a.addEventListener('click', (e) => {
                                e.preventDefault();
                                lightbox.open(sortedItems, 0);
                            });
                            
                            firstContainer.appendChild(a);
                        }
                    }
                    
                    // Create second image container separately (outside masonry)
                    if (secondItem) {
                        const secondContainer = document.getElementById('sciviz-second-image');
                        if (secondContainer) {
                            const a = document.createElement('a');
                            a.className = 'pswp-image sciviz-first-item';
                            a.style.display = 'block';
                            a.style.width = '100%';
                            a.style.borderRadius = '12px';
                            a.style.overflow = 'hidden';
                            a.style.cursor = 'pointer';
                            a.style.marginBottom = '20px';
                            
                            const img = document.createElement('img');
                            img.src = secondItem.src;
                            img.alt = secondItem.title || '';
                            img.style.width = '100%';
                            img.style.height = 'auto';
                            img.style.display = 'block';
                            
                            a.appendChild(img);
                            
                            if (secondItem.title) {
                                const caption = document.createElement('div');
                                caption.className = 'gallery-caption';
                                caption.textContent = secondItem.title;
                                a.appendChild(caption);
                            }
                            
                            a.addEventListener('click', (e) => {
                                e.preventDefault();
                                lightbox.open(sortedItems, 1);
                            });
                            
                            secondContainer.appendChild(a);
                        }
                    }
                }

                sortedItems.forEach((item, idx) => {
                    // Skip first two items for sciviz (already rendered above)
                    if (isSciviz && (idx === 0 || idx === 1)) return;
                    
                    const a = document.createElement('a');
                    a.className = 'pswp-image';
                    
                    // Add featured class if item has featured flag
                    if (item.featured) {
                        a.classList.add('featured');
                    }
                    
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
                    img.style.objectFit = isSciviz ? 'contain' : 'cover';
                    img.style.width = '100%';
                    img.style.height = isSciviz ? 'auto' : '100%';
                    
                    a.appendChild(img);
                    
                    // Create caption element for hover effect
                    if (item.title) {
                        const caption = document.createElement('div');
                        caption.className = 'gallery-caption';
                        caption.textContent = item.title;
                        a.appendChild(caption);
                    }
                    
                    // Click handler - adjust index for sciviz
                    a.addEventListener('click', (e) => {
                        e.preventDefault();
                        lightbox.open(sortedItems, idx);
                    });
                    
                    galleryEl.appendChild(a);
                });
                console.log(`Loaded ${sortedItems.length} images for ${galleryId}`);
            })
            .catch(err => console.error(`Error loading gallery ${galleryId}:`, err));
    };

    // Load galleries
    initGallery('sciviz-gallery', 'static/assets/gallery/sciviz/list.json');
    initGallery('railway-gallery', 'static/assets/gallery/railway/list.json');
    initGallery('plants-gallery', 'static/assets/gallery/plants/list.json');

    // Fade-in effect on scroll for gallery sections
    const fadeOnScrollElements = document.querySelectorAll('.fade-on-scroll');
    const earlyTriggerElements = document.querySelectorAll('.early-trigger');
    
    // Standard observer options
    const standardObserverOptions = {
        threshold: 0.0, // Trigger as soon as any part of the element is visible
        rootMargin: '200px 0px -100px 0px' // Trigger much earlier: 200px before element enters viewport
    };
    
    // Early trigger observer options (trigger even earlier)
    const earlyObserverOptions = {
        threshold: 0.0, // Trigger as soon as any part of the element is visible
        rootMargin: '300px 0px -100px 0px' // Trigger even earlier: 300px before element enters viewport
    };
    
    const standardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            } else {
                entry.target.classList.remove('visible');
            }
        });
    }, standardObserverOptions);
    
    const earlyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            } else {
                entry.target.classList.remove('visible');
            }
        });
    }, earlyObserverOptions);
    
    fadeOnScrollElements.forEach(element => {
        if (!element.classList.contains('early-trigger')) {
            standardObserver.observe(element);
        }
    });
    
    earlyTriggerElements.forEach(element => {
        earlyObserver.observe(element);
    });

    // 暗黑模式切换功能
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    // 检查本地存储中的主题设置
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        htmlElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    // 切换主题
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    // 更新主题图标
    function updateThemeIcon(theme) {
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
            }
        }
    }

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            htmlElement.setAttribute('data-theme', newTheme);
            updateThemeIcon(newTheme);
        }
    });

    // Top section mouse follow blur effect
    const topSection = document.querySelector('.top-section');
    const videoMask = document.querySelector('.video-mask');

    if (topSection && videoMask) {
        topSection.addEventListener('mousemove', (e) => {
            const rect = topSection.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            videoMask.style.setProperty('--x', `${x}px`);
            videoMask.style.setProperty('--y', `${y}px`);
        });

        topSection.addEventListener('mouseleave', () => {
            videoMask.style.opacity = '0';
        });

        topSection.addEventListener('mouseenter', () => {
            videoMask.style.opacity = '1';
        });
    }

}); 

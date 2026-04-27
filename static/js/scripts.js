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

    // Fade out hero name on scroll - simple smooth upward fade
    const heroName = document.querySelector('.hero-name');
    if (heroName) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            // Fade out and move up smoothly as user scrolls
            const maxScroll = 120; // Adjust this value to control how long the fade takes
            
            if (scrollY <= maxScroll) {
                const opacity = Math.max(0, 1 - scrollY / maxScroll);
                //const translateY = -scrollY * 0.3; // Adjust multiplier for speed of upward movement
                
                heroName.style.opacity = opacity;
                //heroName.style.transform = `translateY(${translateY}px)`;
                heroName.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
            } else {
                // Completely hidden after maxScroll
                heroName.style.opacity = '0';
                //heroName.style.transform = `translateY(-30px)`; // Move up enough to be out of view
                heroName.style.pointerEvents = 'none';
            }
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
            // Check current state BEFORE Bootstrap processes the click
            const isExpanded = navbarCollapse.classList.contains('show');
            
            if (!isExpanded) {
                // Menu is opening - set auto-collapse timer
                clearAutoCollapseTimer();
                navbarAutoCollapseTimer = setTimeout(function() {
                    collapseNavbar();
                }, 3000);
            } else {
                // Menu is closing - clear auto-collapse timer
                clearAutoCollapseTimer();
            }
        });
        
        // Function to clear auto-collapse timer
        function clearAutoCollapseTimer() {
            if (navbarAutoCollapseTimer) {
                clearTimeout(navbarAutoCollapseTimer);
                navbarAutoCollapseTimer = null;
            }
        }
        
        // Function to collapse navbar with animation
        function collapseNavbar() {
            if (isAnimating) return;
            if (!navbarCollapse.classList.contains('show')) return;
            
            isAnimating = true;
            
            const navLinks = navbarCollapse.querySelectorAll('.nav-link');
            
            // Apply fade out animation to all links
            navLinks.forEach((link, index) => {
                setTimeout(() => {
                    link.style.animation = 'fadeOut 0.2s ease forwards';
                }, index * 30);
            });
            
            // Collapse after animations complete using Bootstrap API
            setTimeout(() => {
                const bsCollapse = bootstrap.Collapse.getOrCreateInstance(navbarCollapse);
                bsCollapse.hide();
            }, 250);
        }
        
        // Listen to Bootstrap collapse events for proper state management
        navbarCollapse.addEventListener('hide.bs.collapse', function() {
            isAnimating = true;
        });
        
        navbarCollapse.addEventListener('hidden.bs.collapse', function() {
            isAnimating = false;
            clearAutoCollapseTimer();
            
            // Clear animation styles
            const navLinks = navbarCollapse.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.style.animation = '';
            });
        });
        
        navbarCollapse.addEventListener('show.bs.collapse', function() {
            isAnimating = true;
        });
        
        navbarCollapse.addEventListener('shown.bs.collapse', function() {
            isAnimating = false;
        });
    }

    // Collapse responsive navbar when nav link is clicked
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link, #navbarResponsive button.nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                // Clear auto-collapse timer since user is navigating
                clearAutoCollapseTimer();
                
                // Close navbar immediately using Bootstrap API
                const bsCollapse = bootstrap.Collapse.getOrCreateInstance(navbarCollapse);
                bsCollapse.hide();
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

    Promise.all(section_names.map(name => {
        return fetch(content_dir + name + '.md')
            .then(response => response.text())
            .then(markdown => {
                const html = marked.parse(markdown);
                document.getElementById(name + '-md').innerHTML = html;
            })
            .catch(error => console.log(error));
    })).then(() => {
        // MathJax
        MathJax.typeset();
        // Setup scroll animation after content is loaded
        console.log('Content loaded, setting up scroll animation...');
        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            setupScrollAnimation();
        } else {
            console.error('GSAP or ScrollTrigger not available');
        }
    });

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
        // 初始设置videoMask为可见
        videoMask.style.opacity = '1';
        
        // 鼠标移动事件，更新模糊区域位置
        document.addEventListener('mousemove', (e) => {
            const x = e.clientX;
            const y = e.clientY;
            
            videoMask.style.setProperty('--x', `${x}px`);
            videoMask.style.setProperty('--y', `${y}px`);
        });
    }

    // Scroll effects for video background and sections
    // Use existing heroName variable declared earlier
    const homeSection = document.querySelector('.home-section-with-video-bg');
    const videoBackground = document.querySelector('.top-section-video');
    const videoBackgroundContainer = document.querySelector('.video-background-container');
    const publicationsSection = document.getElementById('publications');

    function handleScroll() {
        if (!homeSection || !videoBackground || !publicationsSection) return;
        
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        
        // Calculate positions
        const homeSectionTop = homeSection.offsetTop;
        const homeSectionHeight = homeSection.offsetHeight;
        const publicationsTop = publicationsSection.offsetTop;
        
        // Calculate when home section is fully visible
        const homeSectionVisible = scrollY >= homeSectionTop - windowHeight;
        const homeSectionFullyVisible = scrollY >= homeSectionTop;
        const nearPublications = scrollY >= publicationsTop - windowHeight * 1.5;
        
        // When near publications, start fading out video background
        if (nearPublications) {
            const fadeOutPercentage = (scrollY - (publicationsTop - windowHeight * 1.5)) / (windowHeight * 0.5);
            const videoOpacity = Math.max(0.7, 1 - fadeOutPercentage); // 最小透明度为0.5，而不是0
            videoBackground.style.opacity = videoOpacity;
            if (videoMask) {
                videoMask.style.opacity = videoOpacity;
            }
        } else {
            videoBackground.style.opacity = '1';
            if (videoMask) {
                videoMask.style.opacity = '1';
            }
        }
    }

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Call once after DOM is fully loaded to set initial state
    handleScroll();

    // Initialize railway mileage charts
    (function initCharts() {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        var textColor = isDark ? '#e0e0e0' : '#333';
        var subColor = isDark ? '#ffffffff' : '#666';
        var lineLen = 26;
        var animSpeed =0.32;

        var labelPlugin = {
            id: 'doughnutLabels',
            beforeDraw: function(chart) {
                var ctx = chart.ctx;
                var area = chart.chartArea;
                var cx = (area.left + area.right) / 2;
                var cy = (area.top + area.bottom) / 2;
                var title = chart.options._centerTitle;
                if (!title) return;

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.font = 'bold 28px sans-serif';
                ctx.fillStyle = textColor;
                ctx.fillText(title.big, cx, cy - 6);

                ctx.font = '13px sans-serif';
                ctx.fillStyle = subColor;
                ctx.fillText(title.small, cx, cy + 18);
            },
            afterDraw: function(chart) {
                var ctx = chart.ctx;
                var meta = chart.getDatasetMeta(0);
                var dataset = chart.data.datasets[0];
                var total = dataset.data.reduce(function(a, b) { return a + b; }, 0);
                var anims = chart._hoverAnims;
                var positions = [];

                function lerp(a, b, t) { return a + (b - a) * t; }

                meta.data.forEach(function(arc, i) {
                    var value = dataset.data[i];
                    if (value === 0) return;

                    var t = anims ? (anims[i] || 0) : 0;
                    var angle = (arc.startAngle + arc.endAngle) / 2;
                    var outerR = arc.outerRadius;

                    var sx = arc.x + Math.cos(angle) * outerR;
                    var sy = arc.y + Math.sin(angle) * outerR;
                    var ex = arc.x + Math.cos(angle) * (outerR + lineLen);
                    var ey = arc.y + Math.sin(angle) * (outerR + lineLen);

                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(ex, ey);
                    ctx.strokeStyle = dataset.backgroundColor[i];
                    ctx.lineWidth = lerp(1.5, 3, t);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(sx, sy, lerp(3, 6, t), 0, Math.PI * 2);
                    ctx.fillStyle = dataset.backgroundColor[i];
                    ctx.fill();

                    var pct = ((value / total) * 100).toFixed(1);
                    var label = chart.data.labels[i];
                    var tx = arc.x + Math.cos(angle) * (outerR + lineLen + lerp(10, 18, t));
                    var ty = arc.y + Math.sin(angle) * (outerR + lineLen);

                    positions.push({ x: tx, y: ty });

                    var isRight = Math.cos(angle) >= 0;
                    ctx.textAlign = isRight ? 'left' : 'right';
                    ctx.textBaseline = 'middle';

                    var labelSize = Math.round(lerp(13,14, t));
                    var valSize = Math.round(lerp(12, 18, t));
                    var rowH = Math.round(lerp(14, 20, t));

                    ctx.font = labelSize + 'px sans-serif';
                    ctx.fillStyle = textColor;
                    ctx.fillText(label, tx, ty - rowH);

                    ctx.font = valSize + 'px sans-serif';
                    ctx.fillStyle = subColor;
                    ctx.fillText(value + ' km', tx, ty);

                    ctx.font = valSize + 'px sans-serif';
                    ctx.fillStyle = subColor;
                    ctx.fillText(pct + '%', tx, ty + rowH);
                });

                chart._labelPositions = positions;
            }
        };

        var tooltipCb = function(ctx) {
            var v = ctx.parsed;
            var total = ctx.dataset.data.reduce(function(a, b) { return a + b; }, 0);
            var pct = ((v / total) * 100).toFixed(1);
            return ctx.label + ': ' + v + ' km (' + pct + '%)';
        };

        var basePadding = { top: 50, bottom: 50, left: 60, right: 60 };

        function bindHover(chartInstance, canvas) {
            var count = chartInstance.data.datasets[0].data.length;
            var targets = new Array(count).fill(0);
            var anims = new Array(count).fill(0);
            chartInstance._hoverAnims = anims;
            var running = false;

            function tick() {
                var changed = false;
                for (var i = 0; i < count; i++) {
                    var diff = targets[i] - anims[i];
                    if (Math.abs(diff) < 0.005) {
                        anims[i] = targets[i];
                    } else {
                        anims[i] += diff * animSpeed;
                        changed = true;
                    }
                }
                if (changed) {
                    chartInstance.draw();
                    requestAnimationFrame(tick);
                } else {
                    running = false;
                }
            }

            function startAnim() {
                if (!running) {
                    running = true;
                    requestAnimationFrame(tick);
                }
            }

            function getHoverIndex(e) {
                var pts = chartInstance.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
                if (pts.length) return pts[0].index;

                var labelPositions = chartInstance._labelPositions;
                if (!labelPositions) return -1;

                var rect = canvas.getBoundingClientRect();
                var mx = e.clientX - rect.left;
                var my = e.clientY - rect.top;
                var threshold = 40;

                for (var i = 0; i < labelPositions.length; i++) {
                    var dx = mx - labelPositions[i].x;
                    var dy = my - labelPositions[i].y;
                    if (dx * dx + dy * dy < threshold * threshold) {
                        return i;
                    }
                }
                return -1;
            }

            canvas.addEventListener('mousemove', function(e) {
                var hoverIdx = getHoverIndex(e);
                for (var i = 0; i < count; i++) {
                    targets[i] = (i === hoverIdx) ? 1 : 0;
                }
                startAnim();
            });
            canvas.addEventListener('mouseleave', function() {
                targets.fill(0);
                startAnim();
            });
        }

        var mileageCtx = document.getElementById('mileageChart');
        if (mileageCtx) {
            try {
                var chart1 = new Chart(mileageCtx, {
                    type: 'doughnut',
                    plugins: [labelPlugin],
                    data: {
                        labels: ['高速铁路', '普速铁路'],
                        datasets: [{
                            data: [6758, 3378],
                            backgroundColor: ['#af4949ff', '#4b8f5aff'],
                            borderColor: ['#b03434ff', '#176929ff'],
                            borderWidth: 1,
                            hoverOffset: 12,
                            radius: '73%'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '72%',
                        layout: { padding: basePadding },
                        _centerTitle: { big: '10136 km', small: '总运转里程' },
                        plugins: {
                            legend: { display: false },
                            tooltip: { callbacks: { label: tooltipCb } }
                        }
                    }
                });
                bindHover(chart1, mileageCtx);
            } catch (e) {
                console.error('Error creating mileageChart:', e);
            }
        }

        var highSpeedCtx = document.getElementById('highSpeedChart');
        if (highSpeedCtx) {
            try {
                var chart2 = new Chart(highSpeedCtx, {
                    type: 'doughnut',
                    plugins: [labelPlugin],
                    data: {
                        labels: ['已运转高铁', '未运转高铁'],
                        datasets: [{
                            data: [6758, 50400 - 6758],
                            backgroundColor: ['#527fe8ff', '#7e7e7eff'],
                            borderColor: ['#2a36b1', '#484848ff'],
                            borderWidth: 1,
                            hoverOffset: 12,
                            radius: '73%'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '72%',
                        layout: { padding: basePadding },
                        _centerTitle: { big: '50400 km', small: '全国高铁总里程' },
                        plugins: {
                            legend: { display: false },
                            tooltip: { callbacks: { label: tooltipCb } }
                        }
                    }
                });
                bindHover(chart2, highSpeedCtx);
            } catch (e) {
                console.error('Error creating highSpeedChart:', e);
            }
        }
    })();

    // Advanced scroll-reveal text animation with GSAP + ScrollTrigger
    function setupScrollAnimation() {
        console.log('setupScrollAnimation called');
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
            console.error('GSAP or ScrollTrigger not defined');
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        const sections = [
            { selector: '.home-section-with-video-bg', containerId: 'home-md' },
            { selector: '#publications', containerId: 'publications-md' }
        ];

        sections.forEach(section => {
            const sectionEl = document.querySelector(section.selector);
            const container = section.containerId ? document.getElementById(section.containerId) : null;

            if (!sectionEl) {
                console.log(`Section ${section.selector} not found`);
                return;
            }

            const targetElements = container ?
                container.querySelectorAll('p, li, span') :
                sectionEl.querySelectorAll('p, li, span');

            console.log(`Section ${section.selector}: found ${targetElements.length} elements`);

            if (targetElements.length === 0) return;

            targetElements.forEach((element, index) => {
                if (!element.textContent.trim()) return;

                element.classList.add('scroll-reveal-init');

                gsap.fromTo(element,
                    { opacity: 0.25 },
                    {
                        opacity: 1,
                        duration: 1,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: element,
                            start: 'top 90%',
                            end: 'top 60%',
                            scrub: true
                        }
                    }
                );
            });
        });
    }

    // Home subtitle letter hover effect
    function setupHomeSubtitleEffect() {
        const letters = document.querySelectorAll('#home-subtitle .letter');
        letters.forEach(letter => {
            letter.addEventListener('mouseenter', function() {
                this.style.fontVariationSettings = '"wdth" 125, "wght" 700';
                this.style.transform = 'scale(1.1)';
            });
            letter.addEventListener('mouseleave', function() {
                this.style.fontVariationSettings = '"wdth" 100, "wght" 400';
                this.style.transform = 'scale(1)';
            });
        });
    }

    // High-performance Magnetic Hero Letter Effect
    function setupHeroNameEffect() {
        console.log('setupHeroNameEffect called');
        const heroName = document.querySelector('.top-section .hero-name');
        
        if (!heroName) {
            console.log('Hero name not found');
            return;
        }
        
        console.log('Setting up magnetic hero letter effect');
        console.log('Hero name element:', heroName);
        
        // Fix visibility and pointer events
        heroName.style.opacity = '1';
        heroName.style.pointerEvents = 'auto';
        console.log('Fixed hero name visibility and pointer events');
        
        // Force split text into individual letters regardless of existing elements
        console.log('Forcing split of text into letters');
        const text = heroName.textContent;
        console.log('Hero name text:', text);
        heroName.innerHTML = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const span = document.createElement('span');
            span.className = 'hero-letter';
            span.textContent = char;
            span.tabIndex = 0;
            heroName.appendChild(span);
            console.log('Created letter span:', char);
        }
        
        let letters = document.querySelectorAll('.top-section .hero-letter');
        console.log('Letters after splitting:', letters.length);
        
        // Convert NodeList to array
        letters = Array.from(letters);
        console.log('Letters after conversion to array:', letters.length);
        
        console.log('Found letters:', letters.length);
        letters.forEach((letter, index) => {
            console.log('Letter', index, ':', letter.textContent, letter);
        });
        
        // Configuration
        const config = {
            defaultWeight: 300,
            defaultWidth: 100,
            maxWeight: 900,
            maxWidth: 150,
            maxDistance: 200,
            lerpFactor: 0.15
        };
        
        // Initialize letter state
        const letterStates = letters.map(() => ({
            targetWeight: config.defaultWeight,
            targetWidth: config.defaultWidth,
            currentWeight: config.defaultWeight,
            currentWidth: config.defaultWidth
        }));
        
        // Animation loop
        let animationId = null;
        
        function animate() {
            let hasChanges = false;
            
            letters.forEach((letter, index) => {
                const state = letterStates[index];
                
                // Lerp to target values
                const newWeight = state.currentWeight + (state.targetWeight - state.currentWeight) * config.lerpFactor;
                const newWidth = state.currentWidth + (state.targetWidth - state.currentWidth) * config.lerpFactor;
                
                // Check if values have changed significantly
                if (Math.abs(newWeight - state.currentWeight) > 0.1 || Math.abs(newWidth - state.currentWidth) > 0.1) {
                    state.currentWeight = newWeight;
                    state.currentWidth = newWidth;
                    hasChanges = true;
                    
                    // Apply styles using font-variation-settings
                    letter.style.fontVariationSettings = `"wght" ${Math.round(newWeight)}, "wdth" ${Math.round(newWidth)}`;
                    console.log('Applied styles to:', letter.textContent, 'fontVariationSettings:', letter.style.fontVariationSettings);
                }
            });
            
            if (hasChanges) {
                animationId = requestAnimationFrame(animate);
            }
        }
        
        // Mouse move handler
        function handleMouseMove(e) {
            console.log('Mouse move event triggered at:', e.clientX, e.clientY);
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            letters.forEach((letter, index) => {
                const rect = letter.getBoundingClientRect();
                console.log('Letter', letter.textContent, 'rect:', rect);
                const letterX = rect.left + rect.width / 2;
                const letterY = rect.top + rect.height / 2;
                
                const dx = mouseX - letterX;
                const dy = mouseY - letterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                console.log('Letter', letter.textContent, 'distance:', distance);
                
                if (distance < config.maxDistance) {
                    const intensity = 1 - Math.min(distance / config.maxDistance, 1);
                    const weight = config.defaultWeight + (config.maxWeight - config.defaultWeight) * intensity;
                    const width = config.defaultWidth + (config.maxWidth - config.defaultWidth) * intensity;
                    
                    console.log('Setting target style for:', letter.textContent, 'Distance:', distance, 'Intensity:', intensity, 'Weight:', weight, 'Width:', width);
                    
                    // Update target values
                    letterStates[index].targetWeight = weight;
                    letterStates[index].targetWidth = width;
                } else {
                    // Reset to default
                    console.log('Resetting target style for:', letter.textContent);
                    letterStates[index].targetWeight = config.defaultWeight;
                    letterStates[index].targetWidth = config.defaultWidth;
                }
            });
            
            // Start animation if not already running
            if (!animationId) {
                animationId = requestAnimationFrame(animate);
            }
        }
        
        // Mouse leave handler
        function handleMouseLeave() {
            console.log('Mouse leave event triggered');
            letters.forEach((letter, index) => {
                // Reset to default
                console.log('Resetting target style for:', letter.textContent);
                letterStates[index].targetWeight = config.defaultWeight;
                letterStates[index].targetWidth = config.defaultWidth;
            });
            
            // Start animation if not already running
            if (!animationId) {
                animationId = requestAnimationFrame(animate);
            }
        }
        
        // Add event listeners
        console.log('Adding event listeners to heroName element');
        heroName.addEventListener('mousemove', handleMouseMove);
        heroName.addEventListener('mouseleave', handleMouseLeave);
        
        // Add mouseenter event listener for debugging
        heroName.addEventListener('mouseenter', function(e) {
            console.log('Mouse entered heroName element at:', e.clientX, e.clientY);
        });
        
        console.log('Magnetic hero letter effect initialized');
        console.log('Event listeners added successfully');
        
        // Test the event listeners by triggering a mouseenter event
        console.log('Testing event listeners...');
        const testEvent = new MouseEvent('mouseenter', {
            clientX: 100,
            clientY: 100,
            bubbles: true,
            cancelable: true
        });
        heroName.dispatchEvent(testEvent);
    }

    // Setup test hero name effect (now used for the main hero name)
    function setupTestHeroNameEffect() {
        console.log('setupTestHeroNameEffect called');
        const heroName = document.querySelector('.top-section .test-hero-name');
        
        if (!heroName) {
            console.log('Test hero name not found');
            return;
        }
        
        console.log('Setting up test magnetic hero letter effect');
        console.log('Test hero name element:', heroName);
        
        // Fix visibility and pointer events
        heroName.style.opacity = '1';
        heroName.style.pointerEvents = 'auto';
        console.log('Fixed test hero name visibility and pointer events');
        
        // Force split text into individual letters
        console.log('Forcing split of test text into letters');
        const text = heroName.textContent;
        console.log('Test hero name text:', text);
        heroName.innerHTML = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const span = document.createElement('span');
            span.className = 'test-hero-letter';
            span.textContent = char;
            span.tabIndex = 0;
            heroName.appendChild(span);
            console.log('Created test letter span:', char);
        }
        
        let letters = document.querySelectorAll('.top-section .test-hero-letter');
        console.log('Test letters after splitting:', letters.length);
        
        // Convert NodeList to array
        letters = Array.from(letters);
        console.log('Test letters after conversion to array:', letters.length);
        
        // Log each letter
        letters.forEach((letter, index) => {
            console.log('Test letter', index, ':', letter.textContent, letter);
        });
        
        // Configuration
        const config = {
            defaultWeight: 300,
            defaultWidth: 100,
            maxWeight: 800,
            maxWidth: 130,
            maxDistance: 200,
            lerpFactor: 0.15,
            falloffPower: 2
        };
        
        // Initialize letter state
        const letterStates = letters.map(() => ({
            targetWeight: config.defaultWeight,
            targetWidth: config.defaultWidth,
            currentWeight: config.defaultWeight,
            currentWidth: config.defaultWidth
        }));
        
        // Animation loop
        let animationId = null;
        
        function animate() {
            let hasChanges = false;
            
            letters.forEach((letter, index) => {
                const state = letterStates[index];
                
                // Lerp to target values
                const newWeight = state.currentWeight + (state.targetWeight - state.currentWeight) * config.lerpFactor;
                const newWidth = state.currentWidth + (state.targetWidth - state.currentWidth) * config.lerpFactor;
                
                // Check if values have changed significantly
                if (Math.abs(newWeight - state.currentWeight) > 0.1 || Math.abs(newWidth - state.currentWidth) > 0.1) {
                    state.currentWeight = newWeight;
                    state.currentWidth = newWidth;
                    hasChanges = true;
                    
                    // Apply styles using font-variation-settings
                    letter.style.fontVariationSettings = `"wght" ${Math.round(newWeight)}, "wdth" ${Math.round(newWidth)}`;
                    console.log('Applied test styles to:', letter.textContent, 'fontVariationSettings:', letter.style.fontVariationSettings);
                }
            });
            
            if (hasChanges) {
                animationId = requestAnimationFrame(animate);
            }
        }
        
        // Mouse move handler
        function handleMouseMove(e) {
            console.log('Test mouse move event triggered at:', e.clientX, e.clientY);
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            letters.forEach((letter, index) => {
                const rect = letter.getBoundingClientRect();
                console.log('Test letter', letter.textContent, 'rect:', rect);
                const letterX = rect.left + rect.width / 2;
                const letterY = rect.top + rect.height / 2;
                
                const dx = mouseX - letterX;
                const dy = mouseY - letterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                console.log('Test letter', letter.textContent, 'distance:', distance);
                
                if (distance < config.maxDistance) {
                    const intensity = 1 - Math.min(distance / config.maxDistance, 1);
                    const weight = config.defaultWeight + (config.maxWeight - config.defaultWeight) * intensity;
                    const width = config.defaultWidth + (config.maxWidth - config.defaultWidth) * intensity;
                    
                    console.log('Setting target test style for:', letter.textContent, 'Distance:', distance, 'Intensity:', intensity, 'Weight:', weight, 'Width:', width);
                    
                    // Update target values
                    letterStates[index].targetWeight = weight;
                    letterStates[index].targetWidth = width;
                } else {
                    // Reset to default
                    console.log('Resetting target test style for:', letter.textContent);
                    letterStates[index].targetWeight = config.defaultWeight;
                    letterStates[index].targetWidth = config.defaultWidth;
                }
            });
            
            // Start animation if not already running
            if (!animationId) {
                animationId = requestAnimationFrame(animate);
            }
        }
        
        // Mouse leave handler
        function handleMouseLeave() {
            console.log('Test mouse leave event triggered');
            letters.forEach((letter, index) => {
                // Reset to default
                console.log('Resetting target test style for:', letter.textContent);
                letterStates[index].targetWeight = config.defaultWeight;
                letterStates[index].targetWidth = config.defaultWidth;
            });
            
            // Start animation if not already running
            if (!animationId) {
                animationId = requestAnimationFrame(animate);
            }
        }
        
        // Add event listeners
        console.log('Adding event listeners to test heroName element');
        heroName.addEventListener('mousemove', handleMouseMove);
        heroName.addEventListener('mouseleave', handleMouseLeave);
        
        // Add mouseenter event listener for debugging
        heroName.addEventListener('mouseenter', function(e) {
            console.log('Test mouse entered heroName element at:', e.clientX, e.clientY);
        });
        
        console.log('Test magnetic hero letter effect initialized');
        console.log('Test event listeners added successfully');
        
        // Test the event listeners by triggering a mouseenter event
        console.log('Testing test event listeners...');
        const testEvent = new MouseEvent('mouseenter', {
            clientX: 100,
            clientY: 100,
            bubbles: true,
            cancelable: true
        });
        heroName.dispatchEvent(testEvent);
    }

    // Setup new hero name effect
    function setupNewHeroNameEffect() {
        console.log('setupNewHeroNameEffect called');
        
        // Get the parent section instead of the text container
        const heroSection = document.querySelector('.new-hero-section');
        const heroName = document.querySelector('.new-hero-letter');
        
        if (!heroName || !heroSection) {
            console.log('New hero name or section not found');
            return;
        }
        
        console.log('Setting up new magnetic hero letter effect');
        console.log('New hero name element:', heroName);
        console.log('New hero section element:', heroSection);
        
        // Fix visibility and pointer events
        heroName.style.opacity = '1';
        heroName.style.pointerEvents = 'auto';
        console.log('Fixed new hero name visibility and pointer events');
        
        // Force split text into individual letters
        console.log('Forcing split of new text into letters');
        const text = heroName.textContent;
        console.log('New hero name text:', text);
        heroName.innerHTML = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const span = document.createElement('span');
            span.className = 'new-hero-letter-span';
            span.textContent = char;
            span.tabIndex = 0;
            heroName.appendChild(span);
            console.log('Created new letter span:', char);
        }
        
        let letters = document.querySelectorAll('.new-hero-letter-span');
        console.log('New letters after splitting:', letters.length);
        
        // Convert NodeList to array
        letters = Array.from(letters);
        console.log('New letters after conversion to array:', letters.length);
        
        // Log each letter
        letters.forEach((letter, index) => {
            console.log('New letter', index, ':', letter.textContent, letter);
        });
        
        // Configuration
        const config = {
            defaultWeight: 100,
            defaultWidth: 87.5,
            maxWeight: 800,
            maxWidth: 150,
            maxDistance: 300,
            lerpFactor: 0.55,
            defaultFontSize: 100, // 100% (默认字体大小)
            maxFontSize: 135,     // 120% (最大字体大小)
            defaultSkew: -10,     // 默认倾斜角度 (-10deg)
            maxSkew: 0            // 最大倾斜角度 (0deg)
        };
        
        // Initialize letter state
        const letterStates = letters.map(() => ({
            targetWeight: config.defaultWeight,
            targetWidth: config.defaultWidth,
            currentWeight: config.defaultWeight,
            currentWidth: config.defaultWidth,
            targetFontSize: config.defaultFontSize,
            currentFontSize: config.defaultFontSize,
            targetSkew: config.defaultSkew,
            currentSkew: config.defaultSkew
        }));
        
        // Animation state
        let animationId = null;
        let isMouseInSection = false;
        
        // Always keep animation running, but change target values based on mouse position
        function animate() {
            let hasChanges = false;
            
            letters.forEach((letter, index) => {
                const state = letterStates[index];
                
                // Lerp to target values
                const newWeight = state.currentWeight + (state.targetWeight - state.currentWeight) * config.lerpFactor;
                const newWidth = state.currentWidth + (state.targetWidth - state.currentWidth) * config.lerpFactor;
                const newFontSize = state.currentFontSize + (state.targetFontSize - state.currentFontSize) * config.lerpFactor;
                const newSkew = state.currentSkew + (state.targetSkew - state.currentSkew) * config.lerpFactor;
                
                // Check if values have changed significantly
                if (Math.abs(newWeight - state.currentWeight) > 0.1 || Math.abs(newWidth - state.currentWidth) > 0.1 || Math.abs(newFontSize - state.currentFontSize) > 0.1 || Math.abs(newSkew - state.currentSkew) > 0.1) {
                    state.currentWeight = newWeight;
                    state.currentWidth = newWidth;
                    state.currentFontSize = newFontSize;
                    state.currentSkew = newSkew;
                    hasChanges = true;
                    
                    // Apply styles using font-variation-settings
                    letter.style.fontVariationSettings = `"wght" ${Math.round(newWeight)}, "wdth" ${Math.round(newWidth)}`;
                    // Apply font size
                    letter.style.fontSize = `${Math.round(newFontSize)}%`;
                    // Apply skew
                    letter.style.transform = `skew(${Math.round(newSkew)}deg)`;
                }
            });
            
            if (hasChanges) {
                animationId = requestAnimationFrame(animate);
            } else {
                animationId = null;
            }
        }
        
        // Mouse move handler - attached to the section
        function handleMouseMove(e) {
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            letters.forEach((letter, index) => {
                const rect = letter.getBoundingClientRect();
                const letterX = rect.left + rect.width / 2;
                const letterY = rect.top + rect.height / 2;
                
                const dx = mouseX - letterX;
                const dy = mouseY - letterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < config.maxDistance) {
                    const intensity = 1 - Math.min(distance / config.maxDistance, 1);
                    const weight = config.defaultWeight + (config.maxWeight - config.defaultWeight) * intensity;
                    const width = config.defaultWidth + (config.maxWidth - config.defaultWidth) * intensity;
                    const fontSize = config.defaultFontSize + (config.maxFontSize - config.defaultFontSize) * intensity;
                    const skew = config.defaultSkew + (config.maxSkew - config.defaultSkew) * intensity;
                    
                    // Update target values
                    letterStates[index].targetWeight = weight;
                    letterStates[index].targetWidth = width;
                    letterStates[index].targetFontSize = fontSize;
                    letterStates[index].targetSkew = skew;
                } else {
                    // Reset to default
                    letterStates[index].targetWeight = config.defaultWeight;
                    letterStates[index].targetWidth = config.defaultWidth;
                    letterStates[index].targetFontSize = config.defaultFontSize;
                    letterStates[index].targetSkew = config.defaultSkew;
                }
            });
            
            // Start animation if not already running
            if (!animationId) {
                animationId = requestAnimationFrame(animate);
            }
        }
        
        // Mouse enter handler - attached to the section
        function handleMouseEnter(e) {
            // Only activate if entering from outside the section
            if (!isMouseInSection) {
                console.log('Mouse entered section');
                isMouseInSection = true;
            }
        }
        
        // Mouse leave handler - attached to the section
        function handleMouseLeave(e) {
            // Only deactivate if actually leaving the section
            if (e.relatedTarget && !heroSection.contains(e.relatedTarget)) {
                console.log('Mouse left section');
                isMouseInSection = false;
                
                // Reset all letters to default
                letters.forEach((letter, index) => {
                    letterStates[index].targetWeight = config.defaultWeight;
                    letterStates[index].targetWidth = config.defaultWidth;
                    letterStates[index].targetFontSize = config.defaultFontSize;
                    letterStates[index].targetSkew = config.defaultSkew;
                });
                
                // Start animation to reset styles
                if (!animationId) {
                    animationId = requestAnimationFrame(animate);
                }
            }
        }
        
        // Scroll handler to check if element is in viewport
        function handleScroll() {
            const rect = heroSection.getBoundingClientRect();
            const isInViewport = (
                rect.top < window.innerHeight &&
                rect.bottom > 0
            );
            
            if (!isInViewport && isMouseInSection) {
                console.log('Section out of viewport, deactivating');
                isMouseInSection = false;
                
                // Reset all letters to default
                letters.forEach((letter, index) => {
                    letterStates[index].targetWeight = config.defaultWeight;
                    letterStates[index].targetWidth = config.defaultWidth;
                    letterStates[index].targetFontSize = config.defaultFontSize;
                    letterStates[index].targetSkew = config.defaultSkew;
                });
                
                // Start animation to reset styles
                if (!animationId) {
                    animationId = requestAnimationFrame(animate);
                }
            }
        }
        
        // Add event listeners to the section instead of the text container
        console.log('Adding event listeners to heroSection element');
        heroSection.addEventListener('mousemove', handleMouseMove);
        heroSection.addEventListener('mouseenter', handleMouseEnter);
        heroSection.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('scroll', handleScroll);
        
        console.log('New magnetic hero letter effect initialized');
        console.log('Event listeners added to section element');
    }

    // Initialize all effects
    setupScrollAnimation();
    // setupHomeSubtitleEffect(); // Disabled to test CSS hover
    setupHeroNameEffect();
    setupTestHeroNameEffect();
    setupNewHeroNameEffect();

});

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
            videoMask.style.opacity = videoOpacity;
        } else {
            videoBackground.style.opacity = '1';
            videoMask.style.opacity = '1';
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
                            data: [6243, 3378],
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
                        _centerTitle: { big: '9621 km', small: '总运转里程' },
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
                            data: [6243, 50000 - 6243],
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
                        _centerTitle: { big: '50000 km', small: '全国高铁总里程' },
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

});

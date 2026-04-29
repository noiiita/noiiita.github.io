(function() {
    'use strict';

    console.log('Gallery Loader initialized');

    var videoEl = document.querySelector('.top-section-video');
    var galleryLoadingStarted = false;
    var scrollAnimator = null;

    var SCROLL_DISTANCE = 350;
    var RANDOM_OFFSET_RANGE = 120;
    var INITIAL_SCALE = 1.3;
    var INITIAL_TRANSLATE_Y = 80;
    var INITIAL_TRANSLATE_X_FACTOR = 0.35;
    var PROGRESS_SMOOTHING = 0.06;

    if (window.innerWidth < 768) {
        SCROLL_DISTANCE = 250;
        RANDOM_OFFSET_RANGE = 80;
        INITIAL_TRANSLATE_Y = 50;
        INITIAL_TRANSLATE_X_FACTOR = 0.25;
        PROGRESS_SMOOTHING = 0.08;
    }

    if (!window.__galleryLazyRegistry) {
        window.__galleryLazyRegistry = {
            elements: [],
            startLoading: null,
            galleryLoadingStarted: false
        };
    }

    function startLoadingGalleries() {
        if (galleryLoadingStarted) return;
        galleryLoadingStarted = true;
        window.__galleryLazyRegistry.galleryLoadingStarted = true;
        console.log('[Gallery Loader] Starting gallery image loading...');

        try {
            var registry = window.__galleryLazyRegistry;
            if (!registry || !registry.elements) {
                console.warn('[Gallery Loader] No registry elements found');
                return;
            }

            var imgCount = 0;
            registry.elements.forEach(function(el) {
                if (el && el.tagName === 'IMG' && el.hasAttribute('data-src')) {
                    el.src = el.getAttribute('data-src');
                    el.removeAttribute('data-src');
                    imgCount++;
                }
            });
            console.log('[Gallery Loader] Loaded ' + imgCount + ' gallery images');
        } catch (e) {
            console.error('[Gallery Loader] Error starting gallery loading:', e);
        }
    }

    function onVideoReady() {
        console.log('[Gallery Loader] Video ready');
        startLoadingGalleries();
    }

    if (videoEl) {
        console.log('[Gallery Loader] Video element found');

        if (videoEl.readyState >= 3) {
            console.log('[Gallery Loader] Video already loaded, readyState:', videoEl.readyState);
            setTimeout(onVideoReady, 100);
        } else {
            videoEl.addEventListener('canplaythrough', onVideoReady, { once: true });
            videoEl.addEventListener('loadeddata', function() {
                if (videoEl.readyState >= 3 && !galleryLoadingStarted) {
                    console.log('[Gallery Loader] Video loadeddata fired');
                    onVideoReady();
                }
            }, { once: true });

            videoEl.addEventListener('error', function(e) {
                console.error('[Gallery Loader] Video error:', e);
                startLoadingGalleries();
            });
        }

        setTimeout(function() {
            if (!galleryLoadingStarted) {
                console.log('[Gallery Loader] Video timeout, proceeding with gallery loading');
                onVideoReady();
            }
        }, 3000);
    } else {
        console.log('[Gallery Loader] No video element, loading galleries immediately');
        setTimeout(startLoadingGalleries, 500);
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function easeOutQuad(t) {
        return 1 - (1 - t) * (1 - t);
    }

    function GalleryScrollAnimator() {
        this.elements = [];
        this.ticking = false;
        this.initialized = false;
        this._boundOnScroll = this._onScroll.bind(this);
        this._boundUpdate = this._update.bind(this);
    }

    GalleryScrollAnimator.prototype.init = function() {
        if (this.initialized) return;
        this.initialized = true;
        console.log('[Gallery Loader] Scroll animator initializing');

        this._collectElements();
        this._assignRandomParams();
        this._update();

        window.addEventListener('scroll', this._boundOnScroll, { passive: true });
        window.addEventListener('resize', this._boundOnScroll, { passive: true });

        console.log('[Gallery Loader] Scroll animator initialized');
    };

    GalleryScrollAnimator.prototype._collectElements = function() {
        this.elements = [];
        try {
            var allAnimated = document.querySelectorAll('.gallery-entrance-anim');
            for (var i = 0; i < allAnimated.length; i++) {
                this.elements.push(allAnimated[i]);
            }
        } catch (e) {
            console.error('[Gallery Loader] Error collecting elements:', e);
        }
    };

    GalleryScrollAnimator.prototype._assignRandomParams = function() {
        var rowTolerance = 12;
        var rows = {};

        this.elements.forEach(function(el) {
            try {
                var rect = el.getBoundingClientRect();
                var rowKey = Math.round(rect.top / rowTolerance) * rowTolerance;
                if (!rows[rowKey]) rows[rowKey] = [];
                rows[rowKey].push({
                    el: el,
                    rect: rect,
                    centerX: rect.left + rect.width / 2
                });
            } catch (e) {
                console.error('[Gallery Loader] Error assigning row:', e);
            }
        });

        var windowCenterX = window.innerWidth / 2;

        Object.keys(rows).forEach(function(key) {
            var rowItems = rows[key];

            rowItems.sort(function(a, b) {
                return a.centerX - b.centerX;
            });

            rowItems.forEach(function(item, idx) {
                var el = item.el;
                if (el._animParams) return;

                var offset = Math.random() * RANDOM_OFFSET_RANGE;

                var elementCenterX = item.centerX;
                var distanceFromCenter = elementCenterX - windowCenterX;
                var screenWidth = window.innerWidth;

                var direction = distanceFromCenter > 0 ? 1 : -1;
                var absDistanceRatio = Math.abs(distanceFromCenter) / (screenWidth / 2);

                var baseTranslateX = absDistanceRatio * screenWidth * INITIAL_TRANSLATE_X_FACTOR;
                var translateX = direction * baseTranslateX;

                var additionalRandomX = (Math.random() - 0.5) * 40;
                translateX += additionalRandomX;

                el._animParams = {
                    randomOffset: offset,
                    translateX: translateX,
                    rawProgress: 0,
                    displayedProgress: 0,
                    rowIndex: idx,
                    totalInRow: rowItems.length
                };
            });
        });
    };

    GalleryScrollAnimator.prototype._onScroll = function() {
        if (!this.ticking) {
            this.ticking = true;
            requestAnimationFrame(this._boundUpdate);
        }
    };

    GalleryScrollAnimator.prototype._update = function() {
        this.ticking = false;

        var vh = window.innerHeight;
        var scrollDist = SCROLL_DISTANCE;
        var initScale = INITIAL_SCALE;
        var initTransY = INITIAL_TRANSLATE_Y;
        var smoothing = PROGRESS_SMOOTHING;

        this._collectElements();

        for (var i = 0; i < this.elements.length; i++) {
            var el = this.elements[i];
            var params = el._animParams;
            if (!params) continue;

            try {
                var rect = el.getBoundingClientRect();
                var elCenter = rect.top + rect.height / 2;

                var startY = vh + params.randomOffset;
                var endY = vh - scrollDist + params.randomOffset;

                if (startY <= endY) {
                    params.rawProgress = 1;
                    el.style.transform = '';
                    el.style.opacity = '1';
                    continue;
                }

                var rawProgress = (startY - elCenter) / (startY - endY);
                rawProgress = Math.max(0, Math.min(1, rawProgress));
                params.rawProgress = rawProgress;

                var prevDisplayed = params.displayedProgress;
                var diff = rawProgress - prevDisplayed;

                if (Math.abs(diff) > 0.001) {
                    if (diff > 0) {
                        params.displayedProgress = prevDisplayed + diff * smoothing * 1.5;
                    } else {
                        params.displayedProgress = prevDisplayed + diff * smoothing * 0.6;
                    }
                }

                params.displayedProgress = Math.max(0, Math.min(1, params.displayedProgress));

                var p = easeOutCubic(params.displayedProgress);

                if (params.displayedProgress <= 0.001) {
                    el.style.opacity = '0';
                    continue;
                }

                var scale = initScale - (initScale - 1) * p;
                var opacity = p;
                var translateY = initTransY * (1 - p);
                var translateX = params.translateX * (1 - p);

                el.style.transform = 'translate3d(' + translateX.toFixed(2) + 'px, ' + translateY.toFixed(2) + 'px, 0) scale(' + scale.toFixed(4) + ')';
                el.style.opacity = opacity.toFixed(4);

                if (params.displayedProgress >= 0.999) {
                    el.style.transform = '';
                    el.style.opacity = '1';
                }
            } catch (e) {
                console.error('[Gallery Loader] Error updating animation:', e);
            }
        }
    };

    GalleryScrollAnimator.prototype.destroy = function() {
        window.removeEventListener('scroll', this._boundOnScroll);
        window.removeEventListener('resize', this._boundOnScroll);
        this.initialized = false;
    };

    var initScrollAnimator = function() {
        if (scrollAnimator) return;
        try {
            scrollAnimator = new GalleryScrollAnimator();
            scrollAnimator.init();
        } catch (e) {
            console.error('[Gallery Loader] Error initializing scroll animator:', e);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initScrollAnimator, 500);
        });
    } else {
        setTimeout(initScrollAnimator, 500);
    }

})();
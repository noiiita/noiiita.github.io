(function() {
    'use strict';

    console.log('[Gallery Loader] Initialized');

    var videoEl = document.querySelector('.top-section-video');
    var galleryLoadingStarted = false;

    if (!window.__galleryLazyRegistry) {
        window.__galleryLazyRegistry = {
            elements: [],
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
            if (!registry || !registry.elements) return;

            var imgCount = 0;
            var i = registry.elements.length;
            while (i--) {
                var el = registry.elements[i];
                if (!el) continue;
                if (el.tagName === 'IMG' && el.hasAttribute('data-src')) {
                    el.src = el.getAttribute('data-src');
                    el.removeAttribute('data-src');
                    imgCount++;
                } else if (el.tagName === 'DIV' && el.querySelector('img[data-src]')) {
                    var imgs = el.querySelectorAll('img[data-src]');
                    for (var j = 0; j < imgs.length; j++) {
                        imgs[j].src = imgs[j].getAttribute('data-src');
                        imgs[j].removeAttribute('data-src');
                        imgCount++;
                    }
                }
            }
            registry.elements.length = 0;
            console.log('[Gallery Loader] Loaded ' + imgCount + ' gallery images');

            if (imgCount > 0 && typeof ScrollTrigger !== 'undefined') {
                setTimeout(function() {
                    ScrollTrigger.refresh();
                }, 200);
            }
        } catch (e) {
            console.error('[Gallery Loader] Error:', e);
        }
    }

    function onVideoReady() {
        console.log('[Gallery Loader] Video ready, loading gallery images');
        startLoadingGalleries();
    }

    if (videoEl) {
        if (videoEl.readyState >= 3) {
            setTimeout(onVideoReady, 100);
        } else {
            videoEl.addEventListener('canplaythrough', onVideoReady, { once: true });
            videoEl.addEventListener('loadeddata', function() {
                if (videoEl.readyState >= 3 && !galleryLoadingStarted) {
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
                console.log('[Gallery Loader] Video timeout, proceeding');
                onVideoReady();
            }
        }, 3000);
    } else {
        setTimeout(startLoadingGalleries, 500);
    }

})();

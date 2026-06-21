(function() {
    'use strict';

    console.log('[Loading Overlay] Initializing');

    var loadingOverlay = null;
    var loadingLetters = [];
    var heroLetter = null;
    var heroLetters = [];
    var animationComplete = false;
    var startTime = Date.now();
    var MIN_DISPLAY_TIME = 1000;
    var heroAnimationReady = false;
    window.heroAnimationReady = false;

    var reduceMotion = window.__reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
        MIN_DISPLAY_TIME = 300;
    }

    function init() {
        loadingOverlay = document.getElementById('loading-overlay');
        heroLetter = document.querySelector('.new-hero-letter');
        startTime = Date.now();

        if (!loadingOverlay) {
            console.warn('[Loading Overlay] Loading overlay not found');
            heroAnimationReady = true;
            return;
        }

        loadingLetters = loadingOverlay.querySelectorAll('.loading-letter');

        // 依次显示 loading-letter
        if (reduceMotion) {
            loadingLetters.forEach(function(letter) {
                letter.classList.add('visible');
            });
        } else {
            setTimeout(function() {
                loadingLetters.forEach(function(letter, index) {
                    setTimeout(function() {
                        letter.classList.add('visible');
                    }, index * 30);
                });
            }, 100);
        }

        if (!heroLetter) {
            console.warn('[Loading Overlay] Hero letter not found');
            heroAnimationReady = true;
            hideLoadingOverlay();
            return;
        }

        var videoEl = document.querySelector('.top-section-video');
        var hasTriggered = false;

        function onVideoReady() {
            if (hasTriggered) return;
            hasTriggered = true;
            console.log('[Loading Overlay] Video is playing');
            videoEl.removeEventListener('playing', onVideoReady);
            videoEl.removeEventListener('canplaythrough', onVideoReady);
            videoEl.removeEventListener('loadeddata', onVideoReady);
            videoEl.removeEventListener('error', onVideoReady);
            triggerTransition();
        }

        if (videoEl.readyState >= 3 && !videoEl.paused) {
            console.log('[Loading Overlay] Video already playing');
            setTimeout(onVideoReady, 100);
        } else {
            videoEl.addEventListener('playing', onVideoReady, { once: true });
            videoEl.addEventListener('canplaythrough', function() {
                if (videoEl.readyState >= 3 && !videoEl.paused && !hasTriggered) {
                    onVideoReady();
                }
            }, { once: true });
            videoEl.addEventListener('loadeddata', function() {
                if (videoEl.readyState >= 3 && !videoEl.paused && !hasTriggered) {
                    onVideoReady();
                }
            }, { once: true });
            videoEl.addEventListener('error', function(e) {
                console.error('[Loading Overlay] Video error:', e);
                if (!hasTriggered) {
                    hasTriggered = true;
                    triggerTransition();
                }
            });
        }

        setTimeout(function() {
            if (!hasTriggered) {
                console.log('[Loading Overlay] Video timeout, proceeding');
                hasTriggered = true;
                triggerTransition();
            }
        }, 6000);
    }

    function triggerTransition() {
        if (animationComplete) return;
        animationComplete = true;

        console.log('[Loading Overlay] Triggering transition');

        var elapsed = Date.now() - startTime;
        var remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsed);
        var exitDelay = remainingTime + 300;

        setTimeout(function() {
            exitLoadingLetters();
            hideLoadingOverlay();
        }, exitDelay);
    }

    function exitLoadingLetters() {
        loadingLetters.forEach(function(letter, index) {
            setTimeout(function() {
                letter.classList.add('exit');
            }, index * 50);
        });
    }

    function hideLoadingOverlay() {
        if (loadingOverlay) {
            loadingOverlay.classList.add('fade-out');
            loadingOverlay.style.pointerEvents = 'none';
        }

        setTimeout(function() {
            triggerHeroEntrance();
        }, 200);
    }

    function triggerHeroEntrance() {
        console.log('[Loading Overlay] Triggering hero entrance');

        window.heroAnimationReady = true;

        var heroContainer = document.querySelector('.new-hero-letter');
        if (!heroContainer) {
            console.warn('[Loading Overlay] Hero container not found');
            return;
        }

        var existingLetters = heroContainer.querySelectorAll('.new-hero-letter-span');

        if (existingLetters.length === 0) {
            console.warn('[Loading Overlay] No existing letters found, skipping');
            return;
        }

        existingLetters.forEach(function(letter, index) {
            letter.classList.remove('exit');
            letter.classList.remove('entering');
            letter.style.opacity = '';
            letter.style.transform = '';
            letter.style.animationDelay = '';
        });

        heroContainer.style.opacity = '0';
        heroContainer.style.visibility = 'visible';
        heroContainer.style.transition = 'opacity 0.1s ease-out';

        requestAnimationFrame(function() {
            heroContainer.style.opacity = '1';
            
            requestAnimationFrame(function() {
                existingLetters.forEach(function(letter, index) {
                    letter.classList.add('entering');
                    var randomDelay = Math.random() * 0.3 + 0.1;
                    letter.style.animationDelay = randomDelay.toFixed(3) + 's';
                    console.log('Letter', index, 'delay:', randomDelay.toFixed(3) + 's');
                });
            });
        });

        console.log('[Loading Overlay] Hero entrance complete');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 50);
    }

})();
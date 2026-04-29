(function() {
    'use strict';

    var SmoothScroll = function(options) {
        this.options = {
            duration: 600,
            easing: 'easeOutCubic',
            ...options
        };

        this.easingFunctions = {
            easeOutCubic: function(t) {
                return 1 - Math.pow(1 - t, 3);
            },
            easeOutQuad: function(t) {
                return 1 - (1 - t) * (1 - t);
            },
            easeOutQuart: function(t) {
                return 1 - Math.pow(1 - t, 4);
            }
        };

        this.init();
    };

    SmoothScroll.prototype.init = function() {
        var self = this;

        document.addEventListener('click', function(e) {
            var target = e.target.closest('a[href^="#"]');
            if (!target) return;

            var href = target.getAttribute('href');
            if (href === '#' || href === '') return;

            var destination = document.querySelector(href);
            if (!destination) return;

            e.preventDefault();

            self.scrollToElement(destination);
        });

        console.log('[Smooth Scroll] Initialized');
    };

    SmoothScroll.prototype.scrollToElement = function(element) {
        var targetPosition = element.getBoundingClientRect().top + window.scrollY;
        var startPosition = window.scrollY;
        var distance = targetPosition - startPosition;

        if (Math.abs(distance) < 10) return;

        var duration = this.options.duration;
        var easingFn = this.easingFunctions[this.options.easing] || this.easingFunctions.easeOutCubic;
        var startTime = performance.now();
        var rafId = null;

        var self = this;

        function animate(currentTime) {
            var elapsed = currentTime - startTime;
            var progress = Math.min(elapsed / duration, 1);
            var easedProgress = easingFn(progress);

            var newPosition = startPosition + distance * easedProgress;

            window.scrollTo(0, Math.round(newPosition));

            if (progress < 1) {
                rafId = requestAnimationFrame(animate);
            }
        }

        if (rafId) {
            cancelAnimationFrame(rafId);
        }

        rafId = requestAnimationFrame(animate);
    };

    SmoothScroll.prototype.destroy = function() {
        console.log('[Smooth Scroll] Destroyed');
    };

    window.SmoothScroll = SmoothScroll;

    document.addEventListener('DOMContentLoaded', function() {
        window.smoothScrollInstance = new SmoothScroll({
            duration: 200,
            easing: 'easeOutCubic'
        });
    });

})();
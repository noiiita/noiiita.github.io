(function() {
    'use strict';

    console.log('[Horizontal Gallery] Initializing');

    var scrollTriggers = [];

    function initWhenReady() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
            setTimeout(initWhenReady, 100);
            return;
        }
        gsap.registerPlugin(ScrollTrigger);

        var hasSciViz = !!document.getElementById('sciviz-track');
        var hasPlants = !!document.getElementById('plants-track');
        var hasRailway = !!document.getElementById('railway-track');

        if (!hasSciViz && !hasPlants && !hasRailway) {
            setTimeout(initWhenReady, 200);
            return;
        }

        // 按顺序初始化相册：先sci-viz，再railway，最后plants，确保正确的pin spacing
        var promiseChain = Promise.resolve();
        
        if (hasSciViz) {
            promiseChain = promiseChain.then(function() {
                return initSciVizGallery();
            });
        }
        
        if (hasRailway) {
            promiseChain = promiseChain.then(function() {
                return initRailwayGallery();
            });
        }
        
        if (hasPlants) {
            promiseChain = promiseChain.then(function() {
                return initPlantsGallery();
            });
        }

        promiseChain.then(function() {
            console.log('[Horizontal Gallery] All galleries initialized');
            // 所有相册初始化完成后刷新一次，确保pin spacing正确
            ScrollTrigger.refresh();
            window.addEventListener('resize', debounce(refreshAll, 250));
        }).catch(function(err) {
            console.error('[Horizontal Gallery] Init error:', err);
        });
    }

    function debounce(fn, delay) {
        var timer;
        return function() {
            clearTimeout(timer);
            timer = setTimeout(fn, delay);
        };
    }

    function refreshAll() {
        ScrollTrigger.refresh();
    }

    function getLightbox() {
        return window.__lightbox;
    }

    function createImageElement(item, containerClass) {
        var wrapper = document.createElement('div');
        wrapper.className = 'gallery-item ' + (containerClass || '');

        var img = document.createElement('img');
        img.src = item.src;
        img.alt = item.title || '';
        img.loading = 'lazy';
        wrapper.appendChild(img);

        if (item.title) {
            var caption = document.createElement('div');
            caption.className = 'gallery-caption';
            caption.textContent = item.title;
            wrapper.appendChild(caption);
        }

        return wrapper;
    }

    function buildSingleRowTrack(trackEl, items, containerClass) {
        trackEl.innerHTML = '';
        items.forEach(function(item, idx) {
            var el = createImageElement(item, containerClass);
            el.addEventListener('click', (function(i) {
                return function(e) {
                    e.preventDefault();
                    var lb = getLightbox();
                    if (lb) lb.open(items, i);
                };
            })(idx));
            trackEl.appendChild(el);
        });
    }

    function buildMultiRowTrack(trackEl, items, rows, containerClass, featuredIndices) {
        trackEl.innerHTML = '';
        var rowEls = [];
        for (var r = 0; r < rows; r++) {
            var rowEl = document.createElement('div');
            rowEl.className = 'gallery-row';
            trackEl.appendChild(rowEl);
            rowEls.push(rowEl);
        }

        var featuredSet = {};
        if (featuredIndices) {
            featuredIndices.forEach(function(fi) { featuredSet[fi] = true; });
        }

        var rowCounts = [0, 0, 0];

        items.forEach(function(item, idx) {
            var isFeatured = featuredSet[idx];
            var minRow = 0;
            for (var r = 1; r < rows; r++) {
                if (rowCounts[r] < rowCounts[minRow]) minRow = r;
            }

            var el;
            if (isFeatured) {
                el = createImageElement(item, containerClass);
                el.classList.add('featured');
                rowCounts[minRow] += 2;
            } else {
                el = createImageElement(item, containerClass);
                rowCounts[minRow] += 1;
            }

            (function(itemRef, idxRef) {
                el.addEventListener('click', function(e) {
                    e.preventDefault();
                    var lb = getLightbox();
                    if (lb) lb.open(items, idxRef);
                });
            })(item, idx);

            rowEls[minRow].appendChild(el);
        });
    }

    function waitForTrackImages(trackEl) {
        return new Promise(function(resolve) {
            var imgs = trackEl.querySelectorAll('img');
            var total = imgs.length;
            if (total === 0) { resolve(); return; }

            var loaded = 0;
            var resolved = false;

            function onOneDone() {
                loaded++;
                if (!resolved && loaded >= total) {
                    resolved = true;
                    requestAnimationFrame(function() {
                        requestAnimationFrame(resolve);
                    });
                }
            }

            imgs.forEach(function(img) {
                if (img.complete && img.naturalWidth > 0) {
                    onOneDone();
                } else {
                    img.addEventListener('load', onOneDone, { once: true });
                    img.addEventListener('error', onOneDone, { once: true });
                }
            });

            setTimeout(function() {
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            }, 5000);
        });
    }

    function setupScrollTrigger(pinWrapEl, trackEl, startValue, triggerEl, enableFade) {
        if (!pinWrapEl || !trackEl) return null;

        var viewportWidth = window.innerWidth;
        var pinWidth = pinWrapEl.offsetWidth;
        var fullMove = trackEl.scrollWidth - pinWidth;
        if (fullMove <= 0) fullMove = 500;

        var actualTriggerEl = triggerEl || pinWrapEl;
        var fadeEnabled = enableFade !== false;

        console.log('[Horizontal Gallery]', trackEl.id,
            'pinW:', pinWidth, 'scrollW:', trackEl.scrollWidth,
            'fullMove:', Math.round(fullMove),
            'start:', startValue,
            'trigger:', actualTriggerEl.id || actualTriggerEl.className,
            'fade:', fadeEnabled);

        if (fullMove <= 0) {
            console.warn('[Horizontal Gallery]', trackEl.id, 'fullMove <= 0, forcing to 500');
            fullMove = 500;
        }

        var galleryItems = trackEl.querySelectorAll('.gallery-item');
        var itemData = [];
        var trackRect = trackEl.getBoundingClientRect();

        galleryItems.forEach(function(el) {
            var rect = el.getBoundingClientRect();
            itemData.push({
                el: el,
                offsetLeft: rect.left - trackRect.left,
                width: rect.width
            });
            if (fadeEnabled) {
                el.style.opacity = '0';
                el.style.transform = 'scale(0.94)';
                el.style.willChange = 'transform, opacity';
            } else {
                el.style.opacity = '1';
                el.style.transform = 'scale(1)';
            }
        });

        var st = ScrollTrigger.create({
            trigger: actualTriggerEl,
            start: startValue,
            end: function() { return '+=' + fullMove; },
            pin: pinWrapEl,
            pinSpacing: true,
            scrub: 1,
            invalidateOnRefresh: true,
            onRefresh: function(self) {
                var newPinWidth = pinWrapEl.offsetWidth;
                var newTrackWidth = trackEl.scrollWidth;
                var newFullMove = newTrackWidth - newPinWidth;
                
                if (newFullMove <= 0) newFullMove = 500;
                if (Math.abs(newFullMove - fullMove) > 10) {
                    fullMove = newFullMove;
                    console.log('[Horizontal Gallery]', trackEl.id, 'refreshed fullMove:', Math.round(fullMove));
                }

                var tr = trackEl.getBoundingClientRect();
                itemData.forEach(function(data) {
                    var rect = data.el.getBoundingClientRect();
                    if (rect && rect.width) {
                        data.offsetLeft = rect.left - tr.left;
                        data.width = rect.width;
                    }
                });
            },
            onUpdate: onUpdate
        });

        function onUpdate(self) {
            var progress = self.progress;

            var x = -progress * fullMove;
            trackEl.style.transform = 'translate3d(' + x.toFixed(2) + 'px, 0, 0)';

            if (!fadeEnabled) return;

            itemData.forEach(function(data) {
                var el = data.el;
                if (!data.width) return;

                var itemLeftOnScreen = data.offsetLeft - progress * fullMove;
                var itemRightOnScreen = itemLeftOnScreen + data.width;

                var revealProgress = 0;
                if (itemRightOnScreen > 0 && itemLeftOnScreen < viewportWidth) {
                    revealProgress = 1;
                    // 延迟淡入：图片进入视口更深一些才开始淡入（从25%改为15%）
                    if (itemRightOnScreen < viewportWidth * 0.15) {
                        revealProgress = itemRightOnScreen / (viewportWidth * 0.15);
                    }
                    // 延迟淡出：图片离开视口更晚一些才开始淡出（从75%改为85%）
                    if (itemLeftOnScreen > viewportWidth * 0.85) {
                        var entryProgress = (viewportWidth - itemLeftOnScreen) / (viewportWidth * 0.1);
                        revealProgress = Math.min(revealProgress, entryProgress);
                    }
                }

                revealProgress = Math.max(0, Math.min(1, revealProgress));
                var eased = 1 - Math.pow(1 - revealProgress, 2);

                el.style.opacity = eased.toFixed(3);
                el.style.transform = 'scale(' + (0.94 + 0.06 * eased).toFixed(3) + ')';
            });
        }

        onUpdate({ progress: 0 });

        return st;
    }

    function initSciVizGallery() {
        return fetch('static/assets/gallery/sciviz/list.json')
            .then(function(r) { return r.json(); })
            .then(function(items) {
                var trackEl = document.getElementById('sciviz-track');
                var pinWrap = document.getElementById('sciviz-pin');
                if (!trackEl || !pinWrap || !items.length) return;

                trackEl.innerHTML = '';

                var coverWrap = document.createElement('div');
                coverWrap.className = 'sci-viz-cover-wrap';
                trackEl.appendChild(coverWrap);

                var columnsWrap = document.createElement('div');
                columnsWrap.className = 'sci-viz-columns';
                trackEl.appendChild(columnsWrap);

                items.forEach(function(item, idx) {
                    var el = createImageElement(item, 'sci-viz-item');
                    el.addEventListener('click', (function(i) {
                        return function(e) {
                            e.preventDefault();
                            var lb = getLightbox();
                            if (lb) lb.open(items, i);
                        };
                    })(idx));

                    if (idx === 0) {
                        el.classList.add('sci-viz-cover');
                        coverWrap.appendChild(el);
                    } else {
                        columnsWrap.appendChild(el);
                    }
                });

                return waitForTrackImages(trackEl).then(function() {
                    var observer = new IntersectionObserver(function(entries) {
                        entries.forEach(function(entry) {
                            if (entry.isIntersecting) {
                                entry.target.classList.add('visible');
                                observer.unobserve(entry.target);
                            }
                        });
                    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

                    trackEl.querySelectorAll('.gallery-item').forEach(function(item) {
                        observer.observe(item);
                    });

                    console.log('[Horizontal Gallery] sci-viz loaded:', items.length, 'images (masonry)');
                });
            })
            .catch(function(err) {
                console.error('[Horizontal Gallery] sci-viz error:', err);
            });
    }

    function initPlantsGallery() {
        return fetch('static/assets/gallery/plants/list.json')
            .then(function(r) { return r.json(); })
            .then(function(items) {
                var trackEl = document.getElementById('plants-track');
                var pinWrap = document.getElementById('plants-pin');
                if (!trackEl || !pinWrap) return;

                buildMultiRowTrack(trackEl, items, 3, 'plants-item', null);

                return waitForTrackImages(trackEl).then(function() {
                    var st = setupScrollTrigger(pinWrap, trackEl, 'top top+=64px', pinWrap);
                    if (st) {
                        st.update();
                        scrollTriggers.push(st);
                    }
                    console.log('[Horizontal Gallery] plants loaded:', items.length, 'images');
                });
            })
            .catch(function(err) {
                console.error('[Horizontal Gallery] plants error:', err);
            });
    }

    function initRailwayGallery() {
        return fetch('static/assets/gallery/railway/list.json')
            .then(function(r) { return r.json(); })
            .then(function(items) {
                var trackEl = document.getElementById('railway-track');
                var pinWrap = document.getElementById('railway-pin');
                if (!trackEl || !pinWrap) return;

                var featuredList = [];
                items.forEach(function(item, idx) {
                    if (item.featured) featuredList.push(idx);
                });

                buildMultiRowTrack(trackEl, items, 3, 'railway-item', featuredList);

                return waitForTrackImages(trackEl).then(function() {
                    var st = setupScrollTrigger(pinWrap, trackEl, 'top top+=80px', pinWrap);
                    if (st) {
                        st.update();
                        scrollTriggers.push(st);
                    }
                    console.log('[Horizontal Gallery] railway loaded:', items.length, 'images');
                });
            })
            .catch(function(err) {
                console.error('[Horizontal Gallery] railway error:', err);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initWhenReady, 200);
        });
    } else {
        setTimeout(initWhenReady, 200);
    }

})();

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
                pinWidth = pinWrapEl.offsetWidth;
                fullMove = trackEl.scrollWidth - pinWidth;
                if (fullMove <= 0) fullMove = 500;
                self.end = self.start + fullMove;

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
                    if (itemRightOnScreen < viewportWidth * 0.15) {
                        revealProgress = itemRightOnScreen / (viewportWidth * 0.15);
                    }
                    if (itemLeftOnScreen > viewportWidth * 0.85) {
                        var entryProgress = (viewportWidth - itemLeftOnScreen) / (viewportWidth * 0.15);
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
                var gallerySection = document.getElementById('sciviz');
                if (!trackEl || !pinWrap) return;

                buildSingleRowTrack(trackEl, items, 'sci-viz-item');

                return waitForTrackImages(trackEl).then(function() {
                    // 使用pinWrap作为trigger（与pin相同），避免位置突变
                    // 触发时机设置为相册顶部到达视口顶部时，确保自然滚动到正确位置后才开始水平滚动
                    var st = setupScrollTrigger(pinWrap, trackEl, 'top top+=128px', pinWrap, false);
                    if (st) {
                        st.update();
                        scrollTriggers.push(st);
                    }
                    console.log('[Horizontal Gallery] sci-viz loaded:', items.length, 'images');
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
                var gallerySection = document.getElementById('plants');
                if (!trackEl || !pinWrap) return;

                buildMultiRowTrack(trackEl, items, 3, 'plants-item', null);

                return waitForTrackImages(trackEl).then(function() {
                    // 使用pinWrap作为trigger（与pin相同），避免位置突变
                    // 触发时机与其他相册保持一致：相册顶部到达视口顶部+128px偏移时开始pin
                    var st = setupScrollTrigger(pinWrap, trackEl, 'top top+=128px', pinWrap);
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
                    // 使用pinWrap作为trigger（与pin相同），避免位置突变
                    // 确保railway相册有足够的滚动空间，最小滚动距离设置为1000px
                    var viewportWidth = window.innerWidth;
                    var pinWidth = pinWrap.offsetWidth;
                    var fullMove = trackEl.scrollWidth - pinWidth;
                    if (fullMove <= 0) fullMove = 1000;
                    if (fullMove < 1000) fullMove = 1000;
                    
                    var st = ScrollTrigger.create({
                        trigger: pinWrap,
                        start: 'top top+=64px',
                        end: function() { return '+=' + fullMove; },
                        pin: pinWrap,
                        pinSpacing: true,
                        scrub: 1,
                        invalidateOnRefresh: true,
                        snap: {
                            snapTo: "labels",
                            duration: {min: 0.2, max: 0.5},
                            ease: "power2.out"
                        },
                        onRefresh: function(self) {
                            var pw = pinWrap.offsetWidth;
                            var fm = trackEl.scrollWidth - pw;
                            if (fm <= 0) fm = 1000;
                            if (fm < 1000) fm = 1000;
                            self.end = self.start + fm;
                        },
                        onLeave: function(self) {
                            trackEl.style.transform = 'translate3d(' + (-fullMove) + 'px, 0, 0)';
                        },
                        onLeaveBack: function(self) {
                            trackEl.style.transform = 'translate3d(0px, 0, 0)';
                        },
                        onUpdate: function(self) {
                            var progress = self.progress;
                            var x = -progress * fullMove;
                            trackEl.style.transform = 'translate3d(' + x.toFixed(2) + 'px, 0, 0)';
                            
                            var galleryItems = trackEl.querySelectorAll('.gallery-item');
                            galleryItems.forEach(function(el) {
                                var rect = el.getBoundingClientRect();
                                var itemRightOnScreen = rect.right;
                                
                                var revealProgress = 1;
                                var fadeThreshold = viewportWidth * 0.15;
                                if (itemRightOnScreen <= fadeThreshold) {
                                    revealProgress = itemRightOnScreen / fadeThreshold;
                                }
                                
                                revealProgress = Math.max(0, Math.min(1, revealProgress));
                                var eased = 1 - Math.pow(1 - revealProgress, 2);
                                el.style.opacity = eased.toFixed(3);
                                el.style.transform = 'scale(' + (0.94 + 0.06 * eased).toFixed(3) + ')';
                            });
                        }
                    });
                    
                    scrollTriggers.push(st);
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

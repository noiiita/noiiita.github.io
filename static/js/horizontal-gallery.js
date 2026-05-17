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
                console.log('[Horizontal Gallery] Starting railway init, waiting for photography section images');
                // 等待photography section内所有图片加载完成后再初始化railway ScrollTrigger
                var photographySection = document.getElementById('photography');
                if (photographySection) {
                    return waitForSectionImages(photographySection).then(function() {
                        console.log('[Horizontal Gallery] Photography section images loaded, initializing railway gallery');
                        return initRailwayGallery();
                    });
                }
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
            window.addEventListener('resize', debounce(refreshAll, 250));

            // 关键修复：将 railway 和 plants 的 ScrollTrigger 创建推迟到 window.load 之后
            // 确保 Chart.js 图表、图片等所有上游内容完全渲染后再计算 pin 位置
            // 逐个创建并刷新，避免 pinSpacing 相互干扰
            function scheduleDeferredTriggers() {
                console.log('[Horizontal Gallery] Scheduling deferred ScrollTrigger creation');
                setTimeout(function() {
                    requestAnimationFrame(function() {
                        requestAnimationFrame(function() {
                            // Step 1: 创建 railway ScrollTrigger
                            createRailwayScrollTrigger();
                            ScrollTrigger.refresh();
                            console.log('[Horizontal Gallery] Railway trigger created, pinSpacing applied');

                            // 安装 railway 位置守卫
                            installPositionGuard('railway-pin', 'railway-track',
                                function() { return setupScrollTrigger(
                                    document.getElementById('railway-pin'),
                                    document.getElementById('railway-track'),
                                    'top top+=64px',
                                    document.getElementById('railway-pin'),
                                    true,
                                    2
                                ); },
                                'railway');

                            // Step 2: 等待 railway 的 pinSpacing 完全被浏览器布局处理后再创建 plants
                            // 使用多层 rAF + setTimeout 确保 layout 彻底稳定
                            function waitForRailwayLayoutThenCreatePlants() {
                                var railPin = document.getElementById('railway-pin');
                                if (railPin) { railPin.offsetHeight; } // 强制重排

                                requestAnimationFrame(function() {
                                    var railPin2 = document.getElementById('railway-pin');
                                    if (railPin2) { railPin2.offsetHeight; }

                                    requestAnimationFrame(function() {
                                        var railPin3 = document.getElementById('railway-pin');
                                        if (railPin3) { railPin3.offsetHeight; }

                                        requestAnimationFrame(function() {
                                            console.log('[Horizontal Gallery] Railway layout stabilized, creating plants');

                                            createPlantsScrollTrigger();
                                            ScrollTrigger.refresh();
                                            console.log('[Horizontal Gallery] Plants trigger created, final refresh done');

                                            // 安装 plants 位置守卫
                                            installPositionGuard('plants-pin', 'plants-track',
                                                function() { return setupScrollTrigger(
                                                    document.getElementById('plants-pin'),
                                                    document.getElementById('plants-track'),
                                                    'top top+=64px',
                                                    document.getElementById('plants-pin'),
                                                    true,
                                                    1
                                                ); },
                                                'plants');
                                        });
                                    });
                                });
                            }

                            // 给 railway pinSpacing 足够时间在浏览器中完成布局
                            setTimeout(waitForRailwayLayoutThenCreatePlants, 300);
                        });
                    });
                }, 800);
            }

            if (document.readyState === 'complete') {
                scheduleDeferredTriggers();
            } else {
                window.addEventListener('load', function() {
                    scheduleDeferredTriggers();
                });
            }
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
        setTimeout(validateAllGuards, 200);
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

    function waitForSectionImages(sectionEl) {
        return new Promise(function(resolve) {
            if (!sectionEl) { resolve(); return; }
            var imgs = sectionEl.querySelectorAll('img');
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

    function deferredRefresh() {
        return new Promise(function(resolve) {
            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    ScrollTrigger.refresh();
                    console.log('[Horizontal Gallery] Deferred refresh done');
                    resolve();
                });
            });
        });
    }

    function setupScrollTrigger(pinWrapEl, trackEl, startValue, triggerEl, enableFade, priority) {
        if (!pinWrapEl || !trackEl) return null;

        console.log('[Horizontal Gallery] ===', trackEl.id, '=== Initializing ScrollTrigger ===');

        var forced1 = pinWrapEl.offsetHeight;
        var forced2 = trackEl.offsetHeight;

        var pinWidth = pinWrapEl.offsetWidth;
        var fullMove = trackEl.scrollWidth - pinWidth;

        if (fullMove <= 0) fullMove = 500;

        console.log('[Horizontal Gallery]', trackEl.id, 
            'pinWidth:', pinWidth, 
            'scrollWidth:', trackEl.scrollWidth, 
            'fullMove:', fullMove,
            'start:', startValue,
            'refreshPriority:', priority || 0);

        // 初始化 fade 状态
        var galleryItems = trackEl.querySelectorAll('.gallery-item');
        var fadeEnabled = enableFade !== false;

        galleryItems.forEach(function(el) {
            if (fadeEnabled) {
                el.style.opacity = '0';
                el.style.transform = 'scale(0.94)';
            } else {
                el.style.opacity = '1';
                el.style.transform = 'scale(1)';
            }
        });

        // 最基本、最稳定的 ScrollTrigger 配置
        var st = ScrollTrigger.create({
            trigger: pinWrapEl,
            pin: pinWrapEl,
            pinSpacing: true,
            start: startValue,
            end: function() { return '+=' + fullMove; },
            invalidateOnRefresh: true,
            refreshPriority: priority || 0,
            scrub: 1,
            onUpdate: function(self) {
                var x = -self.progress * fullMove;
                trackEl.style.transform = 'translateX(' + x + 'px)';

                // 处理 fade 动画
                if (fadeEnabled) {
                    var viewportWidth = window.innerWidth;
                    var trackRect = trackEl.getBoundingClientRect();
                    
                    galleryItems.forEach(function(el) {
                        var elRect = el.getBoundingClientRect();
                        var elCenter = elRect.left + elRect.width / 2;
                        
                        // 当元素接近屏幕中心时淡入，离开时淡出
                        var distFromCenter = Math.abs(elCenter - viewportWidth / 2);
                        var fadeRadius = viewportWidth / 2;
                        var revealProgress = 1 - Math.min(1, distFromCenter / fadeRadius);
                        
                        // 平滑过渡
                        revealProgress = 1 - Math.pow(1 - revealProgress, 2);
                        
                        el.style.opacity = (0.5 + revealProgress * 0.5).toFixed(3);
                        el.style.transform = 'scale(' + (0.94 + 0.06 * revealProgress).toFixed(3) + ')';
                    });
                }
            }
        });

        console.log('[Horizontal Gallery]', trackEl.id, 'ScrollTrigger created successfully');
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
                    console.log('[Horizontal Gallery] plants images loaded:', items.length, 'images (ScrollTrigger deferred)');
                    // 不在此处创建 ScrollTrigger，推迟到 window.load 之后
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
                    console.log('[Horizontal Gallery] railway images loaded:', items.length, 'images (ScrollTrigger deferred)');
                    // 不在此处创建 ScrollTrigger，推迟到 window.load 之后
                    // 以确保 Chart.js 图表等上游内容完全渲染后再计算 pin 位置
                });
            })
            .catch(function(err) {
                console.error('[Horizontal Gallery] railway error:', err);
            });
    }

    function createRailwayScrollTrigger() {
        var trackEl = document.getElementById('railway-track');
        var pinWrap = document.getElementById('railway-pin');
        if (!trackEl || !pinWrap) return;

        // 检查是否已经创建过
        var existing = scrollTriggers.filter(function(st) {
            return st.vars && st.vars.trigger === pinWrap;
        });
        if (existing.length > 0) {
            console.log('[Horizontal Gallery] railway ScrollTrigger already exists, skipping');
            return;
        }

        // 强制重排，确保读取到最新的布局尺寸
        pinWrap.offsetHeight;
        trackEl.offsetHeight;

        console.log('[Horizontal Gallery] Creating railway ScrollTrigger after full page load');
        var st = setupScrollTrigger(pinWrap, trackEl, 'top top+=64px', pinWrap, true, 2);
        if (st) {
            st.update();
            scrollTriggers.push(st);
            console.log('[Horizontal Gallery] railway ScrollTrigger created successfully');
        }
    }

    function createPlantsScrollTrigger() {
        var trackEl = document.getElementById('plants-track');
        var pinWrap = document.getElementById('plants-pin');
        if (!trackEl || !pinWrap) return;

        var existing = scrollTriggers.filter(function(st) {
            return st.vars && st.vars.trigger === pinWrap;
        });
        if (existing.length > 0) {
            console.log('[Horizontal Gallery] plants ScrollTrigger already exists, skipping');
            return;
        }

        pinWrap.offsetHeight;
        trackEl.offsetHeight;

        console.log('[Horizontal Gallery] Creating plants ScrollTrigger after full page load');
        var st = setupScrollTrigger(pinWrap, trackEl, 'top top+=64px', pinWrap, true, 1);
        if (st) {
            st.update();
            scrollTriggers.push(st);
            console.log('[Horizontal Gallery] plants ScrollTrigger created successfully');
        }
    }

    // ============================================================
    //  自检测 + 自纠错系统
    //  确保 railway 和 plants 相册始终处于正确的文档位置，
    //  不会跳变到其他区域或遮挡其他内容
    // ============================================================

    var positionGuards = [];
    var guardIntervals = [];

    function findBoundaryElements(pinWrap) {
        var prev = pinWrap.previousElementSibling;
        var next = pinWrap.nextElementSibling;

        // 向上查找：如果 pinWrap 没有前一个兄弟，找父元素的前一个兄弟的最后一个子元素
        if (!prev && pinWrap.parentElement) {
            var parentPrev = pinWrap.parentElement.previousElementSibling;
            if (parentPrev) {
                prev = parentPrev;
            }
        }

        // 向下查找：如果 pinWrap 没有后一个兄弟，找父元素的后一个兄弟
        if (!next && pinWrap.parentElement) {
            var parentNext = pinWrap.parentElement.nextElementSibling;
            if (parentNext) {
                next = parentNext;
            }
        }

        return { prev: prev, next: next };
    }

    function validateGalleryPosition(pinWrap, label) {
        if (!pinWrap) return { valid: true, reason: 'no element' };

        var activeST = null;
        for (var i = 0; i < scrollTriggers.length; i++) {
            var st = scrollTriggers[i];
            if (st && st.vars && st.vars.trigger === pinWrap && st.isActive) {
                activeST = st;
                break;
            }
        }

        if (activeST) {
            // Pin 状态下：验证 pin 位置是否正确，以及是否遮挡了 DOM 中之前的元素
            var pinRect = pinWrap.getBoundingClientRect();
            var expectedPinTop = 64;
            var pinTopTolerance = 25;

            if (Math.abs(pinRect.top - expectedPinTop) > pinTopTolerance) {
                console.warn('[Position Guard] ' + label + ' PIN POSITION ERROR: top=' +
                    Math.round(pinRect.top) + ' expected ~' + expectedPinTop);
                return { valid: false, reason: 'pin at wrong position: top=' + Math.round(pinRect.top) };
            }

            // 检查是否遮挡了 DOM 中位于 pinWrap 之前的元素
            // 如果前一个元素仍在视口内可见，说明 pin 开始得太早
            var boundaries = findBoundaryElements(pinWrap);
            if (boundaries.prev) {
                var prevRect = boundaries.prev.getBoundingClientRect();
                if (prevRect.height > 0 && prevRect.bottom > 50) {
                    console.warn('[Position Guard] ' + label + ' PIN TOO EARLY: previous element still visible, bottom=' +
                        Math.round(prevRect.bottom) + ', pinRect.top=' + Math.round(pinRect.top));
                    return { valid: false, reason: 'pin started too early: prev element visible at bottom=' + Math.round(prevRect.bottom) };
                }
            }

            return { valid: true, reason: 'pinned correctly at top=' + Math.round(pinRect.top) };
        }

        // 非 pin 状态：检查与前后元素的边界
        // 只在至少一个边界接近视口时才做检测，避免元素都在视口外时误报
        var boundaries = findBoundaryElements(pinWrap);
        var pinRect = pinWrap.getBoundingClientRect();
        var tolerance = 5;
        var issues = [];

        if (boundaries.prev) {
            var prevRect = boundaries.prev.getBoundingClientRect();
            if (prevRect.height > 0 && pinRect.top < prevRect.bottom - tolerance) {
                // 只在 prev 或 pinWrap 至少一个接近视口时才报错
                var viewportH = window.innerHeight;
                var prevNearViewport = prevRect.bottom > -200 && prevRect.top < viewportH + 200;
                var pinNearViewport = pinRect.bottom > -200 && pinRect.top < viewportH + 200;
                if (prevNearViewport || pinNearViewport) {
                    var overlap = Math.round(prevRect.bottom - pinRect.top);
                    issues.push('overlaps with previous element by ' + overlap + 'px');
                }
            }
        }

        if (boundaries.next) {
            var nextRect = boundaries.next.getBoundingClientRect();
            if (nextRect.height > 0 && pinRect.bottom > nextRect.top + tolerance) {
                var overlap = Math.round(pinRect.bottom - nextRect.top);
                issues.push('overlaps with next element by ' + overlap + 'px');
            }
        }

        if (issues.length > 0) {
            console.warn('[Position Guard] ' + label + ' POSITION ERROR:', issues.join('; '),
                'pinRect:', JSON.stringify({top: Math.round(pinRect.top), bottom: Math.round(pinRect.bottom), height: Math.round(pinRect.height)}));
            return { valid: false, reason: issues.join('; ') };
        }

        return { valid: true, reason: 'ok' };
    }

    function killGalleryScrollTrigger(pinWrap, label) {
        for (var i = scrollTriggers.length - 1; i >= 0; i--) {
            var st = scrollTriggers[i];
            if (st && st.vars && st.vars.trigger === pinWrap) {
                console.log('[Position Guard] ' + label + ' killing old ScrollTrigger');
                try { st.kill(); } catch(e) {}
                scrollTriggers.splice(i, 1);
            }
        }
    }

    function repairGallery(pinWrapId, trackId, createFn, label) {
        var pinWrap = document.getElementById(pinWrapId);
        var trackEl = document.getElementById(trackId);
        if (!pinWrap || !trackEl) {
            console.warn('[Position Guard] ' + label + ' cannot repair: elements not found');
            return false;
        }

        if (pinWrap._repairing) {
            console.warn('[Position Guard] ' + label + ' already repairing, skipping');
            return false;
        }
        pinWrap._repairing = true;

        // 防止无限修复循环：每个 guard 最多修复 6 次
        if (!pinWrap._repairCount) pinWrap._repairCount = 0;
        if (pinWrap._repairCount >= 6) {
            console.error('[Position Guard] ' + label + ' repair limit reached (6), giving up');
            return false;
        }
        pinWrap._repairCount++;

        console.log('[Position Guard] ' + label + ' starting repair #' + pinWrap._repairCount + '...');

        // 1. 杀死旧 ScrollTrigger
        killGalleryScrollTrigger(pinWrap, label);

        // 2. 清除 GSAP 可能残留的 inline styles
        pinWrap.style.position = '';
        pinWrap.style.top = '';
        pinWrap.style.bottom = '';
        pinWrap.style.left = '';
        pinWrap.style.right = '';
        pinWrap.style.transform = '';
        pinWrap.style.margin = '';
        pinWrap.style.padding = '';
        trackEl.style.transform = '';

        // 3. 强制重排
        pinWrap.offsetHeight;
        trackEl.offsetHeight;

        // 4. 重新创建 ScrollTrigger
        var st = createFn();
        if (st) {
            scrollTriggers.push(st);
        }

        // 5. 全局刷新 — 让 GSAP 正确放置 pinSpacing spacer 到 DOM 中
        //    注意: railway(refreshPriority=2) 先于 plants(refreshPriority=1) 刷新
        //    railway 的 pinSpacing 先应用，plants 基于正确布局计算 start
        ScrollTrigger.refresh();

        // 6. 等布局稳定后验证（异步，让浏览器完成重排）
        setTimeout(function() {
            var recheckPin = document.getElementById(pinWrapId);
            if (!recheckPin) return;
            recheckPin.offsetHeight;

            var result = validateGalleryPosition(recheckPin, label);
            if (result.valid) {
                recheckPin._repairCount = 0;
                console.log('[Position Guard] ' + label + ' repair SUCCESS');
            } else {
                console.error('[Position Guard] ' + label + ' repair FAILED:', result.reason);
            }
            recheckPin._repairing = false;
        }, 250);

        return true;
    }

    function installPositionGuard(pinWrapId, trackId, createFn, label) {
        var pinWrap = document.getElementById(pinWrapId);
        if (!pinWrap) return;

        console.log('[Position Guard] Installing guard for', label);

        // 初始验证
        var initResult = validateGalleryPosition(pinWrap, label);
        if (!initResult.valid) {
            console.warn('[Position Guard] ' + label + ' initial position invalid, repairing...');
            repairGallery(pinWrapId, trackId, createFn, label);
        } else {
            console.log('[Position Guard] ' + label + ' initial position valid');
        }

        // 周期性检测（前 60 秒每 3 秒检测一次，覆盖所有可能的延迟加载）
        var checkCount = 0;
        var maxChecks = 20;
        var intervalId = setInterval(function() {
            checkCount++;
            var currentPinWrap = document.getElementById(pinWrapId);
            if (!currentPinWrap) {
                clearInterval(intervalId);
                return;
            }

            var result = validateGalleryPosition(currentPinWrap, label);
            if (!result.valid) {
                console.warn('[Position Guard] ' + label + ' periodic check #' + checkCount + ' FAILED, repairing...');
                repairGallery(pinWrapId, trackId, createFn, label);
            }

            if (checkCount >= maxChecks) {
                clearInterval(intervalId);
                console.log('[Position Guard] ' + label + ' periodic checks completed (' + maxChecks + ' rounds)');
            }
        }, 3000);

        guardIntervals.push(intervalId);

        // 注册到全局列表
        positionGuards.push({
            pinWrapId: pinWrapId,
            trackId: trackId,
            createFn: createFn,
            label: label,
            intervalId: intervalId
        });
    }

    function validateAllGuards() {
        positionGuards.forEach(function(guard) {
            var pinWrap = document.getElementById(guard.pinWrapId);
            if (!pinWrap) return;
            var result = validateGalleryPosition(pinWrap, guard.label);
            if (!result.valid) {
                console.warn('[Position Guard] validateAll: ' + guard.label + ' invalid, repairing...');
                repairGallery(guard.pinWrapId, guard.trackId, guard.createFn, guard.label);
            }
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

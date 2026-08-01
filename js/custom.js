/*
 * Wedding — free Bootstrap 5 template by uiCookies (https://uicookies.com)
 * Vanilla JavaScript. No jQuery, no plugins.
 */
(function () {
  'use strict';

  var navbar = document.querySelector('.probootstrap-navbar');

  /*----------------------------------------
    Navbar state: transparent over the hero,
    solid + auto-hide/reveal after scrolling
  ----------------------------------------*/
  function initNavbarState() {
    if (!navbar) return;
    var lastScrollTop = 0;
    window.addEventListener('scroll', function () {
      var st = window.scrollY;

      if (st > 200) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled', 'awake');
      }

      if (navbar.classList.contains('scrolled') && st > 300) {
        if (st > lastScrollTop) {
          navbar.classList.remove('awake');
          navbar.classList.add('sleep');
        } else {
          navbar.classList.add('awake');
          navbar.classList.remove('sleep');
        }
        lastScrollTop = st;
      }
    }, { passive: true });
  }

  /*----------------------------------------
    Scroll-triggered animations
    (.probootstrap-animate + data-animate-effect)
  ----------------------------------------*/
  function initAnimations() {
    var items = document.querySelectorAll('.probootstrap-animate');
    if (!items.length || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('fadeInUp', 'probootstrap-animated'); });
      return;
    }
    var queue = [];
    var flushTimer = null;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || entry.target.classList.contains('probootstrap-animated')) return;
        queue.push(entry.target);
        observer.unobserve(entry.target);
      });
      if (queue.length && !flushTimer) {
        flushTimer = setTimeout(function () {
          queue.forEach(function (el, k) {
            setTimeout(function () {
              var effect = el.getAttribute('data-animate-effect') || 'fadeInUp';
              el.classList.add(effect, 'probootstrap-animated');
            }, k * 100);
          });
          queue = [];
          flushTimer = null;
        }, 100);
      }
    }, { rootMargin: '0px 0px -5% 0px' });
    items.forEach(function (el) { observer.observe(el); });
  }

  /*----------------------------------------
    Smooth scrolling nav (data-nav-section)
    + .smoothscroll anchor links
  ----------------------------------------*/
  function scrollToSection(section) {
    var target = document.querySelector('[data-section="' + section + '"]');
    if (!target) return;
    var offset = navbar && navbar.classList.contains('scrolled') ? navbar.offsetHeight : 0;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
  }

  function initClickMenu() {
    document.querySelectorAll('.navbar-nav a[data-nav-section]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        scrollToSection(link.getAttribute('data-nav-section'));
        var collapseEl = document.querySelector('.navbar-collapse.show');
        if (collapseEl && window.bootstrap) {
          bootstrap.Collapse.getOrCreateInstance(collapseEl).hide();
        }
      });
    });
    document.querySelectorAll('a.smoothscroll[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        var target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        event.preventDefault();
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
      });
    });
  }

  /*----------------------------------------
    Scrollspy: reflect the visible section
    in the navigation (data-section)
  ----------------------------------------*/
  function initScrollspy() {
    var sections = document.querySelectorAll('[data-section]');
    if (!sections.length) return;
    function update() {
      var pos = window.scrollY + window.innerHeight / 3;
      var current = sections[0].getAttribute('data-section');
      sections.forEach(function (section) {
        if (section.offsetTop <= pos) current = section.getAttribute('data-section');
      });
      document.querySelectorAll('.navbar-nav li').forEach(function (li) {
        var link = li.querySelector('a[data-nav-section]');
        li.classList.toggle('active', !!link && link.getAttribute('data-nav-section') === current);
      });
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }


  /*----------------------------------------
    Hero slider (replaces FlexSlider)
  ----------------------------------------*/
  function initHeroSlider() {
    var slider = document.querySelector('.flexslider');
    if (!slider) return;
    var slides = Array.prototype.slice.call(slider.querySelectorAll('.slides > li'));
    if (slides.length < 2) { slides[0] && slides[0].classList.add('flex-active'); return; }
    var current = 0;
    var timer = null;

    var nav = document.createElement('ol');
    nav.className = 'flex-control-nav flex-control-paging';
    slides.forEach(function (_, i) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#';
      a.textContent = i + 1;
      a.addEventListener('click', function (e) { e.preventDefault(); go(i); restart(); });
      li.appendChild(a);
      nav.appendChild(li);
    });
    slider.appendChild(nav);
    var dots = nav.querySelectorAll('a');

    function go(n) {
      slides[current].classList.remove('flex-active');
      dots[current].classList.remove('flex-active');
      current = (n + slides.length) % slides.length;
      slides[current].classList.add('flex-active');
      dots[current].classList.add('flex-active');
    }
    function restart() {
      clearInterval(timer);
      timer = setInterval(function () { go(current + 1); }, 5000);
    }
    go(0);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) restart();
  }


  /*----------------------------------------
    Testimonial rotator (replaces Owl)
  ----------------------------------------*/
  function initTestimonyRotator() {
    var box = document.querySelector('.owl-carousel-testimony');
    if (!box) return;
    var items = box.querySelectorAll('.item');
    if (items.length < 2) { items[0] && items[0].classList.add('rot-active'); return; }
    var i = 0;
    items[0].classList.add('rot-active');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setInterval(function () {
      items[i].classList.remove('rot-active');
      i = (i + 1) % items.length;
      items[i].classList.add('rot-active');
    }, 5000);
  }

  /*----------------------------------------
    Header search overlay
  ----------------------------------------*/
  function initSearchOverlay() {
    var panel = document.getElementById('probootstrap-search');
    var toggles = document.querySelectorAll('.js-probootstrap-search');
    if (!panel || !toggles.length) return;
    toggles.forEach(function (t) {
      t.addEventListener('click', function (e) {
        e.preventDefault();
        document.body.classList.toggle('probootstrap-search-active');
        var input = panel.querySelector('input');
        if (input && document.body.classList.contains('probootstrap-search-active')) input.focus();
      });
    });
    document.addEventListener('keyup', function (e) {
      if (e.key === 'Escape') document.body.classList.remove('probootstrap-search-active');
    });
  }

  /*----------------------------------------
    Gallery lightbox (replaces PhotoSwipe)
  ----------------------------------------*/
  function initLightbox() {
    var links = Array.prototype.slice.call(document.querySelectorAll('a.image-popup'));
    if (!links.length) return;
    var lb = document.createElement('div');
    lb.className = 'uic-lightbox';
    lb.innerHTML = '<button class="lb-close" aria-label="Close">&times;</button>' +
      '<button class="lb-prev" aria-label="Previous">&#8249;</button>' +
      '<img alt="">' +
      '<button class="lb-next" aria-label="Next">&#8250;</button>';
    document.body.appendChild(lb);
    var img = lb.querySelector('img');
    var current = 0;
    function show(n) {
      current = (n + links.length) % links.length;
      img.src = links[current].getAttribute('href');
      lb.classList.add('open');
    }
    links.forEach(function (link, i) {
      link.addEventListener('click', function (e) { e.preventDefault(); show(i); });
    });
    lb.querySelector('.lb-close').addEventListener('click', function () { lb.classList.remove('open'); });
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(current - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(current + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.classList.remove('open'); });
    document.addEventListener('keyup', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') lb.classList.remove('open');
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTestimonyRotator();
    initSearchOverlay();
    initLightbox();
    initHeroSlider();
    initNavbarState();
    initAnimations();
    initClickMenu();
    initScrollspy();
  });
})();

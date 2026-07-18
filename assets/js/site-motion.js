/**
 * site-motion.js — aggressive original GSAP motion layer
 * Strong magnetic, scroll-velocity linkage, punchy reveals.
 * No third-party proprietary source.
 */
(function () {
  "use strict";

  document.documentElement.classList.add("js-motion");

  var reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Shared state for hero marquee + scroll velocity */
  window.__heroMarquee = window.__heroMarquee || {
    baseSpeed: 220,
    speed: 220,
    boost: 1,
    dir: 1,
  };
  window.__scrollVel = { y: 0, abs: 0 };

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function waitForGsap(cb, tries) {
    tries = tries || 0;
    if (typeof window.gsap !== "undefined") {
      if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
      cb();
      return;
    }
    if (tries > 80) {
      document.body.classList.add("motion-ready");
      return;
    }
    setTimeout(function () {
      waitForGsap(cb, tries + 1);
    }, 50);
  }

  function q(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function wrapLines(el) {
    if (!el || el.dataset.lineWrapped) return;
    var text = el.textContent;
    el.dataset.lineWrapped = "1";
    el.innerHTML =
      '<span class="motion-clip"><span class="motion-line-inner">' +
      text +
      "</span></span>";
  }

  function wrapImages(imgs) {
    imgs.forEach(function (img) {
      if (img.dataset.motionWrapped || !img.parentNode) return;
      if (img.parentNode.classList.contains("motion-img-wrap")) {
        img.dataset.motionWrapped = "1";
        return;
      }
      var wrap = document.createElement("div");
      wrap.className = "motion-img-wrap";
      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);
      img.dataset.motionWrapped = "1";
    });
  }

  function markTargets() {
    var badge = q("#vineet-big-name .hero-badge");
    var bigName = q("#vineet-big-name .big-name");
    var nav = q("#navScroll");
    if (badge) badge.classList.add("once-in");
    if (bigName) bigName.classList.add("once-in");
    if (nav) nav.classList.add("once-in");

    qa("#abouts .display-4, #abouts .channel-card").forEach(function (el) {
      el.classList.add("motion-reveal");
    });
    qa(
      "section.position-relative .lead, section.position-relative p.fw-lighter, section.position-relative .img-fluid"
    ).forEach(function (el) {
      el.classList.add("motion-reveal");
    });
    qa("#form .wrap-contact100").forEach(function (el) {
      el.classList.add("motion-reveal");
    });
    // Footer (.tc-headline-1) is handled separately — never motion-reveal
    // (last-on-page elements often never hit "top 92%" with smooth scroll)

    qa("#abouts .display-4, #form .contact100-form-title, #abouts h2.fw-lighter, #abouts h2.fw-normal").forEach(
      wrapLines
    );

    wrapImages(
      qa(
        "#abouts .channel-card img, #gallery-1 img, section.position-relative .img-fluid"
      )
    );
  }

  /* ---------- SUPER magnetic (Dennis-style strength) ---------- */
  function initMagnetic() {
    if (reduced || window.innerWidth < 768) return;

    var configs = [
      { sel: "#navScroll .nav-link", strength: 55, strengthText: 30 },
      { sel: "#callMeBtn", strength: 70, strengthText: 40 },
      { sel: ".contact100-form-btn", strength: 60, strengthText: 35 },
      { sel: ".link-fancy", strength: 50, strengthText: 28 },
      { sel: "#vineet-big-name .hero-badge", strength: 45, strengthText: 22 },
      { sel: "#abouts .channel-card", strength: 18, strengthText: 10 },
    ];

    configs.forEach(function (cfg) {
      qa(cfg.sel).forEach(function (el) {
        el.classList.add("magnetic");
        var textChild = el.querySelector("span, .btn-text, h2, p") || null;

        el.addEventListener("mousemove", function (e) {
          var rect = el.getBoundingClientRect();
          var x = e.clientX - rect.left - rect.width / 2;
          var y = e.clientY - rect.top - rect.height / 2;

          gsap.to(el, {
            x: x * (cfg.strength / 100),
            y: y * (cfg.strength / 100),
            duration: 0.9,
            ease: "power3.out",
            overwrite: "auto",
          });

          if (textChild && textChild !== el) {
            gsap.to(textChild, {
              x: x * (cfg.strengthText / 100),
              y: y * (cfg.strengthText / 100),
              duration: 0.9,
              ease: "power3.out",
              overwrite: "auto",
            });
          }
        });

        el.addEventListener("mouseleave", function () {
          gsap.to(el, {
            x: 0,
            y: 0,
            duration: 1.35,
            ease: "elastic.out(1, 0.28)",
            overwrite: "auto",
          });
          if (textChild && textChild !== el) {
            gsap.to(textChild, {
              x: 0,
              y: 0,
              duration: 1.35,
              ease: "elastic.out(1, 0.28)",
              overwrite: "auto",
            });
          }
        });
      });
    });
  }

  /* ---------- Scroll velocity tracker → marquee boost + skew ---------- */
  function initScrollVelocity() {
    if (reduced) return;

    var lastY = window.pageYOffset || 0;
    var lastT = performance.now();
    var vel = 0;
    var skewProxy = { s: 0 };
    var skewTargets = null;

    function sample() {
      var now = performance.now();
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var dt = Math.max((now - lastT) / 1000, 0.001);
      var raw = (y - lastY) / dt;
      // smooth
      vel += (raw - vel) * 0.12;
      lastY = y;
      lastT = now;

      var abs = Math.abs(vel);
      window.__scrollVel.y = vel;
      window.__scrollVel.abs = abs;

      // Marquee: base + scroll boost, reverse with direction
      var m = window.__heroMarquee;
      m.dir = vel >= 0 ? 1 : -1;
      // boost up to ~3.2x when scrolling hard
      m.boost = 1 + Math.min(abs / 900, 2.2);
      m.speed = m.baseSpeed * m.boost;

      // Very light skew — cards/images only (never paragraphs/text)
      var targetSkew = gsap.utils.clamp(-2.2, 2.2, vel / 550);
      skewProxy.s += (targetSkew - skewProxy.s) * 0.06;

      if (!skewTargets) {
        skewTargets = qa("#abouts .channel-card, #gallery-1 .motion-img-wrap");
      }
      if (skewTargets.length) {
        gsap.set(skewTargets, {
          skewY: skewProxy.s,
          force3D: true,
        });
      }

      // Ease skew back when idle
      if (abs < 40) {
        skewProxy.s *= 0.85;
        if (Math.abs(skewProxy.s) < 0.04 && skewTargets && skewTargets.length) {
          gsap.set(skewTargets, { skewY: 0 });
        }
      }

      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  }

  /* ---------- Lenis + ScrollTrigger bridge ---------- */
  function bridgeLenis() {
    if (!window.ScrollTrigger) return;

    function hook() {
      if (window.__lenis) {
        window.__lenis.on("scroll", function () {
          ScrollTrigger.update();
        });
        gsap.ticker.lagSmoothing(0);
        ScrollTrigger.refresh();
        return true;
      }
      return false;
    }

    if (!hook()) {
      var n = 0;
      var id = setInterval(function () {
        n++;
        if (hook() || n > 40) clearInterval(id);
      }, 50);
    }

    window.addEventListener(
      "scroll",
      function () {
        ScrollTrigger.update();
      },
      { passive: true }
    );
  }

  /* ---------- Aggressive scroll reveals + scrub ---------- */
  function initScrollReveals() {
    if (!window.ScrollTrigger || reduced) {
      gsap.set(".motion-reveal, .once-in", {
        clearProps: "all",
        opacity: 1,
        y: 0,
      });
      return;
    }

    // Punchy block reveals (no tilt on text/paragraphs)
    qa(".motion-reveal").forEach(function (el, i) {
      var isText =
        el.matches("p, .lead, .fw-lighter, .display-4, .contact100-form-title") ||
        el.classList.contains("lead");
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: "top 92%",
          toggleActions: "play none none none",
        },
        y: isText ? 48 : 90,
        opacity: 0,
        rotateX: isText ? 0 : 4,
        transformOrigin: "50% 100%",
        duration: 1.05,
        delay: (i % 5) * 0.04,
        ease: "expo.out",
        clearProps: "transform,opacity",
      });
    });

    // Title line wipe — faster / harder
    qa(".motion-line-inner").forEach(function (line) {
      gsap.from(line, {
        scrollTrigger: {
          trigger: line.closest(".motion-reveal, h2, span") || line.parentElement,
          start: "top 92%",
          toggleActions: "play none none none",
        },
        yPercent: 120,
        duration: 0.85,
        ease: "power4.out",
      });
    });

    // Image: bigger scale + scrub parallax inside clip
    qa(".motion-img-wrap img").forEach(function (img) {
      gsap.from(img, {
        scrollTrigger: {
          trigger: img,
          start: "top 92%",
          toggleActions: "play none none none",
        },
        scale: 1.35,
        duration: 1.25,
        ease: "power3.out",
      });

      gsap.fromTo(
        img,
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: "none",
          scrollTrigger: {
            trigger: img.closest(".motion-img-wrap") || img,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.4,
          },
        }
      );
    });

    // Stats — hard punch
    qa(".display-huge").forEach(function (el) {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: "top 92%",
          toggleActions: "play none none none",
        },
        y: 70,
        opacity: 0,
        scale: 0.85,
        duration: 0.95,
        ease: "back.out(1.6)",
        clearProps: "transform,opacity",
      });
    });

    // Gallery cascade — snappier
    var galleryImgs = qa("#gallery-1 .img-fluid");
    if (galleryImgs.length) {
      gsap.from(galleryImgs, {
        scrollTrigger: {
          trigger: "#gallery-1",
          start: "top 85%",
          toggleActions: "play none none none",
        },
        y: 80,
        opacity: 0,
        scale: 0.88,
        rotate: 2,
        duration: 0.85,
        stagger: 0.07,
        ease: "power4.out",
        clearProps: "transform,opacity",
      });

      // Scrub parallax per gallery image
      galleryImgs.forEach(function (img, i) {
        gsap.to(img, {
          y: i % 2 === 0 ? -40 : 40,
          ease: "none",
          scrollTrigger: {
            trigger: img,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      });
    }

    // Hero: light badge drift only — keep "Vineet Durge" fully visible
    var hero = q("#vineet-big-name");
    var badge = q("#vineet-big-name .hero-badge");
    var bigName = q("#vineet-big-name .big-name");
    if (hero && badge) {
      gsap.to(badge, {
        y: -24,
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 0.4,
        },
      });
    }
    // Do NOT fade or push .big-name off-screen (overflow:hidden was clipping it)
    if (bigName) {
      gsap.set(bigName, { opacity: 1, clearProps: "y" });
    }

    // Nav shrink / tint on scroll
    var nav = q("#navScroll .navbar-nav");
    if (nav) {
      ScrollTrigger.create({
        start: 80,
        onUpdate: function (self) {
          var p = Math.min(self.scroll() / 400, 1);
          gsap.to(nav, {
            scale: 1 - p * 0.04,
            duration: 0.2,
            overwrite: "auto",
          });
        },
      });
    }

    // Footer / Established 2024 — always visible (no late scroll-gate)
    // Last page elements often never hit high "start" lines with Lenis
    var foot = q(".tc-headline-1");
    if (foot) {
      gsap.killTweensOf(foot);
      gsap.set(foot, {
        opacity: 1,
        y: 0,
        x: 0,
        visibility: "visible",
        clearProps: "transform,opacity",
      });
    }
  }

  /* ---------- Punchy intro ---------- */
  function playIntro() {
    if (reduced) {
      document.body.classList.add("motion-ready", "motion-intro-done");
      gsap.set(".once-in, #navScroll, #callMeBtn, #vineet-big-name .big-name, #vineet-big-name .hero-badge", {
        clearProps: "all",
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
      });
      return;
    }

    var nameFromY = window.innerWidth > 540 ? "48vh" : "20vh";

    // 1) Lock start state WHILE still visibility:hidden (avoids stick → hide flash)
    gsap.set("#navScroll", { y: -80, opacity: 0, visibility: "visible" });
    gsap.set("#vineet-big-name .hero-badge", {
      y: 90,
      opacity: 0,
      scale: 0.92,
      visibility: "visible",
    });
    gsap.set("#vineet-big-name .big-name", {
      y: nameFromY,
      opacity: 0,
      visibility: "visible",
    });
    gsap.set("#vineet-big-name .big-name h1", { scale: 1 });
    gsap.set("#callMeBtn", { x: 70, opacity: 0, visibility: "visible" });

    // 2) Reveal page only after from-state is applied
    document.body.classList.add("motion-ready");

    // 3) Pull up into place (use .to — never .from, which causes the flash)
    var intro = gsap.timeline({
      defaults: { ease: "expo.out" },
      onComplete: function () {
        document.body.classList.add("motion-intro-done");
        gsap.set(
          "#navScroll, #vineet-big-name .hero-badge, #vineet-big-name .big-name, #callMeBtn",
          { clearProps: "transform" }
        );
      },
    });

    intro.to("#navScroll", { y: 0, opacity: 1, duration: 1.05 }, 0);
    intro.to(
      "#vineet-big-name .hero-badge",
      { y: 0, opacity: 1, scale: 1, duration: 1 },
      0.06
    );
    intro.to(
      "#vineet-big-name .big-name",
      { y: 0, opacity: 1, duration: 1.45, ease: "expo.out" },
      0.08
    );
    intro.to(
      "#callMeBtn",
      { x: 0, opacity: 1, duration: 0.9, ease: "back.out(1.4)" },
      0.28
    );
  }

  /* ---------- Preloader — faster cycle, harder exit ---------- */
  function initPreloader() {
    var preloader = q("#preloaderpage");
    var greeting = q("#greeting");
    if (!preloader || !greeting) {
      playIntro();
      initScrollReveals();
      return;
    }

    if (!q(".loader-curve", preloader)) {
      var curve = document.createElement("div");
      curve.className = "loader-curve";
      curve.innerHTML = '<div class="loader-curve-inner"></div>';
      preloader.appendChild(curve);
    }

    var greetings = [
      "नमस्ते",
      "Hola",
      "Nǐ hǎo",
      "कसा काय?",
      "Bonjour",
      "Ciao",
      "खम्मा घणी",
      "Konnichiwa",
      "آداب",
    ];

    if (reduced) {
      preloader.style.display = "none";
      playIntro();
      initScrollReveals();
      return;
    }

    preloader.style.transition = "none";
    gsap.set(preloader, { yPercent: 0 });
    gsap.set(".loader-curve", {
      height: window.innerWidth > 540 ? "12vh" : "6vh",
    });
    gsap.set("html", { cursor: "wait" });

    var index = 0;
    var totalTime = 1600;
    var intervalTime = totalTime / greetings.length;

    gsap.fromTo(
      greeting,
      { y: 30, opacity: 0, scale: 0.92 },
      { y: 0, opacity: 1, scale: 1, duration: 0.28, ease: "power3.out" }
    );

    var interval = setInterval(function () {
      index++;
      if (index >= greetings.length) {
        clearInterval(interval);
        exitLoader();
        return;
      }
      gsap.to(greeting, {
        y: -18,
        opacity: 0,
        scale: 0.95,
        duration: 0.08,
        ease: "power2.in",
        onComplete: function () {
          greeting.textContent = greetings[index];
          gsap.fromTo(
            greeting,
            { y: 18, opacity: 0, scale: 1.05 },
            { y: 0, opacity: 1, scale: 1, duration: 0.1, ease: "power2.out" }
          );
        },
      });
    }, intervalTime);

    function exitLoader() {
      var tl = gsap.timeline({
        onComplete: function () {
          preloader.style.pointerEvents = "none";
          preloader.style.visibility = "hidden";
          gsap.set("html", { cursor: "auto" });
          playIntro();
          initScrollReveals();
          if (window.ScrollTrigger) ScrollTrigger.refresh();
        },
      });

      tl.to(greeting, {
        opacity: 0,
        y: -40,
        scale: 0.9,
        duration: 0.2,
        ease: "power3.in",
      });

      tl.to(
        preloader,
        {
          yPercent: -100,
          duration: 0.85,
          ease: "power4.inOut",
        },
        "-=0.02"
      );

      tl.to(
        ".loader-curve",
        {
          height: 0,
          duration: 0.8,
          ease: "power4.inOut",
        },
        "<"
      );
    }
  }

  /* ---------- Card hover — bigger lift ---------- */
  function initCardHover() {
    if (reduced || window.innerWidth < 768) return;
    qa("#abouts .channel-card").forEach(function (card) {
      var img = q("img", card);
      card.addEventListener("mouseenter", function () {
        if (img) {
          gsap.to(img, {
            scale: 1.12,
            duration: 0.65,
            ease: "power3.out",
            overwrite: "auto",
          });
        }
        gsap.to(card, {
          y: -14,
          scale: 1.015,
          duration: 0.45,
          ease: "power3.out",
          overwrite: "auto",
        });
      });
      card.addEventListener("mouseleave", function () {
        if (img) {
          gsap.to(img, {
            scale: 1,
            duration: 0.7,
            ease: "power3.out",
            overwrite: "auto",
          });
        }
        gsap.to(card, {
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: "elastic.out(1, 0.4)",
          overwrite: "auto",
        });
      });
    });
  }

  function initLinkHover() {
    qa(".link-fancy").forEach(function (link) {
      link.addEventListener("mouseenter", function () {
        gsap.to(link, {
          letterSpacing: "0.14em",
          x: 6,
          duration: 0.35,
          ease: "power3.out",
          overwrite: "auto",
        });
      });
      link.addEventListener("mouseleave", function () {
        gsap.to(link, {
          letterSpacing: "0.03em",
          x: 0,
          duration: 0.45,
          ease: "power3.out",
          overwrite: "auto",
        });
      });
    });
  }

  /* ---------- Custom cursor disabled (kept system cursor; no smooth-scroll conflict) ---------- */
  function initCursor() {
    var old = q("#motion-cursor");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    document.documentElement.classList.add("cursor-native");
    document.body.classList.remove("cursor-on", "cursor-hover", "cursor-text", "cursor-down");
  }

  ready(function () {
    waitForGsap(function () {
      markTargets();
      bridgeLenis();
      initScrollVelocity();
      initMagnetic();
      initCardHover();
      initLinkHover();
      initCursor();
      initPreloader();

      window.addEventListener("resize", function () {
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    });
  });
})();

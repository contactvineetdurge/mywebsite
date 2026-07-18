/**
 * smooth-scroll.js — Lenis smooth scrolling
 * ScrollTrigger sync + smooth anchor jumps
 */
(function () {
  "use strict";

  var reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function boot() {
    if (reduced) {
      document.documentElement.classList.add("native-smooth");
      return;
    }

    if (typeof Lenis === "undefined") {
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        if (typeof Lenis !== "undefined") {
          clearInterval(t);
          startLenis();
        } else if (tries > 40) {
          clearInterval(t);
          document.documentElement.classList.add("native-smooth");
        }
      }, 50);
      return;
    }

    startLenis();
  }

  function startLenis() {
    if (window.__lenis) {
      try {
        window.__lenis.destroy();
      } catch (e) {}
      window.__lenis = null;
    }

    var lenis = new Lenis({
      duration: 1.4,
      easing: function (t) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * t));
      },
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.05,
      touchMultiplier: 1.3,
      infinite: false,
    });

    window.__lenis = lenis;
    document.documentElement.classList.add("has-smooth-scroll", "lenis");

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync GSAP ScrollTrigger
    if (typeof ScrollTrigger !== "undefined") {
      lenis.on("scroll", function () {
        ScrollTrigger.update();
      });
      if (typeof gsap !== "undefined") {
        gsap.ticker.lagSmoothing(0);
      }
      // refresh after layout settles
      setTimeout(function () {
        ScrollTrigger.refresh();
      }, 400);
    }

    // Smooth in-page anchors (nav: Home / Send Hi! / Work)
    document.addEventListener(
      "click",
      function (e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a) return;

        var href = a.getAttribute("href");
        if (!href || href === "#" || href.length < 2) return;

        var target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();
        lenis.scrollTo(target, {
          offset: -90,
          duration: 1.5,
        });

        if (history.pushState) {
          history.pushState(null, "", href);
        } else {
          location.hash = href;
        }
      },
      false
    );

    // Pause while preloader covers the page
    var pre = document.getElementById("preloaderpage");
    if (pre) {
      lenis.stop();
      var started = false;
      function tryStart() {
        if (started) return;
        if (
          document.body.classList.contains("motion-ready") ||
          pre.style.visibility === "hidden" ||
          getComputedStyle(pre).visibility === "hidden"
        ) {
          started = true;
          lenis.start();
          return;
        }
        requestAnimationFrame(tryStart);
      }
      requestAnimationFrame(tryStart);
      setTimeout(function () {
        if (!started) {
          started = true;
          lenis.start();
        }
      }, 3500);
    }

    window.smoothScrollTo = function (target, opts) {
      lenis.scrollTo(target, opts || { offset: -90, duration: 1.4 });
    };

    window.addEventListener("resize", function () {
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

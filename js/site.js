document.addEventListener("DOMContentLoaded", function () {
  var navLinks = Array.from(
    document.querySelectorAll('nav a[href^="#"], #mobile-menu a[href^="#"]'),
  ).filter(function (link) {
    var href = link.getAttribute("href") || "";
    return href.length > 1;
  });

  if (!navLinks.length) return;

  var sectionMap = {};
  navLinks.forEach(function (link) {
    var href = link.getAttribute("href");
    var id = href.slice(1);
    var section = document.getElementById(id);
    if (section) sectionMap[id] = section;
  });

  var sections = Object.keys(sectionMap).map(function (id) {
    return sectionMap[id];
  });

  function setActiveSection(sectionId) {
    navLinks.forEach(function (link) {
      var href = link.getAttribute("href");
      var isActive = href === "#" + sectionId;
      link.classList.toggle("is-active-section", isActive);
      if (href === "#join") {
        link.classList.toggle("is-active-pill", isActive);
      }
    });
  }

  function getCurrentSectionId() {
    if (!sections.length) return null;
    var smt = parseFloat(getComputedStyle(sections[0]).scrollMarginTop) || 112;
    var line = smt + 16;
    var currentId = sections[0].id;

    sections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= line) {
        currentId = section.id;
      }
    });

    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
      currentId = sections[sections.length - 1].id;
    }

    return currentId;
  }

  function updateActiveFromScroll() {
    var id = getCurrentSectionId();
    if (id) setActiveSection(id);
  }

  navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      var href = link.getAttribute("href") || "";
      if (href.length > 1) {
        setActiveSection(href.slice(1));
      }
    });
  });

  window.addEventListener("scroll", updateActiveFromScroll, {
    passive: true,
  });
  window.addEventListener("resize", updateActiveFromScroll);
  updateActiveFromScroll();
});

document.addEventListener("DOMContentLoaded", function () {
  var modal = document.getElementById("tv-modal");
  if (!modal) return;

  var player = document.getElementById("tv-modal-player");
  var titleEl = document.getElementById("tv-modal-title");
  var closeBtn = document.getElementById("tv-modal-close");
  var lastFocused = null;

  function openModal(type, src, title) {
    titleEl.textContent = title || "";
    if (type === "youtube") {
      player.innerHTML =
        '<iframe class="absolute inset-0 h-full w-full" src="https://www.youtube.com/embed/' +
        encodeURIComponent(src) +
        '?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="' +
        (title || "Video") +
        '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
    } else {
      player.innerHTML =
        '<video class="absolute inset-0 h-full w-full" src="' +
        src +
        '" controls autoplay playsinline preload="metadata"></video>';
    }
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }

  function closeModal() {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    modal.setAttribute("aria-hidden", "true");
    player.innerHTML = "";
    document.body.style.overflow = "";
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function trigger(card) {
    lastFocused = card;
    openModal(
      card.getAttribute("data-video-type"),
      card.getAttribute("data-video-src"),
      card.getAttribute("data-video-title"),
    );
  }

  Array.prototype.forEach.call(
    document.querySelectorAll("[data-tv-video]"),
    function (card) {
      card.addEventListener("click", function () {
        trigger(card);
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          trigger(card);
        }
      });
    },
  );

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
  });
});

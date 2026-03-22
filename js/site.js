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

    var nav = document.querySelector("nav");
    var offset = (nav ? nav.offsetHeight : 0) + 24;
    var currentId = sections[0].id;

    sections.forEach(function (section) {
      if (window.scrollY + offset >= section.offsetTop) {
        currentId = section.id;
      }
    });

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

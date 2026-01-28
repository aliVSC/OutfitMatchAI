// client/js/idle.js
(function () {
  const IDLE_MINUTES = 5;
  const IDLE_MS = IDLE_MINUTES * 60 * 1000;

  let timer = null;

  function goHome() {
    // Evita loops si ya estás en index
    const path = (window.location.pathname || "").toLowerCase();
    if (path.endsWith("index.html") || path.endsWith("/")) return;

    window.location.href = "index.html";
  }

  function resetTimer() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(goHome, IDLE_MS);
  }

  // Eventos que cuentan como "actividad"
  ["mousemove", "mousedown", "keydown", "touchstart", "scroll"].forEach((evt) => {
    window.addEventListener(evt, resetTimer, { passive: true });
  });

  // arrancar
  resetTimer();
})();

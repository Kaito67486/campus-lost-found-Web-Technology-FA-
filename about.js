document.addEventListener("DOMContentLoaded", () => {
  // show page if using body.page fade animation
  document.body.classList.add("page-ready");

  // footer year
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
});
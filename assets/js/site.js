(function () {
  const data = window.SPL_DATA || { categories: [], programs: [] };

  const categoryLabel = (id) => data.categories.find((category) => category.id === id)?.label || id;
  const accessLabel = (access) => ({
    "free-full": "フル無料",
    "free-preview": "無料プレビュー",
    "planned-paid": "有料予定",
  })[access] || access;

  function pathPrefix() {
    const depth = document.body.dataset.depth || "root";
    if (depth === "two") return "../../";
    if (depth === "one") return "../";
    return "";
  }

  function renderProgramCard(program) {
    const prefix = pathPrefix();
    const detailHref = program.access === "free-full"
      ? `${prefix}programs/${program.slug}/`
      : `${prefix}programs/#${program.slug}`;
    const download = program.downloads?.[0]
      ? `<a class="text-link" href="${prefix}${program.downloads[0].href}">${program.downloads[0].label}</a>`
      : `<span class="muted">詳細版は今後公開予定</span>`;

    return `
      <article class="program-card" data-category="${program.category}" data-access="${program.access}" data-title="${program.title}">
        <div class="card-kicker">${categoryLabel(program.category)} / ${program.duration}分 / ${program.difficulty}</div>
        <h3><a href="${detailHref}">${program.title}</a></h3>
        <p>${program.summary}</p>
        <div class="tag-row">
          <span class="tag">${accessLabel(program.access)}</span>
          ${program.targetServices.slice(0, 2).map((service) => `<span class="tag ghost">${service}</span>`).join("")}
        </div>
        <div class="card-actions">
          <a class="button secondary" href="${detailHref}">内容を見る</a>
          ${download}
        </div>
      </article>
    `;
  }

  function renderCards() {
    document.querySelectorAll("[data-render-programs]").forEach((target) => {
      const mode = target.dataset.renderPrograms;
      let programs = data.programs;
      if (mode === "featured") programs = programs.filter((program) => program.access === "free-full");
      if (mode === "samples") programs = programs.filter((program) => program.access !== "planned-paid");
      target.innerHTML = programs.map(renderProgramCard).join("");
    });
  }

  function renderCategories() {
    document.querySelectorAll("[data-render-categories]").forEach((target) => {
      const prefix = pathPrefix();
      target.innerHTML = data.categories.map((category) => `
        <article class="category-card">
          <p class="card-kicker">Program Field</p>
          <h3>${category.label}</h3>
          <p>${category.summary}</p>
          <a class="text-link" href="${prefix}programs/#${category.id}">この分野の教材を見る</a>
        </article>
      `).join("");
    });
  }

  function setupFilters() {
    const list = document.querySelector("[data-program-list]");
    if (!list) return;
    const search = document.querySelector("[data-program-search]");
    const category = document.querySelector("[data-program-category]");
    const access = document.querySelector("[data-program-access]");

    function apply() {
      const q = (search?.value || "").trim().toLowerCase();
      const selectedCategory = category?.value || "all";
      const selectedAccess = access?.value || "all";
      list.querySelectorAll(".program-card").forEach((card) => {
        const matchesSearch = !q || card.dataset.title.toLowerCase().includes(q) || card.textContent.toLowerCase().includes(q);
        const matchesCategory = selectedCategory === "all" || card.dataset.category === selectedCategory;
        const matchesAccess = selectedAccess === "all" || card.dataset.access === selectedAccess;
        card.hidden = !(matchesSearch && matchesCategory && matchesAccess);
      });
    }

    [search, category, access].forEach((input) => input?.addEventListener("input", apply));
    if (location.hash) {
      const hash = location.hash.replace("#", "");
      if (data.categories.some((item) => item.id === hash) && category) category.value = hash;
    }
    apply();
  }

  function hydrateDetail() {
    const target = document.querySelector("[data-program-slug]");
    if (!target) return;
    const program = data.programs.find((item) => item.slug === target.dataset.programSlug);
    if (!program) {
      target.innerHTML = `<section class="section"><h1>教材が見つかりません</h1><p>一覧から教材を選び直してください。</p></section>`;
      return;
    }
    target.innerHTML = `
      <section class="detail-hero">
        <p class="eyebrow">${categoryLabel(program.category)} / ${program.duration}分 / ${program.difficulty}</p>
        <h1>${program.title}</h1>
        <p>${program.summary}</p>
        <div class="tag-row">${program.targetServices.map((service) => `<span class="tag">${service}</span>`).join("")}</div>
        <div class="button-row">
          ${program.downloads.map((download) => `<a class="button" href="${pathPrefix()}${download.href}">${download.label}を開く</a>`).join("")}
          <a class="button secondary" href="../">教材一覧へ</a>
        </div>
      </section>
      <section class="section two-column">
        <div>
          <h2>ねらい</h2>
          <ul class="check-list">${program.goals.map((goal) => `<li>${goal}</li>`).join("")}</ul>
        </div>
        <div>
          <h2>準備物</h2>
          <ul class="plain-list">${program.materials.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
      </section>
      <section class="section">
        <h2>進行の流れ</h2>
        <ol class="flow-list">${program.flow.map((step) => `<li>${step}</li>`).join("")}</ol>
      </section>
      <section class="section two-column">
        <div class="note-box">
          <h2>記録文例</h2>
          <p>${program.recordExample}</p>
        </div>
        <div class="note-box">
          <h2>観察ポイント</h2>
          <ul class="plain-list">${program.observationPoints.map((point) => `<li>${point}</li>`).join("")}</ul>
        </div>
      </section>
      <section class="section caution">
        <h2>進行上の配慮</h2>
        <ul class="plain-list">${program.cautions.map((item) => `<li>${item}</li>`).join("")}</ul>
      </section>
    `;
  }

  function markActiveNav() {
    const current = location.pathname.replace(/\/index\.html$/, "/");
    document.querySelectorAll(".site-nav a").forEach((link) => {
      const linkPath = new URL(link.href).pathname.replace(/\/index\.html$/, "/");
      if (current === linkPath) link.setAttribute("aria-current", "page");
    });
  }

  renderCards();
  renderCategories();
  hydrateDetail();
  setupFilters();
  markActiveNav();
})();

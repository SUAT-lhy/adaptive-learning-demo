const state = {
  data: null,
  subject: "math",
  view: "solve",
  problemId: "p-exam-2013-daxing",
  reasoningStep: 1,
  reading: "thin",
  chapter: "c8",
  section: "8.5 空间直线、平面的平行",
  mistake: "m02",
  mistakeKnowledge: "全部",
  mistakeNumber: "全部",
  cnStep: 0,
  visibleSeries: new Set(),
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const svgNS = "http://www.w3.org/2000/svg";

async function request(url, options = {}) {
  if (url === "/api/bootstrap" && window.STATIC_BOOTSTRAP) {
    return structuredClone(window.STATIC_BOOTSTRAP);
  }
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) throw new Error(`请求失败：${response.status}`);
  return response.json();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2300);
}

function initShell() {
  $$(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
  $("#mobileMenu").addEventListener("click", () => $(".sidebar").classList.toggle("is-open"));

  const subjectEntry = $("#subjectEntry");
  const subjectPopover = $("#subjectPopover");
  subjectEntry.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = subjectPopover.hidden;
    subjectPopover.hidden = !willOpen;
    subjectEntry.setAttribute("aria-expanded", String(willOpen));
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".subject-wrap")) {
      subjectPopover.hidden = true;
      subjectEntry.setAttribute("aria-expanded", "false");
    }
  });
}

function renderSubjectMenu() {
  const subjects = state.data.subjectMethods;
  const groups = ["文科", "理科"];
  $("#subjectPopover").innerHTML = `<b>选择科目</b>${groups.map((group) => `
    <div class="subject-group"><span>${group}</span>${subjects.filter((subject) => subject.group === group).map((subject) => `
      <button class="${subject.id === state.subject ? "is-current" : ""}" data-subject="${escapeHtml(subject.id)}"><span>${escapeHtml(subject.mark)}</span><div><strong>${escapeHtml(subject.name)}</strong><small>${subject.demo ? "已有演示" : "思维口诀"}</small></div></button>
    `).join("")}</div>`).join("")}`;
  $$("[data-subject]", $("#subjectPopover")).forEach((button) => button.addEventListener("click", () => switchSubject(button.dataset.subject)));
}

function switchSubject(subjectId) {
  const subject = state.data.subjectMethods.find((item) => item.id === subjectId);
  if (!subject) return;
  state.subject = subjectId;
  $("#subjectPopover").hidden = true;
  $("#subjectEntry").setAttribute("aria-expanded", "false");
  $("#currentSubjectName").textContent = subject.name;
  $("#subjectCrumb").textContent = subject.name;
  $("#currentBook").textContent = subjectId === "math" ? "人教A版 · 必修第二册" : subjectId === "chinese" ? "统编版 · 高中语文" : "学科思维框架";
  $("#currentUnit").textContent = subjectId === "math" ? "第八章 立体几何初步" : subjectId === "chinese" ? "文学阅读 · 真题训练" : `${subject.modules.length} 个解题板块`;
  $$(".nav-item").forEach((button) => {
    const unavailable = subjectId !== "math" && button.dataset.view !== "solve";
    button.hidden = unavailable;
  });
  $("#mathSolve").hidden = subjectId !== "math";
  $("#chineseSolve").hidden = subjectId !== "chinese";
  $("#subjectOverview").hidden = subjectId === "math" || subjectId === "chinese";
  document.title = `星图 · ${subject.name}学习系统`;
  renderSubjectMenu();
  if (subjectId === "chinese") renderChineseDemo();
  if (subjectId !== "math" && subjectId !== "chinese") renderSubjectOverview(subject);
  switchView("solve");
}

function switchView(view) {
  if (state.subject !== "math" && view !== "solve") view = "solve";
  state.view = view;
  $$(".nav-item").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  $$(".view").forEach((section) => section.classList.toggle("is-visible", section.id === `view-${view}`));
  $("#crumbTitle").textContent = state.subject === "math" ? ($(`#view-${view}`)?.dataset.title || "解题") : state.subject === "chinese" ? "文学阅读" : "解题思路";
  $(".sidebar").classList.remove("is-open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderProblem() {
  const problems = state.data.problems || [state.data.currentProblem];
  const problem = problems.find((item) => item.id === state.problemId) || problems[0];
  state.problemId = problem.id;
  $("#problemNumber").textContent = `错题 ${problem.number || "02"}`;
  $("#problemTitle").textContent = problem.title;
  $("#problemSource").textContent = `来源：${problem.source}`;
  $("#problemDifficulty").textContent = problem.difficulty;
  $("#problemSwitcher").innerHTML = problems.map((item) => `
    <button class="${item.id === problem.id ? "is-active" : ""}" data-problem-id="${escapeHtml(item.id)}">${escapeHtml(item.number)} · ${item.kind === "perpendicular" ? "垂直" : "平行"}</button>
  `).join("");
  $$('[data-problem-id]').forEach((button) => button.addEventListener("click", () => selectProblem(button.dataset.problemId)));
  $("#problemStem").textContent = problem.stem;
  $("#studentAttempt").textContent = problem.attempt;
  $("#diagnosisText").textContent = problem.diagnosis;
  $("#knownSummary").textContent = problem.knownSummary;
  $("#missingText").textContent = problem.missing;
  $("#targetText").textContent = problem.strategy.target;
  $("#criterionBook").textContent = problem.strategy.criterion.book;
  $("#criterionName").textContent = problem.strategy.criterion.name;
  $("#criterionText").textContent = problem.strategy.criterion.text;
  $("#conditionList").innerHTML = problem.strategy.criterion.conditions
    .map((condition) => `<li>${escapeHtml(condition)}</li>`).join("");
  $("#propertyList").innerHTML = problem.strategy.properties.map((property, index) => `
    <div class="property-row${index >= state.reasoningStep ? " is-locked" : ""}" data-property-index="${index}">
      <div class="known"><b>已知：</b>${escapeHtml(property.known)}</div>
      <div class="result"><b>${escapeHtml(property.book)} · ${escapeHtml(property.name)}</b><span>${escapeHtml(property.result)}</span></div>
    </div>
  `).join("");
  $("#fullSolution").innerHTML = problem.strategy.solution.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  renderProblemFigure(problem);
  $("#nextReasoning").onclick = nextReasoning;
  $("#toggleSolution").onclick = toggleSolution;
  updateReasoning();
}

function selectProblem(problemId) {
  if (state.problemId === problemId) return;
  state.problemId = problemId;
  state.reasoningStep = 1;
  $("#fullSolution").hidden = true;
  $("#toggleSolution").textContent = "查看完整证明";
  renderProblem();
}

function currentProblem() {
  const problems = state.data.problems || [state.data.currentProblem];
  return problems.find((item) => item.id === state.problemId) || problems[0];
}

function renderProblemFigure(problem) {
  const figure = $("#problemFigure");
  const cubeSvg = `
    <svg viewBox="0 0 470 360" role="img" aria-labelledby="cubeTitle">
      <title id="cubeTitle">正方体 ABCD-A₁B₁C₁D₁，展示 A₁B 平行于平面 CDC₁D₁</title>
      <path class="target-plane" d="M205 95 L370 65 L370 255 L205 290 Z" />
      <g class="solid-lines">
        <path d="M75 125 L245 145 L370 65 L205 95 Z" />
        <path d="M75 315 L245 335 L370 255 L205 290 Z" />
        <path d="M75 125 L75 315 M245 145 L245 335 M370 65 L370 255 M205 95 L205 290" />
      </g>
      <path class="target-line" d="M75 125 L245 335" />
      <g class="auxiliary"><path class="aux-line" d="M205 95 L370 255" /></g>
      <g class="labels">
        <text x="57" y="333">A</text><text x="248" y="350">B</text><text x="376" y="272">C</text><text x="187" y="309">D</text>
        <text x="53" y="119">A₁</text><text x="247" y="140">B₁</text><text x="374" y="60">C₁</text><text x="184" y="89">D₁</text>
        <text class="aux-label" x="296" y="171">D₁C</text>
      </g>
    </svg>`;
  const svg = problem.kind === "cubeParallel" ? cubeSvg : problem.kind === "perpendicular" ? `
    <svg viewBox="0 0 470 360" role="img" aria-labelledby="tetrahedronTitle">
      <title id="tetrahedronTitle">三棱锥 P-ABC，展示待证的 BC 垂直平面 PAB</title>
      <path class="target-plane" d="M135 48 L135 285 L370 310 Z" />
      <g class="solid-lines">
        <path d="M135 48 L135 285 L370 310 L135 48" />
        <path d="M135 285 L285 165 L370 310 M135 48 L285 165" />
      </g>
      <path class="target-line" d="M370 310 L285 165" />
      <g class="auxiliary">
        <path class="aux-line" d="M135 48 L135 285 L370 310" />
        <path class="right-angle" d="M135 270 L150 272 L150 287" />
        <path class="right-angle" d="M342 307 L345 290 L362 293" />
      </g>
      <g class="labels">
        <text x="118" y="42">P</text><text x="113" y="305">A</text><text x="378" y="327">B</text><text x="292" y="160">C</text>
        <text class="aux-label" x="162" y="90">PA</text><text class="aux-label" x="245" y="318">AB</text>
      </g>
    </svg>` : `
    <svg viewBox="0 0 470 360" role="img" aria-labelledby="prismTitle">
      <title id="prismTitle">直三棱柱 ABC-A₁B₁C₁，D 为 BC 中点，O 为辅助点</title>
      <path class="target-plane" d="M80 300 L255 277.5 L200 30 Z" />
      <g class="solid-lines">
        <path d="M80 300 L310 320 L200 235 Z" />
        <path d="M80 95 L310 115 L200 30 Z" />
        <path d="M80 300 L80 95 M310 320 L310 115 M200 235 L200 30" />
      </g>
      <g class="given-points"><circle cx="255" cy="277.5" r="4" /></g>
      <path class="target-line" d="M80 95 L310 320" />
      <g class="auxiliary">
        <circle cx="140" cy="165" r="4" />
        <path class="aux-line" d="M80 95 L200 235 M80 300 L200 30 M140 165 L255 277.5" />
      </g>
      <g class="labels">
        <text x="59" y="319">A</text><text x="313" y="341">B</text><text x="205" y="241">C</text>
        <text x="58" y="89">A₁</text><text x="314" y="111">B₁</text><text x="204" y="26">C₁</text>
        <text x="260" y="275">D</text><text class="aux-label" x="146" y="161">O</text>
      </g>
    </svg>`;
  figure.innerHTML = `${svg}<span class="figure-note">${escapeHtml(problem.figureNote)}</span>`;
}

function nextReasoning() {
  if (state.reasoningStep < 3) state.reasoningStep += 1;
  updateReasoning();
}

function updateReasoning() {
  const problem = currentProblem();
  const step = state.reasoningStep;
  $$(".property-row").forEach((row) => {
    row.classList.toggle("is-locked", Number(row.dataset.propertyIndex) >= step);
  });
  const bridge = $("#bridgeText");
  const nextButton = $("#nextReasoning");
  nextButton.textContent = "显示下一步";
  nextButton.disabled = false;
  $("#problemFigure").classList.toggle("show-aux", step >= 2);
  if (step === 1) {
    bridge.textContent = problem.strategy.stepHints[0];
  } else if (step === 2) {
    bridge.textContent = problem.strategy.stepHints[1];
  } else {
    bridge.textContent = problem.strategy.bridge;
    nextButton.textContent = "路线已连通";
    nextButton.disabled = true;
  }
}

function toggleSolution() {
  const solution = $("#fullSolution");
  solution.hidden = !solution.hidden;
  $("#toggleSolution").textContent = solution.hidden ? "查看完整证明" : "收起完整证明";
}

function renderChineseDemo() {
  const demo = state.data.chineseDemo;
  $("#cnNumber").textContent = demo.number;
  $("#cnTitle").textContent = demo.title;
  $("#cnSource").innerHTML = `来源：<a href="${escapeHtml(demo.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(demo.source)}</a>`;
  $("#cnQuestion").textContent = demo.question;
  $("#cnAnchor").textContent = demo.anchor;
  $("#cnEvidence").innerHTML = demo.evidence.map((item) => `<div><span>${escapeHtml(item.label)}</span><p>${escapeHtml(item.text)}</p></div>`).join("");
  $("#cnAttempt").textContent = demo.attempt;
  $("#cnDiagnosis").textContent = demo.diagnosis;
  $("#cnAnswer").innerHTML = demo.answer.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  $("#cnStepTabs").innerHTML = demo.steps.map((step, index) => `<button class="${index === state.cnStep ? "is-active" : ""}" data-cn-step="${index}"><span>${index + 1}</span>${escapeHtml(step.name)}</button>`).join("");
  $$("[data-cn-step]").forEach((button) => button.addEventListener("click", () => { state.cnStep = Number(button.dataset.cnStep); renderChineseDemo(); }));
  const step = demo.steps[state.cnStep];
  $("#cnStepCard").innerHTML = `<span>${escapeHtml(step.name)}</span><h2>${escapeHtml(step.prompt)}</h2><p>${escapeHtml(step.result)}</p>`;
  const next = $("#cnNextStep");
  next.textContent = state.cnStep === demo.steps.length - 1 ? "思路已连通" : "显示下一步";
  next.disabled = state.cnStep === demo.steps.length - 1;
  next.onclick = () => { if (state.cnStep < demo.steps.length - 1) { state.cnStep += 1; renderChineseDemo(); } };
  $("#cnToggleAnswer").onclick = () => {
    const answer = $("#cnAnswer");
    answer.hidden = !answer.hidden;
    $("#cnToggleAnswer").textContent = answer.hidden ? "查看完整答案" : "收起完整答案";
  };
}

function renderSubjectOverview(subject) {
  $("#overviewTitle").textContent = subject.name;
  $("#subjectMethodList").innerHTML = subject.modules.map((module, index) => `
    <section><span>${String(index + 1).padStart(2, "0")} · ${escapeHtml(module.name)}</span><strong>${escapeHtml(module.motto)}</strong><p>先用前半句锁定观察对象，再用后半句产生一个可执行的下一步。</p></section>
  `).join("");
}

function renderKnowledge() {
  const book = state.data.book;
  $("#chapterList").innerHTML = book.chapters.map((chapter) => `
    <div class="chapter-item${chapter.id === state.chapter ? " is-active" : ""}" data-chapter="${chapter.id}">
      <button class="chapter-button"><span>${escapeHtml(chapter.number)}</span><b>${escapeHtml(chapter.title)}</b></button>
      <div class="section-list">
        ${chapter.sections.map((section) => `<button class="${section === state.section ? "is-selected" : ""}" data-section="${escapeHtml(section)}">${escapeHtml(section)}</button>`).join("")}
      </div>
    </div>
  `).join("");
  $$(".chapter-button").forEach((button) => button.addEventListener("click", () => {
    const chapterId = button.closest(".chapter-item").dataset.chapter;
    state.chapter = chapterId;
    const chapter = book.chapters.find((item) => item.id === chapterId);
    state.section = chapter.sections[0];
    renderKnowledge();
  }));
  $$("[data-section]").forEach((button) => button.addEventListener("click", () => {
    state.section = button.dataset.section;
    renderKnowledge();
  }));
  $$("[data-reading]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.reading === state.reading);
    button.onclick = () => { state.reading = button.dataset.reading; renderKnowledge(); };
  });
  renderChapterDetail();
}

function renderChapterDetail() {
  const chapter = state.data.book.chapters.find((item) => item.id === state.chapter);
  const detail = $("#chapterDetail");
  if (state.reading === "thin") {
    const routes = state.chapter === "c8" ? [
      ["8.1—8.3", "认识基本立体图形、直观图、表面积与体积"],
      ["8.4", "确定点、线、面的位置关系，建立证明语言"],
      ["8.5", "平行：线线 → 线面 → 面面；判定与性质互相转化"],
      ["8.6", "垂直：线线 → 线面 → 面面；条件必须完整"],
      ["综合证明", "看已知想性质；看求证想判定；用辅助线搭桥"],
    ] : chapter.sections.map((section, index) => [section.split(" ")[0], `${index === 0 ? "建立本章基本对象" : "在前一节基础上继续展开"}：${section.split(" ").slice(1).join(" ")}`]);
    detail.innerHTML = `
      <span class="detail-kicker">读薄 · 只保留结构</span>
      <h1>${escapeHtml(chapter.number)} ${escapeHtml(chapter.title)}</h1>
      <p>当前位置：${escapeHtml(state.section)}。先看它在整章、整本书中的作用。</p>
      <div class="thin-route">${routes.map(([label, text]) => `<div class="thin-route-row"><b>${escapeHtml(label)}</b><p>${escapeHtml(text)}</p></div>`).join("")}</div>
    `;
    return;
  }

  if (state.chapter === "c8" && state.section.startsWith("8.5")) {
    detail.innerHTML = `
      <span class="detail-kicker">读厚 · 定义、判定、性质、反例</span>
      <h1>8.5 空间直线、平面的平行</h1>
      <p>同一节点向下展开，直到知道“什么时候能用、为什么能用、最容易错在哪里”。</p>
      <div class="thick-section"><b>课本定理</b>
        <div class="theorem-line"><span>8.5.1 直线与直线平行</span><p>平行的传递性，以及空间等角定理，是把不同平面中的线线关系接起来的基础。</p></div>
        <div class="theorem-line"><span>8.5.2 直线与平面平行 · 判定</span><p>平面外一条直线与此平面内的一条直线平行，则该直线与此平面平行。</p></div>
        <div class="theorem-line"><span>8.5.2 直线与平面平行 · 性质</span><p>一条直线与一个平面平行，过该直线的平面与已知平面相交，则该直线与交线平行。</p></div>
        <div class="theorem-line"><span>8.5.3 平面与平面平行 · 判定</span><p>一个平面内两条相交直线分别平行于另一个平面，则这两个平面平行。</p></div>
      </div>
      <div class="thick-section"><b>判定和性质不要混用</b>
        <table class="compare-table"><thead><tr><th></th><th>已知</th><th>要推出</th></tr></thead><tbody><tr><td>判定</td><td>线线平行</td><td>线面平行</td></tr><tr><td>性质</td><td>线面平行</td><td>线线平行</td></tr></tbody></table>
      </div>
      <div class="thick-section"><b>反例检查</b><div class="theorem-line"><span>常见错误</span><p>只写 a∥b、b⊂α 还不够；如果 a 本身也在 α 内，就不能得到 a∥α。</p></div></div>
    `;
  } else {
    detail.innerHTML = `
      <span class="detail-kicker">读厚 · 当前小节</span>
      <h1>${escapeHtml(state.section)}</h1>
      <p>${escapeHtml(chapter.number)} ${escapeHtml(chapter.title)}</p>
      <div class="thick-section"><b>本节展开方式</b><div class="theorem-line"><span>概念 → 条件 → 例子 → 反例</span><p>这一节点的教师审核资料将在后续录入；当前演示重点已完成 8.5 平行关系。</p></div></div>
    `;
  }
}

function renderMistakes() {
  const all = [...state.data.mistakes].sort((a, b) => a.number.localeCompare(b.number));
  renderMistakeIndex(all);
  const items = all.filter((item) => {
    if (state.mistakeNumber !== "全部") return item.number === state.mistakeNumber;
    if (state.mistakeKnowledge !== "全部") return `${item.section} ${item.knowledge}` === state.mistakeKnowledge;
    return true;
  });
  if (!items.some((item) => item.id === state.mistake)) state.mistake = items[0]?.id || "";
  $("#mistakeList").innerHTML = items.map((item) => {
    const color = item.status === "已掌握" ? "#26805f" : item.status === "待复测" ? "#c87918" : "#2563eb";
    return `<button class="mistake-row${item.id === state.mistake ? " is-active" : ""}" data-mistake="${item.id}"><span class="mistake-number">${escapeHtml(item.number)}</span><span class="mistake-main"><small>${escapeHtml(item.section)} · ${escapeHtml(item.knowledge)}</small><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.error)} · ${escapeHtml(item.source)}</span></span><span class="mistake-status" style="--status-color:${color}">${escapeHtml(item.status)}</span></button>`;
  }).join("");
  $$("[data-mistake]").forEach((button) => button.addEventListener("click", () => { state.mistake = button.dataset.mistake; renderMistakes(); }));
  renderMistakeDetail(all.find((item) => item.id === state.mistake));
}

function renderMistakeIndex(all) {
  const knowledgeOptions = [...new Set(all.map((item) => `${item.section} ${item.knowledge}`))];
  $("#mistakeIndex").innerHTML = `
    <div class="index-row"><span>章节</span><button class="is-active">第八章 立体几何初步</button></div>
    <div class="index-row"><span>知识点</span>
      <button class="${state.mistakeKnowledge === "全部" ? "is-active" : ""}" data-knowledge="全部">全部</button>
      ${knowledgeOptions.map((knowledge) => `<button class="${state.mistakeKnowledge === knowledge ? "is-active" : ""}" data-knowledge="${escapeHtml(knowledge)}">${escapeHtml(knowledge)}</button>`).join("")}
    </div>
    <div class="index-row number-index"><span>错题序号</span>
      <button class="${state.mistakeNumber === "全部" ? "is-active" : ""}" data-number="全部">全部</button>
      ${all.map((item) => `<button class="${state.mistakeNumber === item.number ? "is-active" : ""}" data-number="${escapeHtml(item.number)}">${escapeHtml(item.number)}</button>`).join("")}
    </div>`;
  $$("[data-knowledge]", $("#mistakeIndex")).forEach((button) => button.addEventListener("click", () => {
    state.mistakeKnowledge = button.dataset.knowledge;
    state.mistakeNumber = "全部";
    renderMistakes();
  }));
  $$("[data-number]", $("#mistakeIndex")).forEach((button) => button.addEventListener("click", () => {
    state.mistakeNumber = button.dataset.number;
    if (button.dataset.number !== "全部") {
      const item = all.find((candidate) => candidate.number === button.dataset.number);
      state.mistake = item.id;
      state.mistakeKnowledge = `${item.section} ${item.knowledge}`;
    } else {
      state.mistakeKnowledge = "全部";
    }
    renderMistakes();
  }));
}

function renderMistakeDetail(item) {
  const target = $("#mistakeDetail");
  if (!item) { target.innerHTML = "<p>没有匹配的错题。</p>"; return; }
  target.innerHTML = `
    <div class="mistake-breadcrumb">${escapeHtml(item.chapter)} <i>›</i> ${escapeHtml(item.section)} ${escapeHtml(item.knowledge)} <i>›</i> <b>错题 ${escapeHtml(item.number)}</b></div>
    <span class="detail-id">错题 ${escapeHtml(item.number)}</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.date)} · ${escapeHtml(item.source)} · ${escapeHtml(item.level)}</p>
    <div class="mistake-detail-section"><span>错误类型</span><p class="error-text">${escapeHtml(item.error)}</p></div>
    <div class="mistake-detail-section"><span>原错误</span><p>${escapeHtml(item.attempt)}</p></div>
    <div class="mistake-detail-section"><span>订正要点</span><p class="correction-text">${escapeHtml(item.correction)}</p></div>
    ${item.problemId ? '<div class="mistake-detail-section"><button class="primary-button" id="returnToProblem">打开这道题</button></div>' : ""}
  `;
  $("#returnToProblem")?.addEventListener("click", () => {
    state.problemId = item.problemId;
    state.reasoningStep = 1;
    $("#fullSolution").hidden = true;
    $("#toggleSolution").textContent = "查看完整证明";
    renderProblem();
    switchView("solve");
  });
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(svgNS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function renderGrowth() {
  const growth = state.data.growth;
  if (!state.visibleSeries.size) growth.series.forEach((series) => state.visibleSeries.add(series.id));
  $("#curveControls").innerHTML = growth.series.map((series) => `<button class="curve-toggle${state.visibleSeries.has(series.id) ? "" : " is-off"}" data-series="${series.id}" style="--series-color:${series.color}"><i></i>${escapeHtml(series.label)}</button>`).join("");
  $$("[data-series]").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.series;
    if (state.visibleSeries.has(id) && state.visibleSeries.size > 1) state.visibleSeries.delete(id); else state.visibleSeries.add(id);
    renderGrowth();
  }));
  drawMasteryCurve();
  $("#growthTable").innerHTML = `
    <div class="growth-row header"><span>知识点</span><span>开学测</span><span>最新</span><span>变化判断</span></div>
    ${growth.series.map((series) => {
      const change = series.values.at(-1) - series.values[0];
      const latestGain = series.values.at(-1) - series.values.at(-2);
      return `<div class="growth-row"><b style="--series-color:${series.color}"><i></i>${escapeHtml(series.label)}</b><span>${series.values[0]}</span><span>${series.values.at(-1)}</span><span class="${latestGain >= 7 ? "trend-up" : "trend-watch"}">+${change} · ${latestGain >= 7 ? "持续上升" : "增速放缓，需复测"}</span></div>`;
    }).join("")}
  `;
}

function drawMasteryCurve() {
  const { exams, series } = state.data.growth;
  const svg = $("#masteryCurve");
  svg.replaceChildren();
  const left = 70, right = 980, top = 35, bottom = 400;
  const xStep = (right - left) / (exams.length - 1);
  const y = (value) => bottom - value / 100 * (bottom - top);
  [0, 20, 40, 60, 80, 100].forEach((tick) => {
    svg.append(svgElement("line", { x1: left, y1: y(tick), x2: right, y2: y(tick), class: "chart-grid" }));
    const label = svgElement("text", { x: left - 14, y: y(tick) + 4, class: "chart-axis-label", "text-anchor": "end" });
    label.textContent = `${tick}`;
    svg.append(label);
  });
  exams.forEach((exam, index) => {
    const label = svgElement("text", { x: left + index * xStep, y: bottom + 35, class: "chart-axis-label", "text-anchor": "middle" });
    label.textContent = exam;
    svg.append(label);
  });
  series.filter((item) => state.visibleSeries.has(item.id)).forEach((item) => {
    const points = item.values.map((value, index) => [left + index * xStep, y(value)]);
    const polyline = svgElement("polyline", { points: points.map(([x, py]) => `${x},${py}`).join(" "), class: "chart-line", style: `--series-color:${item.color}` });
    svg.append(polyline);
    points.forEach(([x, py], index) => {
      svg.append(svgElement("circle", { cx: x, cy: py, r: "5", class: "chart-dot", style: `--series-color:${item.color}` }));
      const value = svgElement("text", { x, y: py - 11, class: "chart-value", style: `--series-color:${item.color}`, "text-anchor": "middle" });
      value.textContent = item.values[index];
      svg.append(value);
    });
  });
}

async function boot() {
  try {
    state.data = await request("/api/bootstrap");
    initShell();
    renderSubjectMenu();
    renderProblem();
    renderChineseDemo();
    renderKnowledge();
    renderMistakes();
    renderGrowth();
  } catch (error) {
    document.querySelector("main").innerHTML = '<article class="paper" style="padding:30px"><b>演示数据加载失败</b><p>请确认云端服务已启动后刷新页面。</p></article>';
  }
}

boot();

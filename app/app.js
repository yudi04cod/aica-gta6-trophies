// Leonida Trophy Guide — offline tracker for the 55 GTA VI trophies on PS5.
// Loads data/trophies.json once, renders the roadmap and the checklist, and keeps
// earned ticks in localStorage. No network requests after the first load.
const STORAGE_KEY = 'leonida-trophies-v1';
const DATA_URL = 'data/trophies.json';

const KIND_LABELS = {
  story: 'Story',
  side: 'Side quest',
  collectibles: 'Collectibles',
  activities: 'Activities',
  'free-roam': 'Free-roam',
  platinum: 'Platinum',
  completion: '100% completion',
};

const listEl = document.getElementById('trophyList');
const emptyEl = document.getElementById('emptyState');
const onlineEl = document.getElementById('onlineState');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const gradeStats = document.getElementById('gradeStats');
const filterCount = document.getElementById('filterCount');
const searchEl = document.getElementById('search');
const kindEl = document.getElementById('kind');
const gradeEl = document.getElementById('grade');
const missableEl = document.getElementById('missableOnly');
const hideEarnedEl = document.getElementById('hideEarned');
const spoilerEl = document.getElementById('spoilers');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const resetBtn = document.getElementById('resetBtn');
const roadmapEl = document.getElementById('roadmapStages');

let doc = null;
let earned = new Set();
let openGuideId = null;

function loadSaved() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (raw && Array.isArray(raw.earned)) earned = new Set(raw.earned.filter((n) => Number.isInteger(n)));
    if (raw && raw.spoiler === true) spoilerEl.checked = true;
  } catch {
    earned = new Set();
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ earned: [...earned].sort((a, b) => a - b), spoiler: spoilerEl.checked }));
}

function gradeWord(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function isSpoilerHidden(trophy) {
  return spoilerEl.checked && trophy.hidden && !earned.has(trophy.id);
}

function badge(text, cls) {
  const span = document.createElement('span');
  span.className = 'badge ' + cls;
  span.textContent = text;
  return span;
}

function renderRoadmap() {
  roadmapEl.replaceChildren();
  for (const stage of doc.roadmap) {
    const card = document.createElement('div');
    card.className = 'stage';
    const title = document.createElement('h3');
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = 'Stage ' + stage.stage;
    title.append(num, document.createTextNode(stage.title));
    const text = document.createElement('p');
    text.textContent = stage.text;
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (const trophy of doc.trophies.filter((t) => t.stage === stage.stage)) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (earned.has(trophy.id) ? ' earned' : '');
      chip.textContent = trophy.name;
      chip.addEventListener('click', () => {
        openGuideId = trophy.id;
        renderList();
        const cardEl = document.getElementById('trophy-' + trophy.id);
        if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      chips.append(chip);
    }
    card.append(title, text, chips);
    roadmapEl.append(card);
  }
}

function trophyMatches(trophy) {
  const q = searchEl.value.trim().toLowerCase();
  if (q) {
    const hay = (trophy.name + ' ' + trophy.description + ' ' + trophy.guide).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (kindEl.value === 'online') return false;
  if (kindEl.value === 'completion') {
    if (trophy.kind !== 'platinum' && trophy.kind !== 'completion') return false;
  } else if (kindEl.value !== 'all' && trophy.kind !== kindEl.value) {
    return false;
  }
  if (gradeEl.value !== 'all' && trophy.grade !== gradeEl.value) return false;
  if (missableEl.checked && !trophy.missable) return false;
  if (hideEarnedEl.checked && earned.has(trophy.id)) return false;
  return true;
}

function renderProgress() {
  const total = doc.trophies.length;
  const done = earned.size;
  const pct = Math.round((done / total) * 100);
  progressFill.style.width = pct + '%';
  progressText.textContent = done + ' of ' + total + ' earned · ' + pct + '% to the platinum';
  const byGrade = {};
  for (const t of doc.trophies) {
    if (earned.has(t.id)) byGrade[t.grade] = (byGrade[t.grade] || 0) + 1;
  }
  const totals = {};
  for (const t of doc.trophies) totals[t.grade] = (totals[t.grade] || 0) + 1;
  gradeStats.textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => (byGrade[g] || 0) + '/' + totals[g] + ' ' + g)
    .join(' · ');
}

function renderList() {
  listEl.replaceChildren();
  const visible = doc.trophies.filter(trophyMatches);
  onlineEl.classList.toggle('hidden', kindEl.value !== 'online');
  emptyEl.classList.toggle('hidden', visible.length > 0 || kindEl.value === 'online');
  filterCount.textContent = visible.length + ' of ' + doc.trophies.length + ' shown';

  for (const trophy of visible) {
    const card = document.createElement('article');
    card.className = 'trophy' + (earned.has(trophy.id) ? ' earned' : '');
    card.id = 'trophy-' + trophy.id;

    const head = document.createElement('div');
    head.className = 'trophy-head';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(trophy.id);
    box.setAttribute('aria-label', 'Mark ' + trophy.name + ' as earned');
    box.addEventListener('change', () => {
      if (box.checked) earned.add(trophy.id);
      else earned.delete(trophy.id);
      save();
      renderProgress();
      renderRoadmap();
      renderList();
    });
    const titleWrap = document.createElement('div');
    titleWrap.className = 'trophy-title';
    const title = document.createElement('h3');
    const idSpan = document.createElement('span');
    idSpan.className = 'trophy-id';
    idSpan.textContent = '#' + trophy.id;
    const masked = isSpoilerHidden(trophy);
    title.append(idSpan, document.createTextNode(masked ? 'Hidden story trophy' : trophy.name));
    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = masked
      ? 'A hidden story trophy. Earn it in the game — or turn off “Hide story spoilers” — to reveal it.'
      : trophy.description;
    titleWrap.append(title, desc);
    head.append(box, titleWrap);
    card.append(head);

    const badges = document.createElement('div');
    badges.className = 'badges';
    badges.append(badge(gradeWord(trophy.grade), trophy.grade));
    // The platinum's kind badge would just repeat its grade badge, so skip it.
    if (trophy.kind !== 'platinum') badges.append(badge(KIND_LABELS[trophy.kind] || trophy.kind, 'kind'));
    if (trophy.hidden) badges.append(badge('Hidden on PSN', 'hidden-badge'));
    if (trophy.missable) badges.append(badge('Possibly missable', 'missable'));
    if (trophy.gamerscore > 0) badges.append(badge(trophy.gamerscore + 'G on Xbox', ''));
    card.append(badges);

    if (trophy.count_label && !masked) {
      const count = document.createElement('p');
      count.className = 'count-label';
      count.textContent = 'Target: ' + trophy.count_label;
      card.append(count);
    }
    if (trophy.missable && trophy.missable_note) {
      const note = document.createElement('p');
      note.className = 'count-label';
      note.textContent = 'Missable: ' + trophy.missable_note;
      card.append(note);
    }

    if (!masked) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'guide-toggle';
      const open = openGuideId === trophy.id;
      toggle.textContent = open ? 'Hide guide ▲' : 'Read the guide ▼';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.addEventListener('click', () => {
        openGuideId = open ? null : trophy.id;
        renderList();
      });
      card.append(toggle);
      if (open) {
        const guide = document.createElement('div');
        guide.className = 'guide';
        const body = document.createElement('p');
        body.textContent = trophy.guide;
        guide.append(body);
        const src = document.createElement('p');
        src.className = 'sources';
        src.append(document.createTextNode('Sources: '));
        trophy.sources.forEach((s, i) => {
          if (i > 0) src.append(document.createTextNode(' · '));
          const a = document.createElement('a');
          a.href = s.url;
          a.target = '_blank';
          a.rel = 'noopener';
          a.textContent = s.name;
          src.append(a);
        });
        guide.append(src);
        card.append(guide);
      }
    } else {
      const note = document.createElement('p');
      note.className = 'spoiler-note';
      note.textContent = 'Guide hidden with spoilers. Tick the box above once you have earned it, or turn spoilers off.';
      card.append(note);
    }
    listEl.append(card);
  }
}

function renderAll() {
  renderProgress();
  renderRoadmap();
  renderList();
}

function download(filename, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

exportBtn.addEventListener('click', () => {
  download('gta6-trophy-progress.json', JSON.stringify({
    game: 'Grand Theft Auto VI',
    platform: 'PlayStation 5',
    exported: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
    spoiler: spoilerEl.checked,
  }, null, 2));
});

importFile.addEventListener('change', async () => {
  const file = importFile.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(ids)) throw new Error('no earned list');
    const valid = new Set(doc.trophies.map((t) => t.id));
    earned = new Set(ids.filter((n) => valid.has(n)));
    if (typeof data.spoiler === 'boolean') spoilerEl.checked = data.spoiler;
    save();
    renderAll();
  } catch {
    alert('That file is not a trophy progress export from this guide.');
  }
  importFile.value = '';
});

resetBtn.addEventListener('click', () => {
  if (confirm('Clear every earned tick?')) {
    earned = new Set();
    openGuideId = null;
    save();
    renderAll();
  }
});

for (const el of [searchEl, kindEl, gradeEl, missableEl, hideEarnedEl, spoilerEl]) {
  el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', () => {
    if (el === spoilerEl) save();
    renderList();
  });
}

async function start() {
  loadSaved();
  const response = await fetch(DATA_URL);
  doc = await response.json();
  const hash = location.hash.match(/^#trophy-(\d+)$/);
  if (hash) openGuideId = Number(hash[1]);
  renderAll();
  if (openGuideId) {
    const cardEl = document.getElementById('trophy-' + openGuideId);
    if (cardEl) cardEl.scrollIntoView({ block: 'center' });
  }
}

start();

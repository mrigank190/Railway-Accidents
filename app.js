const CATEGORY_META = {
  rail:   { label: "Railway",            color: "#16324F" },
  air:    { label: "Aviation",           color: "#1F6F78" },
  terror: { label: "Terrorism",          color: "#8B1E2B" },
  naxal:  { label: "Naxalite / Maoist",  color: "#6B5B1E" },
};

const CAUSE_COLORS = {
  collision: "#B23A2E",
  derailment: "#C98A2C",
  bridge: "#2A4A6B",
  fire: "#8a3b1f",
  levelCrossing: "#3F6B4C",
  sabotage: "#4a3a5c",
  crash: "#7A5C3E",
  hijack: "#A6742C",
  bombing: "#7A1F2B",
  shooting: "#5A2020",
  hostage: "#5A3E7A",
  ambush: "#2F4F3F",
  ied: "#A0522D",
  other: "#6b6455",
};
const CAUSE_LABELS = {
  collision: "Collision",
  derailment: "Derailment",
  bridge: "Bridge / flood",
  fire: "Fire",
  levelCrossing: "Level crossing",
  sabotage: "Sabotage",
  crash: "Crash",
  hijack: "Hijacking",
  bombing: "Bombing",
  shooting: "Shooting",
  hostage: "Hostage siege",
  ambush: "Ambush",
  ied: "IED blast",
  other: "Other",
};

let activeCauses = new Set(Object.keys(CAUSE_COLORS));
let activeCategories = new Set(Object.keys(CATEGORY_META));
let yearMin = 1902, yearMax = 2025;
let sortKey = "date", sortDir = -1;
let searchQuery = "";
let openSlug = null;

function yearOf(d){ return parseInt(d.date.slice(0,4),10); }
function matchesSearch(d, q){
  if(!q) return true;
  const hay = (d.name + " " + d.state + " " + d.note).toLowerCase();
  return hay.includes(q);
}
function filtered(){
  const q = searchQuery.trim().toLowerCase();
  return INCIDENTS.filter(d =>
    activeCauses.has(d.cause) &&
    activeCategories.has(d.category) &&
    yearOf(d) >= yearMin && yearOf(d) <= yearMax &&
    matchesSearch(d, q)
  );
}

// ---------- Departure board ----------
function renderBoard(){
  const data = INCIDENTS;
  const totalDeaths = data.reduce((s,d)=>s+d.deaths,0);
  const deadliest = data.reduce((a,b)=> b.deaths>a.deaths?b:a);
  const byCat = {};
  Object.keys(CATEGORY_META).forEach(c=>byCat[c]=0);
  data.forEach(d=>byCat[d.category]++);
  const catSummary = Object.entries(byCat).map(([c,n])=>`${n} ${CATEGORY_META[c].label.split(" ")[0]}`).join(" · ");

  const cells = [
    ["Incidents tracked", data.length],
    ["Total lives lost", totalDeaths.toLocaleString()],
    ["Deadliest incident", deadliest.deaths + " · " + deadliest.name],
    ["Span of record", "1902 – 2025"],
    ["By category", catSummary],
  ];
  const board = document.getElementById("board");
  board.innerHTML = cells.map(([label,val],i)=>`
    <div class="board-cell">
      <div class="board-label">${label}</div>
      <div class="board-value ${String(val).length>14?'small':''}" style="animation-delay:${i*0.08}s">${val}</div>
    </div>`).join("");
}

// ---------- Category filter ----------
function renderCategoryChips(){
  const box = document.getElementById("categoryFilters");
  box.innerHTML = Object.entries(CATEGORY_META).map(([c,meta])=>
    `<button class="chip cat-chip active" data-category="${c}" style="border-color:${meta.color}">${meta.label}</button>`
  ).join("");
  box.querySelectorAll(".cat-chip").forEach(chip=>{
    const c = chip.dataset.category;
    chip.style.background = CATEGORY_META[c].color;
    chip.style.color = "#fff";
    chip.addEventListener("click", ()=>{
      if(activeCategories.has(c)){
        activeCategories.delete(c);
        chip.classList.remove("active");
        chip.style.background = "transparent";
        chip.style.color = "var(--ink)";
      } else {
        activeCategories.add(c);
        chip.classList.add("active");
        chip.style.background = CATEGORY_META[c].color;
        chip.style.color = "#fff";
      }
      refreshAll();
    });
  });
}

// ---------- Filters ----------
function renderFilterChips(){
  const box = document.getElementById("causeFilters");
  box.innerHTML = Object.keys(CAUSE_COLORS).map(c=>
    `<button class="chip active" data-cause="${c}">${CAUSE_LABELS[c]}</button>`
  ).join("");
  box.querySelectorAll(".chip").forEach(chip=>{
    const c = chip.dataset.cause;
    chip.style.borderColor = CAUSE_COLORS[c];
    chip.style.background = CAUSE_COLORS[c];
    chip.style.color = "#fff";
    chip.addEventListener("click", ()=>{
      if(activeCauses.has(c)){
        activeCauses.delete(c);
        chip.classList.remove("active");
        chip.style.background = "transparent";
        chip.style.color = "var(--ink)";
      } else {
        activeCauses.add(c);
        chip.classList.add("active");
        chip.style.background = CAUSE_COLORS[c];
        chip.style.color = "#fff";
      }
      refreshAll();
    });
  });
}

function renderLegend(){
  document.getElementById("legend").innerHTML = Object.entries(CATEGORY_META).map(([c,meta])=>
    `<span><span class="dot" style="background:${meta.color}"></span>${meta.label}</span>`
  ).join("");
}

// ---------- Map ----------
let map, markerLayer;
function initMap(){
  map = L.map("map", { scrollWheelZoom:false }).setView([22.5,79.5], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 12,
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
}
function renderMap(){
  markerLayer.clearLayers();
  filtered().forEach(d=>{
    const r = 4 + Math.sqrt(d.deaths)*1.1;
    const color = CATEGORY_META[d.category].color;
    const m = L.circleMarker([d.lat,d.lng], {
      radius:r, color:color, weight:1.5,
      fillColor:color, fillOpacity:0.55,
    });
    m.bindPopup(`<b>${d.name}</b><br>${d.date} · ${d.state}<br>${CATEGORY_META[d.category].label} · ${CAUSE_LABELS[d.cause]} · ${d.deaths} deaths<br><span style="color:#4B463D">${d.note}</span>`);
    m.addTo(markerLayer);
  });
}

// ---------- Charts ----------
let decadeChart, causeChart;
function renderDecadeChart(){
  const ctx = document.getElementById("decadeChart");
  if(decadeChart) decadeChart.destroy();
  decadeChart = new Chart(ctx, {
    type:"bar",
    data:{
      labels: DECADE_STATS.map(d=>d.decade),
      datasets:[
        {label:"Derailment", data:DECADE_STATS.map(d=>d.derailment), backgroundColor:CAUSE_COLORS.derailment},
        {label:"Collision", data:DECADE_STATS.map(d=>d.collision), backgroundColor:CAUSE_COLORS.collision},
        {label:"Level crossing", data:DECADE_STATS.map(d=>d.levelCrossing), backgroundColor:CAUSE_COLORS.levelCrossing},
        {label:"Fire", data:DECADE_STATS.map(d=>d.fire), backgroundColor:CAUSE_COLORS.fire},
      ]
    },
    options:{
      responsive:true,
      plugins:{ legend:{ position:"bottom", labels:{ font:{family:"IBM Plex Mono", size:10} } } },
      scales:{
        x:{ stacked:true, ticks:{font:{family:"IBM Plex Mono", size:10}}, grid:{display:false} },
        y:{ stacked:true, ticks:{font:{family:"IBM Plex Mono", size:10}}, grid:{color:"#C9BFA8"} },
      }
    }
  });
}
function renderCauseChart(){
  const ctx = document.getElementById("causeChart");
  const data = filtered();
  const counts = {};
  Object.keys(CATEGORY_META).forEach(c=>counts[c]=0);
  data.forEach(d=>counts[d.category]++);
  if(causeChart) causeChart.destroy();
  causeChart = new Chart(ctx, {
    type:"doughnut",
    data:{
      labels: Object.keys(counts).map(c=>CATEGORY_META[c].label),
      datasets:[{ data:Object.values(counts), backgroundColor:Object.keys(counts).map(c=>CATEGORY_META[c].color) }]
    },
    options:{
      responsive:true,
      plugins:{ legend:{ position:"bottom", labels:{font:{family:"IBM Plex Mono", size:10}} } }
    }
  });
}

// ---------- Ledger table ----------
function renderTable(){
  const body = document.getElementById("ledgerBody");
  let rows = filtered().slice();
  rows.sort((a,b)=>{
    let av=a[sortKey], bv=b[sortKey];
    if(sortKey==="deaths"){ return (av-bv)*sortDir; }
    return String(av).localeCompare(String(bv)) * sortDir;
  });
  body.innerHTML = rows.map(d=>`
    <tr class="incident-row" data-slug="${d.slug}">
      <td class="date-cell"><span class="expand-caret">${openSlug===d.slug?"▾":"▸"}</span>${d.date}</td>
      <td class="name-cell"><strong>${d.name}</strong><span class="note">${d.note}</span></td>
      <td>${d.state}</td>
      <td><span class="cause-tag" style="background:${CATEGORY_META[d.category].color}">${CATEGORY_META[d.category].label}</span></td>
      <td><span class="cause-tag" style="background:${CAUSE_COLORS[d.cause]}">${CAUSE_LABELS[d.cause]}</span></td>
      <td class="deaths-cell">${d.deaths}</td>
    </tr>
    <tr class="detail-row ${openSlug===d.slug?"open":""}" data-slug-detail="${d.slug}">
      <td colspan="6">
        <div class="detail-inner">
          <div class="detail-text">
            <strong>${d.name}</strong> · ${d.date} · ${d.state}<br>
            ${d.note} Category: ${CATEGORY_META[d.category].label}. Cause: ${CAUSE_LABELS[d.cause]}. Reported deaths: ${d.deaths}.
          </div>
          <div class="detail-actions">
            ${d.wiki ? `<a href="${d.wiki}" target="_blank" rel="noopener">Wikipedia ↗</a>` : `<a href="https://en.wikipedia.org/wiki/Portal:Current_events" target="_blank" rel="noopener">Search sources ↗</a>`}
            <button class="copy-link" data-slug="${d.slug}">Copy link</button>
          </div>
        </div>
      </td>
    </tr>
  `).join("");

  body.querySelectorAll("tr.incident-row").forEach(tr=>{
    tr.addEventListener("click", ()=>{
      const slug = tr.dataset.slug;
      openSlug = (openSlug === slug) ? null : slug;
      history.replaceState(null, "", openSlug ? "#"+openSlug : location.pathname);
      renderTable();
    });
  });
  body.querySelectorAll(".copy-link").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      e.stopPropagation();
      const slug = btn.dataset.slug;
      const url = location.origin + location.pathname + "#" + slug;
      navigator.clipboard?.writeText(url).catch(()=>{});
      btn.textContent = "Copied ✓";
      setTimeout(()=>{ btn.textContent = "Copy link"; }, 1500);
    });
  });
}

// ---------- Search ----------
document.getElementById("searchBox").addEventListener("input", (e)=>{
  searchQuery = e.target.value;
  refreshAll();
});

// ---------- Deep link on load ----------
function openFromHash(){
  const slug = location.hash.replace("#","");
  if(!slug) return;
  const incident = INCIDENTS.find(d=>d.slug===slug);
  if(!incident) return;
  // reset filters so the incident is guaranteed visible
  activeCauses = new Set(Object.keys(CAUSE_COLORS));
  activeCategories = new Set(Object.keys(CATEGORY_META));
  document.querySelectorAll("#causeFilters .chip, #categoryFilters .chip").forEach(c=>{
    c.classList.add("active");
    const causeKey = c.dataset.cause, catKey = c.dataset.category;
    if(causeKey){ c.style.background = CAUSE_COLORS[causeKey]; c.style.color = "#fff"; }
    if(catKey){ c.style.background = CATEGORY_META[catKey].color; c.style.color = "#fff"; }
  });
  yearMin = 1902; yearMax = 2025;
  yMinEl.value = 1902; yMaxEl.value = 2025;
  syncYearLabels();
  searchQuery = "";
  document.getElementById("searchBox").value = "";
  openSlug = slug;
  refreshAll();
  setTimeout(()=>{
    document.getElementById("table-section").scrollIntoView({behavior:"smooth", block:"start"});
    const row = document.querySelector(`tr.incident-row[data-slug="${slug}"]`);
    if(row) row.classList.add("flash");
  }, 150);
}
document.querySelectorAll("#ledgerTable thead th").forEach(th=>{
  th.addEventListener("click", ()=>{
    const key = th.dataset.key;
    if(sortKey===key) sortDir *= -1; else { sortKey=key; sortDir = key==="deaths"?-1:1; }
    renderTable();
  });
});

// ---------- Year range ----------
const yMinEl = document.getElementById("yearMin");
const yMaxEl = document.getElementById("yearMax");
function syncYearLabels(){
  document.getElementById("yearMinLabel").textContent = yMinEl.value;
  document.getElementById("yearMaxLabel").textContent = yMaxEl.value;
}
[yMinEl,yMaxEl].forEach(el=>el.addEventListener("input", ()=>{
  let a = parseInt(yMinEl.value,10), b = parseInt(yMaxEl.value,10);
  if(a>b){ if(el===yMinEl) yMaxEl.value=a; else yMinEl.value=b; }
  yearMin = parseInt(yMinEl.value,10); yearMax = parseInt(yMaxEl.value,10);
  syncYearLabels();
  refreshAll();
}));

function refreshAll(){
  renderMap();
  renderCauseChart();
  renderTable();
}

// ---------- Init ----------
renderBoard();
renderCategoryChips();
renderFilterChips();
renderLegend();
initMap();
renderDecadeChart();
refreshAll();
openFromHash();
window.addEventListener("hashchange", openFromHash);

const CAUSE_COLORS = {
  collision: "#B23A2E",
  derailment: "#C98A2C",
  bridge: "#2A4A6B",
  fire: "#8a3b1f",
  levelCrossing: "#3F6B4C",
  sabotage: "#4a3a5c",
  other: "#6b6455",
};
const CAUSE_LABELS = {
  collision: "Collision",
  derailment: "Derailment",
  bridge: "Bridge / flood",
  fire: "Fire",
  levelCrossing: "Level crossing",
  sabotage: "Sabotage / bombing",
  other: "Other",
};

let activeCauses = new Set(Object.keys(CAUSE_COLORS));
let yearMin = 1902, yearMax = 2025;
let sortKey = "date", sortDir = -1;

function yearOf(d){ return parseInt(d.date.slice(0,4),10); }
function filtered(){
  return INCIDENTS.filter(d => activeCauses.has(d.cause) && yearOf(d) >= yearMin && yearOf(d) <= yearMax);
}

// ---------- Departure board ----------
function renderBoard(){
  const data = INCIDENTS;
  const totalDeaths = data.reduce((s,d)=>s+d.deaths,0);
  const deadliest = data.reduce((a,b)=> b.deaths>a.deaths?b:a);
  const byDecadeCount = {};
  data.forEach(d=>{
    const dec = Math.floor(yearOf(d)/10)*10;
    byDecadeCount[dec] = (byDecadeCount[dec]||0)+1;
  });
  const worstDecade = Object.entries(byDecadeCount).sort((a,b)=>b[1]-a[1])[0];

  const cells = [
    ["Incidents tracked", data.length],
    ["Total lives lost", totalDeaths.toLocaleString()],
    ["Deadliest incident", deadliest.deaths + " · " + deadliest.name],
    ["Span of record", "1902 – 2025"],
    ["Most incidents / decade", worstDecade[0] + "s (" + worstDecade[1] + ")"],
  ];
  const board = document.getElementById("board");
  board.innerHTML = cells.map(([label,val],i)=>`
    <div class="board-cell">
      <div class="board-label">${label}</div>
      <div class="board-value ${String(val).length>14?'small':''}" style="animation-delay:${i*0.08}s">${val}</div>
    </div>`).join("");
}

// ---------- Filters ----------
function renderFilterChips(){
  const box = document.getElementById("causeFilters");
  box.innerHTML = Object.keys(CAUSE_COLORS).map(c=>
    `<button class="chip active" data-cause="${c}">${CAUSE_LABELS[c]}</button>`
  ).join("");
  box.querySelectorAll(".chip").forEach(chip=>{
    chip.addEventListener("click", ()=>{
      const c = chip.dataset.cause;
      if(activeCauses.has(c)){ activeCauses.delete(c); chip.classList.remove("active"); }
      else { activeCauses.add(c); chip.classList.add("active"); }
      refreshAll();
    });
  });
}

function renderLegend(){
  document.getElementById("legend").innerHTML = Object.entries(CAUSE_COLORS).map(([c,col])=>
    `<span><span class="dot" style="background:${col}"></span>${CAUSE_LABELS[c]}</span>`
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
    const m = L.circleMarker([d.lat,d.lng], {
      radius:r, color:CAUSE_COLORS[d.cause], weight:1.5,
      fillColor:CAUSE_COLORS[d.cause], fillOpacity:0.55,
    });
    m.bindPopup(`<b>${d.name}</b><br>${d.date} · ${d.state}<br>${CAUSE_LABELS[d.cause]} · ${d.deaths} deaths<br><span style="color:#4B463D">${d.note}</span>`);
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
  Object.keys(CAUSE_COLORS).forEach(c=>counts[c]=0);
  data.forEach(d=>counts[d.cause]++);
  if(causeChart) causeChart.destroy();
  causeChart = new Chart(ctx, {
    type:"doughnut",
    data:{
      labels: Object.keys(counts).map(c=>CAUSE_LABELS[c]),
      datasets:[{ data:Object.values(counts), backgroundColor:Object.keys(counts).map(c=>CAUSE_COLORS[c]) }]
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
    <tr>
      <td class="date-cell">${d.date}</td>
      <td class="name-cell"><strong>${d.name}</strong><span class="note">${d.note}</span></td>
      <td>${d.state}</td>
      <td><span class="cause-tag" style="background:${CAUSE_COLORS[d.cause]}">${CAUSE_LABELS[d.cause]}</span></td>
      <td class="deaths-cell">${d.deaths}</td>
    </tr>
  `).join("");
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
renderFilterChips();
renderLegend();
initMap();
renderDecadeChart();
refreshAll();

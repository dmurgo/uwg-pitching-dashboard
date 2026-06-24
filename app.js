const dataStore = JSON.parse(JSON.stringify(window.UWG_PITCHING_DATA));
const roster = dataStore.roster;
let selectedPitcher = roster[0];

function ensurePlayer(name) {
  if (!dataStore.players[name]) {
    dataStore.players[name] = {
      metrics: { strikePct: 0, firstPitchPct: 0, zonePct: 0, whiffPct: 0, walkRate: 0, availability: 'Available' },
      weeklyPlan: { weekOf: '', availability: 'Available', weeklyFocus: '', bullpenFocus: '', planRHH: '', planLHH: '', attackCue: '', nextOutingGoal: '' },
      review: { selfGrade: '', coachGrade: '', whatPlayed: '', whatNeedsWork: '', recoveryFocus: '', coachNotes: '' },
      platoon: { rhh: { bf: 0, h: 0, bb: 0, k: 0 }, lhh: { bf: 0, h: 0, bb: 0, k: 0 } },
      weeklyThrows: [0,0,0,0,0,0,0],
      heatRHH: [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
      heatLHH: [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]]
    };
  }
  return dataStore.players[name];
}

function pct(v) {
  return typeof v === 'number' ? `${Math.round(v * 100)}%` : '--';
}

function dec(v) {
  return typeof v === 'number' ? v.toFixed(2) : '--';
}

function renderRoster(filter = '') {
  const list = document.getElementById('rosterList');
  const q = filter.toLowerCase();
  list.innerHTML = '';
  roster
    .filter(name => name.toLowerCase().includes(q))
    .forEach(name => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = `roster-btn${name === selectedPitcher ? ' active' : ''}`;
      btn.textContent = name;
      btn.addEventListener('click', () => {
        selectedPitcher = name;
        renderAll();
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
}

function renderMetrics(player) {
  document.getElementById('selectedPitcherName').textContent = selectedPitcher;
  document.getElementById('selectedPitcherSubtitle').textContent = 'Player card, weekly plan, splits, and visual zones.';
  document.getElementById('metricStrike').textContent = pct(player.metrics.strikePct);
  document.getElementById('metricFirstPitch').textContent = pct(player.metrics.firstPitchPct);
  document.getElementById('metricZone').textContent = pct(player.metrics.zonePct);
  document.getElementById('metricWhiff').textContent = pct(player.metrics.whiffPct);
  document.getElementById('metricWalkRate').textContent = dec(player.metrics.walkRate);
  document.getElementById('metricAvailability').textContent = player.weeklyPlan.availability || player.metrics.availability;
}

function bindFields(player) {
  const weekly = player.weeklyPlan;
  const review = player.review;
  const map = {
    weekOf: 'weekOf',
    availability: 'availability',
    weeklyFocus: 'weeklyFocus',
    bullpenFocus: 'bullpenFocus',
    planRHH: 'planRHH',
    planLHH: 'planLHH',
    attackCue: 'attackCue',
    nextOutingGoal: 'nextOutingGoal'
  };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    el.value = weekly[key] ?? '';
    el.oninput = () => {
      weekly[key] = el.value;
      if (id === 'availability') renderTeamDashboard();
      if (id === 'availability') renderMetrics(player);
    };
  });

  const reviewMap = {
    selfGrade: 'selfGrade',
    coachGrade: 'coachGrade',
    whatPlayed: 'whatPlayed',
    whatNeedsWork: 'whatNeedsWork',
    recoveryFocus: 'recoveryFocus',
    coachNotes: 'coachNotes'
  };
  Object.entries(reviewMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    el.value = review[key] ?? '';
    el.oninput = () => {
      review[key] = el.value;
    };
  });
}

function rate(part, whole) {
  return whole ? part / whole : 0;
}

function renderPlatoon(player) {
  const tbody = document.querySelector('#platoonTable tbody');
  tbody.innerHTML = '';
  [['Vs RHH', player.platoon.rhh], ['Vs LHH', player.platoon.lhh]].forEach(([label, row]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${label}</td>
      <td>${row.bf}</td>
      <td>${row.h}</td>
      <td>${row.bb}</td>
      <td>${row.k}</td>
      <td>${pct(rate(row.k, row.bf))}</td>
      <td>${pct(rate(row.bb, row.bf))}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderWeeklyThrows(player) {
  const tbody = document.querySelector('#weeklyPlanTable tbody');
  tbody.innerHTML = '';
  const tr = document.createElement('tr');
  const total = player.weeklyThrows.reduce((a, b) => a + Number(b || 0), 0);
  tr.innerHTML = [...player.weeklyThrows, total].map(v => `<td>${v}</td>`).join('');
  tbody.appendChild(tr);
}

function renderStrikeZone() {
  const grid = document.getElementById('attackZoneGrid');
  grid.innerHTML = '';
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const div = document.createElement('div');
      const inCore = r >= 1 && r <= 3 && c >= 1 && c <= 3;
      const center = r === 2 && c === 2;
      div.className = `zone-cell ${center ? 'green' : inCore ? 'yellow' : 'gray'}`;
      grid.appendChild(div);
    }
  }
}

function heatClass(v) {
  if (v >= 5) return 'darkgreen';
  if (v === 4) return 'green';
  if (v === 3) return 'yellow';
  if (v === 2) return 'orange';
  return 'red';
}

function renderHeatMap(elId, values) {
  const grid = document.getElementById(elId);
  grid.innerHTML = '';
  const topLabels = ['', 'Arm', 'Glove', 'Waste', 'Middle', 'Chase'];
  topLabels.forEach(label => {
    const d = document.createElement('div');
    d.className = label ? 'heat-label' : '';
    d.textContent = label;
    grid.appendChild(d);
  });
  ['Top', 'Heart', 'Bottom'].forEach((rowLabel, rIndex) => {
    const row = document.createElement('div');
    row.className = 'heat-label';
    row.textContent = rowLabel;
    grid.appendChild(row);
    values[rIndex].forEach(value => {
      const d = document.createElement('div');
      d.className = `heat-cell ${heatClass(value)}`;
      d.textContent = value || '';
      grid.appendChild(d);
    });
  });
}

function renderTeamDashboard() {
  const tbody = document.querySelector('#teamDashboardTable tbody');
  tbody.innerHTML = '';
  roster.forEach(name => {
    const player = ensurePlayer(name);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${name}</td>
      <td>${pct(player.metrics.strikePct)}</td>
      <td>${pct(player.metrics.firstPitchPct)}</td>
      <td>${pct(player.metrics.zonePct)}</td>
      <td>${pct(player.metrics.whiffPct)}</td>
      <td>${dec(player.metrics.walkRate)}</td>
      <td>${player.weeklyPlan.availability || player.metrics.availability}</td>
    `;
    tbody.appendChild(tr);
  });
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, i) => row[h] = cols[i] ?? '');
    return row;
  });
}

function updateFromTrackman(rows) {
  const grouped = {};
  rows.forEach(row => {
    const name = row['Pitcher'];
    if (!name) return;
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push(row);
  });

  Object.entries(grouped).forEach(([name, playerRows]) => {
    const player = ensurePlayer(name);
    const total = playerRows.length;
    const strikeRows = playerRows.filter(r => ['Called Strike', 'Swinging Strike', 'FoulBall', 'InPlay'].includes(r['PitchCall']));
    const whiffRows = playerRows.filter(r => ['Swinging Strike', 'Swinging Strike (Blocked)'].includes(r['PitchCall']));
    const zeroStrikeCount = playerRows.filter(r => String(r['Strikes']) === '0').length;
    const firstPitchStrikeRows = playerRows.filter(r => String(r['Strikes']) === '0' && ['Called Strike', 'Swinging Strike', 'FoulBall', 'InPlay'].includes(r['PitchCall'])).length;
    const zoneRows = playerRows.filter(r => ['Called Strike', 'Swinging Strike'].includes(r['PitchCall']));
    const walkRows = playerRows.filter(r => r['KorBB'] === 'Walk');

    player.metrics.strikePct = total ? strikeRows.length / total : 0;
    player.metrics.firstPitchPct = zeroStrikeCount ? firstPitchStrikeRows / zeroStrikeCount : 0;
    player.metrics.zonePct = total ? zoneRows.length / total : 0;
    player.metrics.whiffPct = total ? whiffRows.length / total : 0;
    player.metrics.walkRate = total ? walkRows.length / total : 0;

    const rhh = playerRows.filter(r => r['BatterSide'] === 'Right');
    const lhh = playerRows.filter(r => r['BatterSide'] === 'Left');
    player.platoon.rhh = {
      bf: rhh.length,
      h: rhh.filter(r => ['Single', 'Double', 'Triple', 'HomeRun'].includes(r['PlayResult'])).length,
      bb: rhh.filter(r => r['KorBB'] === 'Walk').length,
      k: rhh.filter(r => r['KorBB'] === 'Strikeout').length,
    };
    player.platoon.lhh = {
      bf: lhh.length,
      h: lhh.filter(r => ['Single', 'Double', 'Triple', 'HomeRun'].includes(r['PlayResult'])).length,
      bb: lhh.filter(r => r['KorBB'] === 'Walk').length,
      k: lhh.filter(r => r['KorBB'] === 'Strikeout').length,
    };
  });
  renderAll();
}

function renderAll() {
  const player = ensurePlayer(selectedPitcher);
  renderRoster(document.getElementById('pitcherSearch').value);
  renderMetrics(player);
  bindFields(player);
  renderPlatoon(player);
  renderWeeklyThrows(player);
  renderStrikeZone();
  renderHeatMap('heatMapRHH', player.heatRHH);
  renderHeatMap('heatMapLHH', player.heatLHH);
  renderTeamDashboard();
}

document.getElementById('pitcherSearch').addEventListener('input', (e) => renderRoster(e.target.value));
document.getElementById('resetDataBtn').addEventListener('click', () => window.location.reload());
document.getElementById('csvFile').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  updateFromTrackman(parseCsv(text));
});

roster.forEach(ensurePlayer);
renderAll();

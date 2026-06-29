const dataStore = JSON.parse(JSON.stringify(window.UWG_PITCHING_DATA));
const roster = dataStore.roster;
let selectedPitcher = roster[0];

function ensurePlayer(name) {
  if (!dataStore.players[name]) {
    dataStore.players[name] = {
      metrics: {
        strikePct: 0,
        firstPitchPct: 0,
        zonePct: 0,
        whiffPct: 0,
        walkRate: 0,
        availability: 'Available'
      },
      weeklyPlan: {
        weekOf: '',
        availability: 'Available',
        weeklyFocus: '',
        bullpenFocus: '',
        planRHH: '',
        planLHH: '',
        attackCue: '',
        nextOutingGoal: ''
      },
      review: {
        selfGrade: '',
        coachGrade: '',
        whatPlayed: '',
        whatNeedsWork: '',
        recoveryFocus: '',
        coachNotes: ''
      },
      platoon: {
        rhh: { bf: 0, h: 0, bb: 0, k: 0 },
        lhh: { bf: 0, h: 0, bb: 0, k: 0 }
      },
      weeklyThrows: [0, 0, 0, 0, 0, 0, 0],
      heatRHH: [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0]
      ],
      heatLHH: [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0]
      ],
      pitchMetrics: []
    };
  }
  return dataStore.players[name];
}

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z\s,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function rosterNameMatches(trackmanName) {
  const raw = normalizeName(trackmanName);
  if (!raw) return null;

  const direct = roster.find(name => normalizeName(name) === raw);
  if (direct) return direct;

  if (raw.includes(',')) {
    const [last, first] = raw.split(',').map(s => s.trim());
    const flipped = `${first} ${last}`.trim();
    const match = roster.find(name => normalizeName(name) === flipped);
    if (match) return match;
  }

  return roster.find(name => {
    const parts = normalizeName(name).split(' ');
    if (parts.length < 2) return false;
    const first = parts[0];
    const last = parts[parts.length - 1];
    return raw.includes(first) && raw.includes(last);
  }) || null;
}

function pct(v) {
  return typeof v === 'number' && Number.isFinite(v)
    ? `${Math.round(v * 100)}%`
    : '--';
}

function dec(v, digits = 2) {
  return typeof v === 'number' && Number.isFinite(v)
    ? v.toFixed(digits)
    : '--';
}

function renderRoster(filter = '') {
  const list = document.getElementById('rosterList');
  if (!list) return;

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
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('selectedPitcherName', selectedPitcher);
  setText('selectedPitcherSubtitle', 'Player card, weekly plan, splits, and visual zones.');
  setText('metricStrike', pct(player.metrics.strikePct));
  setText('metricFirstPitch', pct(player.metrics.firstPitchPct));
  setText('metricZone', pct(player.metrics.zonePct));
  setText('metricWhiff', pct(player.metrics.whiffPct));
  setText('metricWalkRate', dec(player.metrics.walkRate));
  setText('metricAvailability', player.weeklyPlan.availability || player.metrics.availability);
}

function bindFields(player) {
  const weekly = player.weeklyPlan;
  const review = player.review;

  const weeklyMap = {
    weekOf: 'weekOf',
    availability: 'availability',
    weeklyFocus: 'weeklyFocus',
    bullpenFocus: 'bullpenFocus',
    planRHH: 'planRHH',
    planLHH: 'planLHH',
    attackCue: 'attackCue',
    nextOutingGoal: 'nextOutingGoal'
  };

  Object.entries(weeklyMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = weekly[key] ?? '';
    el.oninput = () => {
      weekly[key] = el.value;
      if (id === 'availability') {
        renderTeamDashboard();
        renderMetrics(player);
      }
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
    if (!el) return;
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
  if (!tbody) return;

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
  if (!tbody) return;

  tbody.innerHTML = '';
  const tr = document.createElement('tr');
  const total = player.weeklyThrows.reduce((a, b) => a + Number(b || 0), 0);
  tr.innerHTML = [...player.weeklyThrows, total]
    .map(v => `<td>${v}</td>`)
    .join('');
  tbody.appendChild(tr);
}

function renderPitchMetrics(player) {
  const container = document.getElementById('pitchMetrics');
  if (!container) return;

  const rows = player.pitchMetrics || [];

  if (!rows.length) {
    container.innerHTML = `
      <div class="empty-state">No pitch metric data yet.</div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Pitch</th>
          <th>Usage %</th>
          <th>Avg Velo</th>
          <th>Max Velo</th>
          <th>Spin</th>
          <th>IVB</th>
          <th>HB</th>
          <th>Rel Height</th>
          <th>Extension</th>
          <th>Tilt</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            <td>${row.pitchType}</td>
            <td>${pct(row.usagePct)}</td>
            <td>${row.avgVelo}</td>
            <td>${row.maxVelo}</td>
            <td>${row.avgSpin}</td>
            <td>${row.avgIVB}</td>
            <td>${row.avgHB}</td>
            <td>${row.avgRelHeight}</td>
            <td>${row.avgExtension}</td>
            <td>${row.avgTilt}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderStrikeZone() {
  const grid = document.getElementById('attackZoneGrid');
  if (!grid) return;

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
  if (!grid) return;

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
  if (!tbody) return;

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

function buildHeatMap(rows) {
  const grid = [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
  ];

  rows.forEach(r => {
    const side = Number(r.PlateLocSide);
    const height = Number(r.PlateLocHeight);
    if (!Number.isFinite(side) || !Number.isFinite(height)) return;

    let col = 4;
    if (side < -0.8) col = 0;
    else if (side < -0.2) col = 1;
    else if (side < 0.4) col = 2;
    else if (side < 1.0) col = 3;

    let row = 2;
    if (height > 2.9) row = 0;
    else if (height > 1.7) row = 1;

    grid[row][col] += 1;
  });

  const max = Math.max(1, ...grid.flat());

  return grid.map(row =>
    row.map(v => (v === 0 ? 0 : Math.max(1, Math.min(5, Math.round((v / max) * 5)))))
  );
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(value);
      if (row.some(cell => String(cell).trim() !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  if (value.length || row.length) {
    row.push(value);
    if (row.some(cell => String(cell).trim() !== '')) rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map(h => String(h).trim());

  return rows.slice(1).map(cols => {
    const record = {};
    headers.forEach((h, i) => {
      record[h] = cols[i] ?? '';
    });
    return record;
  });
}

function getNumericAverage(rows, key, digits = 1) {
  const vals = rows
    .map(r => Number(r[key]))
    .filter(v => Number.isFinite(v));

  if (!vals.length) return '--';
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(digits);
}

function getNumericMax(rows, key, digits = 1) {
  const vals = rows
    .map(r => Number(r[key]))
    .filter(v => Number.isFinite(v));

  if (!vals.length) return '--';
  return Math.max(...vals).toFixed(digits);
}

function getMostCommonTilt(rows) {
  const counts = {};

  rows.forEach(r => {
    const tilt = String(r.Tilt || '').trim();
    if (!tilt) return;
    counts[tilt] = (counts[tilt] || 0) + 1;
  });

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries[0][0] : '--';
}

function updateFromTrackman(rows) {
  const grouped = {};
  const matched = new Set();

  rows.forEach(row => {
    const mappedName = rosterNameMatches(row.Pitcher);
    if (!mappedName) return;

    matched.add(mappedName);
    if (!grouped[mappedName]) grouped[mappedName] = [];
    grouped[mappedName].push(row);
  });

  Object.entries(grouped).forEach(([name, playerRows]) => {
    const player = ensurePlayer(name);
    const total = playerRows.length;

    const strikeRows = playerRows.filter(r =>
      ['StrikeCalled', 'StrikeSwinging', 'FoulBall', 'FoulBallNotFieldable', 'InPlay'].includes(r.PitchCall)
    );

    const whiffRows = playerRows.filter(r =>
      ['StrikeSwinging', 'StrikeSwingingBlocked'].includes(r.PitchCall)
    );

    const firstPitchRows = playerRows.filter(r => String(r.PitchofPA) === '1');

    const firstPitchStrikeRows = firstPitchRows.filter(r =>
      ['StrikeCalled', 'StrikeSwinging', 'FoulBall', 'FoulBallNotFieldable', 'InPlay'].includes(r.PitchCall)
    );

    const zoneRows = playerRows.filter(r => {
      const side = Number(r.PlateLocSide);
      const height = Number(r.PlateLocHeight);
      return (
        Number.isFinite(side) &&
        Number.isFinite(height) &&
        side >= -0.83 &&
        side <= 0.83 &&
        height >= 1.5 &&
        height <= 3.5
      );
    });

    const plateAppearanceKeys = new Set(
      playerRows.map(r => `${r.GameID}|${r.Inning}|${r['Top/Bottom']}|${r.PAofInning}|${r.Batter}`)
    );

    const walkPAKeys = new Set(
      playerRows
        .filter(r => r.KorBB === 'Walk')
        .map(r => `${r.GameID}|${r.Inning}|${r['Top/Bottom']}|${r.PAofInning}|${r.Batter}`)
    );

    player.metrics.strikePct = total ? strikeRows.length / total : 0;
    player.metrics.firstPitchPct = firstPitchRows.length ? firstPitchStrikeRows.length / firstPitchRows.length : 0;
    player.metrics.zonePct = total ? zoneRows.length / total : 0;
    player.metrics.whiffPct = total ? whiffRows.length / total : 0;
    player.metrics.walkRate = plateAppearanceKeys.size ? walkPAKeys.size / plateAppearanceKeys.size : 0;

    const rhh = playerRows.filter(r => r.BatterSide === 'Right');
    const lhh = playerRows.filter(r => r.BatterSide === 'Left');

    player.platoon.rhh = {
      bf: rhh.length,
      h: rhh.filter(r => ['Single', 'Double', 'Triple', 'HomeRun'].includes(r.PlayResult)).length,
      bb: rhh.filter(r => r.KorBB === 'Walk').length,
      k: rhh.filter(r => r.KorBB === 'Strikeout').length
    };

    player.platoon.lhh = {
      bf: lhh.length,
      h: lhh.filter(r => ['Single', 'Double', 'Triple', 'HomeRun'].includes(r.PlayResult)).length,
      bb: lhh.filter(r => r.KorBB === 'Walk').length,
      k: lhh.filter(r => r.KorBB === 'Strikeout').length
    };

    player.heatRHH = buildHeatMap(rhh);
    player.heatLHH = buildHeatMap(lhh);

    const pitchGroups = {};

    playerRows.forEach(r => {
      const pitchType = r.TaggedPitchType || r.AutoPitchType || 'Unknown';
      if (!pitchGroups[pitchType]) pitchGroups[pitchType] = [];
      pitchGroups[pitchType].push(r);
    });

    player.pitchMetrics = Object.entries(pitchGroups)
      .map(([pitchType, pitchRows]) => ({
        pitchType,
        count: pitchRows.length,
        usagePct: total ? pitchRows.length / total : 0,
        avgVelo: getNumericAverage(pitchRows, 'RelSpeed', 1),
        maxVelo: getNumericMax(pitchRows, 'RelSpeed', 1),
        avgSpin: getNumericAverage(pitchRows, 'SpinRate', 0),
        avgIVB: getNumericAverage(pitchRows, 'InducedVertBreak', 1),
        avgHB: getNumericAverage(pitchRows, 'HorzBreak', 1),
        avgRelHeight: getNumericAverage(pitchRows, 'RelHeight', 2),
        avgExtension: getNumericAverage(pitchRows, 'Extension', 2),
        avgTilt: getMostCommonTilt(pitchRows)
      }))
      .sort((a, b) => b.count - a.count);
  });

  const subtitle = matched.size
    ? `Loaded TrackMan data for ${matched.size} rostered pitcher${matched.size === 1 ? '' : 's'}.`
    : 'No roster names matched the uploaded TrackMan file.';

  const subtitleEl = document.getElementById('selectedPitcherSubtitle');
  if (subtitleEl) subtitleEl.textContent = subtitle;

  renderAll();
}

function renderAll() {
  const player = ensurePlayer(selectedPitcher);
  renderRoster(document.getElementById('pitcherSearch')?.value || '');
  renderMetrics(player);
  bindFields(player);
  renderPitchMetrics(player);
  renderPlatoon(player);
  renderWeeklyThrows(player);
  renderStrikeZone();
  renderHeatMap('heatMapRHH', player.heatRHH);
  renderHeatMap('heatMapLHH', player.heatLHH);
  renderTeamDashboard();
}

document.getElementById('pitcherSearch')?.addEventListener('input', e => {
  renderRoster(e.target.value);
});

document.getElementById('resetDataBtn')?.addEventListener('click', () => {
  window.location.reload();
});

document.getElementById('csvFile')?.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;

  const text = await file.text();
  const rows = parseCsv(text);
  updateFromTrackman(rows);
});

roster.forEach(ensurePlayer);
renderAll();

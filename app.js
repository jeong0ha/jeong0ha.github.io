(function () {
  'use strict';

  // ============================================================
  // 상태
  // ============================================================
  const state = {
    selectedDate: startOfDay(new Date()),
    selectedSiteId: null,
    zoom: { scale: 1, tx: 0, ty: 0 },
    isDragging: false,
    dragStart: null,
  };

  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const MIN_SCALE = 1;
  const MAX_SCALE = 8;

  function startOfDay(d) {
    const n = new Date(d);
    n.setHours(0, 0, 0, 0);
    return n;
  }
  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }
  function formatMD(d) {
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }
  function formatMDShort(d) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  // ============================================================
  // DOM refs
  // ============================================================
  const svg = document.getElementById('koreaMap');
  const zoomGroup = document.getElementById('mapZoomGroup');
  const mapWrap = svg.closest('.map-wrap');
  const tooltip = document.getElementById('markerTooltip');
  const listEl = document.getElementById('campsiteList');
  const mapSummaryEl = document.getElementById('mapSummary');
  const searchInput = document.getElementById('searchInput');
  const onlyAvailableCheckbox = document.getElementById('onlyAvailableCheckbox');
  const selectedDateLabel = document.getElementById('selectedDateLabel');
  const selectedDateSub = document.getElementById('selectedDateSub');
  const toggleDateStripBtn = document.getElementById('toggleDateStripBtn');
  const dateStrip = document.getElementById('dateStrip');
  const modalOverlay = document.getElementById('detailModal');
  const modalBody = document.getElementById('modalBody');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const toastEl = document.getElementById('toast');
  const myReservationsBtn = document.getElementById('myReservationsBtn');
  const myReservationsCount = document.getElementById('myReservationsCount');

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ============================================================
  // 지도 그리기
  // ============================================================
  function catmullRomClosedPath(points) {
    const n = points.length;
    let d = '';
    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n];
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const p3 = points[(i + 2) % n];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      if (i === 0) d += `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} `;
      d += `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} `;
    }
    return d + 'Z';
  }

  function drawBaseMap() {
    const outlinePts = KOREA_OUTLINE.map(([lat, lon]) => project(lat, lon));
    const land = document.createElementNS(SVG_NS, 'path');
    land.setAttribute('class', 'land');
    land.setAttribute('d', catmullRomClosedPath(outlinePts));
    zoomGroup.appendChild(land);

    const { pxPerLat, pxPerLon } = getPxPerDegree();
    ISLANDS.forEach((isl) => {
      const center = project(isl.lat, isl.lon);
      const island = document.createElementNS(SVG_NS, 'ellipse');
      island.setAttribute('class', 'island');
      island.setAttribute('cx', center.x.toFixed(2));
      island.setAttribute('cy', center.y.toFixed(2));
      island.setAttribute('rx', (isl.dlon * pxPerLon).toFixed(2));
      island.setAttribute('ry', (isl.dlat * pxPerLat).toFixed(2));
      zoomGroup.appendChild(island);
    });
  }

  const markerEls = new Map();

  function drawMarkers() {
    CAMPSITES.forEach((site) => {
      const pos = project(site.lat, site.lon);
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'marker');
      g.setAttribute('data-site-id', site.id);
      g.setAttribute('transform', `translate(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`);

      const pin = document.createElementNS(SVG_NS, 'circle');
      pin.setAttribute('class', 'pin');
      pin.setAttribute('r', 4.5);
      pin.setAttribute('cx', 0);
      pin.setAttribute('cy', 0);
      g.appendChild(pin);

      g.addEventListener('mouseenter', (e) => showTooltip(site, g));
      g.addEventListener('mouseleave', hideTooltip);
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        hideTooltip();
        selectSite(site.id, { openModal: true, scrollList: true });
      });

      zoomGroup.appendChild(g);
      markerEls.set(site.id, g);
    });
  }

  function refreshMarkerStates() {
    CAMPSITES.forEach((site) => {
      const g = markerEls.get(site.id);
      if (!g) return;
      const slots = getAvailableSlots(site, state.selectedDate);
      g.classList.toggle('available', slots > 0);
      g.classList.toggle('full', slots === 0);
      g.classList.toggle('selected', state.selectedSiteId === site.id);
    });
  }

  // ============================================================
  // 휠 확대/축소 + 드래그 이동
  // ============================================================
  function applyZoomTransform() {
    const { scale, tx, ty } = state.zoom;
    zoomGroup.setAttribute('transform', `translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) scale(${scale.toFixed(3)})`);
  }

  function clampTranslate() {
    const { scale } = state.zoom;
    const w = MAP_CONFIG.width;
    const h = MAP_CONFIG.height;
    const minTx = w * (1 - scale);
    const minTy = h * (1 - scale);
    state.zoom.tx = Math.min(0, Math.max(minTx, state.zoom.tx));
    state.zoom.ty = Math.min(0, Math.max(minTy, state.zoom.ty));
  }

  function viewBoxPointFromClient(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const scaleX = MAP_CONFIG.width / rect.width;
    const scaleY = MAP_CONFIG.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function onWheel(e) {
    e.preventDefault();
    const point = viewBoxPointFromClient(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    const prevScale = state.zoom.scale;
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prevScale * factor));
    if (nextScale === prevScale) return;

    const ratio = nextScale / prevScale;
    state.zoom.tx = point.x - ratio * (point.x - state.zoom.tx);
    state.zoom.ty = point.y - ratio * (point.y - state.zoom.ty);
    state.zoom.scale = nextScale;
    clampTranslate();
    applyZoomTransform();
  }

  function onPointerDown(e) {
    if (e.target.closest('.marker')) return;
    state.isDragging = true;
    state.dragStart = {
      clientX: e.clientX,
      clientY: e.clientY,
      tx: state.zoom.tx,
      ty: state.zoom.ty,
    };
    svg.classList.add('grabbing');
    svg.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!state.isDragging) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = MAP_CONFIG.width / rect.width;
    const scaleY = MAP_CONFIG.height / rect.height;
    const dx = (e.clientX - state.dragStart.clientX) * scaleX;
    const dy = (e.clientY - state.dragStart.clientY) * scaleY;
    state.zoom.tx = state.dragStart.tx + dx;
    state.zoom.ty = state.dragStart.ty + dy;
    clampTranslate();
    applyZoomTransform();
  }

  function onPointerUp(e) {
    state.isDragging = false;
    svg.classList.remove('grabbing');
    if (svg.hasPointerCapture && svg.hasPointerCapture(e.pointerId)) {
      svg.releasePointerCapture(e.pointerId);
    }
  }

  // ============================================================
  // 툴팁
  // ============================================================
  function priceBand(price) {
    return `${Math.floor(price / 10000)}만원대`;
  }

  function showTooltip(site, markerEl) {
    const slots = getAvailableSlots(site, state.selectedDate);
    const today = startOfDay(new Date());
    const dayLabel = isSameDay(state.selectedDate, today) ? '오늘' : formatMDShort(state.selectedDate);
    const rect = markerEl.querySelector('circle').getBoundingClientRect();
    tooltip.innerHTML = `
      <div class="tt-photo theme-${site.theme}"><span class="tt-photo-emoji">${site.emoji}</span></div>
      <div class="tt-body">
        <div class="tt-title">${site.name}</div>
        <div class="tt-region">${site.region} · ★ ${site.rating.toFixed(1)}</div>
        <div class="tt-desc">${site.desc}</div>
        <div class="tt-price">${priceBand(site.price)} · 1박 ${site.price.toLocaleString()}원~</div>
        <div class="tt-status ${slots > 0 ? 'available' : 'full'}">${slots > 0 ? `${dayLabel} 예약 가능 · ${slots}자리 남음` : `${dayLabel} 예약 마감`}</div>
      </div>
    `;
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top}px`;
    tooltip.hidden = false;
  }
  function hideTooltip() {
    tooltip.hidden = true;
  }

  // ============================================================
  // 날짜 선택 UI
  // ============================================================
  function renderDateStrip() {
    dateStrip.innerHTML = '';
    for (let i = 0; i < 14; i++) {
      const d = addDays(startOfDay(new Date()), i);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'date-chip' + (isSameDay(d, state.selectedDate) ? ' selected' : '');
      const label = i === 0 ? '오늘' : i === 1 ? '내일' : DOW[d.getDay()];
      chip.innerHTML = `<span class="dow">${label}</span><span class="dnum">${formatMDShort(d)}</span>`;
      chip.addEventListener('click', () => {
        state.selectedDate = d;
        dateStrip.hidden = true;
        toggleDateStripBtn.classList.remove('active');
        renderAll();
      });
      dateStrip.appendChild(chip);
    }
  }

  function updateDateLabel() {
    const today = startOfDay(new Date());
    if (isSameDay(state.selectedDate, today)) {
      selectedDateLabel.textContent = '오늘';
      selectedDateSub.textContent = `${formatMD(state.selectedDate)} (${DOW[state.selectedDate.getDay()]})`;
    } else if (isSameDay(state.selectedDate, addDays(today, 1))) {
      selectedDateLabel.textContent = '내일';
      selectedDateSub.textContent = `${formatMD(state.selectedDate)} (${DOW[state.selectedDate.getDay()]})`;
    } else {
      selectedDateLabel.textContent = `${formatMD(state.selectedDate)} (${DOW[state.selectedDate.getDay()]})`;
      selectedDateSub.textContent = '선택한 날짜';
    }
  }

  toggleDateStripBtn.addEventListener('click', () => {
    dateStrip.hidden = !dateStrip.hidden;
    toggleDateStripBtn.classList.toggle('active', !dateStrip.hidden);
  });

  // ============================================================
  // 리스트 렌더링
  // ============================================================
  function renderList() {
    const query = searchInput.value.trim().toLowerCase();
    const onlyAvailable = onlyAvailableCheckbox.checked;

    let items = CAMPSITES.map((site) => ({
      site,
      slots: getAvailableSlots(site, state.selectedDate),
    }));

    if (query) {
      items = items.filter(({ site }) =>
        site.name.toLowerCase().includes(query) ||
        site.region.toLowerCase().includes(query) ||
        site.tags.some((t) => t.toLowerCase().includes(query))
      );
    }
    if (onlyAvailable) {
      items = items.filter(({ slots }) => slots > 0);
    }

    items.sort((a, b) => {
      if ((a.slots > 0) !== (b.slots > 0)) return a.slots > 0 ? -1 : 1;
      return b.site.rating - a.site.rating;
    });

    listEl.innerHTML = '';
    if (items.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = '조건에 맞는 캠핑장이 없습니다.';
      listEl.appendChild(empty);
    } else {
      items.forEach(({ site, slots }) => {
        listEl.appendChild(buildCard(site, slots));
      });
    }

    const availableCount = CAMPSITES.filter((s) => getAvailableSlots(s, state.selectedDate) > 0).length;
    const today = startOfDay(new Date());
    const dayWord = isSameDay(state.selectedDate, today) ? '오늘' : formatMD(state.selectedDate);
    mapSummaryEl.textContent = `${dayWord} 예약 가능한 캠핑장 ${availableCount}곳 / 전체 ${CAMPSITES.length}곳`;
  }

  function buildCard(site, slots) {
    const li = document.createElement('li');
    li.className = 'campsite-card' + (slots === 0 ? ' full' : '') + (state.selectedSiteId === site.id ? ' selected' : '');
    li.setAttribute('data-site-id', site.id);
    li.innerHTML = `
      <div class="card-emoji">${site.emoji}</div>
      <div class="card-body">
        <div class="card-title-row">
          <span class="card-title">${site.name}</span>
          <span class="availability-badge ${slots > 0 ? 'available' : 'full'}">${slots > 0 ? `${slots}자리 남음` : '마감'}</span>
        </div>
        <div class="card-region">${site.region} · ★ ${site.rating.toFixed(1)}</div>
        <div class="card-tags">${site.tags.map((t) => `<span class="card-tag">${t}</span>`).join('')}</div>
        <div class="card-meta-row">
          <span class="card-price">${site.price.toLocaleString()}원 <small>/ 1박</small></span>
        </div>
      </div>
    `;
    li.addEventListener('click', () => selectSite(site.id, { openModal: true, panToMarker: true }));
    return li;
  }

  function selectSite(siteId, opts = {}) {
    state.selectedSiteId = siteId;
    refreshMarkerStates();
    document.querySelectorAll('.campsite-card').forEach((el) => {
      el.classList.toggle('selected', el.getAttribute('data-site-id') === siteId);
    });
    if (opts.scrollList) {
      const cardEl = listEl.querySelector(`[data-site-id="${siteId}"]`);
      if (cardEl) cardEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    if (opts.openModal) {
      const site = CAMPSITES.find((s) => s.id === siteId);
      if (site) openDetailModal(site);
    }
  }

  // ============================================================
  // 예약 모달
  // ============================================================
  function getReservations() {
    try {
      return JSON.parse(localStorage.getItem('campReservations') || '[]');
    } catch (e) {
      return [];
    }
  }
  function saveReservations(list) {
    localStorage.setItem('campReservations', JSON.stringify(list));
    const count = list.length;
    myReservationsCount.hidden = count === 0;
    myReservationsCount.textContent = count;
  }

  function openDetailModal(site) {
    const slots = getAvailableSlots(site, state.selectedDate);
    let people = 1;
    const dateText = `${formatMD(state.selectedDate)} (${DOW[state.selectedDate.getDay()]})`;

    modalBody.innerHTML = `
      <div class="modal-photo theme-${site.theme}"><span class="tt-photo-emoji">${site.emoji}</span></div>
      <h2>${site.name}</h2>
      <div class="modal-region">${site.region} · ★ ${site.rating.toFixed(1)}</div>
      <div class="modal-tags">${site.tags.map((t) => `<span class="card-tag">${t}</span>`).join('')}</div>
      <p class="modal-desc">${site.desc}</p>
      <div class="modal-info-row"><span>예약 날짜</span><span>${dateText}</span></div>
      <div class="modal-info-row"><span>1박 요금</span><span>${site.price.toLocaleString()}원</span></div>
      <div class="modal-info-row"><span>예약 현황</span><span>${slots > 0 ? `${slots}자리 남음` : '마감'}</span></div>
      ${slots > 0 ? `
        <div class="people-select">
          <span>인원</span>
          <button type="button" class="stepper-btn" id="decPeople">−</button>
          <span id="peopleCount">1</span>명
          <button type="button" class="stepper-btn" id="incPeople">+</button>
        </div>
        <button type="button" class="confirm-btn" id="confirmReserveBtn">예약하기</button>
      ` : `
        <button type="button" class="confirm-btn" disabled>선택한 날짜는 예약이 마감되었습니다</button>
      `}
    `;
    modalOverlay.hidden = false;

    if (slots > 0) {
      const peopleCountEl = modalBody.querySelector('#peopleCount');
      const decBtn = modalBody.querySelector('#decPeople');
      const incBtn = modalBody.querySelector('#incPeople');
      const confirmBtn = modalBody.querySelector('#confirmReserveBtn');

      decBtn.addEventListener('click', () => {
        people = Math.max(1, people - 1);
        peopleCountEl.textContent = people;
      });
      incBtn.addEventListener('click', () => {
        people = Math.min(site.capacity, people + 1);
        peopleCountEl.textContent = people;
      });
      confirmBtn.addEventListener('click', () => {
        const reservations = getReservations();
        reservations.push({
          id: `${site.id}-${state.selectedDate.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
          siteId: site.id,
          siteName: site.name,
          region: site.region,
          date: state.selectedDate.getTime(),
          people,
          price: site.price,
        });
        saveReservations(reservations);
        confirmBtn.textContent = '예약 완료!';
        confirmBtn.classList.add('done');
        confirmBtn.disabled = true;
        showToast(`${site.name} 예약이 완료되었습니다.`);
        setTimeout(closeModal, 900);
      });
    }
  }

  function closeModal() {
    modalOverlay.hidden = true;
    modalBody.innerHTML = '';
  }
  closeModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalOverlay.hidden) closeModal();
  });

  // ============================================================
  // 내 예약 내역
  // ============================================================
  function openMyReservations() {
    const reservations = getReservations().sort((a, b) => a.date - b.date);
    if (reservations.length === 0) {
      modalBody.innerHTML = `
        <h2>내 예약 내역</h2>
        <p class="empty-state">아직 예약한 캠핑장이 없습니다.</p>
      `;
    } else {
      modalBody.innerHTML = `
        <h2>내 예약 내역</h2>
        <ul class="reservation-list">
          ${reservations.map((r) => `
            <li class="reservation-item" data-id="${r.id}">
              <div class="r-name">${r.siteName}</div>
              <div class="r-meta">${r.region} · ${formatMD(new Date(r.date))} · ${r.people}명 · ${r.price.toLocaleString()}원</div>
              <button type="button" class="stepper-btn cancel-reservation" data-id="${r.id}" title="예약 취소" style="margin-top:6px; width:auto; border-radius:8px; padding:4px 10px; font-size:0.75rem;">취소</button>
            </li>
          `).join('')}
        </ul>
      `;
      modalBody.querySelectorAll('.cancel-reservation').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const next = getReservations().filter((r) => r.id !== id);
          saveReservations(next);
          openMyReservations();
        });
      });
    }
    modalOverlay.hidden = false;
  }
  myReservationsBtn.addEventListener('click', openMyReservations);

  // ============================================================
  // 토스트
  // ============================================================
  let toastTimer = null;
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2500);
  }

  // ============================================================
  // 렌더 진입점
  // ============================================================
  function renderAll() {
    updateDateLabel();
    refreshMarkerStates();
    renderList();
  }

  function init() {
    drawBaseMap();
    drawMarkers();
    renderDateStrip();
    renderAll();

    const initial = getReservations();
    myReservationsCount.hidden = initial.length === 0;
    myReservationsCount.textContent = initial.length;

    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointerleave', onPointerUp);

    searchInput.addEventListener('input', renderList);
    onlyAvailableCheckbox.addEventListener('change', renderList);
  }

  init();
})();

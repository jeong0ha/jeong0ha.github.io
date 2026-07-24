// ============================================================
// 대한민국 지도 좌표 투영 설정
// 등장방형 도법(Equirectangular) + 위도 36°N 기준 축척 보정
// ============================================================
const MAP_CONFIG = {
  lonMin: 125.8,
  lonMax: 129.8,
  latMin: 33.0,
  latMax: 38.5,
  width: 470,
  height: 800,
};

function project(lat, lon) {
  const { pxPerLat, pxPerLon } = getPxPerDegree();
  const x = (lon - MAP_CONFIG.lonMin) * pxPerLon;
  const y = (MAP_CONFIG.latMax - lat) * pxPerLat;
  return { x, y };
}

function getPxPerDegree() {
  const pxPerLat = MAP_CONFIG.height / (MAP_CONFIG.latMax - MAP_CONFIG.latMin);
  const pxPerLon = pxPerLat * Math.cos((36 * Math.PI) / 180);
  return { pxPerLat, pxPerLon };
}

// 남한 해안선 근사 좌표 [위도, 경도] - 강화도 부근에서 시작해 시계방향
// (섬 지역은 아래 ISLANDS로 별도 처리하고, 여기는 본토 해안선만 담는다)
const KOREA_OUTLINE = [
  [37.75, 126.35], [37.95, 126.65], [38.20, 127.00], [38.30, 127.50], [38.35, 128.15],
  [38.20, 128.55], [37.75, 128.85], [37.45, 129.10], [37.05, 129.35], [36.55, 129.40],
  [36.05, 129.45], [35.85, 129.55], [35.55, 129.45], [35.30, 129.35], [35.15, 129.15],
  [35.05, 129.03], [34.95, 128.85], [34.85, 128.60], [34.75, 128.70], [34.65, 128.55],
  [34.75, 128.30], [34.80, 127.95], [34.90, 127.75], [34.75, 127.65], [34.85, 127.50],
  [34.75, 127.35], [34.85, 127.20], [34.65, 127.05], [34.80, 126.90], [34.65, 126.75],
  [34.55, 126.55], [34.75, 126.45], [35.05, 126.35], [35.35, 126.35], [35.70, 126.50],
  [35.95, 126.55], [36.20, 126.50], [36.45, 126.45],
  [36.35, 126.58], [36.25, 126.45], [36.20, 126.25], [36.45, 126.05], [36.70, 126.00],
  [36.88, 126.05], [36.93, 126.28],
  [36.95, 126.50], [37.10, 126.45], [37.30, 126.50], [37.45, 126.55], [37.55, 126.50],
];

// 본토와 분리된 섬 (중심 위경도 + 반경, 위경도 단위) - 제주/강화/거제/남해/완도
const ISLANDS = [
  { name: '제주도', lat: 33.335, lon: 126.56, dlat: 0.27, dlon: 0.46 },
  { name: '강화도', lat: 37.69, lon: 126.43, dlat: 0.10, dlon: 0.14 },
  { name: '거제도', lat: 34.85, lon: 128.65, dlat: 0.12, dlon: 0.13 },
  { name: '남해도', lat: 34.82, lon: 127.87, dlat: 0.13, dlon: 0.15 },
  { name: '완도', lat: 34.35, lon: 126.79, dlat: 0.13, dlon: 0.14 },
];

// ============================================================
// 캠핑장 목데이터
// ============================================================
// 이름·지역은 실제 존재하는 캠핑장/야영장을 참고했습니다.
// 요금·정원·평점·예약 가능 여부는 데모용으로 만든 가상의 값이며 실제 예약 현황과 무관합니다.
const CAMPSITES = [
  { id: 'c01', name: '자라섬 캠핑장', region: '경기 가평', lat: 37.831, lon: 127.535, price: 32000, capacity: 4, rating: 4.5, tags: ['오토캠핑', '강변'], emoji: '🏞️', theme: 'river', desc: '북한강 물줄기를 낀 국내 대표 오토캠핑장으로 넓은 잔디 사이트가 특징입니다.' },
  { id: 'c02', name: '남이섬 오토캠핑장', region: '강원 춘천', lat: 37.791, lon: 127.525, price: 35000, capacity: 4, rating: 4.6, tags: ['오토캠핑', '숲세권'], emoji: '🌲', theme: 'forest', desc: '메타세쿼이아 길로 유명한 남이섬 인근에서 즐기는 숲속 캠핑입니다.' },
  { id: 'c03', name: '대관령자연휴양림', region: '강원 강릉', lat: 37.68, lon: 128.72, price: 20000, capacity: 4, rating: 4.7, tags: ['자연휴양림', '숲세권'], emoji: '🌳', theme: 'forest', desc: '고원 지형의 서늘한 기후와 울창한 전나무 숲이 매력인 휴양림입니다.' },
  { id: 'c04', name: '청태산자연휴양림', region: '강원 평창', lat: 37.57, lon: 128.36, price: 18000, capacity: 4, rating: 4.6, tags: ['자연휴양림', '계곡'], emoji: '🌲', theme: 'forest', desc: '해발 1200m대 능선 아래 자리해 여름에도 선선한 것이 특징입니다.' },
  { id: 'c05', name: '유명산자연휴양림', region: '경기 가평', lat: 37.60, lon: 127.43, price: 17000, capacity: 4, rating: 4.4, tags: ['자연휴양림', '계곡'], emoji: '⛰️', theme: 'forest', desc: '계곡을 따라 야영지가 이어져 물놀이와 캠핑을 함께 즐길 수 있습니다.' },
  { id: 'c06', name: '설악산국립공원 소공원야영장', region: '강원 속초', lat: 38.17, lon: 128.47, price: 12000, capacity: 4, rating: 4.8, tags: ['국립공원', '야영데크'], emoji: '🏔️', theme: 'mountain', desc: '설악산 대청봉 등반 코스 초입에 있어 등산객들이 즐겨 찾습니다.' },
  { id: 'c07', name: '지리산국립공원 화엄사야영장', region: '전남 구례', lat: 35.28, lon: 127.50, price: 11000, capacity: 4, rating: 4.6, tags: ['국립공원', '계곡'], emoji: '🏔️', theme: 'mountain', desc: '천년 고찰 화엄사 인근, 지리산 자락의 조용한 국립공원 야영장입니다.' },
  { id: 'c08', name: '덕유산국립공원 구천동야영장', region: '전북 무주', lat: 35.85, lon: 127.75, price: 11000, capacity: 4, rating: 4.7, tags: ['국립공원', '계곡'], emoji: '🌲', theme: 'mountain', desc: '구천동 계곡을 따라 자리한 국립공원 직영 야영장입니다.' },
  { id: 'c09', name: '내장산국립공원 야영장', region: '전북 정읍', lat: 35.48, lon: 126.89, price: 10000, capacity: 4, rating: 4.5, tags: ['국립공원', '숲세권'], emoji: '🍁', theme: 'forest', desc: '가을 단풍으로 유명한 내장산 자락의 국립공원 야영장입니다.' },
  { id: 'c10', name: '몽산포오토캠핑장', region: '충남 태안', lat: 36.62, lon: 126.31, price: 33000, capacity: 5, rating: 4.4, tags: ['오션뷰', '오토캠핑'], emoji: '🏖️', theme: 'ocean', desc: '백사장이 넓게 펼쳐진 몽산포 해변 바로 앞 오토캠핑장입니다.' },
  { id: 'c11', name: '만리포오토캠핑장', region: '충남 태안', lat: 36.78, lon: 126.14, price: 34000, capacity: 5, rating: 4.3, tags: ['오션뷰', '오토캠핑'], emoji: '🌊', theme: 'ocean', desc: '서해 대표 해수욕장인 만리포 백사장과 인접한 캠핑장입니다.' },
  { id: 'c12', name: '안면도자연휴양림', region: '충남 태안', lat: 36.52, lon: 126.32, price: 19000, capacity: 4, rating: 4.6, tags: ['자연휴양림', '숲세권'], emoji: '🌲', theme: 'forest', desc: '안면도 소나무 숲 사이에 자리한 휴양림으로 산림욕에 좋습니다.' },
  { id: 'c13', name: '옥천자연휴양림', region: '충북 옥천', lat: 36.28, lon: 127.53, price: 16000, capacity: 4, rating: 4.3, tags: ['자연휴양림', '계곡'], emoji: '🌳', theme: 'forest', desc: '금강 지류 계곡을 낀 조용한 충북 내륙의 자연휴양림입니다.' },
  { id: 'c14', name: '남해편백자연휴양림', region: '경남 남해', lat: 34.83, lon: 127.87, price: 18000, capacity: 4, rating: 4.7, tags: ['자연휴양림', '힐링'], emoji: '🌲', theme: 'forest', desc: '편백나무 숲의 피톤치드로 유명한 힐링형 휴양림입니다.' },
  { id: 'c15', name: '거제자연휴양림', region: '경남 거제', lat: 34.85, lon: 128.70, price: 19000, capacity: 4, rating: 4.5, tags: ['자연휴양림', '오션뷰'], emoji: '🌊', theme: 'ocean', desc: '남해 바다를 조망할 수 있는 거제도 산림 속 휴양림입니다.' },
  { id: 'c16', name: '완도수목원 야영장', region: '전남 완도', lat: 34.36, lon: 126.79, price: 15000, capacity: 4, rating: 4.4, tags: ['수목원', '숲세권'], emoji: '🌳', theme: 'forest', desc: '다양한 난대림을 관찰할 수 있는 수목원 내 야영장입니다.' },
  { id: 'c17', name: '김녕 성세기해변 야영장', region: '제주 구좌', lat: 33.556, lon: 126.76, price: 30000, capacity: 4, rating: 4.8, tags: ['오션뷰', '해변'], emoji: '🌴', theme: 'ocean', desc: '에메랄드빛 바다와 검은 현무암 해안이 인상적인 제주 해변 야영장입니다.' },
  { id: 'c18', name: '동막해수욕장 야영장', region: '인천 강화', lat: 37.61, lon: 126.38, price: 27000, capacity: 4, rating: 4.2, tags: ['오션뷰', '반려동물동반'], emoji: '🌅', theme: 'ocean', desc: '강화도 대표 해변으로 노을 명소로도 잘 알려진 야영장입니다.' },
];

// ============================================================
// 예약 가능 여부 시뮬레이션 (백엔드 없이 날짜+캠핑장 기준 결정적 생성)
// ============================================================
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 해당 날짜/캠핑장의 남은 예약 가능 자리 수 (0이면 마감)
function getAvailableSlots(site, date) {
  const seed = hashString(site.id + dateKey(date));
  const roll = seed % 8; // 0~7
  if (roll <= 1) return 0; // 약 25% 확률로 마감
  return roll; // 2~7자리 남음
}

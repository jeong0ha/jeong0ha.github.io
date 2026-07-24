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
  const pxPerLat = MAP_CONFIG.height / (MAP_CONFIG.latMax - MAP_CONFIG.latMin);
  const pxPerLon = pxPerLat * Math.cos((36 * Math.PI) / 180);
  const x = (lon - MAP_CONFIG.lonMin) * pxPerLon;
  const y = (MAP_CONFIG.latMax - lat) * pxPerLat;
  return { x, y };
}

// 남한 해안선 근사 좌표 [위도, 경도] - 강화도 부근에서 시작해 시계방향
const KOREA_OUTLINE = [
  [37.75, 126.35], [37.95, 126.65], [38.20, 127.00], [38.30, 127.50], [38.35, 128.15],
  [38.20, 128.55], [37.75, 128.85], [37.45, 129.10], [37.05, 129.35], [36.55, 129.40],
  [36.05, 129.45], [35.85, 129.55], [35.55, 129.45], [35.30, 129.35], [35.15, 129.15],
  [35.05, 129.03], [34.95, 128.85], [34.85, 128.60], [34.75, 128.70], [34.65, 128.55],
  [34.75, 128.30], [34.80, 127.95], [34.90, 127.75], [34.75, 127.65], [34.85, 127.50],
  [34.75, 127.35], [34.85, 127.20], [34.65, 127.05], [34.80, 126.90], [34.65, 126.75],
  [34.55, 126.55], [34.75, 126.45], [35.05, 126.35], [35.35, 126.35], [35.70, 126.50],
  [35.95, 126.55], [36.20, 126.50], [36.45, 126.45], [36.65, 126.30], [36.85, 126.35],
  [36.95, 126.50], [37.10, 126.45], [37.30, 126.50], [37.45, 126.55], [37.55, 126.50],
];

const JEJU_CENTER = [33.38, 126.53];

// ============================================================
// 캠핑장 목데이터
// ============================================================
const CAMPSITES = [
  { id: 'c01', name: '남이섬 캠핑장', region: '강원 춘천', lat: 37.79, lon: 127.53, price: 35000, capacity: 4, rating: 4.6, tags: ['오토캠핑', '숲세권'], emoji: '🌲' },
  { id: 'c02', name: '인제 자작나무숲 캠핑장', region: '강원 인제', lat: 38.07, lon: 128.35, price: 40000, capacity: 4, rating: 4.8, tags: ['글램핑', '포토스팟'], emoji: '🌳' },
  { id: 'c03', name: '평창 하늘내린 캠핑장', region: '강원 평창', lat: 37.60, lon: 128.53, price: 38000, capacity: 6, rating: 4.7, tags: ['오토캠핑', '반려동물동반'], emoji: '⛰️' },
  { id: 'c04', name: '가평 자라섬 캠핑장', region: '경기 가평', lat: 37.83, lon: 127.53, price: 32000, capacity: 4, rating: 4.5, tags: ['강변', '오토캠핑'], emoji: '🏞️' },
  { id: 'c05', name: '양평 두물머리 캠핑장', region: '경기 양평', lat: 37.55, lon: 127.32, price: 30000, capacity: 4, rating: 4.4, tags: ['강변', '감성캠핑'], emoji: '🌅' },
  { id: 'c06', name: '태안 솔라리스 캠핑장', region: '충남 태안', lat: 36.75, lon: 126.30, price: 42000, capacity: 6, rating: 4.6, tags: ['오션뷰', '글램핑'], emoji: '🏖️' },
  { id: 'c07', name: '단양 온달 캠핑장', region: '충북 단양', lat: 36.98, lon: 128.37, price: 33000, capacity: 4, rating: 4.5, tags: ['계곡', '오토캠핑'], emoji: '🏔️' },
  { id: 'c08', name: '무주 덕유산 캠핑장', region: '전북 무주', lat: 35.87, lon: 127.66, price: 31000, capacity: 4, rating: 4.7, tags: ['숲세권', '계곡'], emoji: '🌲' },
  { id: 'c09', name: '부안 변산 캠핑장', region: '전북 부안', lat: 35.68, lon: 126.53, price: 34000, capacity: 5, rating: 4.3, tags: ['오션뷰', '오토캠핑'], emoji: '🌊' },
  { id: 'c10', name: '순천만 캠핑장', region: '전남 순천', lat: 34.88, lon: 127.49, price: 29000, capacity: 4, rating: 4.5, tags: ['습지생태', '감성캠핑'], emoji: '🌾' },
  { id: 'c11', name: '여수 오동도 캠핑장', region: '전남 여수', lat: 34.73, lon: 127.75, price: 39000, capacity: 4, rating: 4.6, tags: ['오션뷰', '글램핑'], emoji: '🏖️' },
  { id: 'c12', name: '안동 하회마을 캠핑장', region: '경북 안동', lat: 36.54, lon: 128.52, price: 28000, capacity: 4, rating: 4.2, tags: ['전통마을', '강변'], emoji: '🏞️' },
  { id: 'c13', name: '경주 보문호 캠핑장', region: '경북 경주', lat: 35.85, lon: 129.28, price: 36000, capacity: 5, rating: 4.6, tags: ['호수', '오토캠핑'], emoji: '🌅' },
  { id: 'c14', name: '거제 바람의언덕 캠핑장', region: '경남 거제', lat: 34.80, lon: 128.60, price: 41000, capacity: 4, rating: 4.7, tags: ['오션뷰', '감성캠핑'], emoji: '🌊' },
  { id: 'c15', name: '부산 기장 대변항 캠핑장', region: '부산 기장', lat: 35.24, lon: 129.22, price: 37000, capacity: 4, rating: 4.4, tags: ['오션뷰', '오토캠핑'], emoji: '🏖️' },
  { id: 'c16', name: '제주 협재 캠핑장', region: '제주 한림', lat: 33.39, lon: 126.24, price: 45000, capacity: 4, rating: 4.9, tags: ['오션뷰', '글램핑'], emoji: '🌴' },
  { id: 'c17', name: '강화 석모도 캠핑장', region: '인천 강화', lat: 37.68, lon: 126.30, price: 27000, capacity: 4, rating: 4.1, tags: ['오션뷰', '반려동물동반'], emoji: '🌅' },
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

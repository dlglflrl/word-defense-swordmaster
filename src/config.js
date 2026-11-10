/* ---------------- CONFIG ---------------- */
/* ★ 빌드 설정: true = 기능 확인용 테스트 버전 (재화 넉넉, 모든 스테이지 열림, 별도 저장) */
const DEV_MODE = false;
const W = 1280, H = 520, GROUND = 448;
const ALLY_BASE_X = 92, ENEMY_BASE_X = 1188, BASE_W = 56;
const INK = '#2b2140';

/* 밸런스 상수 */
const BASE_HP=2600, MAX_LV=8, LV_STEP=0.1, ALLY_NERF=1.0;
const lvMul=lv=>1+LV_STEP*(lv-1);

export { DEV_MODE, W, H, GROUND, ALLY_BASE_X, ENEMY_BASE_X, BASE_W, INK, BASE_HP, MAX_LV, LV_STEP, ALLY_NERF, lvMul };

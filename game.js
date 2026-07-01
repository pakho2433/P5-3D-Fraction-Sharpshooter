import {
  DIFFICULTIES,
  fractionText,
  generateQuestion,
  renderQuestionHTML,
  sameFraction
} from './src/fractions.js';
import {
  createArrowModel,
  createBossMonster,
  createEnergyProjectile,
  createSmallMonster,
  disposeObject
} from './src/entities.js';

const THREE = window.THREE;
const PLAYER_EYE_HEIGHT = 1.7;
const TIME_PENALTY_SECONDS = 5;
const FIRST_ATTACK_LEVEL = 6;
const BOSS_LEVEL = 10;
const BOSS_MAX_HP = 10;
const TOTAL_LEVELS = 10;

const canvas = document.getElementById('gameCanvas');
const scoreValue = document.getElementById('scoreValue');
const levelValue = document.getElementById('levelValue');
const difficultyValue = document.getElementById('difficultyValue');
const timeValue = document.getElementById('timeValue');
const timerStat = document.getElementById('timerStat');
const questionCard = document.getElementById('questionCard');
const feedbackCard = document.getElementById('feedbackCard');
const crosshair = document.getElementById('crosshair');
const joystickZone = document.getElementById('joystickZone');
const joystickKnob = document.getElementById('joystickKnob');
const shootButton = document.getElementById('shootButton');
const startOverlay = document.getElementById('startOverlay');
const endOverlay = document.getElementById('endOverlay');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const chooseLevelButton = document.getElementById('chooseLevelButton');
const endTitle = document.getElementById('endTitle');
const endSummary = document.getElementById('endSummary');
const damageFlash = document.getElementById('damageFlash');
const bossHud = document.getElementById('bossHud');
const bossHpValue = document.getElementById('bossHpValue');
const bossHpFill = document.getElementById('bossHpFill');
const difficultyButtons = [...document.querySelectorAll('.difficulty-button')];

let scene;
let camera;
let renderer;
let clock;
let raycaster;
let player;
let bow;
let currentQuestion;
let audioContext = null;

let monsters = [];
let targetObjects = [];
let playerArrows = [];
let enemyProjectiles = [];
let boss = null;

let playing = false;
let changingLevel = false;
let bossWaveLocked = false;
let selectedDifficulty = 1;
let level = 1;
let score = 0;
let timeRemaining = DIFFICULTIES[1].seconds;
let lastDisplayedSecond = DIFFICULTIES[1].seconds;
let yaw = 0;
let pitch = -0.04;
let shootCooldown = 0;
let attackCooldown = 999;
let bossHp = BOSS_MAX_HP;
let bossHitMessageCooldown = 0;

const keys = Object.create(null);
const joystick = { x: 0, y: 0, pointerId: null };
const lookDrag = { active: false, pointerId: null, lastX: 0, lastY: 0 };

init();
bindControls();
selectDifficulty(1);
currentQuestion = generateQuestion(1, 1);
renderQuestion();
renderer.setAnimationLoop(gameLoop);

function currentConfig() {
  return DIFFICULTIES[selectedDifficulty];
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7ed3f2);
  scene.fog = new THREE.Fog(0x9ad9f1, 38, 110);

  camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 170);
  camera.rotation.order = 'YXZ';

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  raycaster.far = 95;

  player = new THREE.Object3D();
  player.position.set(0, 0, 22);
  scene.add(player);
  player.add(camera);
  camera.position.set(0, PLAYER_EYE_HEIGHT, 0);

  scene.add(new THREE.HemisphereLight(0xdff5ff, 0x4f7d3d, 2.15));

  const sun = new THREE.DirectionalLight(0xfff4d4, 2.4);
  sun.position.set(-16, 30, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -48;
  sun.shadow.camera.right = 48;
  sun.shadow.camera.top = 48;
  sun.shadow.camera.bottom = -48;
  scene.add(sun);

  createWorld();
  createBow();
  updateCameraRotation();
  window.addEventListener('resize', resize);
}

function createWorld() {
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(170, 170),
    new THREE.MeshStandardMaterial({ color: 0x5bb94e, roughness: 1 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.04;
  grass.receiveShadow = true;
  scene.add(grass);

  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 110),
    new THREE.MeshStandardMaterial({ color: 0xd4ab69, roughness: 1 })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, -22);
  path.receiveShadow = true;
  scene.add(path);

  const mountainMaterial = new THREE.MeshStandardMaterial({
    color: 0x789d73,
    roughness: 1,
    flatShading: true
  });
  for (let index = 0; index < 11; index += 1) {
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(12 + Math.random() * 10, 19 + Math.random() * 11, 5),
      mountainMaterial
    );
    mountain.position.set(index * 15 - 75, 7.5, -74 - Math.random() * 15);
    mountain.rotation.y = Math.random() * Math.PI;
    scene.add(mountain);
  }

  const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78 });
  for (let cloudIndex = 0; cloudIndex < 10; cloudIndex += 1) {
    const cloud = new THREE.Group();
    const scale = 0.8 + Math.random() * 1.2;
    for (let part = 0; part < 4; part += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1.5 - part * 0.11, 18, 12), cloudMaterial);
      puff.position.set((part - 1.5) * 1.65, -Math.abs(part - 1.5) * 0.18, 0);
      cloud.add(puff);
    }
    cloud.scale.setScalar(scale);
    cloud.position.set(Math.random() * 100 - 50, 20 + Math.random() * 10, -38 - Math.random() * 55);
    scene.add(cloud);
  }

  const treeColors = [0x2f8521, 0x3b9825, 0x277b2d, 0x4a9b2e];
  for (let treeIndex = 0; treeIndex < 110; treeIndex += 1) {
    const side = treeIndex % 2 === 0 ? -1 : 1;
    const z = 30 - Math.random() * 115;
    const x = side * (20 + Math.random() * 52);
    const scale = 0.7 + Math.random() * 1.6;
    const tree = createTree(treeColors[treeIndex % treeColors.length], scale);
    tree.position.set(x, 0, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    scene.add(tree);
  }
}

function createTree(color, scale) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.36, 3.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x82502f, roughness: 1 })
  );
  trunk.position.y = 1.7;
  trunk.castShadow = true;
  tree.add(trunk);

  const leafMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true });
  for (let layer = 0; layer < 3; layer += 1) {
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.85 - layer * 0.2, 3.25, 7), leafMaterial);
    leaves.position.y = 3.35 + layer * 1.15;
    leaves.castShadow = true;
    tree.add(leaves);
  }
  tree.scale.setScalar(scale);
  return tree;
}

function createBow() {
  bow = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a4c24, roughness: 0.7 });
  const grip = new THREE.MeshStandardMaterial({ color: 0x3d2b19, roughness: 0.9 });
  const stringMaterial = new THREE.LineBasicMaterial({ color: 0xf4f1df });
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.05, 0),
    new THREE.Vector3(0.28, 0.55, 0),
    new THREE.Vector3(0.38, 0, 0),
    new THREE.Vector3(0.28, -0.55, 0),
    new THREE.Vector3(0, -1.05, 0)
  ]);
  const bowBody = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.055, 8, false), wood);
  bowBody.castShadow = true;
  bow.add(bowBody);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.45, 12), grip);
  handle.position.x = 0.37;
  bow.add(handle);

  const stringGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 1.05, 0),
    new THREE.Vector3(0.18, 0, 0),
    new THREE.Vector3(0, -1.05, 0)
  ]);
  bow.add(new THREE.Line(stringGeometry, stringMaterial));
  bow.position.set(-0.72, -0.58, -1.25);
  bow.rotation.set(0.05, -0.12, -0.07);
  bow.scale.setScalar(0.62);
  camera.add(bow);
}

function bindControls() {
  difficultyButtons.forEach((button) => {
    button.addEventListener('click', () => selectDifficulty(Number(button.dataset.difficulty)));
  });

  window.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    if (event.code === 'Space') {
      event.preventDefault();
      shoot();
    }
  });
  window.addEventListener('keyup', (event) => { keys[event.code] = false; });

  joystickZone.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    joystick.pointerId = event.pointerId;
    joystickZone.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });
  joystickZone.addEventListener('pointermove', (event) => {
    if (event.pointerId === joystick.pointerId) updateJoystick(event);
  });
  const stopJoystick = (event) => {
    if (event.pointerId !== joystick.pointerId) return;
    joystick.pointerId = null;
    joystick.x = 0;
    joystick.y = 0;
    joystickKnob.style.transform = 'translate(-50%, -50%)';
  };
  joystickZone.addEventListener('pointerup', stopJoystick);
  joystickZone.addEventListener('pointercancel', stopJoystick);

  canvas.addEventListener('pointerdown', (event) => {
    if (!playing || event.button === 2) return;
    lookDrag.active = true;
    lookDrag.pointerId = event.pointerId;
    lookDrag.lastX = event.clientX;
    lookDrag.lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!lookDrag.active || event.pointerId !== lookDrag.pointerId) return;
    const deltaX = event.clientX - lookDrag.lastX;
    const deltaY = event.clientY - lookDrag.lastY;
    lookDrag.lastX = event.clientX;
    lookDrag.lastY = event.clientY;
    const sensitivity = event.pointerType === 'touch' ? 0.0052 : 0.0042;
    yaw -= deltaX * sensitivity;
    pitch -= deltaY * sensitivity;
    pitch = THREE.MathUtils.clamp(pitch, -1.1, 0.75);
    updateCameraRotation();
  });
  const stopLook = (event) => {
    if (event.pointerId !== lookDrag.pointerId) return;
    lookDrag.active = false;
    lookDrag.pointerId = null;
  };
  canvas.addEventListener('pointerup', stopLook);
  canvas.addEventListener('pointercancel', stopLook);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  shootButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    shootButton.classList.add('pressed');
    shoot();
  });
  const releaseShootButton = () => shootButton.classList.remove('pressed');
  shootButton.addEventListener('pointerup', releaseShootButton);
  shootButton.addEventListener('pointercancel', releaseShootButton);
  shootButton.addEventListener('pointerleave', releaseShootButton);

  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  chooseLevelButton?.addEventListener('click', () => {
    endOverlay.classList.add('hidden');
    startOverlay.classList.remove('hidden');
  });
}

function selectDifficulty(id) {
  if (!DIFFICULTIES[id]) return;
  selectedDifficulty = id;
  difficultyButtons.forEach((button) => {
    const selected = Number(button.dataset.difficulty) === id;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  difficultyValue.textContent = DIFFICULTIES[id].chinese;
  timeValue.textContent = String(DIFFICULTIES[id].seconds);
  currentQuestion = generateQuestion(id, 1);
  renderQuestion();
}

function updateJoystick(event) {
  const rect = joystickZone.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const limit = rect.width * 0.32;
  let offsetX = event.clientX - centerX;
  let offsetY = event.clientY - centerY;
  const distance = Math.hypot(offsetX, offsetY);
  if (distance > limit) {
    offsetX = (offsetX / distance) * limit;
    offsetY = (offsetY / distance) * limit;
  }
  joystick.x = offsetX / limit;
  joystick.y = offsetY / limit;
  joystickKnob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
}

function startGame() {
  ensureAudio();
  startOverlay.classList.add('hidden');
  endOverlay.classList.add('hidden');
  playing = true;
  changingLevel = false;
  bossWaveLocked = false;
  level = 1;
  score = 0;
  yaw = 0;
  pitch = -0.04;
  player.position.set(0, 0, 22);
  updateCameraRotation();
  scoreValue.textContent = String(score);
  difficultyValue.textContent = currentConfig().chinese;
  loadLevel();
  clock.getDelta();
}

function loadLevel() {
  clearLevelObjects();
  changingLevel = false;
  bossWaveLocked = false;
  levelValue.textContent = String(level);
  player.position.set(0, 0, 22);
  yaw = 0;
  pitch = -0.04;
  updateCameraRotation();

  if (level === BOSS_LEVEL) {
    startBossLevel();
    return;
  }

  bossHud.classList.add('hidden');
  timerStat.classList.remove('boss-time');
  timeRemaining = currentConfig().seconds;
  lastDisplayedSecond = timeRemaining;
  timeValue.textContent = String(timeRemaining);
  timerStat.classList.remove('danger');

  currentQuestion = generateQuestion(selectedDifficulty, level);
  renderQuestion();
  spawnAnswerMonsters(currentQuestion.options, false);
  attackCooldown = level >= FIRST_ATTACK_LEVEL ? nextAttackDelay() : 999;

  const terms = currentConfig().terms === 2 ? '兩個' : '三個';
  if (level >= FIRST_ATTACK_LEVEL) {
    showFeedback(`第 ${level} 關：${terms}分數加減；怪獸會攻擊，被擊中扣 ${TIME_PENALTY_SECONDS} 秒。`, 'bad', 2200);
  } else {
    showFeedback(`第 ${level} 關：${currentConfig().seconds} 秒，答對後時間重設。`, 'good', 1700);
  }
}

function startBossLevel() {
  timeRemaining = Infinity;
  timeValue.textContent = '∞';
  timerStat.classList.remove('danger');
  timerStat.classList.add('boss-time');
  bossHp = BOSS_MAX_HP;
  updateBossHud();
  bossHud.classList.remove('hidden');

  boss = createBossMonster();
  boss.position.set(0, 0, -32);
  scene.add(boss);
  monsters.push(boss);
  targetObjects.push(...boss.userData.targets);

  spawnBossWave();
  attackCooldown = 0.8;
  showFeedback('最終關不限時！先擊倒正確答案的小怪獸，才能令大怪獸 HP -1。', 'bad', 3000);
}

function spawnBossWave() {
  removeSmallMonsters();
  currentQuestion = generateQuestion(selectedDifficulty, BOSS_LEVEL + (BOSS_MAX_HP - bossHp));
  renderQuestion();
  spawnAnswerMonsters(currentQuestion.options, true);
  bossWaveLocked = false;
}

function spawnAnswerMonsters(options, bossWave) {
  const normalPositions = [
    new THREE.Vector3(-17, 0, -7),
    new THREE.Vector3(-6, 0, -25),
    new THREE.Vector3(7, 0, -13),
    new THREE.Vector3(18, 0, -29)
  ];
  const bossPositions = [
    new THREE.Vector3(-20, 0, -7),
    new THREE.Vector3(-9, 0, -23),
    new THREE.Vector3(9, 0, -10),
    new THREE.Vector3(20, 0, -25)
  ];
  const positions = bossWave ? bossPositions : normalPositions;
  const colors = [0xe85c58, 0x6d67d8, 0x2da976, 0xf09d38];

  options.forEach((answer, index) => {
    const monster = createSmallMonster({
      answer,
      answerMode: currentQuestion.answerMode,
      color: colors[index % colors.length],
      index,
      stage: level
    });
    monster.userData.isCorrect = sameFraction(answer, currentQuestion.answer);
    monster.userData.isBossMinion = bossWave;
    monster.position.copy(positions[index]);
    monster.position.x += (Math.random() - 0.5) * 4;
    monster.position.z += (Math.random() - 0.5) * 5;
    scene.add(monster);
    monsters.push(monster);
    targetObjects.push(...monster.userData.targets);
  });
}

function renderQuestion() {
  questionCard.innerHTML = renderQuestionHTML(currentQuestion);
  questionCard.classList.toggle('three-term-question', currentQuestion.operands.length === 3);
}

function shoot() {
  if (!playing || changingLevel || bossWaveLocked || shootCooldown > 0) return;
  shootCooldown = 0.34;
  playSound('shoot');
  bow.rotation.z = -0.13;
  setTimeout(() => { if (bow) bow.rotation.z = -0.07; }, 100);

  const canvasRect = canvas.getBoundingClientRect();
  const crosshairRect = crosshair.getBoundingClientRect();
  const crosshairX = crosshairRect.left + crosshairRect.width / 2;
  const crosshairY = crosshairRect.top + crosshairRect.height / 2;
  const ndc = new THREE.Vector2(
    ((crosshairX - canvasRect.left) / canvasRect.width) * 2 - 1,
    -(((crosshairY - canvasRect.top) / canvasRect.height) * 2 - 1)
  );
  raycaster.setFromCamera(ndc, camera);

  const intersections = raycaster.intersectObjects(targetObjects, false);
  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  const direction = raycaster.ray.direction.clone().normalize();
  let hitMonster = null;
  let hitPoint = origin.clone().add(direction.clone().multiplyScalar(78));

  for (const intersection of intersections) {
    const monster = intersection.object.userData.monsterRoot || findMonsterRoot(intersection.object);
    if (monster && monster.userData.alive) {
      hitMonster = monster;
      hitPoint.copy(intersection.point);
      break;
    }
  }
  launchPlayerArrow(origin, direction, hitPoint, hitMonster);
}

function launchPlayerArrow(origin, direction, hitPoint, hitMonster) {
  const arrow = createArrowModel();
  arrow.position.copy(origin);
  arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().normalize());
  scene.add(arrow);
  playerArrows.push({
    object: arrow,
    start: origin.clone(),
    end: hitPoint.clone(),
    direction: direction.clone().normalize(),
    elapsed: 0,
    duration: Math.max(0.16, Math.min(0.5, origin.distanceTo(hitPoint) / 90)),
    hitMonster,
    stuck: false,
    life: hitMonster ? 8 : 0.7
  });
}

function updatePlayerArrows(delta) {
  playerArrows = playerArrows.filter((arrow) => {
    if (!arrow.object?.parent) return false;
    if (!arrow.stuck) {
      arrow.elapsed += delta;
      const progress = Math.min(1, arrow.elapsed / arrow.duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      arrow.object.position.lerpVectors(arrow.start, arrow.end, eased);
      if (progress >= 1) {
        if (arrow.hitMonster && arrow.hitMonster.parent && arrow.hitMonster.userData.alive) {
          arrow.object.position.copy(arrow.end).addScaledVector(arrow.direction, -0.03);
          arrow.hitMonster.attach(arrow.object);
          arrow.stuck = true;
          resolveHit(arrow.hitMonster);
        } else {
          arrow.stuck = true;
        }
      }
    }

    if (arrow.stuck) {
      arrow.life -= delta;
      if (arrow.life <= 0) {
        disposeObject(arrow.object);
        return false;
      }
    }
    return true;
  });
}

function resolveHit(monster) {
  if (!playing || changingLevel || bossWaveLocked || !monster.userData.alive) return;

  if (monster.userData.isBoss) {
    playSound('wrong');
    animateBossBlock();
    showFeedback('大怪獸有護盾！先擊倒正確答案的小怪獸。', 'bad', 1300);
    return;
  }

  if (level === BOSS_LEVEL) {
    resolveBossMinionHit(monster);
    return;
  }

  if (monster.userData.isCorrect) {
    changingLevel = true;
    monster.userData.alive = false;
    score += 100 + Math.ceil(timeRemaining);
    scoreValue.textContent = String(score);
    playSound('correct');
    animateCorrectMonster(monster);
    showFeedback(
      `答對！答案是 ${fractionText(currentQuestion.answer, currentQuestion.answerMode)}。`,
      'good',
      1250
    );
    setTimeout(() => {
      if (!playing) return;
      level += 1;
      loadLevel();
    }, 900);
  } else {
    applyTimePenalty(`答案錯誤！扣 ${TIME_PENALTY_SECONDS} 秒。`);
    playSound('wrong');
    shakeMonster(monster);
  }
}

function resolveBossMinionHit(monster) {
  if (!monster.userData.isCorrect) {
    playSound('wrong');
    flashDamage();
    shakeMonster(monster);
    showFeedback('答案錯誤！第 10 關不限時，再計算一次。', 'bad', 1200);
    return;
  }

  bossWaveLocked = true;
  monster.userData.alive = false;
  score += 150;
  scoreValue.textContent = String(score);
  bossHp = Math.max(0, bossHp - 1);
  updateBossHud();
  playSound('correct');
  animateCorrectMonster(monster);
  animateBossDamage();
  showFeedback(`答對！大怪獸 HP -1，剩下 ${bossHp}/${BOSS_MAX_HP}。`, 'good', 1400);

  if (bossHp <= 0) {
    if (boss) boss.userData.alive = false;
    setTimeout(defeatBoss, 850);
  } else {
    setTimeout(() => {
      if (playing && level === BOSS_LEVEL) spawnBossWave();
    }, 850);
  }
}

function updateBossHud() {
  bossHpValue.textContent = String(bossHp);
  bossHpFill.style.width = `${(bossHp / BOSS_MAX_HP) * 100}%`;
  bossHpFill.classList.remove('hit');
  void bossHpFill.offsetWidth;
  bossHpFill.classList.add('hit');
}

function applyTimePenalty(message) {
  if (level === BOSS_LEVEL) return;
  timeRemaining = Math.max(0, timeRemaining - TIME_PENALTY_SECONDS);
  updateTimerDisplay(true);
  flashDamage();
  showFeedback(message, 'bad', 1200);
  if (timeRemaining <= 0) endGame(false);
}

function shakeMonster(monster) {
  monster.scale.set(0.88, 1.18, 0.88);
  setTimeout(() => { if (monster.parent) monster.scale.set(1, 1, 1); }, 180);
}

function animateCorrectMonster(monster) {
  const startY = monster.position.y;
  const startTime = performance.now();
  const duration = 760;
  const animate = (now) => {
    if (!monster.parent) return;
    const progress = Math.min(1, (now - startTime) / duration);
    monster.rotation.y += 0.19;
    monster.position.y = startY + Math.sin(progress * Math.PI) * 2.2;
    monster.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.25);
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

function animateBossDamage() {
  if (!boss?.parent) return;
  const originalX = boss.position.x;
  const start = performance.now();
  const duration = 450;
  const animate = (now) => {
    if (!boss?.parent) return;
    const progress = Math.min(1, (now - start) / duration);
    boss.position.x = originalX + Math.sin(progress * Math.PI * 8) * (1 - progress) * 0.8;
    boss.rotation.z = Math.sin(progress * Math.PI * 6) * 0.1;
    if (progress < 1) requestAnimationFrame(animate);
    else {
      boss.position.x = originalX;
      boss.rotation.z = 0;
    }
  };
  requestAnimationFrame(animate);
}

function animateBossBlock() {
  if (!boss?.parent) return;
  boss.scale.set(1.08, 0.94, 1.08);
  setTimeout(() => { if (boss?.parent) boss.scale.set(1, 1, 1); }, 160);
}

function defeatBoss() {
  if (!playing || !boss?.parent) return;
  playSound('victory');
  const startY = boss.position.y;
  const startTime = performance.now();
  const duration = 1100;
  const animate = (now) => {
    if (!boss?.parent) return;
    const progress = Math.min(1, (now - startTime) / duration);
    boss.rotation.z = Math.sin(progress * Math.PI * 6) * 0.18;
    boss.rotation.y += 0.12;
    boss.position.y = startY + Math.sin(progress * Math.PI) * 3.5;
    boss.scale.setScalar(Math.max(0.05, 1 - progress * 0.92));
    if (progress < 1) requestAnimationFrame(animate);
    else endGame(true);
  };
  requestAnimationFrame(animate);
}

function updateMonsterAttacks(delta) {
  if (!playing || changingLevel || level < FIRST_ATTACK_LEVEL) return;
  attackCooldown -= delta;
  if (attackCooldown > 0) return;
  if (level === BOSS_LEVEL) fireBossProjectiles();
  else fireSmallMonsterProjectile();
  attackCooldown = level === BOSS_LEVEL ? nextBossAttackDelay() : nextAttackDelay();
}

function fireSmallMonsterProjectile() {
  const attackers = monsters.filter((monster) => !monster.userData.isBoss && monster.userData.alive && monster.parent);
  if (!attackers.length) return;
  const attacker = attackers[Math.floor(Math.random() * attackers.length)];
  const start = new THREE.Vector3();
  attacker.getWorldPosition(start);
  start.y += 2.1;
  const target = new THREE.Vector3();
  camera.getWorldPosition(target);
  const direction = target.sub(start).normalize();
  createProjectile(start, direction, 8.5 + level * 0.45, 0.3, 0xff3c38);
  attacker.scale.set(1.18, 0.9, 1.18);
  setTimeout(() => { if (attacker.parent) attacker.scale.set(1, 1, 1); }, 170);
  playSound('monsterShoot');
}

function fireBossProjectiles() {
  if (!boss?.parent || !boss.userData.alive) return;
  const start = new THREE.Vector3();
  boss.getWorldPosition(start);
  start.y += 5.4;
  const target = new THREE.Vector3();
  camera.getWorldPosition(target);
  const baseDirection = target.sub(start).normalize();
  const spreads = bossHp <= 4 ? [-0.13, 0, 0.13] : [-0.07, 0.07];
  spreads.forEach((spread) => {
    const direction = baseDirection.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
    createProjectile(start, direction, 11.5 + (BOSS_MAX_HP - bossHp) * 0.22, 0.48, 0xb824ff);
  });
  boss.rotation.x = -0.1;
  setTimeout(() => { if (boss?.parent) boss.rotation.x = 0; }, 180);
  playSound('bossShoot');
}

function createProjectile(start, direction, speed, radius, color) {
  const orb = createEnergyProjectile({ position: start, color, radius });
  scene.add(orb);
  enemyProjectiles.push({ object: orb, velocity: direction.multiplyScalar(speed), life: 8 });
}

function updateEnemyProjectiles(delta) {
  const playerPosition = new THREE.Vector3();
  camera.getWorldPosition(playerPosition);
  enemyProjectiles = enemyProjectiles.filter((projectile) => {
    projectile.life -= delta;
    projectile.object.position.addScaledVector(projectile.velocity, delta);
    projectile.object.rotation.x += delta * 5;
    projectile.object.rotation.y += delta * 7;

    if (projectile.object.position.distanceTo(playerPosition) < 1.05) {
      const hitDirection = projectile.velocity.clone().setY(0).normalize();
      disposeObject(projectile.object);
      playSound('playerHit');
      flashDamage();

      if (level === BOSS_LEVEL) {
        player.position.addScaledVector(hitDirection, 2.4);
        shootCooldown = Math.max(shootCooldown, 0.75);
        if (bossHitMessageCooldown <= 0) {
          showFeedback('被大怪獸擊中！你被擊退，但最終關不限時。', 'bad', 1000);
          bossHitMessageCooldown = 1.1;
        }
      } else {
        applyTimePenalty(`被怪獸擊中！扣 ${TIME_PENALTY_SECONDS} 秒。`);
      }
      return false;
    }

    if (projectile.life <= 0 || projectile.object.position.length() > 145) {
      disposeObject(projectile.object);
      return false;
    }
    return true;
  });
}

function nextAttackDelay() {
  const base = Math.max(2.1, 4.6 - (level - FIRST_ATTACK_LEVEL) * 0.42);
  return base + Math.random() * 1.2;
}

function nextBossAttackDelay() {
  const healthPressure = (BOSS_MAX_HP - bossHp) * 0.045;
  return Math.max(0.9, 1.75 - healthPressure) + Math.random() * 0.5;
}

function updateMonsters(delta) {
  const time = performance.now() * 0.001;
  monsters.forEach((monster, index) => {
    if (!monster.userData.alive) return;
    if (monster.userData.isBoss) {
      updateBossMovement(monster, delta, time);
      return;
    }
    if (changingLevel || bossWaveLocked) return;

    monster.userData.turnTimer -= delta;
    if (monster.userData.turnTimer <= 0) {
      monster.userData.turnTimer = 0.8 + Math.random() * 2.1;
      monster.userData.velocity
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 1.8)
        .normalize();
    }

    const velocity = monster.userData.velocity;
    monster.position.addScaledVector(velocity, monster.userData.speed * delta);
    const xLimit = level === BOSS_LEVEL ? 23 : 22;
    const minZ = level === BOSS_LEVEL ? -40 : -42;
    const maxZ = 8;

    if (monster.position.x < -xLimit || monster.position.x > xLimit) {
      velocity.x *= -1;
      monster.position.x = THREE.MathUtils.clamp(monster.position.x, -xLimit, xLimit);
    }
    if (monster.position.z < minZ || monster.position.z > maxZ) {
      velocity.z *= -1;
      monster.position.z = THREE.MathUtils.clamp(monster.position.z, minZ, maxZ);
    }

    monster.rotation.y = Math.atan2(velocity.x, velocity.z) + Math.PI;
    monster.position.y = monster.userData.baseY + Math.sin(time * 4.2 + monster.userData.phase + index) * 0.09;

    if (monster.position.distanceTo(player.position) < 4.5) {
      const away = monster.position.clone().sub(player.position).setY(0).normalize();
      monster.position.addScaledVector(away, 3 * delta);
      velocity.copy(away);
    }
  });
}

function updateBossMovement(monster, delta, time) {
  monster.userData.turnTimer -= delta;
  if (monster.userData.turnTimer <= 0) {
    monster.userData.turnTimer = 1.4 + Math.random() * 1.8;
    monster.userData.velocity.x = Math.random() < 0.5 ? -1 : 1;
  }
  monster.position.x += monster.userData.velocity.x * monster.userData.speed * delta;
  if (monster.position.x < -15 || monster.position.x > 15) {
    monster.userData.velocity.x *= -1;
    monster.position.x = THREE.MathUtils.clamp(monster.position.x, -15, 15);
  }
  monster.position.z = -32 + Math.sin(time * 0.7) * 2.8;
  monster.position.y = Math.sin(time * 2.2 + monster.userData.phase) * 0.12;
  const lookAt = player.position.clone();
  lookAt.y = monster.position.y + 3;
  monster.lookAt(lookAt);
}

function updatePlayer(delta) {
  let horizontal = joystick.x;
  let forward = -joystick.y;
  if (keys.KeyA || keys.ArrowLeft) horizontal -= 1;
  if (keys.KeyD || keys.ArrowRight) horizontal += 1;
  if (keys.KeyW || keys.ArrowUp) forward += 1;
  if (keys.KeyS || keys.ArrowDown) forward -= 1;

  const magnitude = Math.hypot(horizontal, forward);
  if (magnitude > 1) {
    horizontal /= magnitude;
    forward /= magnitude;
  }

  if (Math.abs(horizontal) > 0.01 || Math.abs(forward) > 0.01) {
    const forwardVector = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const rightVector = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const movement = forwardVector.multiplyScalar(forward).add(rightVector.multiplyScalar(horizontal));
    player.position.addScaledVector(movement, 8.4 * delta);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -31, 31);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -47, 30);
    camera.position.y = PLAYER_EYE_HEIGHT + Math.sin(performance.now() * 0.012) * 0.025;
  } else {
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, PLAYER_EYE_HEIGHT, 0.12);
  }
}

function updateTimer(delta) {
  if (changingLevel || level === BOSS_LEVEL) return;
  timeRemaining = Math.max(0, timeRemaining - delta);
  updateTimerDisplay(false);
  if (timeRemaining <= 0) endGame(false);
}

function updateTimerDisplay(force) {
  if (level === BOSS_LEVEL) {
    timeValue.textContent = '∞';
    return;
  }
  const displayed = Math.ceil(timeRemaining);
  if (!force && displayed === lastDisplayedSecond) return;
  lastDisplayedSecond = displayed;
  timeValue.textContent = String(displayed);
  timerStat.classList.toggle('danger', displayed <= 10);
  if (displayed <= 10 && displayed > 0 && !force) playSound('tick');
}

function endGame(completed) {
  if (!playing) return;
  playing = false;
  changingLevel = false;
  bossWaveLocked = false;
  clearLevelObjects();
  timerStat.classList.remove('danger', 'boss-time');
  bossHud.classList.add('hidden');
  endTitle.textContent = completed ? '🏆 大怪獸被擊倒！' : '⏰ 本關時間到！';
  const completedLevels = completed ? TOTAL_LEVELS : Math.max(0, level - 1);
  endSummary.innerHTML = `程度${currentConfig().chinese}：完成 <strong>${completedLevels}/${TOTAL_LEVELS}</strong> 關，總分 <strong>${score}</strong> 分。`;
  endOverlay.classList.remove('hidden');
  if (!completed) playSound('end');
}

function clearLevelObjects() {
  monsters.forEach((monster) => disposeObject(monster));
  enemyProjectiles.forEach((projectile) => disposeObject(projectile.object));
  playerArrows.forEach((arrow) => {
    if (arrow.object?.parent) disposeObject(arrow.object);
  });
  monsters = [];
  targetObjects = [];
  enemyProjectiles = [];
  playerArrows = [];
  boss = null;
}

function removeSmallMonsters() {
  const smallMonsters = monsters.filter((monster) => !monster.userData.isBoss);
  smallMonsters.forEach((monster) => disposeObject(monster));
  monsters = monsters.filter((monster) => monster.userData.isBoss);
  targetObjects = boss?.userData.targets ? [...boss.userData.targets] : [];
  playerArrows = playerArrows.filter((arrow) => {
    const keep = arrow.object?.parent === boss;
    if (!keep && arrow.object?.parent) disposeObject(arrow.object);
    return keep;
  });
}

function findMonsterRoot(object) {
  let current = object;
  while (current) {
    if (current.userData?.isMonster) return current;
    current = current.parent;
  }
  return null;
}

function showFeedback(message, type, duration) {
  feedbackCard.textContent = message;
  feedbackCard.classList.remove('good', 'bad', 'show');
  feedbackCard.classList.add(type, 'show');
  clearTimeout(showFeedback.timeoutId);
  showFeedback.timeoutId = setTimeout(() => feedbackCard.classList.remove('show'), duration);
}

function flashDamage() {
  damageFlash.classList.remove('flash');
  void damageFlash.offsetWidth;
  damageFlash.classList.add('flash');
}

function ensureAudio() {
  if (audioContext) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (AudioContextClass) audioContext = new AudioContextClass();
}

function playSound(type) {
  if (!audioContext) return;
  if (audioContext.state === 'suspended') audioContext.resume();
  const start = audioContext.currentTime;
  const gain = audioContext.createGain();
  gain.connect(audioContext.destination);
  gain.gain.setValueAtTime(0.0001, start);

  const tone = (frequency, delay, duration, volume, wave = 'sine') => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start + delay);
    oscillator.connect(gain);
    gain.gain.exponentialRampToValueAtTime(volume, start + delay + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + duration);
    oscillator.start(start + delay);
    oscillator.stop(start + delay + duration + 0.02);
  };

  if (type === 'shoot') tone(220, 0, 0.11, 0.08, 'triangle');
  if (type === 'wrong') tone(125, 0, 0.22, 0.11, 'sawtooth');
  if (type === 'tick') tone(740, 0, 0.07, 0.04, 'square');
  if (type === 'end') tone(210, 0, 0.25, 0.07, 'triangle');
  if (type === 'monsterShoot') tone(165, 0, 0.13, 0.055, 'square');
  if (type === 'bossShoot') {
    tone(105, 0, 0.2, 0.075, 'sawtooth');
    tone(155, 0.05, 0.23, 0.06, 'square');
  }
  if (type === 'playerHit') {
    tone(105, 0, 0.18, 0.1, 'sawtooth');
    tone(75, 0.08, 0.22, 0.08, 'sawtooth');
  }
  if (type === 'correct') {
    tone(520, 0, 0.12, 0.08);
    tone(690, 0.12, 0.18, 0.09);
  }
  if (type === 'victory') {
    tone(440, 0, 0.14, 0.07);
    tone(554, 0.14, 0.14, 0.08);
    tone(659, 0.28, 0.28, 0.09);
  }
}

function updateCameraRotation() {
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}

function gameLoop() {
  const delta = Math.min(clock.getDelta(), 0.05);
  shootCooldown = Math.max(0, shootCooldown - delta);
  bossHitMessageCooldown = Math.max(0, bossHitMessageCooldown - delta);

  if (playing) {
    updatePlayer(delta);
    updateMonsters(delta);
    updateMonsterAttacks(delta);
    updateEnemyProjectiles(delta);
    updateTimer(delta);
    updatePlayerArrows(delta);
  } else {
    updateMonsters(delta * 0.35);
    updatePlayerArrows(delta);
  }
  renderer.render(scene, camera);
}

(() => {
  'use strict';

  const PLAYER_EYE_HEIGHT = 1.7;
  const LEVEL_TIME_SECONDS = 60;
  const TIME_PENALTY_SECONDS = 5;
  const FIRST_ATTACK_LEVEL = 6;
  const TOTAL_LEVELS = 10;

  const canvas = document.getElementById('gameCanvas');
  const scoreValue = document.getElementById('scoreValue');
  const levelValue = document.getElementById('levelValue');
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
  const endTitle = document.getElementById('endTitle');
  const endSummary = document.getElementById('endSummary');
  const damageFlash = document.getElementById('damageFlash');

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

  let playing = false;
  let changingLevel = false;
  let level = 1;
  let score = 0;
  let timeRemaining = LEVEL_TIME_SECONDS;
  let lastDisplayedSecond = LEVEL_TIME_SECONDS;
  let yaw = 0;
  let pitch = -0.04;
  let shootCooldown = 0;
  let attackCooldown = 999;

  const keys = Object.create(null);
  const joystick = { x: 0, y: 0, pointerId: null };
  const lookDrag = { active: false, pointerId: null, lastX: 0, lastY: 0 };

  init();
  bindControls();
  currentQuestion = generateQuestion(1);
  renderQuestion(currentQuestion);
  renderer.setAnimationLoop(gameLoop);

  function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ed3f2);
    scene.fog = new THREE.Fog(0x9ad9f1, 28, 83);

    camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 140);
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
    raycaster.far = 65;

    player = new THREE.Object3D();
    player.position.set(0, 0, 18);
    scene.add(player);
    player.add(camera);
    camera.position.set(0, PLAYER_EYE_HEIGHT, 0);

    scene.add(new THREE.HemisphereLight(0xdff5ff, 0x4f7d3d, 2.15));

    const sun = new THREE.DirectionalLight(0xfff4d4, 2.4);
    sun.position.set(-16, 30, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -35;
    sun.shadow.camera.right = 35;
    sun.shadow.camera.top = 35;
    sun.shadow.camera.bottom = -35;
    scene.add(sun);

    createWorld();
    createBow();
    updateCameraRotation();
    window.addEventListener('resize', resize);
  }

  function createWorld() {
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(130, 130),
      new THREE.MeshStandardMaterial({ color: 0x5bb94e, roughness: 1 })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.04;
    grass.receiveShadow = true;
    scene.add(grass);

    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 78),
      new THREE.MeshStandardMaterial({ color: 0xd4ab69, roughness: 1 })
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, -15);
    path.receiveShadow = true;
    scene.add(path);

    const mountainMaterial = new THREE.MeshStandardMaterial({
      color: 0x789d73,
      roughness: 1,
      flatShading: true
    });

    for (let index = 0; index < 9; index += 1) {
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(10 + Math.random() * 9, 16 + Math.random() * 9, 5),
        mountainMaterial
      );
      mountain.position.set(index * 13 - 50, 6.5, -55 - Math.random() * 12);
      mountain.rotation.y = Math.random() * Math.PI;
      scene.add(mountain);
    }

    const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78 });
    for (let cloudIndex = 0; cloudIndex < 8; cloudIndex += 1) {
      const cloud = new THREE.Group();
      const scale = 0.8 + Math.random() * 1.1;
      for (let part = 0; part < 4; part += 1) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.5 - part * 0.11, 18, 12), cloudMaterial);
        puff.position.set((part - 1.5) * 1.65, -Math.abs(part - 1.5) * 0.18, 0);
        cloud.add(puff);
      }
      cloud.scale.setScalar(scale);
      cloud.position.set(Math.random() * 76 - 38, 19 + Math.random() * 9, -30 - Math.random() * 38);
      scene.add(cloud);
    }

    const treeColors = [0x2f8521, 0x3b9825, 0x277b2d, 0x4a9b2e];
    for (let treeIndex = 0; treeIndex < 86; treeIndex += 1) {
      const side = treeIndex % 2 === 0 ? -1 : 1;
      const z = 23 - Math.random() * 78;
      const x = side * (12 + Math.random() * 40);
      const scale = 0.7 + Math.random() * 1.5;
      const tree = createTree(treeColors[treeIndex % treeColors.length], scale);
      tree.position.set(x, 0, z);
      tree.rotation.y = Math.random() * Math.PI * 2;
      scene.add(tree);
    }

    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x8f6d37, roughness: 1 });
    for (const side of [-1, 1]) {
      for (let post = 0; post < 13; post += 1) {
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.4, 0.22), postMaterial);
        marker.position.set(side * 10.2, 0.7, 14 - post * 4.4);
        marker.castShadow = true;
        scene.add(marker);
      }
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
    level = 1;
    score = 0;
    yaw = 0;
    pitch = -0.04;
    player.position.set(0, 0, 18);
    updateCameraRotation();
    scoreValue.textContent = String(score);
    loadLevel();
    clock.getDelta();
  }

  function loadLevel() {
    clearLevelObjects();
    changingLevel = false;
    timeRemaining = LEVEL_TIME_SECONDS;
    lastDisplayedSecond = LEVEL_TIME_SECONDS;
    timeValue.textContent = String(LEVEL_TIME_SECONDS);
    timerStat.classList.remove('danger');
    levelValue.textContent = String(level);
    player.position.set(0, 0, 18);
    yaw = 0;
    pitch = -0.04;
    updateCameraRotation();
    currentQuestion = generateQuestion(level);
    renderQuestion(currentQuestion);
    spawnMonsters(currentQuestion.options);
    attackCooldown = level >= FIRST_ATTACK_LEVEL ? nextAttackDelay() : 999;
    if (level >= FIRST_ATTACK_LEVEL) {
      showFeedback(`第 ${level} 關：怪獸會攻擊！被擊中扣 ${TIME_PENALTY_SECONDS} 秒。`, 'bad', 1900);
    } else {
      showFeedback(`第 ${level} 關：每關有 ${LEVEL_TIME_SECONDS} 秒，答對後時間重設。`, 'good', 1500);
    }
  }

  function spawnMonsters(options) {
    const positions = [
      new THREE.Vector3(-7.8, 0, -10),
      new THREE.Vector3(-2.5, 0, -15),
      new THREE.Vector3(3, 0, -12),
      new THREE.Vector3(8.1, 0, -18)
    ];
    const colors = [0xe85c58, 0x6d67d8, 0x2da976, 0xf09d38];
    options.forEach((answer, index) => {
      const monster = createMonster(answer, colors[index % colors.length], index);
      monster.position.copy(positions[index]);
      monster.position.x += (Math.random() - 0.5) * 2.2;
      monster.position.z += (Math.random() - 0.5) * 2.5;
      scene.add(monster);
      monsters.push(monster);
    });
  }

  function createMonster(answer, color, index) {
    const monster = new THREE.Group();
    monster.userData.isMonster = true;
    monster.userData.answer = answer;
    monster.userData.isCorrect = sameFraction(answer, currentQuestion.answer);
    monster.userData.alive = true;
    monster.userData.phase = Math.random() * Math.PI * 2;
    monster.userData.baseY = 0;
    monster.userData.speed = 1.25 + Math.random() * 0.8 + level * 0.035;
    const heading = Math.PI + (Math.random() - 0.5) * 1.2;
    monster.userData.velocity = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading)).normalize();
    monster.userData.turnTimer = 1.2 + Math.random() * 2.5;

    const skin = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02 });
    const bellyMaterial = new THREE.MeshStandardMaterial({ color: 0xffe9bd, roughness: 0.85 });
    const hornMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2820, roughness: 0.65 });
    const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
    const pupil = new THREE.MeshStandardMaterial({ color: 0x161b20, roughness: 0.5 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(1.08, 22, 17), skin);
    body.scale.y = 1.18;
    body.position.y = 1.28;
    body.castShadow = true;
    body.receiveShadow = true;
    registerTarget(body, monster);
    monster.add(body);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 14), bellyMaterial);
    belly.scale.set(1, 1.1, 0.32);
    belly.position.set(0, 1.2, 0.89);
    registerTarget(belly, monster);
    monster.add(belly);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.78, 22, 16), skin);
    head.position.y = 2.55;
    head.castShadow = true;
    registerTarget(head, monster);
    monster.add(head);

    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.6, 9), hornMaterial);
      horn.position.set(side * 0.48, 3.22, 0);
      horn.rotation.z = -side * 0.25;
      horn.castShadow = true;
      registerTarget(horn, monster);
      monster.add(horn);
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), eyeWhite);
      white.position.set(side * 0.27, 2.68, 0.68);
      monster.add(white);
      const black = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), pupil);
      black.position.set(side * 0.27, 2.67, 0.83);
      monster.add(black);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.05, 10), skin);
      arm.position.set(side * 1.12, 1.38, 0);
      arm.rotation.z = -side * 0.62;
      arm.castShadow = true;
      registerTarget(arm, monster);
      monster.add(arm);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.8, 10), hornMaterial);
      leg.position.set(side * 0.43, 0.3, 0);
      leg.castShadow = true;
      registerTarget(leg, monster);
      monster.add(leg);
    }

    const mouthPoints = new THREE.EllipseCurve(0, 0, 0.22, 0.12, Math.PI * 0.15, Math.PI * 0.85, false, 0)
      .getPoints(16)
      .map((point) => new THREE.Vector3(point.x, point.y, 0));
    const mouth = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(mouthPoints),
      new THREE.LineBasicMaterial({ color: 0x4d292f })
    );
    mouth.position.set(0, 2.31, 0.76);
    monster.add(mouth);

    const fractionLabel = createFractionLabel(answer, color);
    fractionLabel.position.set(0, 1.26, 1.24);
    fractionLabel.userData.monsterRoot = monster;
    monster.add(fractionLabel);
    targetObjects.push(fractionLabel);
    monster.rotation.y = index % 2 === 0 ? 0.12 : -0.12;
    return monster;
  }

  function createFractionLabel(answer, color) {
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 400;
    const context = labelCanvas.getContext('2d');
    const borderColor = `#${color.toString(16).padStart(6, '0')}`;
    roundedRect(context, 28, 28, 456, 344, 68);
    context.fillStyle = 'rgba(255,255,255,0.97)';
    context.fill();
    context.lineWidth = 24;
    context.strokeStyle = borderColor;
    context.stroke();
    context.fillStyle = '#17324f';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '900 120px Arial, sans-serif';
    context.fillText(String(answer.n), 256, 126);
    context.fillRect(138, 193, 236, 12);
    context.fillText(String(answer.d), 256, 280);
    const texture = new THREE.CanvasTexture(labelCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 1.56, 1);
    return sprite;
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function registerTarget(object, monster) {
    object.userData.monsterRoot = monster;
    targetObjects.push(object);
  }

  function shoot() {
    if (!playing || changingLevel || shootCooldown > 0) return;
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
    const direction = new THREE.Vector3();
    camera.getWorldPosition(origin);
    direction.copy(raycaster.ray.direction);
    let hitMonster = null;
    let hitPoint = origin.clone().add(direction.clone().multiplyScalar(48));
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
      duration: Math.max(0.16, Math.min(0.34, origin.distanceTo(hitPoint) / 85)),
      hitMonster,
      stuck: false,
      removeAfter: hitMonster ? null : 0.55
    });
  }

  function createArrowModel() {
    const group = new THREE.Group();
    const shaftMaterial = new THREE.MeshStandardMaterial({ color: 0x7b4b28, roughness: 0.72 });
    const tipMaterial = new THREE.MeshStandardMaterial({ color: 0xe8edf1, metalness: 0.7, roughness: 0.3 });
    const featherMaterial = new THREE.MeshStandardMaterial({ color: 0xf45b55, roughness: 0.75, side: THREE.DoubleSide });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.25, 8), shaftMaterial);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = -0.68;
    shaft.castShadow = true;
    group.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.31, 8), tipMaterial);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.05;
    tip.castShadow = true;
    group.add(tip);
    for (const side of [-1, 1]) {
      const feather = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.32), featherMaterial);
      feather.position.set(side * 0.1, 0, -1.17);
      feather.rotation.z = side * 0.24;
      group.add(feather);
    }
    return group;
  }

  function updatePlayerArrows(delta) {
    playerArrows = playerArrows.filter((arrow) => {
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
            return playing;
          }
          arrow.stuck = true;
        }
      }
      if (!arrow.hitMonster) {
        arrow.removeAfter -= delta;
        if (arrow.removeAfter <= 0) {
          disposeObject(arrow.object);
          return false;
        }
      }
      return true;
    });
  }

  function resolveHit(monster) {
    if (!playing || changingLevel || !monster.userData.alive) return;
    if (monster.userData.isCorrect) {
      changingLevel = true;
      monster.userData.alive = false;
      score += 100 + Math.ceil(timeRemaining);
      scoreValue.textContent = String(score);
      playSound('correct');
      animateCorrectMonster(monster);
      showFeedback(
        `答對！${fractionText(currentQuestion.a)} ${currentQuestion.operator} ${fractionText(currentQuestion.b)} = ${fractionText(currentQuestion.answer)}`,
        'good',
        1200
      );
      setTimeout(() => {
        if (!playing) return;
        if (level >= TOTAL_LEVELS) endGame(true);
        else {
          level += 1;
          loadLevel();
        }
      }, 900);
    } else {
      applyTimePenalty(`答案錯誤！扣 ${TIME_PENALTY_SECONDS} 秒。`);
      playSound('wrong');
      monster.scale.set(0.88, 1.18, 0.88);
      setTimeout(() => { if (monster.parent) monster.scale.set(1, 1, 1); }, 180);
    }
  }

  function applyTimePenalty(message) {
    timeRemaining = Math.max(0, timeRemaining - TIME_PENALTY_SECONDS);
    updateTimerDisplay(true);
    flashDamage();
    showFeedback(message, 'bad', 1150);
    if (timeRemaining <= 0) endGame(false);
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

  function fireMonsterProjectile() {
    if (level < FIRST_ATTACK_LEVEL || !playing || changingLevel) return;
    const attackers = monsters.filter((monster) => monster.userData.alive && monster.parent);
    if (!attackers.length) return;
    const attacker = attackers[Math.floor(Math.random() * attackers.length)];
    const start = new THREE.Vector3();
    attacker.getWorldPosition(start);
    start.y += 2.1;
    const playerTarget = new THREE.Vector3();
    camera.getWorldPosition(playerTarget);
    const direction = playerTarget.clone().sub(start).normalize();
    const speed = 8.5 + level * 0.45;
    const orbMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3c38,
      emissive: 0x8f0909,
      emissiveIntensity: 2,
      roughness: 0.28
    });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), orbMaterial);
    orb.position.copy(start);
    scene.add(orb);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.045, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd05a, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = Math.PI / 2;
    orb.add(ring);
    enemyProjectiles.push({ object: orb, velocity: direction.multiplyScalar(speed), life: 6 });
    attacker.scale.set(1.18, 0.9, 1.18);
    setTimeout(() => { if (attacker.parent) attacker.scale.set(1, 1, 1); }, 170);
    playSound('monsterShoot');
  }

  function updateEnemyProjectiles(delta) {
    const playerPosition = new THREE.Vector3();
    camera.getWorldPosition(playerPosition);
    enemyProjectiles = enemyProjectiles.filter((projectile) => {
      projectile.life -= delta;
      projectile.object.position.addScaledVector(projectile.velocity, delta);
      projectile.object.rotation.x += delta * 5;
      projectile.object.rotation.y += delta * 7;
      if (projectile.object.position.distanceTo(playerPosition) < 0.95) {
        disposeObject(projectile.object);
        playSound('playerHit');
        applyTimePenalty(`被怪獸擊中！扣 ${TIME_PENALTY_SECONDS} 秒。`);
        return false;
      }
      if (projectile.life <= 0 || projectile.object.position.length() > 120) {
        disposeObject(projectile.object);
        return false;
      }
      return true;
    });
  }

  function updateMonsterAttacks(delta) {
    if (level < FIRST_ATTACK_LEVEL || changingLevel) return;
    attackCooldown -= delta;
    if (attackCooldown <= 0) {
      fireMonsterProjectile();
      attackCooldown = nextAttackDelay();
    }
  }

  function nextAttackDelay() {
    const base = Math.max(2.1, 4.6 - (level - FIRST_ATTACK_LEVEL) * 0.42);
    return base + Math.random() * 1.2;
  }

  function updateMonsters(delta) {
    const time = performance.now() * 0.001;
    monsters.forEach((monster, index) => {
      if (!monster.userData.alive || changingLevel) return;
      monster.userData.turnTimer -= delta;
      if (monster.userData.turnTimer <= 0) {
        monster.userData.turnTimer = 1.1 + Math.random() * 2.7;
        monster.userData.velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 1.5).normalize();
      }
      const velocity = monster.userData.velocity;
      monster.position.addScaledVector(velocity, monster.userData.speed * delta);
      if (monster.position.x < -10.5 || monster.position.x > 10.5) {
        velocity.x *= -1;
        monster.position.x = THREE.MathUtils.clamp(monster.position.x, -10.5, 10.5);
      }
      if (monster.position.z < -29 || monster.position.z > -5.5) {
        velocity.z *= -1;
        monster.position.z = THREE.MathUtils.clamp(monster.position.z, -29, -5.5);
      }
      monster.rotation.y = Math.atan2(velocity.x, velocity.z) + Math.PI;
      monster.position.y = monster.userData.baseY + Math.sin(time * 4.2 + monster.userData.phase + index) * 0.09;
      if (monster.position.distanceTo(player.position) < 4.3) {
        const away = monster.position.clone().sub(player.position).setY(0).normalize();
        monster.position.addScaledVector(away, 2.5 * delta);
        velocity.copy(away);
      }
    });
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
      player.position.addScaledVector(movement, 7.2 * delta);
      player.position.x = THREE.MathUtils.clamp(player.position.x, -21, 21);
      player.position.z = THREE.MathUtils.clamp(player.position.z, -35, 23);
      camera.position.y = PLAYER_EYE_HEIGHT + Math.sin(performance.now() * 0.012) * 0.025;
    } else camera.position.y = THREE.MathUtils.lerp(camera.position.y, PLAYER_EYE_HEIGHT, 0.12);
  }

  function updateTimer(delta) {
    if (changingLevel) return;
    timeRemaining = Math.max(0, timeRemaining - delta);
    updateTimerDisplay(false);
    if (timeRemaining <= 0) endGame(false);
  }

  function updateTimerDisplay(force) {
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
    clearLevelObjects();
    timerStat.classList.remove('danger');
    endTitle.textContent = completed ? '🏆 十關全破！' : '⏰ 本關時間到！';
    const completedLevels = completed ? TOTAL_LEVELS : Math.max(0, level - 1);
    endSummary.innerHTML = `你完成了 <strong>${completedLevels}/${TOTAL_LEVELS}</strong> 關，總分 <strong>${score}</strong> 分。`;
    endOverlay.classList.remove('hidden');
    playSound(completed ? 'victory' : 'end');
  }

  function clearLevelObjects() {
    monsters.forEach((monster) => disposeObject(monster));
    enemyProjectiles.forEach((projectile) => disposeObject(projectile.object));
    playerArrows.forEach((arrow) => { if (arrow.object.parent === scene) disposeObject(arrow.object); });
    monsters = [];
    targetObjects = [];
    enemyProjectiles = [];
    playerArrows = [];
  }

  function disposeObject(object) {
    if (!object) return;
    if (object.parent) object.parent.remove(object);
    object.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (material.map) material.map.dispose();
          material.dispose();
        });
      }
    });
  }

  function findMonsterRoot(object) {
    let current = object;
    while (current) {
      if (current.userData && current.userData.isMonster) return current;
      current = current.parent;
    }
    return null;
  }

  function renderQuestion(question) {
    questionCard.innerHTML = `${fractionHTML(question.a)}<span>${question.operator}</span>${fractionHTML(question.b)}<span>= ?</span>`;
  }

  function fractionHTML(fraction) {
    return `<span class="fraction" aria-label="${fraction.d} 分之 ${fraction.n}"><span>${fraction.n}</span><span class="bar"></span><span>${fraction.d}</span></span>`;
  }

  function generateQuestion(currentLevel) {
    if (currentLevel === 1) {
      const a = simplifyFraction(2, 3);
      const b = simplifyFraction(1, 6);
      const answer = simplifyFraction(5, 6);
      return { a, b, operator: '+', answer, options: shuffle([answer, simplifyFraction(3, 6), simplifyFraction(3, 9), simplifyFraction(3, 4)]) };
    }
    let a;
    let b;
    let operator;
    let answer;
    let attempts = 0;
    do {
      attempts += 1;
      const maxDenominator = Math.min(12, 6 + Math.floor(currentLevel / 2));
      const denominatorA = randomInt(2, maxDenominator);
      let denominatorB = randomInt(2, maxDenominator);
      if (currentLevel >= 3 && denominatorA === denominatorB) denominatorB = denominatorB === maxDenominator ? denominatorB - 1 : denominatorB + 1;
      a = simplifyFraction(randomInt(1, denominatorA - 1), denominatorA);
      b = simplifyFraction(randomInt(1, denominatorB - 1), denominatorB);
      operator = currentLevel < 4 || Math.random() < 0.58 ? '+' : '−';
      if (operator === '−' && fractionValue(a) < fractionValue(b)) [a, b] = [b, a];
      answer = simplifyFraction(
        operator === '+' ? a.n * b.d + b.n * a.d : a.n * b.d - b.n * a.d,
        a.d * b.d
      );
    } while ((answer.n <= 0 || answer.n > 24 || answer.d > 20) && attempts < 80);
    return { a, b, operator, answer, options: generateOptions(answer) };
  }

  function generateOptions(answer) {
    const unique = new Map();
    const add = (fraction) => {
      if (!fraction || fraction.n <= 0 || fraction.d <= 0 || fraction.n > 30 || fraction.d > 24) return;
      const simplified = simplifyFraction(fraction.n, fraction.d);
      unique.set(fractionText(simplified), simplified);
    };
    add(answer);
    add(simplifyFraction(answer.n + 1, answer.d));
    if (answer.n > 1) add(simplifyFraction(answer.n - 1, answer.d));
    add(simplifyFraction(answer.n, answer.d + 1));
    if (answer.d > 2) add(simplifyFraction(answer.n, answer.d - 1));
    add(simplifyFraction(answer.n + answer.d, answer.d));
    add(simplifyFraction(answer.n + 2, answer.d + 1));
    let attempts = 0;
    while (unique.size < 4 && attempts < 200) {
      attempts += 1;
      add(simplifyFraction(Math.max(1, answer.n + randomInt(-3, 4)), Math.max(2, answer.d + randomInt(-3, 4))));
    }
    return shuffle(Array.from(unique.values()).slice(0, 4));
  }

  function simplifyFraction(numerator, denominator) {
    if (denominator === 0) return { n: 0, d: 1 };
    const sign = denominator < 0 ? -1 : 1;
    numerator *= sign;
    denominator = Math.abs(denominator);
    const divisor = greatestCommonDivisor(Math.abs(numerator), denominator) || 1;
    return { n: numerator / divisor, d: denominator / divisor };
  }

  function greatestCommonDivisor(a, b) {
    while (b !== 0) [a, b] = [b, a % b];
    return Math.abs(a);
  }

  function sameFraction(a, b) { return a.n * b.d === b.n * a.d; }
  function fractionValue(fraction) { return fraction.n / fraction.d; }
  function fractionText(fraction) { return `${fraction.n}/${fraction.d}`; }
  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function shuffle(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
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
    if (playing) {
      if (!changingLevel) {
        updatePlayer(delta);
        updateMonsters(delta);
        updateMonsterAttacks(delta);
        updateEnemyProjectiles(delta);
        updateTimer(delta);
      }
      updatePlayerArrows(delta);
    } else {
      updateMonsters(delta * 0.4);
      updatePlayerArrows(delta);
    }
    renderer.render(scene, camera);
  }
})();
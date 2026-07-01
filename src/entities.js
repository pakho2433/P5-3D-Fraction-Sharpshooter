import { displayModeFor, mixedParts } from './fractions.js';

const THREE = window.THREE;

function registerTarget(object, root, targets) {
  object.userData.monsterRoot = root;
  targets.push(object);
}

export function createSmallMonster({ answer, answerMode, color, index, stage }) {
  const monster = new THREE.Group();
  const targets = [];
  monster.userData.isMonster = true;
  monster.userData.isBoss = false;
  monster.userData.answer = answer;
  monster.userData.alive = true;
  monster.userData.phase = Math.random() * Math.PI * 2;
  monster.userData.baseY = 0;
  monster.userData.speed = 1.35 + Math.random() * 0.9 + stage * 0.045;
  monster.userData.turnTimer = 0.8 + Math.random() * 2.2;
  const heading = Math.PI + (Math.random() - 0.5) * 1.9;
  monster.userData.velocity = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading)).normalize();

  const skin = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02 });
  const bellyMaterial = new THREE.MeshStandardMaterial({ color: 0xffe9bd, roughness: 0.85 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x28231e, roughness: 0.66 });
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
  const pupil = new THREE.MeshStandardMaterial({ color: 0x15191f, roughness: 0.5 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.08, 22, 17), skin);
  body.scale.y = 1.18;
  body.position.y = 1.28;
  body.castShadow = true;
  body.receiveShadow = true;
  registerTarget(body, monster, targets);
  monster.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 14), bellyMaterial);
  belly.scale.set(1, 1.1, 0.32);
  belly.position.set(0, 1.2, 0.89);
  registerTarget(belly, monster, targets);
  monster.add(belly);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.78, 22, 16), skin);
  head.position.y = 2.55;
  head.castShadow = true;
  registerTarget(head, monster, targets);
  monster.add(head);

  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.6, 9), darkMaterial);
    horn.position.set(side * 0.48, 3.22, 0);
    horn.rotation.z = -side * 0.25;
    horn.castShadow = true;
    registerTarget(horn, monster, targets);
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
    registerTarget(arm, monster, targets);
    monster.add(arm);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.8, 10), darkMaterial);
    leg.position.set(side * 0.43, 0.3, 0);
    leg.castShadow = true;
    registerTarget(leg, monster, targets);
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

  const answerSprite = createAnswerSprite(answer, answerMode, color);
  answerSprite.position.set(0, 1.28, 1.24);
  answerSprite.userData.monsterRoot = monster;
  monster.add(answerSprite);
  targets.push(answerSprite);

  monster.rotation.y = index % 2 === 0 ? 0.12 : -0.12;
  monster.userData.targets = targets;
  return monster;
}

export function createBossMonster() {
  const boss = new THREE.Group();
  const targets = [];
  boss.userData.isMonster = true;
  boss.userData.isBoss = true;
  boss.userData.alive = true;
  boss.userData.phase = Math.random() * Math.PI * 2;
  boss.userData.velocity = new THREE.Vector3(1, 0, 0);
  boss.userData.turnTimer = 2;
  boss.userData.speed = 0.72;

  const skin = new THREE.MeshStandardMaterial({
    color: 0x7c218f,
    emissive: 0x26002d,
    emissiveIntensity: 0.45,
    roughness: 0.58,
    metalness: 0.08
  });
  const bellyMaterial = new THREE.MeshStandardMaterial({ color: 0xffbb55, roughness: 0.7 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x24152a, roughness: 0.55 });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xff3c38,
    emissive: 0x8b0000,
    emissiveIntensity: 1.8
  });

  const body = new THREE.Mesh(new THREE.SphereGeometry(2.35, 28, 22), skin);
  body.scale.y = 1.35;
  body.position.y = 3.1;
  body.castShadow = true;
  body.receiveShadow = true;
  registerTarget(body, boss, targets);
  boss.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(1.45, 24, 18), bellyMaterial);
  belly.scale.set(1, 1.18, 0.34);
  belly.position.set(0, 2.85, 2.08);
  registerTarget(belly, boss, targets);
  boss.add(belly);

  const head = new THREE.Mesh(new THREE.SphereGeometry(1.72, 26, 20), skin);
  head.position.y = 6.3;
  head.castShadow = true;
  registerTarget(head, boss, targets);
  boss.add(head);

  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.75, 10), darkMaterial);
    horn.position.set(side * 1.2, 8.0, 0);
    horn.rotation.z = -side * 0.32;
    horn.castShadow = true;
    registerTarget(horn, boss, targets);
    boss.add(horn);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), eyeMaterial);
    eye.position.set(side * 0.65, 6.58, 1.5);
    registerTarget(eye, boss, targets);
    boss.add(eye);

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.48, 2.8, 12), skin);
    arm.position.set(side * 2.75, 3.35, 0);
    arm.rotation.z = -side * 0.78;
    arm.castShadow = true;
    registerTarget(arm, boss, targets);
    boss.add(arm);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.56, 1.8, 12), darkMaterial);
    leg.position.set(side * 1.0, 0.72, 0);
    leg.castShadow = true;
    registerTarget(leg, boss, targets);
    boss.add(leg);
  }

  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 1.6, 5),
    new THREE.MeshStandardMaterial({ color: 0xffd341, metalness: 0.45, roughness: 0.35 })
  );
  crown.position.y = 8.2;
  crown.rotation.y = Math.PI / 5;
  registerTarget(crown, boss, targets);
  boss.add(crown);

  boss.userData.targets = targets;
  return boss;
}

export function createAnswerSprite(answer, preferredMode, color) {
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 640;
  labelCanvas.height = 420;
  const context = labelCanvas.getContext('2d');
  const borderColor = `#${color.toString(16).padStart(6, '0')}`;

  roundedRect(context, 34, 28, 572, 360, 72);
  context.fillStyle = 'rgba(255,255,255,0.98)';
  context.fill();
  context.lineWidth = 24;
  context.strokeStyle = borderColor;
  context.stroke();
  context.fillStyle = '#17324f';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const mode = displayModeFor(answer, preferredMode);
  if (mode === 'integer') {
    context.font = '900 198px Arial, sans-serif';
    context.fillText(String(answer.n), 320, 210);
  } else if (mode === 'mixed') {
    const parts = mixedParts(answer);
    const sign = parts.sign < 0 ? '-' : '';
    context.font = '900 168px Arial, sans-serif';
    context.fillText(`${sign}${parts.whole}`, 190, 213);
    context.font = '900 100px Arial, sans-serif';
    context.fillText(String(parts.remainder), 430, 135);
    context.fillRect(355, 207, 150, 11);
    context.fillText(String(parts.denominator), 430, 287);
  } else {
    context.font = '900 122px Arial, sans-serif';
    context.fillText(String(answer.n), 320, 132);
    context.fillRect(200, 205, 240, 12);
    context.fillText(String(answer.d), 320, 290);
  }

  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.35, 1.54, 1);
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

export function createArrowModel() {
  const group = new THREE.Group();
  const shaftMaterial = new THREE.MeshStandardMaterial({ color: 0x7b4b28, roughness: 0.72 });
  const tipMaterial = new THREE.MeshStandardMaterial({ color: 0xe8edf1, metalness: 0.7, roughness: 0.3 });
  const featherMaterial = new THREE.MeshStandardMaterial({
    color: 0xf45b55,
    roughness: 0.75,
    side: THREE.DoubleSide
  });

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

export function createEnergyProjectile({ position, color, radius = 0.3 }) {
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.7,
    roughness: 0.25
  });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material);
  orb.position.copy(position);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.38, radius * 0.15, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe45b, transparent: true, opacity: 0.85 })
  );
  ring.rotation.x = Math.PI / 2;
  orb.add(ring);
  return orb;
}

export function disposeObject(object) {
  if (!object) return;
  if (object.parent) object.parent.remove(object);
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (!child.material) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (material.map) material.map.dispose();
      material.dispose();
    });
  });
}

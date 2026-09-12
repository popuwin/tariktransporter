import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const COLOR_PALETTE = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6BCB77", "#4D96FF", "#C780FA", "#F59E0B", "#14B8A6"];

function easeOutBounce(x) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

function makeTextSprite(text, background = "rgba(15,23,42,0.86)") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Sprite();

  ctx.fillStyle = background;
  ctx.roundRect?.(8, 8, 240, 80, 10);
  if (!ctx.roundRect) {
    ctx.fillRect(8, 8, 240, 80);
  } else {
    ctx.fill();
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Manrope, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 50);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.72, 0.27, 1);
  return sprite;
}

export class SprinterViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error("Контейнер для 3D-вьюера не найден");

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8fafc);

    this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 100);
    this.camera.position.set(5.5, 3.8, 5.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.target.set(1.6, 0.8, 0.89);

    this.vehicleGroup = new THREE.Group();
    this.cargoGroup = new THREE.Group();
    this.gridGroup = new THREE.Group();
    this.streetGroup = new THREE.Group();
    this.scene.add(this.streetGroup, this.gridGroup, this.vehicleGroup, this.cargoGroup);

    this.vehicleWalls = [];
    this.explodeFactor = 0;
    this.dim = { length: 3.2, width: 1.78, height: 1.94, maxWeight: 1500 };
    this.cameraTween = null;
    this.dropAnimations = [];
    this.pulseItems = [];

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hovered = null;

    this.tooltip = document.createElement("div");
    this.tooltip.style.position = "absolute";
    this.tooltip.style.pointerEvents = "none";
    this.tooltip.style.padding = "6px 8px";
    this.tooltip.style.fontSize = "12px";
    this.tooltip.style.borderRadius = "8px";
    this.tooltip.style.color = "#fff";
    this.tooltip.style.background = "rgba(15,23,42,0.88)";
    this.tooltip.style.transform = "translate(-50%, -130%)";
    this.tooltip.style.display = "none";
    this.container.style.position = "relative";
    this.container.appendChild(this.tooltip);

    this.addLights();
    this.buildWarehouseStreet();
    this.attachEvents();
    this.loadVehicle(this.dim);

    this.animate = this.animate.bind(this);
    this._raf = requestAnimationFrame(this.animate);
  }

  addLights() {
    this.scene.add(new THREE.HemisphereLight(0xe2efff, 0x94a3b8, 0.65));
    const directional = new THREE.DirectionalLight(0xffffff, 0.9);
    directional.position.set(6, 9, 4);
    this.scene.add(directional);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  }

  buildWarehouseStreet() {
    this.streetGroup.clear();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 0xf1f5f9 }));
    floor.rotation.x = -Math.PI / 2;
    this.streetGroup.add(floor);

    const road = new THREE.Mesh(new THREE.PlaneGeometry(20, 3.5), new THREE.MeshStandardMaterial({ color: 0xcbd5e1 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(2.2, 0.001, 2.9);
    this.streetGroup.add(road);

    const warehouseA = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 2.4), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
    warehouseA.position.set(-5.4, 1.25, -5.2);
    const warehouseB = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.9, 2.8), new THREE.MeshStandardMaterial({ color: 0xdbe4ee }));
    warehouseB.position.set(5.6, 1.45, -4.6);
    const dock = new THREE.Mesh(new THREE.BoxGeometry(11, 0.8, 0.9), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    dock.position.set(0, 0.4, -6.1);
    this.streetGroup.add(warehouseA, warehouseB, dock);
  }

  loadVehicle(dimensions) {
    this.dim = { ...this.dim, ...dimensions };
    this.vehicleGroup.clear();
    this.gridGroup.clear();
    this.vehicleWalls = [];

    const L = this.dim.length;
    const W = this.dim.width;
    const H = this.dim.height;

    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      transmission: 0.9,
      roughness: 0.1,
      metalness: 0,
    });

    const edgeMat = new THREE.LineBasicMaterial({ color: 0x2277cc });

    const cargoOffsetX = 0.78;
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, H, W), shellMat.clone());
    body.position.set(cargoOffsetX + L / 2, H / 2 + 0.55, W / 2);
    const bodyEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L, H, W)), edgeMat);
    bodyEdges.position.copy(body.position);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(L, 0.08, W), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    floor.position.set(cargoOffsetX + L / 2, 0.51, W / 2);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(L, H), shellMat.clone());
    leftWall.position.set(cargoOffsetX + L / 2, H / 2 + 0.55, 0);
    leftWall.rotation.y = Math.PI / 2;
    const rightWall = leftWall.clone();
    rightWall.position.z = W;
    rightWall.rotation.y = -Math.PI / 2;

    const roof = new THREE.Mesh(new THREE.PlaneGeometry(L, W), shellMat.clone());
    roof.position.set(cargoOffsetX + L / 2, H + 0.55, W / 2);
    roof.rotation.x = Math.PI / 2;

    const rear = new THREE.Mesh(new THREE.PlaneGeometry(W, H), shellMat.clone());
    rear.position.set(cargoOffsetX, H / 2 + 0.55, W / 2);
    rear.rotation.y = Math.PI / 2;

    this.vehicleWalls.push(leftWall, rightWall, roof, rear);

    const rearDoorPts = [
      new THREE.Vector3(cargoOffsetX + 0.001, 0.55, 0),
      new THREE.Vector3(cargoOffsetX + 0.001, 0.55 + H, 0),
      new THREE.Vector3(cargoOffsetX + 0.001, 0.55 + H, W),
      new THREE.Vector3(cargoOffsetX + 0.001, 0.55, W),
      new THREE.Vector3(cargoOffsetX + 0.001, 0.55, 0),
    ];
    const rearDoor = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(rearDoorPts),
      new THREE.LineDashedMaterial({ color: 0x1e40af, dashSize: 0.12, gapSize: 0.08 })
    );
    rearDoor.computeLineDistances();

    const cabinBody = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.45, Math.min(1.82, W + 0.1)), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    cabinBody.position.set(cargoOffsetX - 0.7, 1.22, W / 2);

    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.72), new THREE.MeshStandardMaterial({ color: 0x9fb6ca, transparent: true, opacity: 0.45 }));
    windshield.position.set(cargoOffsetX - 1.18, 1.4, W / 2);
    windshield.rotation.y = Math.PI / 2;
    windshield.rotation.z = 0.42;

    const wheelPositions = [
      [cargoOffsetX + 0.55, 0.37, 0.16],
      [cargoOffsetX + 0.55, 0.37, W - 0.16],
      [cargoOffsetX + L - 0.55, 0.37, 0.16],
      [cargoOffsetX + L - 0.55, 0.37, W - 0.16],
    ];
    const wheels = wheelPositions.map((p) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.22, 24), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(p[0], p[1], p[2]);
      return wheel;
    });

    const archGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.08, 24, 1, true, 0, Math.PI);
    const archA = new THREE.Mesh(archGeo, new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
    archA.rotation.set(0, 0, Math.PI / 2);
    archA.position.set(cargoOffsetX + 0.55, 0.56, 0.06);
    const archB = archA.clone();
    archB.position.z = W - 0.06;
    const archC = archA.clone();
    archC.position.x = cargoOffsetX + L - 0.55;
    const archD = archB.clone();
    archD.position.x = cargoOffsetX + L - 0.55;

    this.vehicleGroup.add(body, bodyEdges, floor, leftWall, rightWall, roof, rear, rearDoor, cabinBody, windshield, archA, archB, archC, archD, ...wheels);
    this.vehicleGroup.position.set(-L / 2, 0, -W / 2);

    this.buildDimensionGrid(L, W, H, cargoOffsetX);
    this.controls.target.set(0.78 + L / 2 - L / 2, 1, 0);
    this.setCameraView("iso");
    this.animateVehicleAssemble();
  }

  buildDimensionGrid(L, W, H, cargoOffsetX) {
    const gridMat = new THREE.LineBasicMaterial({ color: 0xd7e2ee, transparent: true, opacity: 0.85 });
    const group = new THREE.Group();
    const startX = cargoOffsetX - L / 2;
    const startZ = -W / 2;
    for (let x = 0; x <= L + 0.001; x += 0.5) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(startX + x, 0.55, startZ),
        new THREE.Vector3(startX + x, H + 0.55, startZ),
      ]);
      group.add(new THREE.Line(g, gridMat));
    }
    for (let z = 0; z <= W + 0.001; z += 0.5) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(startX, 0.55, startZ + z),
        new THREE.Vector3(startX + L, 0.55, startZ + z),
      ]);
      group.add(new THREE.Line(g, gridMat));
    }
    for (let y = 0; y <= H + 0.001; y += 0.5) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(startX, 0.55 + y, startZ),
        new THREE.Vector3(startX, 0.55 + y, startZ + W),
      ]);
      group.add(new THREE.Line(g, gridMat));
    }

    const lenLabel = makeTextSprite(`${L.toFixed(2)} м`);
    lenLabel.position.set(startX + L / 2, 0.24, startZ - 0.22);
    const widLabel = makeTextSprite(`${W.toFixed(2)} м`);
    widLabel.position.set(startX - 0.32, 0.42, startZ + W / 2);
    const heiLabel = makeTextSprite(`${H.toFixed(2)} м`);
    heiLabel.position.set(startX - 0.26, 0.55 + H / 2, startZ - 0.34);

    const arrX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(startX, 0.12, startZ - 0.26), L, 0x1d4ed8, 0.16, 0.08);
    const arrZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(startX - 0.2, 0.2, startZ), W, 0x1d4ed8, 0.16, 0.08);
    const arrY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(startX - 0.2, 0.55, startZ - 0.2), H, 0x1d4ed8, 0.16, 0.08);

    group.add(lenLabel, widLabel, heiLabel, arrX, arrZ, arrY);
    this.gridGroup.add(group);
  }

  clearCargo() {
    const toRemove = [];
    this.cargoGroup.traverse((obj) => {
      if (obj.userData?.type === "cargo") toRemove.push(obj);
    });
    toRemove.forEach((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
      obj.parent?.remove(obj);
    });
    this.dropAnimations = [];
    this.pulseItems = [];
  }

  renderCargo(items) {
    this.clearCargo();
    const L = this.dim.length;
    const W = this.dim.width;
    const H = this.dim.height;

    items.forEach((item, index) => {
      const l = item.l;
      const w = item.w;
      const h = item.h;
      const color = item.fits === false ? "#ef4444" : item.color || COLOR_PALETTE[index % COLOR_PALETTE.length];

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(l, h, w),
        new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.85, emissive: 0x000000 })
      );

      const px = item.x + l / 2 - L / 2 + 0.78;
      const py = item.y + h / 2 + 0.55;
      const pz = item.z + w / 2 - W / 2;
      mesh.position.set(px, py + 2.5, pz);
      if (item.rotated) mesh.rotation.y = Math.PI / 2;

      mesh.userData = { type: "cargo", item };
      this.cargoGroup.add(mesh);

      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(l, h, w)), new THREE.LineBasicMaterial({ color: 0x0f172a }));
      edges.position.copy(mesh.position);
      edges.rotation.copy(mesh.rotation);
      edges.userData = { type: "cargo" };
      this.cargoGroup.add(edges);

      const number = makeTextSprite(String(index + 1), "rgba(30,41,59,0.92)");
      number.position.set(px, py + h / 2 + 0.12, pz);
      number.userData = { type: "cargo" };
      this.cargoGroup.add(number);

      this.dropAnimations.push({ mesh, edges, targetY: py, startY: py + 2.5, startedAt: performance.now() });
      if (item.fits === false) this.pulseItems.push(mesh);
    });
  }

  setCameraView(view) {
    const L = this.dim.length;
    const W = this.dim.width;
    const H = this.dim.height;
    const center = new THREE.Vector3(0.78, 0.55 + H / 2, 0);
    let pos = this.camera.position.clone();

    if (view === "top") pos = new THREE.Vector3(0.78, 5, 0);
    if (view === "side") pos = new THREE.Vector3(0.78, 0.55 + H / 2, 5);
    if (view === "back") pos = new THREE.Vector3(-5, 0.55 + H / 2, 0);
    if (view === "iso" || view === "reset") pos = new THREE.Vector3(L * 0.85, H * 1.25 + 0.8, W * 2.35);

    this.cameraTween = {
      fromPos: this.camera.position.clone(),
      toPos: pos,
      fromTarget: this.controls.target.clone(),
      toTarget: center,
      start: performance.now(),
      duration: 450,
    };
  }

  toggleGrid(visible) {
    this.gridGroup.visible = visible;
  }

  toggleTransparency(transparent) {
    const opacity = transparent ? 0.15 : 0.6;
    this.vehicleWalls.forEach((wall) => {
      wall.material.opacity = opacity;
      wall.material.needsUpdate = true;
    });
  }

  animateExplode(value = 1) {
    this.explodeFactor = Math.max(0, Math.min(1, value));
    const spread = 0.6 * this.explodeFactor;
    const [left, right, roof, rear] = this.vehicleWalls;
    if (!left || !right || !roof || !rear) return;
    left.position.z = -spread;
    right.position.z = this.dim.width + spread;
    roof.position.y = this.dim.height + 0.55 + spread;
    rear.position.x = 0.78 - spread;
  }

  attachEvents() {
    this.onResize = () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / Math.max(h, 1);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    this.onPointerMove = (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      if (window.innerWidth < 768) return;
      this.updateHover(event.clientX - rect.left, event.clientY - rect.top);
    };

    this.onClick = (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const hit = this.pickCargo();
      if (hit) {
        const p = hit.position.clone();
        const target = new THREE.Vector3(p.x + 1.7, p.y + 1.2, p.z + 2.2);
        this.cameraTween = {
          fromPos: this.camera.position.clone(),
          toPos: target,
          fromTarget: this.controls.target.clone(),
          toTarget: p,
          start: performance.now(),
          duration: 500,
        };
        if (window.innerWidth < 768) this.showTooltip(hit.userData.item, event.clientX - rect.left, event.clientY - rect.top);
      } else if (window.innerWidth < 768) {
        this.tooltip.style.display = "none";
      }
    };

    this.onDblClick = () => {
      this.setCameraView("reset");
    };

    this.onWheel = (event) => {
      if (window.innerWidth < 768) event.preventDefault();
    };

    window.addEventListener("resize", this.onResize);
    this.renderer.domElement.addEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.addEventListener("click", this.onClick);
    this.renderer.domElement.addEventListener("dblclick", this.onDblClick);
    this.renderer.domElement.addEventListener("wheel", this.onWheel, { passive: false });
  }

  pickCargo() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.cargoGroup.children, true);
    return hits.find((h) => h.object.userData?.type === "cargo" && h.object.userData?.item)?.object || null;
  }

  updateHover(localX, localY) {
    const hit = this.pickCargo();
    if (this.hovered && this.hovered !== hit) {
      this.hovered.material.emissive.setHex(0x000000);
      this.tooltip.style.display = "none";
    }
    this.hovered = hit;
    if (hit) {
      hit.material.emissive.setHex(0x1f2937);
      this.showTooltip(hit.userData.item, localX, localY);
    }
  }

  showTooltip(item, x, y) {
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
    this.tooltip.style.display = "block";
    this.tooltip.textContent = `${item.l.toFixed(2)}x${item.w.toFixed(2)}x${item.h.toFixed(2)} м, ${item.weight} кг`;
  }

  animateVehicleAssemble() {
    const start = performance.now();
    const duration = 800;
    const animated = [...this.vehicleWalls];
    animated.forEach((part) => {
      part.scale.set(0.01, 0.01, 0.01);
      part.material.opacity = 0;
    });

    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / duration);
      animated.forEach((part) => {
        part.scale.set(t, t, t);
        part.material.opacity = 0.15 * t;
      });
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  animate(now) {
    if (this.cameraTween) {
      const t = Math.min(1, (now - this.cameraTween.start) / this.cameraTween.duration);
      this.camera.position.lerpVectors(this.cameraTween.fromPos, this.cameraTween.toPos, t);
      this.controls.target.lerpVectors(this.cameraTween.fromTarget, this.cameraTween.toTarget, t);
      if (t >= 1) this.cameraTween = null;
    }

    this.dropAnimations = this.dropAnimations.filter((entry) => {
      const t = Math.min(1, (now - entry.startedAt) / 500);
      const bounce = easeOutBounce(t);
      const y = entry.startY + (entry.targetY - entry.startY) * bounce;
      entry.mesh.position.y = y;
      entry.edges.position.y = y;
      return t < 1;
    });

    this.pulseItems.forEach((mesh) => {
      if (mesh.material) mesh.material.opacity = 0.55 + Math.abs(Math.sin(now * 0.006)) * 0.35;
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(this.animate);
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener("resize", this.onResize);
    this.renderer.domElement.removeEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.removeEventListener("click", this.onClick);
    this.renderer.domElement.removeEventListener("dblclick", this.onDblClick);
    this.renderer.domElement.removeEventListener("wheel", this.onWheel);
    this.controls.dispose();
    this.clearCargo();
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    this.renderer.dispose();
    this.tooltip.remove();
    if (this.renderer.domElement.parentNode === this.container) this.container.removeChild(this.renderer.domElement);
  }
}
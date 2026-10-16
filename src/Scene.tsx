import { resourceModel } from "./resourceModels";
import {
  LAKE,
  riverX,
  riverLevel,
  shoreRadius,
  waterSurface,
} from "./hydrology";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useStore } from "./store";
import {
  arrivals,
  dropSamples,
  fireContour,
  fireSpine,
  fireOrigin,
  archiveLabel,
  CELL,
  DRONE_IDS,
  GRID,
  mulberry32,
  sampleDrone,
  sampleFire,
  sampleResource,
  resources,
  terrainVertex,
  TERRAIN_SEGMENTS,
  worldY,
} from "./simulation";

type Label = {
  el: HTMLButtonElement;
  pos: THREE.Vector3;
  id?: string;
  time?: number;
};
export function Scene() {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!host.current) return;
    const root = host.current;
    let renderer: THREE.WebGLRenderer;
    try {
      if (new URLSearchParams(location.search).has("noWebGL"))
        throw new Error("WebGL unavailable");
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      setError(
        "3D unavailable. Timeline and simulation data remain available.",
      );
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor("#a4b4b6");
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    root.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#a4b4b6");
    scene.fog = new THREE.Fog("#a4b4b6", 6, 15);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.015, 40);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 0.18;
    controls.maxDistance = 9;
    const reset = () => {
      camera.position.set(2.0, 3.1, 2.6);
      controls.target.set(-0.2, 0.55, -0.35);
      camera.up.set(0, 1, 0);
      camera.fov = 45;
      camera.updateProjectionMatrix();
      controls.update();
    };
    reset();
    scene.add(new THREE.HemisphereLight("#eeeade", "#4c452c", 1.12));
    const sun = new THREE.DirectionalLight("#fff4dc", 2.25);
    sun.position.set(-3, 5, 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -3;
    sun.shadow.camera.right = 3;
    sun.shadow.camera.top = 3;
    sun.shadow.camera.bottom = -3;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 12;
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = 0.004;
    scene.add(sun);
    const world = new THREE.Group();
    scene.add(world);
    const texture = new THREE.TextureLoader().load("/assets/alpine-ground.jpg");
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(22, 22);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    function terrain(size: number, segments: number) {
      const g = new THREE.PlaneGeometry(size, size, segments, segments);
      g.rotateX(-Math.PI / 2);
      const pos = g.attributes.position,
        colors = [];
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) * 1000,
          z = pos.getZ(i) * 1000,
          h = terrainVertex(x, z);
        pos.setY(i, ((h - 200) * 1.8) / 1000);
        const slope =
          Math.abs(terrainVertex(x + 15, z) - h) +
          Math.abs(terrainVertex(x, z + 15) - h);
        const c = new THREE.Color(
          slope > 24 ? "#b8ada0" : slope > 12 ? "#dbcaac" : "#c8b98f",
        );
        const valley = Math.max(
          0,
          (terrainVertex(x - 12, z) +
            terrainVertex(x + 12, z) +
            terrainVertex(x, z - 12) +
            terrainVertex(x, z + 12) -
            4 * h) /
            18,
        );
        c.multiplyScalar(
          (0.9 + Math.sin(x * 0.012 + z * 0.007) * 0.06) *
            (1 - Math.min(0.32, valley * 0.25)),
        );
        colors.push(c.r, c.g, c.b);
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      g.computeVertexNormals();
      return g;
    }
    const waters = new THREE.Group();
    world.add(waters);
    const waterMat = new THREE.MeshStandardMaterial({
      color: "#5b838a",
      roughness: 0.28,
      metalness: 0.22,
      side: THREE.DoubleSide,
    });
    const waterTime = { value: 0 };
    waterMat.onBeforeCompile = (shader) => {
      shader.uniforms.waterTime = waterTime;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec2 waveCoord;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nwaveCoord=position.xz;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec2 waveCoord;uniform float waterTime;",
        )
        .replace(
          "#include <map_fragment>",
          "#include <map_fragment>\ndiffuseColor.rgb*=.94+.06*sin(waveCoord.x*840.+waveCoord.y*220.+waterTime*.1);",
        );
    };
    const lakePoints = [
        LAKE.x / 1000,
        ((LAKE.level - 200) * 1.8 + 0.8) / 1000,
        LAKE.z / 1000,
      ],
      lakeIndex: number[] = [];
    for (let j = 0; j <= 160; j++) {
      const a = (j / 160) * Math.PI * 2,
        r = shoreRadius(a);
      lakePoints.push(
        (LAKE.x + Math.cos(a) * LAKE.rx * r) / 1000,
        ((LAKE.level - 200) * 1.8 + 0.8) / 1000,
        (LAKE.z + Math.sin(a) * LAKE.rz * r) / 1000,
      );
      if (j > 0) lakeIndex.push(0, j, j + 1);
    }
    const lakeGeo = new THREE.BufferGeometry();
    lakeGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(lakePoints, 3),
    );
    lakeGeo.setIndex(lakeIndex);
    lakeGeo.computeVertexNormals();
    waters.add(new THREE.Mesh(lakeGeo, waterMat));
    const riverPoints: number[] = [],
      riverIndex: number[] = [];
    for (let j = 0; j <= 280; j++) {
      const z = -1430 + (j / 280) * 3500,
        x = riverX(z),
        w = 19 + 5 * Math.sin(z / 110),
        y = ((riverLevel(z) - 200) * 1.8 + 1.4) / 1000;
      riverPoints.push(
        (x - w) / 1000,
        y,
        z / 1000,
        (x + w) / 1000,
        y,
        z / 1000,
      );
      if (j > 0) {
        const n = j * 2;
        riverIndex.push(n - 2, n, n - 1, n - 1, n, n + 1);
      }
    }
    const riverGeo = new THREE.BufferGeometry();
    riverGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(riverPoints, 3),
    );
    riverGeo.setIndex(riverIndex);
    riverGeo.computeVertexNormals();
    waters.add(new THREE.Mesh(riverGeo, waterMat));
    const data = new THREE.DataTexture(
      arrivals,
      128,
      128,
      THREE.RedFormat,
      THREE.FloatType,
    );
    data.needsUpdate = true;
    data.magFilter = THREE.LinearFilter;
    data.minFilter = THREE.LinearFilter;
    const terrainGeo = terrain(4, TERRAIN_SEGMENTS);
    const groundMat = new THREE.MeshStandardMaterial({
      map: texture,
      vertexColors: true,
      roughness: 1,
      bumpMap: texture,
      bumpScale: 0.006,
    });
    const terrainUniforms = {
      topo: { value: 0 },
      burnTime: { value: 0 },
      burnOpacity: { value: 0.8 },
      burnVisible: { value: 1 },
      field: { value: data },
    };
    groundMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, terrainUniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying float vHeight; varying vec2 vTerrainXZ;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvHeight=position.y;vTerrainXZ=position.xz;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying float vHeight; varying vec2 vTerrainXZ;uniform float topo;uniform sampler2D field;uniform float burnTime;uniform float burnOpacity;uniform float burnVisible;",
        )
        .replace(
          "#include <map_fragment>",
          "#ifdef USE_MAP\nvec4 sampledDiffuseColor=texture2D(map,vMapUv);diffuseColor.rgb*=mix(vec3(1.),sampledDiffuseColor.rgb,.72);\n#endif\nvec2 coord=(vTerrainXZ+2.)/4.;float arrivalTime=texture2D(field,coord).r;float age=burnTime-arrivalTime;if(burnVisible>.5&&age>=0.&&all(greaterThanEqual(coord,vec2(0.)))&&all(lessThanEqual(coord,vec2(1.)))){float ash=.21+.05*sin(vTerrainXZ.x*210.)*sin(vTerrainXZ.y*173.);vec3 charred=vec3(ash*.84,ash*.77,ash*.71);diffuseColor.rgb=mix(diffuseColor.rgb,charred,burnOpacity); }\nif(topo>.5){float contour=smoothstep(.045,.08,abs(fract(vHeight*30.)-.5));diffuseColor.rgb=mix(vec3(.61,.66,.49),vec3(.86,.88,.77),contour);}",
        )
        .replace(
          "#include <dithering_fragment>",
          "#include <dithering_fragment>\nif(topo>.5){float c=smoothstep(.035,.07,abs(fract(vHeight*30.)-.5));gl_FragColor.rgb=mix(vec3(.64,.71,.55),vec3(.91,.93,.84),c);if(burnVisible>.5&&age>=0.&&all(greaterThanEqual(coord,vec2(0.)))&&all(lessThanEqual(coord,vec2(1.))))gl_FragColor.rgb=mix(gl_FragColor.rgb,age<12.?vec3(.93,.62,.35):vec3(.5,.38,.3),burnOpacity*.6);}",
        );
    };
    const ground = new THREE.Mesh(terrainGeo, groundMat);
    ground.receiveShadow = true;
    world.add(ground);
    const outerGeo = terrain(20, 200);
    const outerIdx = outerGeo.index!,
      outerPos = outerGeo.attributes.position;
    const keep: number[] = [];
    for (let i = 0; i < outerIdx.count; i += 3) {
      let x = 0,
        z = 0;
      for (let j = 0; j < 3; j++) {
        x += outerPos.getX(outerIdx.getX(i + j)) / 3;
        z += outerPos.getZ(outerIdx.getX(i + j)) / 3;
      }
      if (Math.abs(x) >= 2 || Math.abs(z) >= 2)
        keep.push(outerIdx.getX(i), outerIdx.getX(i + 1), outerIdx.getX(i + 2));
    }
    outerGeo.setIndex(keep);
    const outer = new THREE.Mesh(outerGeo, groundMat);
    outer.position.y = -0.018;
    world.add(outer);
    const fireMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      uniforms: {
        field: { value: data },
        minute: { value: 0 },
        opacity: { value: 0.8 },
        thermal: { value: 0 },
      },
      vertexShader: `varying vec2 coord;void main(){coord=(position.xz+2.0)/4.0;vec3 p=position;p.y+=.003;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
      fragmentShader: `uniform sampler2D field;uniform float minute;uniform float opacity;uniform float thermal;varying vec2 coord;void main(){float a=texture2D(field,coord).r;float age=minute-a;if(age<0.||age>1.7)discard;float edge=1.-smoothstep(0.,1.7,age);gl_FragColor=vec4(1.,.23,.025,opacity*edge*.68);}`,
    });
    const fireMesh = new THREE.Mesh(terrainGeo, fireMat);
    fireMesh.renderOrder = 2;
    world.add(fireMesh);
    const seed = mulberry32(42),
      dummy = new THREE.Object3D();
    const canopyGeo = mergeGeometries([
      new THREE.ConeGeometry(0.012, 0.027, 7).translate(0, -0.005, 0),
      new THREE.ConeGeometry(0.0085, 0.024, 7).translate(0, 0.009, 0),
    ]);
    const trees = new THREE.InstancedMesh(
      canopyGeo,
      new THREE.MeshStandardMaterial({ roughness: 1, color: "#a0a37f" }),
      12000,
    );
    const trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.0006, 0.0008, 0.035, 5),
      new THREE.MeshStandardMaterial({ color: "#645740" }),
      12000,
    );
    const treeLocations: Array<[number, number, number]> = [];
    for (let i = 0; i < 12000; i++) {
      let x = 0,
        z = 0;
      for (let k = 0; k < 40; k++) {
        x = seed() * 4000 - 2000;
        z = seed() * 4000 - 2000;
        const h = terrainVertex(x, z),
          slope =
            Math.abs(terrainVertex(x + 30, z) - h) +
            Math.abs(terrainVertex(x, z + 30) - h);
        if (
          waterSurface(x, z) === null &&
          Math.abs(
            x - (-1300 + 200 * Math.sin(z / 470) + 80 * Math.cos(z / 160)),
          ) > 12 &&
          slope < 45 &&
          Math.sin(x / 190 + Math.sin(z / 300)) * Math.cos(z / 210) > -0.02
        )
          break;
      }
      const size =
        waterSurface(x, z) !== null ||
        Math.abs(
          x - (-1300 + 200 * Math.sin(z / 470) + 80 * Math.cos(z / 160)),
        ) < 12
          ? 0
          : 0.28 + seed() * 0.57;
      treeLocations.push([x, z, size]);
      dummy.position.set(x / 1000, worldY(x, z) + 0.022 * size, z / 1000);
      dummy.scale.setScalar(size);
      dummy.rotation.y = seed() * 6.28;
      dummy.updateMatrix();
      trees.setMatrixAt(i, dummy.matrix);
      dummy.position.y -= 0.016 * size;
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      trees.setColorAt(
        i,
        new THREE.Color().setHSL(
          0.2 + seed() * 0.045,
          0.23 + seed() * 0.13,
          0.15 + seed() * 0.13,
        ),
      );
    }
    trees.castShadow = true;
    trees.receiveShadow = true;
    world.add(trees, trunks);
    const remoteTrees = new THREE.InstancedMesh(
      trees.geometry,
      trees.material,
      18000,
    );
    for (let i = 0; i < 18000; i++) {
      let x = 0,
        z = 0;
      while (Math.abs(x) < 2050 && Math.abs(z) < 2050) {
        x = seed() * 12000 - 6000;
        z = seed() * 12000 - 6000;
      }
      dummy.position.set(
        x / 1000,
        ((terrainVertex(x, z) - 200) * 1.8) / 1000 + 0.03,
        z / 1000,
      );
      dummy.scale.setScalar(0.7 + seed());
      dummy.updateMatrix();
      remoteTrees.setMatrixAt(i, dummy.matrix);
      remoteTrees.setColorAt(
        i,
        new THREE.Color().setHSL(0.2, 0.3, 0.14 + seed() * 0.12),
      );
    }
    world.add(remoteTrees);
    const treeColors = trees.instanceColor!.array.slice();
    const borderMat = new THREE.LineBasicMaterial({
      color: "#ff7938",
      transparent: true,
      opacity: 0.4,
    });
    const border = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      borderMat,
    );
    world.add(border);
    const histories = new THREE.Group();
    world.add(histories);
    const labels: Label[] = [];
    function line(points: THREE.Vector3[], color: string, opacity = 1) {
      const l = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
      );
      return l;
    }
    function label(
      text: string,
      x: number,
      z: number,
      cls = "map-label",
      id?: string,
      time?: number,
    ) {
      const el = document.createElement("button");
      el.className = cls;
      el.textContent = text;
      el.setAttribute(
        "aria-label",
        id ? `Select ${id}` : time !== undefined ? `Jump to ${text}` : text,
      );
      if (id) el.onclick = () => useStore.getState().select(id);
      else if (time !== undefined)
        el.onclick = () => {
          useStore.getState().pause();
          useStore.getState().setTime(time);
        };
      else el.tabIndex = -1;
      root.append(el);
      const l = {
        el,
        pos: new THREE.Vector3(x / 1000, worldY(x, z) + 0.035, z / 1000),
        id,
        time,
      };
      labels.push(l);
      return l;
    }
    label("▲  ASTER RIDGE", -100, -800, "map-place");
    label("Canyon Creek", riverX(300), 300, "map-place");
    label("ASTER RESERVOIR", LAKE.x - 100, LAKE.z - 220, "map-place");
    label("▲  MESA PEAK", 1100, -700, "map-place");
    label("FIELD BASE", -1600, 1400, "map-place");
    for (const t of [0, 900, 1800, 2700, 3600]) {
      const points: THREE.Vector3[] = [];
      for (const [x1, z1, x2, z2] of fireContour(t)) {
        points.push(
          new THREE.Vector3(x1 / 1000, worldY(x1, z1) + 0.008, z1 / 1000),
          new THREE.Vector3(x2 / 1000, worldY(x2, z2) + 0.008, z2 / 1000),
        );
      }
      const l = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: t === 3600 ? "#fbd573" : "#ff9a4a",
          transparent: true,
          opacity: 0.45,
        }),
      );
      l.userData.time = t;
      histories.add(l);
      const { x, z } = t === 0 ? fireOrigin : fireSpine(t);
      label(
        t === 0 ? "◉ IGNITION · Day 01" : `◉ ${archiveLabel(t)}`,
        x,
        z,
        "map-label fire-label",
        undefined,
        t,
      );
    }
    for (const t of [900, 1800, 2700, 3600]) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 20; k++) {
        const { x, z } = fireSpine(t - 600 + k * 30);
        pts.push(new THREE.Vector3(x / 1000, worldY(x, z) + 0.018, z / 1000));
      }
      const p = new THREE.CatmullRomCurve3(pts),
        tube = new THREE.Mesh(
          new THREE.TubeGeometry(p, 28, 0.0026, 5, false),
          new THREE.MeshBasicMaterial({ color: "#ff8a32" }),
        );
      tube.userData.time = t;
      histories.add(tube);
      const tip = pts[16],
        dir = pts[17].clone().sub(pts[15]).normalize(),
        arrow = new THREE.Mesh(
          new THREE.ConeGeometry(0.014, 0.045, 3),
          new THREE.MeshBasicMaterial({ color: "#ff8a32" }),
        );
      arrow.position.copy(tip);
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      arrow.userData.time = t;
      histories.add(arrow);
    }
    // Script progression spine. Only the elapsed portion is visible.
    const spine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: "#ffe18a" }),
    );
    world.add(spine);
    // Winding local access road, no external map data.
    const roadPoints = [];
    for (let i = 0; i <= 600; i++) {
      const z = -1900 + (i / 600) * 3800,
        x = -1300 + 200 * Math.sin(z / 470) + 80 * Math.cos(z / 160);
      roadPoints.push(
        new THREE.Vector3(x / 1000, worldY(x, z) + 0.006, z / 1000),
      );
    }
    const roadVertices: number[] = [],
      roadIndices: number[] = [];
    for (let j = 0; j < roadPoints.length; j++) {
      const p = roadPoints[j],
        prev = roadPoints[Math.max(0, j - 1)],
        next = roadPoints[Math.min(roadPoints.length - 1, j + 1)],
        dx = next.x - prev.x,
        dz = next.z - prev.z,
        len = Math.hypot(dx, dz) || 1;
      for (const sign of [-1, 1]) {
        const x = p.x + sign * (-dz / len) * 0.004,
          z = p.z + sign * (dx / len) * 0.004;
        roadVertices.push(x, worldY(x * 1000, z * 1000) + 0.001, z);
      }
      if (j > 0) {
        const n = j * 2;
        roadIndices.push(n - 2, n - 1, n, n - 1, n + 1, n);
      }
    }
    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(roadVertices, 3),
    );
    roadGeo.setIndex(roadIndices);
    roadGeo.computeVertexNormals();
    const road = new THREE.Mesh(
      roadGeo,
      new THREE.MeshStandardMaterial({
        color: "#75786b",
        roughness: 1,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    );
    world.add(road);
    const trackGroup = new THREE.Group();
    world.add(trackGroup);
    const vehicles = new Map<string, THREE.Group>();
    const entityLabels = new Map<string, Label>();
    function vehicle(id: string, type: string) {
      const g = new THREE.Group();
      const white = new THREE.MeshStandardMaterial({
        color: type === "drone" ? "#e0e5d8" : "#f1e4cf",
        metalness: 0.3,
        roughness: 0.55,
      });
      const red = new THREE.MeshStandardMaterial({ color: "#c54427" });
      const box = (
        sx: number,
        sy: number,
        sz: number,
        x = 0,
        y = 0,
        z = 0,
        mat = white,
      ) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
        m.position.set(x, y, z);
        g.add(m);
        return m;
      };
      if (type === "drone") {
        box(0.065, 0.007, 0.008);
        box(0.008, 0.007, 0.065);
        box(0.02, 0.013, 0.028);
        for (const x of [-0.03, 0.03])
          for (const z of [-0.03, 0.03]) {
            const p = new THREE.Mesh(
              new THREE.CylinderGeometry(0.019, 0.019, 0.0015, 16),
              new THREE.MeshBasicMaterial({
                color: "#89938a",
                transparent: true,
                opacity: 0.65,
              }),
            );
            p.position.set(x, 0.006, z);
            g.add(p);
          }
      } else {
        g.add(resourceModel(id, type));
      }
      if (type === "drone") g.scale.setScalar(0.16);

      g.userData.baseScale = g.scale.x;
      g.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
      });
      g.userData.id = id;
      vehicles.set(id, g);
      world.add(g);
      entityLabels.set(id, label(id, 0, 0, "map-label entity-label", id));
    }
    DRONE_IDS.forEach((id) => vehicle(id, "drone"));
    resources.forEach((r) => vehicle(r.id, r.type));
    const effectCount = 240,
      flameGeo = new THREE.BufferGeometry(),
      flamePositions = new Float32Array(effectCount * 3);
    flameGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(flamePositions, 3),
    );
    const flame = new THREE.Points(
      flameGeo,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { size: { value: 19 } },
        vertexShader: `uniform float size;void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(size/-p.z,2.,38.);gl_Position=projectionMatrix*p;}`,
        fragmentShader: `void main(){vec2 p=gl_PointCoord*2.-1.;p.x*=2.5;float a=pow(max(0.,1.-length(p)),1.5);if(a<.01)discard;gl_FragColor=vec4(1.,.28+.5*a,.035,a*.8);}`,
      }),
    );
    world.add(flame);
    const smokeTexture = new THREE.TextureLoader().load(
      "/assets/smoke-puff.png",
    );
    smokeTexture.colorSpace = THREE.SRGBColorSpace;
    const dropGeo = new THREE.BufferGeometry(),
      dropPos = new Float32Array(220 * 3),
      dropColor = new Float32Array(220 * 3),
      dropSize = new Float32Array(220),
      dropAlpha = new Float32Array(220);
    dropGeo.setAttribute("position", new THREE.BufferAttribute(dropPos, 3));
    dropGeo.setAttribute("tint", new THREE.BufferAttribute(dropColor, 3));
    dropGeo.setAttribute(
      "particleSize",
      new THREE.BufferAttribute(dropSize, 1),
    );
    dropGeo.setAttribute("alpha", new THREE.BufferAttribute(dropAlpha, 1));
    const dropPlume = new THREE.Points(
      dropGeo,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { sprite: { value: smokeTexture } },
        vertexShader: `attribute vec3 tint;attribute float particleSize;attribute float alpha;varying vec3 color;varying float opacity;void main(){color=tint;opacity=alpha;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(particleSize/-p.z,1.,160.);}`,
        fragmentShader: `uniform sampler2D sprite;varying vec3 color;varying float opacity;void main(){vec4 puff=texture2D(sprite,gl_PointCoord);if(puff.a<.01)discard;gl_FragColor=vec4(puff.rgb*color,opacity*puff.a);}`,
      }),
    );
    dropPlume.frustumCulled = false;
    world.add(dropPlume);
    const tracePositions: number[] = [],
      traceTimes: number[] = [],
      traceColors: number[] = [],
      traceWater: number[] = [];
    for (const r of resources.filter(
      (r) => r.type === "aircraft" && r.capacity > 0,
    ))
      for (let cycle = 0; cycle < 4; cycle++)
        for (let j = 0; j < 100; j++) {
          const emitted = cycle * 900 + 701 + j * 2 + resources.indexOf(r) * 35,
            d1 = sampleResource(r.id, emitted),
            d2 = sampleResource(r.id, emitted + 2),
            fall = Math.sqrt((2 * d1.altitudeAglM) / 9.8),
            width = r.id.startsWith("H-") ? 7 : 15;
          const dx = d2.x - d1.x,
            dz = d2.z - d1.z,
            len = Math.hypot(dx, dz) || 1,
            nx = (-dz / len) * width,
            nz = (dx / len) * width;
          const x = d1.x + fall * 1.2,
            z = d1.z - fall * 0.6,
            xx = d2.x + fall * 1.2,
            zz = d2.z - fall * 0.6;
          const corners = [
              [x + nx, z + nz],
              [x - nx, z - nz],
              [xx + nx, zz + nz],
              [xx - nx, zz - nz],
            ],
            water = r.id.startsWith("H-"),
            c = new THREE.Color(water ? "#47656b" : "#b64c2f");
          for (const k of [0, 1, 2, 2, 1, 3]) {
            const [cx, cz] = corners[k];
            tracePositions.push(cx / 1000, worldY(cx, cz) + 0.005, cz / 1000);
            traceTimes.push(emitted + fall);
            traceColors.push(c.r, c.g, c.b);
            traceWater.push(water ? 1 : 0);
          }
        }
    const traceGeo = new THREE.BufferGeometry();
    traceGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(tracePositions, 3),
    );
    traceGeo.setAttribute(
      "depositedAt",
      new THREE.Float32BufferAttribute(traceTimes, 1),
    );
    traceGeo.setAttribute(
      "tint",
      new THREE.Float32BufferAttribute(traceColors, 3),
    );
    traceGeo.setAttribute(
      "isWater",
      new THREE.Float32BufferAttribute(traceWater, 1),
    );
    const traceMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      uniforms: { time: { value: 0 } },
      vertexShader: `attribute float depositedAt;attribute float isWater;attribute vec3 tint;varying float at;varying float water;varying vec3 color;void main(){at=depositedAt;water=isWater;color=tint;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float time;varying float at;varying float water;varying vec3 color;void main(){float age=time-at;if(age<0.)discard;float fade=water>.5?max(0.,1.-age/180.):.8;gl_FragColor=vec4(color,fade*.3);}`,
    });
    const dropTraces = new THREE.Mesh(traceGeo, traceMat);
    dropTraces.renderOrder = 3;
    world.add(dropTraces);
    let visibleDropParticles = 0;
    function updateDrops(t: number, relief: number) {
      dropPos.fill(-100);
      dropAlpha.fill(0);
      visibleDropParticles = 0;
      const samples = dropSamples(t);
      samples.forEach((p, i) => {
        const floor = worldY(p.x, p.z),
          y = worldY(p.originX, p.originZ) + p.agl / 1000 / (relief / 1.8);
        if (y < floor + 0.002) return;
        visibleDropParticles++;
        dropPos.set([p.x / 1000, y, p.z / 1000], i * 3);
        dropColor.set(p.water ? [0.78, 0.86, 0.87] : [0.83, 0.28, 0.12], i * 3);
        dropSize[i] = 5 + p.age * 3.1;
        dropAlpha[i] = Math.max(0.035, 0.28 - p.age * 0.021);
      });
      for (const a of Object.values(dropGeo.attributes)) a.needsUpdate = true;
      traceMat.uniforms.time.value = t;
    }
    const smoke = new THREE.Group();
    const puffs: THREE.Sprite[] = [];
    for (let i = 0; i < 48; i++) {
      const puff = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: smokeTexture,
          color: i % 3 ? "#a39b8c" : "#d4cebf",
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
          rotation: i * 2.4,
        }),
      );
      puffs.push(puff);
      smoke.add(puff);
    }
    world.add(smoke);
    const sensorMaterial = new THREE.ShaderMaterial({
      uniforms: {
        field: { value: data },
        minute: { value: 0 },
        palette: { value: 0 },
      },
      vertexShader: `varying vec3 location;varying float shade;void main(){vec4 p=vec4(position,1.);
#ifdef USE_INSTANCING
p=instanceMatrix*p;
#endif
location=(modelMatrix*p).xyz;shade=abs(normal.y);gl_Position=projectionMatrix*viewMatrix*vec4(location,1.);}`,
      fragmentShader: `uniform sampler2D field;uniform float minute;uniform float palette;varying vec3 location;varying float shade;void main(){vec2 uv=(location.xz+2.)/4.;float age=minute-texture2D(field,uv).r;float heat=.08+shade*.13;if(all(greaterThanEqual(uv,vec2(0.)))&&all(lessThanEqual(uv,vec2(1.)))&&age>=0.)heat=age<12.? .95-age*.027 : .45*exp(-(age-12.)/25.)+.17;vec3 c=vec3(heat);if(palette>.5){c=mix(vec3(.025,.035,.16),vec3(.5,.04,.36),smoothstep(.05,.4,heat));c=mix(c,vec3(1.,.26,.015),smoothstep(.35,.7,heat));c=mix(c,vec3(1.,.96,.49),smoothstep(.7,1.,heat));}gl_FragColor=vec4(c,1.);}`,
    });
    const viewTargets = new Map<string, THREE.Vector3>();
    function sensorTarget(id: string, t: number, relief: number) {
      const key = `${id}:${t}:${relief}`;
      const cached = viewTargets.get(key);
      if (cached) return cached;
      const d = sampleDrone(id, t),
        eye = worldY(d.x, d.z, d.altitudeAglM, relief),
        candidates: Array<{ x: number; z: number; distance: number }> = [];
      sampleFire(t).forEach((v, i) => {
        if (v !== 1) return;
        const x = ((i % 128) + 0.5) * CELL - 2000,
          z = (Math.floor(i / 128) + 0.5) * CELL - 2000;
        candidates.push({ x, z, distance: (x - d.x) ** 2 + (z - d.z) ** 2 });
      });
      candidates.sort((a, b) => a.distance - b.distance);
      let target = fireSpine(t);
      for (const p of candidates.slice(0, 48)) {
        const y = worldY(p.x, p.z, 5, relief);
        let visible = true;
        for (let k = 1; k < 24; k++) {
          const f = k / 24;
          if (
            worldY(d.x + (p.x - d.x) * f, d.z + (p.z - d.z) * f, 1, relief) >
            eye + (y - eye) * f
          ) {
            visible = false;
            break;
          }
        }
        if (visible) {
          target = p;
          break;
        }
      }
      const point = new THREE.Vector3(
        target.x / 1000,
        worldY(target.x, target.z, 5, relief),
        target.z / 1000,
      );
      viewTargets.set(key, point);
      if (viewTargets.size > 20)
        viewTargets.delete(viewTargets.keys().next().value!);
      return point;
    }
    const previewCamera = new THREE.PerspectiveCamera(52, 16 / 9, 0.01, 30);
    const previewRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    previewRenderer.setSize(480, 270);
    previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
    previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    previewRenderer.toneMappingExposure = 1.05;
    let previewParent: HTMLElement | null = null;
    let previewWasPlaying = false;
    function fireAt(t: number) {
      waterTime.value = t;
      fireMat.uniforms.minute.value = t / 60;
      terrainUniforms.burnTime.value = t / 60;
      const mask = sampleFire(t),
        coords: number[] = [],
        sp: THREE.Vector3[] = [];
      const emit = (x1: number, z1: number, x2: number, z2: number) => {
        coords.push(
          x1 / 1000,
          worldY(x1, z1) + 0.007,
          z1 / 1000,
          x2 / 1000,
          worldY(x2, z2) + 0.007,
          z2 / 1000,
        );
      };
      for (const edge of fireContour(t)) emit(...edge);
      border.geometry.dispose();
      border.geometry = new THREE.BufferGeometry();
      border.geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(coords, 3),
      );
      for (let s = 0; s <= t; s += 20) {
        const { x, z } = fireSpine(s);
        sp.push(new THREE.Vector3(x / 1000, worldY(x, z) + 0.013, z / 1000));
      }
      spine.geometry.dispose();
      spine.geometry = new THREE.BufferGeometry().setFromPoints(sp);
      const active: number[] = [];
      mask.forEach((v, i) => {
        if (v === 1) active.push(i);
      });
      for (let j = 0; j < effectCount; j++) {
        const i = active[(j * 17) % active.length];
        if (i === undefined) {
          flamePositions[j * 3 + 1] = -100;
          continue;
        }
        const x = ((i % 128) + 0.5) * CELL - 2000,
          z = (Math.floor(i / 128) + 0.5) * CELL - 2000,
          phase = (t * 0.08 + j * 0.618) % 1;
        flamePositions[j * 3] = x / 1000 + phase * 0.009;
        flamePositions[j * 3 + 1] = worldY(x, z) + 0.008 + phase * 0.025;
        flamePositions[j * 3 + 2] = z / 1000;
      }
      flameGeo.attributes.position.needsUpdate = true;
      puffs.forEach((puff, j) => {
        const i = active[(j * 31) % active.length];
        if (i === undefined) {
          puff.visible = false;
          return;
        }
        puff.visible = true;
        const phase = (t * 0.012 + j * 0.618) % 1,
          x = ((i % 128) + 0.5) * CELL - 2000,
          z = (Math.floor(i / 128) + 0.5) * CELL - 2000;
        puff.position.set(
          x / 1000 + phase * 0.09,
          worldY(x, z) + 0.022 + phase * 0.16,
          z / 1000 - phase * 0.07,
        );
        puff.scale.setScalar(0.035 + phase * 0.13);
        puff.material.opacity = 0.24 * Math.sin(phase * Math.PI);
        puff.material.rotation = j * 2.4 + phase * 0.4;
      });
      for (let i = 0; i < treeLocations.length; i++) {
        const [x, z, size] = treeLocations[i],
          burn =
            mask[
              Math.min(127, Math.floor((z + 2000) / CELL)) * 128 +
                Math.min(127, Math.floor((x + 2000) / CELL))
            ] > 0,
          offset = i * 3;
        trees.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        dummy.scale.set(
          size * (burn ? 0.14 : 1),
          size * (burn ? 0.75 : 1),
          size * (burn ? 0.14 : 1),
        );
        dummy.updateMatrix();
        trees.setMatrixAt(i, dummy.matrix);
        for (let c = 0; c < 3; c++)
          trees.instanceColor!.array[offset + c] = burn
            ? treeColors[offset + c] * 0.23
            : treeColors[offset + c];
      }
      trees.instanceColor!.needsUpdate = true;
      trees.instanceMatrix.needsUpdate = true;
    }
    let lastState = "",
      lastTime = -1,
      lastPreview = -1,
      lastPreviewId = "",
      frame = 0,
      lastReset = 0,
      last2d = false,
      disposed = false;
    const screen = new THREE.Vector3();
    let fpsStart = performance.now(),
      fpsFrames = 0;
    const profile: number[] = [];
    const resize = () => {
      const w = root.clientWidth,
        h = root.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(root);
    resize();
    const onLost = (e: Event) => {
      e.preventDefault();
      useStore.getState().pause();
      setError(
        "The 3D rendering context was lost. Retry to rebuild at this time.",
      );
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);
    function animate(now: number) {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const state = useStore.getState();
      if (state.reset !== lastReset) {
        lastReset = state.reset;
        reset();
      }
      if (state.map2d !== last2d) {
        last2d = state.map2d;
        if (state.map2d) {
          camera.position.set(-0.2, 7, 0.001);
          camera.up.set(0, 0, -1);
          controls.target.set(-0.2, 0.45, 0);
          camera.lookAt(controls.target);
        } else reset();
      }
      world.scale.y = state.map2d ? 0.02 : state.relief / 1.8;
      terrainUniforms.topo.value = state.map2d ? 1 : 0;
      waters.position.y = state.map2d ? 0.04 : 0;
      const key = JSON.stringify([
        state.time,
        state.layers,
        state.opacity,
        state.selected,
        state.mode,
        state.thermal,
        state.reduced,
        state.map2d,
        state.relief,
      ]);
      if (key !== lastState) {
        lastState = key;
        if (state.time !== lastTime) {
          fireAt(state.time);
          lastTime = state.time;
        }
        trees.visible =
          trunks.visible =
          remoteTrees.visible =
            state.layers.trees && !state.map2d;
        renderer.shadowMap.enabled = !state.reduced;
        remoteTrees.count = state.reduced ? 3000 : 18000;
        trees.count = trunks.count = state.reduced ? 1200 : 12000;
        const nextMap = state.layers.imagery ? texture : null;
        if (groundMat.map !== nextMap) {
          groundMat.map = nextMap;
          groundMat.needsUpdate = true;
        }
        fireMesh.visible = border.visible = state.layers.coverage;
        flame.visible = smoke.visible = state.layers.effects && !state.reduced;
        updateDrops(state.time, state.relief);
        dropPlume.visible =
          state.mode === "resources" &&
          state.layers.resources &&
          state.layers.effects;
        dropTraces.visible = state.layers.resources;
        terrainUniforms.burnVisible.value = state.layers.coverage ? 1 : 0;
        terrainUniforms.burnOpacity.value = state.opacity;
        fireMat.uniforms.opacity.value = state.opacity;
        fireMat.uniforms.thermal.value = state.thermal ? 1 : 0;
        histories.visible = spine.visible = state.layers.history;
        histories.children.forEach((c) => {
          c.visible = c.userData.time <= state.time;
        });
        for (const [id, g] of vehicles) {
          const d = id.startsWith("KITE")
            ? sampleDrone(id, state.time)
            : sampleResource(id, state.time);
          g.position.set(
            d.x / 1000,
            worldY(d.x, d.z) + d.altitudeAglM / 1000 / world.scale.y,
            d.z / 1000,
          );
          g.rotation.y = (-d.headingDeg * Math.PI) / 180;
          if (d.altitudeAglM < 20) {
            const a = (d.headingDeg * Math.PI) / 180,
              fy =
                (worldY(d.x + Math.sin(a) * 5, d.z - Math.cos(a) * 5) -
                  worldY(d.x, d.z)) /
                0.005,
              ry =
                (worldY(d.x + Math.cos(a) * 5, d.z + Math.sin(a) * 5) -
                  worldY(d.x, d.z)) /
                0.005;
            g.rotation.order = "YXZ";
            g.rotation.x = Math.atan(fy);
            g.rotation.z = -Math.atan(ry);
          }
          g.traverse((o) => {
            if (o.userData.rotor) o.rotation.y = state.time * 2.7;
          });
          g.visible = id.startsWith("KITE")
            ? state.mode === "drones" && state.layers.drones
            : state.mode === "resources" && state.layers.resources;
          g.scale.setScalar(
            g.userData.baseScale * (id === state.selected ? 1.1 : 1),
          );
          const lab = entityLabels.get(id)!;
          lab.pos.copy(g.position);
          lab.pos.y += d.altitudeAglM > 20 ? 0.065 : 0.009;
          lab.el.textContent = `${"link" in d && d.link === "stale" ? "◌" : "●"} ${id}  ${Math.round(d.altitudeAglM)} m`;
          lab.el.classList.toggle("selected", id === state.selected);
        }
        while (trackGroup.children.length) {
          const c = trackGroup.children[0] as THREE.Line;
          trackGroup.remove(c);
          c.geometry.dispose();
          (c.material as THREE.Material).dispose();
        }
        if (state.layers.tracks && state.mode === "drones") {
          for (const id of DRONE_IDS) {
            let pts: THREE.Vector3[] = [];
            const finish = () => {
              if (pts.length > 1)
                trackGroup.add(
                  line(pts, id === state.selected ? "#fff4c2" : "#e7e8d4", 0.5),
                );
              pts = [];
            };
            for (
              let t = Math.max(0, state.time - 720);
              t <= state.time;
              t += 10
            ) {
              const d = sampleDrone(id, t);
              if (d.link === "stale") {
                finish();
                continue;
              }
              pts.push(
                new THREE.Vector3(
                  d.x / 1000,
                  worldY(d.x, d.z) + d.altitudeAglM / 1000 / world.scale.y,
                  d.z / 1000,
                ),
              );
            }
            finish();
          }
        }
      }
      const selected = state.selected ? vehicles.get(state.selected) : null;
      controls.enabled = state.camera === "orbit";
      controls.enableRotate = !state.map2d;
      if (selected && state.camera !== "orbit") {
        const d = state.selected!.startsWith("KITE")
            ? sampleDrone(state.selected!, state.time)
            : sampleResource(state.selected!, state.time),
          pos = selected.position.clone();
        pos.y *= world.scale.y;
        controls.target.copy(pos);
        const angle = (d.headingDeg * Math.PI) / 180,
          forward = new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle));
        if (state.camera === "cockpit") {
          if (state.selected!.startsWith("KITE")) {
            camera.fov = 52 / state.cameraZoom;
            camera.updateProjectionMatrix();
            camera.position.copy(pos);
            camera.lookAt(
              sensorTarget(
                state.selected!,
                "sampledAtSec" in d ? d.sampledAtSec : state.time,
                state.relief,
              ),
            );
          } else {
            camera.position
              .copy(pos)
              .add(new THREE.Vector3(0, 0.028, 0))
              .addScaledVector(forward, 0.1);
            camera.lookAt(
              pos
                .clone()
                .addScaledVector(forward, 1.4)
                .add(new THREE.Vector3(0, -0.07, 0)),
            );
          }
        } else {
          const groundUnit = d.altitudeAglM < 20,
            crew = state.selected?.startsWith("C-");
          const distance = groundUnit ? (crew ? 0.025 : 0.055) : 0.34;
          camera.fov = 45;
          camera.updateProjectionMatrix();
          camera.position
            .copy(pos)
            .addScaledVector(forward, -distance)
            .add(
              new THREE.Vector3(
                distance * 0.13,
                groundUnit ? distance * 0.65 : 0.18,
                distance * 0.13,
              ),
            );
          camera.position.y = Math.max(
            camera.position.y,
            worldY(
              camera.position.x * 1000,
              camera.position.z * 1000,
              groundUnit ? 8 : 35,
              state.relief,
            ),
          );
          camera.lookAt(
            pos.clone().add(new THREE.Vector3(0, groundUnit ? 0.003 : 0, 0)),
          );
        }
      } else {
        controls.update();
        const px = camera.position.x * 1000,
          pz = camera.position.z * 1000;
        if (!state.map2d && Math.abs(px) < 2000 && Math.abs(pz) < 2000)
          camera.position.y = Math.max(
            camera.position.y,
            worldY(px, pz, 70, state.relief),
          );
      }
      for (const l of labels) {
        let visible = !state.camera || state.camera === "orbit";
        if (l.id) visible = !!vehicles.get(l.id)?.visible;
        if (l.time !== undefined)
          visible = state.layers.history && l.time <= state.time;
        screen.copy(l.pos);
        screen.y *= world.scale.y;
        screen.project(camera);
        visible =
          visible &&
          screen.z < 1 &&
          screen.z > -1 &&
          Math.abs(screen.x) < 1.1 &&
          Math.abs(screen.y) < 1.1;
        l.el.style.display = visible ? "block" : "none";
        if (visible) {
          l.el.style.left = `${(screen.x * 0.5 + 0.5) * root.clientWidth}px`;
          l.el.style.top = `${(-screen.y * 0.5 + 0.5) * root.clientHeight}px`;
        }
      }
      const compass = root.querySelector<HTMLElement>(".north-arrow");
      if (compass)
        compass.style.transform = `rotate(${(controls.getAzimuthalAngle() * 180) / Math.PI}deg)`;
      const scaleEl = root.parentElement?.querySelector<HTMLElement>(".scale");
      if (scaleEl) {
        const a = controls.target.clone().project(camera),
          right = new THREE.Vector3()
            .setFromMatrixColumn(camera.matrixWorld, 0)
            .multiplyScalar(0.5),
          b = controls.target.clone().add(right).project(camera);
        const px = (Math.abs(b.x - a.x) * root.clientWidth) / 2;
        const desired = (100 * 500) / Math.max(1, px);
        const meters =
          [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
            .filter((m) => m <= desired)
            .at(-1) || 1;
        scaleEl.style.width = `${Math.max(30, (px * meters) / 500)}px`;
        const label = scaleEl.querySelectorAll("span")[1];
        if (label) label.textContent = meters === 1000 ? "1 km" : `${meters} m`;
      }
      const fullSensor =
        state.camera === "cockpit" &&
        state.selected?.startsWith("KITE") &&
        (state.ir || state.thermal);
      if (fullSensor) {
        const sensorBackground = scene.background;
        scene.background = new THREE.Color("#111111");
        sensorMaterial.uniforms.minute.value =
          sampleDrone(state.selected!, state.time).sampledAtSec / 60;
        sensorMaterial.uniforms.palette.value = state.thermal ? 1 : 0;
        const visible = [
          smoke.visible,
          flame.visible,
          fireMesh.visible,
          border.visible,
        ];
        scene.overrideMaterial = sensorMaterial;
        smoke.visible =
          flame.visible =
          fireMesh.visible =
          border.visible =
            false;
        renderer.render(scene, camera);
        scene.background = sensorBackground;
        scene.overrideMaterial = null;
        [smoke.visible, flame.visible, fireMesh.visible, border.visible] =
          visible;
      } else renderer.render(scene, camera);
      const pp = document.getElementById("preview-mount");
      if (pp && pp !== previewParent) {
        pp.appendChild(previewRenderer.domElement);
        previewParent = pp;
        lastPreviewId = "";
      }
      const justPaused = previewWasPlaying && !state.playing;
      previewWasPlaying = state.playing;
      if (pp && state.selected?.startsWith("KITE")) {
        const d = sampleDrone(state.selected, state.time),
          id =
            d.link === "stale"
              ? `${state.selected}-1799`
              : `${state.selected}-${d.sampledAtSec}-${state.thermal}-${state.ir}-${state.relief}-${state.cameraZoom}`;
        if (
          id !== lastPreviewId &&
          d.mission !== "docked" &&
          (now - lastPreview > (state.reduced ? 1000 : 200) ||
            justPaused ||
            !lastPreviewId)
        ) {
          const sampled = d.sampledAtSec,
            restore = sampled !== state.time;
          const oldScale = world.scale.y,
            oldTopo = terrainUniforms.topo.value,
            oldWaterY = waters.position.y,
            oldTrees = trees.visible;
          world.scale.y = state.relief / 1.8;
          terrainUniforms.topo.value = 0;
          waters.position.y = 0;
          trees.visible = trunks.visible = state.layers.trees;
          if (restore) {
            fireAt(sampled);
            traceMat.uniforms.time.value = sampled;
          }
          previewCamera.fov = 52 / state.cameraZoom;
          previewCamera.updateProjectionMatrix();
          previewCamera.position.set(
            d.x / 1000,
            worldY(d.x, d.z) * world.scale.y + d.altitudeAglM / 1000,
            d.z / 1000,
          );
          previewCamera.lookAt(
            sensorTarget(state.selected, sampled, state.relief),
          );
          const vis = [...vehicles.values()].map((g) => g.visible);
          vehicles.forEach((g) => (g.visible = false));
          const tr = trackGroup.visible;
          const historicalVisibility = histories.visible;
          const spineVisibility = spine.visible;
          trackGroup.visible = false;
          histories.visible = spine.visible = false;
          const sensor = state.ir || state.thermal;
          const oldSmoke = smoke.visible,
            oldFlame = flame.visible,
            oldFire = fireMesh.visible,
            oldBorder = border.visible;
          const sensorBackground = scene.background;
          if (sensor) {
            scene.background = new THREE.Color("#111111");
            sensorMaterial.uniforms.minute.value = sampled / 60;
            sensorMaterial.uniforms.palette.value = state.thermal ? 1 : 0;
            scene.overrideMaterial = sensorMaterial;
            smoke.visible =
              flame.visible =
              fireMesh.visible =
              border.visible =
                false;
          }
          previewRenderer.render(scene, previewCamera);
          scene.background = sensorBackground;
          scene.overrideMaterial = null;
          smoke.visible = oldSmoke;
          flame.visible = oldFlame;
          fireMesh.visible = oldFire;
          border.visible = oldBorder;
          [...vehicles.values()].forEach((g, i) => (g.visible = vis[i]));
          trackGroup.visible = tr;
          histories.visible = historicalVisibility;
          spine.visible = spineVisibility;
          world.scale.y = oldScale;
          terrainUniforms.topo.value = oldTopo;
          waters.position.y = oldWaterY;
          trees.visible = trunks.visible = oldTrees;
          if (restore) {
            fireAt(state.time);
            traceMat.uniforms.time.value = state.time;
          }
          lastPreviewId = id;
          lastPreview = now;
        }
      }
      fpsFrames++;
      if (now - fpsStart >= 1000) {
        profile.push((fpsFrames * 1000) / (now - fpsStart));
        fpsFrames = 0;
        fpsStart = now;
        if (profile.length > 120) profile.shift();
      }
      (window as any).__sceneStats = {
        dropParticles: visibleDropParticles,
        fps: profile.at(-1) || 0,
        profile,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      };
    }
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      const geoms = new Set<THREE.BufferGeometry>(),
        mats = new Set<THREE.Material>();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) geoms.add(m.geometry);
        if (m.material)
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) =>
            mats.add(x),
          );
      });
      geoms.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      texture.dispose();
      smokeTexture.dispose();
      sensorMaterial.dispose();
      data.dispose();
      renderer.dispose();
      previewRenderer.dispose();
      renderer.domElement.remove();
      previewRenderer.domElement.remove();
      labels.forEach((l) => l.el.remove());
    };
  }, [retry]);
  return (
    <div
      className="scene"
      ref={host}
      aria-label="Interactive synthetic terrain"
    >
      <div className="compass">
        <span>N</span>
        <div className="north-arrow">➤</div>
      </div>
      {error && (
        <div className="scene-error">
          <strong>{error}</strong>
          <p>Fictional incident · no live data</p>
          <button
            onClick={() => {
              setError("");
              setRetry((n) => n + 1);
            }}
          >
            Retry 3D
          </button>
        </div>
      )}
    </div>
  );
}

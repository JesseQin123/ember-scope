import * as T from "three";
// Independently authored model geometry. Dimensions are meters; root converts to scene km.
export function resourceModel(id: string, type: string) {
  const g = new T.Group();
  g.scale.setScalar(0.001);
  const mat = (c: string, metalness = 0.15) =>
    new T.MeshStandardMaterial({ color: c, roughness: 0.55, metalness });
  const ivory = mat("#e6e1cf"),
    red = mat("#b83e24"),
    dark = mat("#252d2e"),
    glass = mat("#38565c", 0.6),
    yellow = mat("#d3a33e");
  const mesh = (geo: T.BufferGeometry, m: T.Material, x = 0, y = 0, z = 0) => {
    const o = new T.Mesh(geo, m);
    o.position.set(x, y, z);
    g.add(o);
    return o;
  };
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: T.Material = ivory,
  ) => mesh(new T.BoxGeometry(w, h, d), m, x, y, z);
  const cyl = (
    x: number,
    y: number,
    z: number,
    r: number,
    len: number,
    m: T.Material = ivory,
  ) => mesh(new T.CylinderGeometry(r, r, len, 16), m, x, y, z);
  const wing = (
    span: number,
    chord: number,
    z: number,
    y: number,
    m: T.Material = ivory,
  ) => {
    const sh = new T.Shape();
    sh.moveTo(-span / 2, chord * 0.5);
    sh.lineTo(-span * 0.46, -chord * 0.12);
    sh.lineTo(-2, -chord * 0.65);
    sh.lineTo(2, -chord * 0.65);
    sh.lineTo(span * 0.46, -chord * 0.12);
    sh.lineTo(span / 2, chord * 0.5);
    sh.lineTo(2, chord * 0.12);
    sh.lineTo(-2, chord * 0.12);
    sh.closePath();
    const o = mesh(
      new T.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: false }),
      m,
      0,
      y,
      z,
    );
    o.rotation.x = Math.PI / 2;
    return o;
  };
  const rotor = (
    x: number,
    y: number,
    z: number,
    r: number,
    horizontal = true,
  ) => {
    const pivot = new T.Group();
    pivot.position.set(x, y, z);
    const blades = new T.Mesh(new T.BoxGeometry(r * 2, 0.12, 0.65), dark),
      cross = blades.clone();
    cross.rotation.y = Math.PI / 2;
    pivot.add(blades, cross);
    if (!horizontal) pivot.rotation.x = Math.PI / 2;
    g.add(pivot);
    pivot.userData.rotor = true;
    return pivot;
  };
  if (type === "aircraft" && id.startsWith("H-")) {
    const body = mesh(new T.SphereGeometry(1, 20, 12), ivory);
    body.scale.set(2.3, 2.1, 5.4);
    const nose = mesh(new T.SphereGeometry(1, 16, 8), glass, 0, 0.5, -3.2);
    nose.scale.set(2.1, 1.6, 2.5);
    box(0, -0.9, 1, 4.2, 1.4, 6.2, red);
    const tail = mesh(
      new T.CylinderGeometry(0.42, 1.1, 10, 12),
      ivory,
      0,
      0.6,
      8,
    );
    tail.rotation.x = Math.PI / 2;
    box(0, 2.2, 12.5, 0.3, 4, 2.6, red);
    wing(5, 2, 10, 1, red);
    rotor(0, 3.2, 0, 9);
    const tr = rotor(0.7, 2.5, 12, 1.6, false);
    tr.rotation.z = Math.PI / 2;
    for (const x of [-2.4, 2.4]) {
      box(x, -2.6, 0, 0.25, 0.25, 10, dark);
      box(x, -1.8, -2, 0.2, 2, 0.2, dark);
      box(x, -1.8, 2, 0.2, 2, 0.2, dark);
    }
    if (id === "H-52") {
      cyl(0, -10, 0, 0.07, 15, dark);
      cyl(0, -18, 0, 1.7, 2.4, red);
    } else {
      box(0, -2, 0, 3.8, 1.4, 4, red);
    }
  } else if (type === "aircraft") {
    const prop = id === "T-204" || id === "A-08",
      small = id === "A-08",
      length = small ? 15 : prop ? 35 : 55,
      r = small ? 1.1 : prop ? 2.2 : 3.15,
      span = small ? 20 : prop ? 40 : 52;
    const body = mesh(new T.CapsuleGeometry(r, length - r * 2, 8, 24), ivory);
    body.rotation.x = Math.PI / 2;
    box(0, -r * 0.78, 0, r * 1.55, 0.6, length * 0.77, red);
    wing(span, small ? 3.2 : 7.5, 0, prop ? 1 : 0);
    wing(span * 0.37, 3.6, length * 0.37, 1.5);
    const finShape = new T.Shape();
    finShape.moveTo(-3, 0);
    finShape.lineTo(2.7, 0);
    finShape.lineTo(2.2, 9);
    finShape.lineTo(-0.7, 8);
    finShape.closePath();
    const fin = mesh(
      new T.ExtrudeGeometry(finShape, { depth: 0.5, bevelEnabled: false }),
      red,
      -0.25,
      1,
      length * 0.35,
    );
    fin.rotation.y = Math.PI / 2;
    const nose = mesh(
      new T.SphereGeometry(1, 16, 8),
      glass,
      0,
      r * 0.65,
      -length * 0.36,
    );
    nose.scale.set(r * 0.9, r * 0.32, r * 1.4);
    const engines = small ? [-5, 5] : prop ? [-14, -7, 7, 14] : [-13, 13];
    for (const x of engines) {
      const engine = cyl(
        x,
        prop ? 0.5 : -2.7,
        -2,
        small ? 0.6 : 1.35,
        small ? 3 : 6,
        ivory,
      );
      engine.rotation.x = Math.PI / 2;
      const intake = cyl(
        x,
        prop ? 0.5 : -2.7,
        -5.05,
        small ? 0.45 : 1.1,
        0.12,
        dark,
      );
      intake.rotation.x = Math.PI / 2;
      if (prop) rotor(x, 0.5, -5.2, small ? 1.5 : 2.6, false);
    }
    if (!prop) {
      const third = cyl(0, 4, length * 0.36, 1.4, 6, ivory);
      third.rotation.x = Math.PI / 2;
    }
    for (const x of [-span * 0.47, span * 0.47]) box(x, 0, 1, 3, 0.6, 4, red);
    for (let n = 0; n < 6; n++)
      for (const x of [-r, r])
        box(x, r * 0.25, -length * 0.23 + n * 2, 0.12, 0.45, 0.7, glass);
  } else if (type === "engine") {
    const tender = id === "WT-04",
      long = tender ? 10 : 8;
    box(0, 1, 0, 2.7, 1.2, long, dark);
    box(0, 2.5, -long * 0.34, 2.8, 2.5, 2.4, red);
    box(0, 3, -long * 0.47, 2.45, 1, 0.1, glass);
    box(0, 1.5, -long * 0.5 - 0.2, 3, 0.5, 0.5, ivory);
    box(0, 4, -long * 0.34, 2.3, 0.22, 0.45, red);
    if (tender) {
      const tank = cyl(0, 2.7, 1, 1.4, 6, ivory);
      tank.rotation.x = Math.PI / 2;
    } else {
      box(0, 2.4, 1.2, 2.8, 2.2, 5, red);
      for (const x of [-1.42, 1.42])
        for (let n = 0; n < 3; n++)
          box(x, 2.5, -0.3 + n * 1.5, 0.07, 1.4, 1.25, ivory);
      box(0, 3.65, 1, 1.7, 0.25, 5, dark);
      for (let n = 0; n < 8; n++)
        box(0, 3.85, -1 + n * 0.6, 2, 0.12, 0.1, ivory);
    }
    for (const x of [-1.5, 1.5])
      for (const z of [-long * 0.32, long * 0.2, long * 0.36]) {
        const tire = cyl(x, 0.8, z, 0.72, 0.45, dark);
        tire.rotation.z = Math.PI / 2;
        const hub = cyl(x * 1.08, 0.8, z, 0.3, 0.12, ivory);
        hub.rotation.z = Math.PI / 2;
      }
  } else if (id === "DZ-03") {
    box(0, 1, 0, 3, 1.5, 4.5, yellow);
    box(0, 2.8, 0.5, 2.2, 2.2, 2, glass);
    box(0, 4, 0.5, 2.8, 0.25, 2.6, yellow);
    for (const x of [-1.8, 1.8]) {
      box(x, 0.7, 0, 1.1, 1.4, 5.3, dark);
      for (let z = -2; z <= 2; z++) {
        const w = cyl(x, 0.7, z, 0.62, 1.2, yellow);
        w.rotation.z = Math.PI / 2;
      }
      box(x * 0.7, 1, -3, 0.3, 0.4, 2.5, yellow);
    }
    box(0, 0.8, -4, 5, 1.8, 0.55, yellow);
  } else {
    for (let i = 0; i < 6; i++) {
      const x = (i % 3) * 3 - 3,
        z = Math.floor(i / 3) * 4;
      const torso = mesh(
        new T.CapsuleGeometry(0.3, 0.65, 3, 8),
        yellow,
        x,
        1.2,
        z,
      );
      torso.rotation.z = (i % 2 ? 1 : -1) * 0.08;
      mesh(new T.SphereGeometry(0.24, 10, 8), ivory, x, 2, z);
      mesh(
        new T.SphereGeometry(0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        yellow,
        x,
        2.05,
        z,
      );
      for (const side of [-1, 1]) {
        box(x + side * 0.16, 0.45, z, 0.22, 0.85, 0.25, dark);
        box(x + side * 0.43, 1.15, z, 0.18, 0.8, 0.2, yellow);
      }
      box(x + 0.6, 0.7, z, 0.06, 1.7, 0.06, dark);
      box(x + 0.6, 0.05, z, 0.45, 0.15, 0.2, dark);
    }
  }
  g.traverse((o) => {
    if ((o as T.Mesh).isMesh) {
      (o as T.Mesh).castShadow = true;
      (o as T.Mesh).receiveShadow = true;
    }
  });
  return g;
}

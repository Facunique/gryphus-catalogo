// Escena provisoria hecha con primitivas, para probar la interacción mientras
// no existe el modelo de Blender (assets/escena.glb). Respeta las mismas reglas
// de nombres que la escena de Blender (ver README):
//   prod_*            un producto seleccionable (el nombre es su id en catalogo.json)
//   interruptor_foco  el foco con hilo que cambia entre modo claro y oscuro
//   foco_vidrio       el vidrio del foco (se ilumina cuando está prendido)
//   foco_hilo         el hilo que se tira (se anima al tocarlo)
//   mascota_condor    la mascota que guía la cámara
//   material "pantalla*"  brilla más en modo oscuro
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Paleta de la marca (60-30-10) y tonos derivados mezclándola entre sí, para
// que todo lo que se ve salga de los mismos tres colores.
export const PALETA = {
  crema: 0xf6f2e7,      // 60 %: paredes, piso, superficies grandes
  azul: 0x1d355b,       // 30 %: muebles, marcos, estructura
  terracota: 0xca7957,  // 10 %: acentos, solo en lo que se puede tocar
  cremaOscuro: 0xdcdbd6, // crema 88 % + azul 12 %
  azulClaro: 0x748193,  // azul 60 % + crema 40 %
  azulProfundo: 0x142540, // azul 70 % + negro
  terracotaClaro: 0xdca991, // terracota 60 % + crema 40 %
};
const C = PALETA;

const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...extra });

function mesh(geo, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0 } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const caja = (w, h, d, material, pos, r = 0.01) =>
  mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), material, pos);

// ---------- Productos (tamaño "de vitrina", ~1 unidad; se escalan al ubicarlos) ----------

function maceta() {
  const g = new THREE.Group();
  const perfil = [
    [0, 0], [0.32, 0], [0.34, 0.04], [0.42, 0.55], [0.47, 0.58], [0.47, 0.66], [0.40, 0.66], [0.38, 0.6], [0, 0.6],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(mesh(new THREE.LatheGeometry(perfil, 48), mat(C.terracota)));
  g.add(mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.02, 32), mat(C.azulProfundo), { y: 0.6 }));
  const hoja = mat(C.azulClaro);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(mesh(new THREE.SphereGeometry(0.16, 16, 12).scale(0.55, 1.6, 0.3), hoja, {
      x: Math.cos(a) * 0.1, y: 0.82, z: Math.sin(a) * 0.1, rz: Math.cos(a) * 0.35, rx: Math.sin(a) * 0.35, ry: -a,
    }));
  }
  return g;
}

function ondasNfc(color) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    g.add(mesh(new THREE.TorusGeometry(0.08 + i * 0.07, 0.016, 8, 32, Math.PI / 2), mat(color), { rz: -Math.PI / 4 }));
  }
  return g;
}

function tagNfc() {
  const g = new THREE.Group();
  g.add(caja(0.62, 0.9, 0.14, mat(C.crema), { y: 0.5 }, 0.08));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 40), mat(C.terracota), { y: 0.62, z: 0.075, rx: Math.PI / 2 }));
  const ondas = ondasNfc(C.azul);
  ondas.position.set(-0.05, 0.58, 0.09);
  g.add(ondas);
  g.add(caja(0.75, 0.1, 0.4, mat(C.azul), { y: 0.05 }, 0.04));
  return g;
}

function mesaViva() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.7, 3, 1), mat(C.terracota), { y: 0.35, rz: Math.PI / 2, ry: Math.PI / 2 }));
  const campana = new THREE.Group();
  campana.add(mesh(new THREE.SphereGeometry(0.13, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.crema)));
  campana.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.025, 24), mat(C.crema)));
  campana.add(mesh(new THREE.SphereGeometry(0.03, 12, 8), mat(C.azul), { y: 0.15 }));
  campana.position.set(0, 0.36, 0.2);
  campana.rotation.x = 0.52;
  g.add(campana);
  return g;
}

function soporteAuriculares() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.08, 40), mat(C.crema), { y: 0.04 }));
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.05, 16), mat(C.crema), { y: 0.6 }));
  g.add(caja(0.42, 0.05, 0.12, mat(C.crema), { y: 1.12 }, 0.02));
  const auris = new THREE.Group();
  auris.add(mesh(new THREE.TorusGeometry(0.3, 0.035, 12, 40, Math.PI), mat(C.azulClaro)));
  for (const s of [-1, 1]) {
    auris.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 28), mat(C.terracota), { x: s * 0.3, y: -0.05, rz: Math.PI / 2 }));
    auris.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 28), mat(C.azul), { x: s * 0.24, y: -0.05, rz: Math.PI / 2 }));
  }
  auris.position.y = 0.86;
  g.add(auris);
  return g;
}

function soporteCelular() {
  const g = new THREE.Group();
  const forma = new THREE.Shape();
  forma.moveTo(-0.3, 0);
  forma.lineTo(0.3, 0);
  forma.lineTo(0.3, 0.06);
  forma.lineTo(-0.12, 0.12);
  forma.lineTo(-0.3, 0.62);
  forma.lineTo(-0.36, 0.6);
  forma.lineTo(-0.36, 0);
  const cuna = new THREE.ExtrudeGeometry(forma, { depth: 0.5, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 });
  cuna.translate(0, 0, -0.25);
  g.add(mesh(cuna, mat(C.terracotaClaro), { ry: Math.PI / 2 }));
  const celu = new THREE.Group();
  celu.add(caja(0.4, 0.8, 0.05, mat(C.azulProfundo), {}, 0.04));
  celu.add(mesh(new THREE.PlaneGeometry(0.34, 0.72),
    mat(C.crema, { name: 'pantalla_celular', emissive: C.terracotaClaro, emissiveIntensity: 0.3 }), { z: 0.027 }));
  celu.position.set(0, 0.47, -0.05);
  celu.rotation.x = -0.36;
  g.add(celu);
  return g;
}

function notebook() {
  const g = new THREE.Group();
  g.add(caja(1.0, 0.05, 0.68, mat(C.crema), { y: 0.03 }, 0.02));
  g.add(mesh(new THREE.PlaneGeometry(0.82, 0.36), mat(C.azul), { y: 0.056, z: -0.06, rx: -Math.PI / 2 }));
  g.add(mesh(new THREE.PlaneGeometry(0.3, 0.14), mat(C.cremaOscuro), { y: 0.056, z: 0.2, rx: -Math.PI / 2 }));
  const tapa = new THREE.Group();
  tapa.add(caja(1.0, 0.66, 0.035, mat(C.crema), { y: 0.33 }, 0.015));
  tapa.add(mesh(new THREE.PlaneGeometry(0.9, 0.56),
    mat(C.azulClaro, { name: 'pantalla_notebook', emissive: C.azulClaro, emissiveIntensity: 0.3 }), { y: 0.33, z: 0.019 }));
  // Llave inglesa en pantalla, por el servicio técnico
  tapa.add(caja(0.3, 0.05, 0.01, mat(C.terracota), { y: 0.33, z: 0.025, rz: 0.6 }));
  tapa.add(mesh(new THREE.TorusGeometry(0.05, 0.02, 8, 20, Math.PI * 1.5), mat(C.terracota), { x: 0.13, y: 0.42, z: 0.025, rz: 0.6 }));
  tapa.position.set(0, 0.05, -0.33);
  tapa.rotation.x = -0.25;
  g.add(tapa);
  return g;
}

function impresora3d() {
  const g = new THREE.Group();
  const marco = mat(C.azul);
  g.add(caja(0.9, 0.1, 0.8, marco, { y: 0.05 }, 0.03));
  for (const x of [-0.4, 0.4]) g.add(mesh(new THREE.BoxGeometry(0.06, 1.0, 0.06), marco, { x, y: 0.55, z: -0.25 }));
  g.add(mesh(new THREE.BoxGeometry(0.86, 0.06, 0.06), marco, { y: 1.05, z: -0.25 }));
  g.add(mesh(new THREE.BoxGeometry(0.86, 0.05, 0.08), mat(C.terracota), { y: 0.62, z: -0.2 }));
  g.add(caja(0.14, 0.14, 0.14, mat(C.terracotaClaro), { x: 0.1, y: 0.62, z: -0.12 }, 0.03));
  g.add(mesh(new THREE.ConeGeometry(0.03, 0.06, 12), marco, { x: 0.1, y: 0.53, z: -0.08, rx: Math.PI }));
  g.add(mesh(new THREE.BoxGeometry(0.7, 0.03, 0.6), mat(C.azulClaro), { y: 0.12, z: 0.02 }));
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.2, 6), mat(C.terracota), { x: 0.1, y: 0.235, z: 0 }));
  g.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 32), mat(C.crema), { x: 0.56, y: 0.75, z: -0.25, rz: Math.PI / 2 }));
  return g;
}

const CONSTRUCTORES = {
  prod_maceta: maceta,
  prod_tag_nfc: tagNfc,
  prod_mesa_viva: mesaViva,
  prod_soporte_auriculares: soporteAuriculares,
  prod_soporte_celular: soporteCelular,
  prod_notebook: notebook,
  prod_impresion_3d: impresora3d,
};

// Dónde va cada producto. Están agrupados por zona (proximidad de la Gestalt):
// escritorio, estante NFC y mueble de impresión 3D.
const UBICACION = {
  prod_soporte_auriculares: { x: -1.58, y: 0.76, z: -2.62, esc: 0.39, ry: 0.25 },
  prod_notebook:            { x: -0.75, y: 0.76, z: -2.55, esc: 0.55, ry: 0.1 },
  prod_soporte_celular:     { x: 0.18, y: 0.76, z: -2.6, esc: 0.42, ry: -0.3 },
  prod_tag_nfc:             { x: -1.2, y: 1.62, z: -2.84, esc: 0.39, ry: 0.15 },
  prod_mesa_viva:           { x: -0.52, y: 1.62, z: -2.82, esc: 0.42, ry: 0 },
  prod_maceta:              { x: 1.55, y: 0.82, z: -2.58, esc: 0.44, ry: 0 },
  prod_impresion_3d:        { x: 2.3, y: 0.82, z: -2.62, esc: 0.72, ry: -0.2 },
};

// ---------- Habitación ----------

function habitacion() {
  const g = new THREE.Group();
  g.name = 'habitacion';
  const crema = mat(C.crema, { roughness: 0.95 });
  const azul = mat(C.azul);
  const pared = (w, h, d, pos) => {
    const m = mesh(new THREE.BoxGeometry(w, h, d), crema, pos);
    m.castShadow = false;
    return m;
  };

  // Base azul (marco de la "maqueta") y piso
  g.add(caja(6.5, 0.24, 6.5, azul, { x: -0.05, y: -0.2, z: -0.05 }, 0.04));
  const piso = mesh(new THREE.BoxGeometry(6.2, 0.08, 6.2), mat(C.cremaOscuro, { roughness: 0.9 }), { x: -0.05, y: -0.04, z: -0.05 });
  piso.castShadow = false;
  g.add(piso);
  // Tablas del piso, apenas marcadas
  for (let i = -2; i <= 3; i++) {
    g.add(mesh(new THREE.BoxGeometry(0.012, 0.002, 6.2), mat(C.azulClaro, { transparent: true, opacity: 0.25 }), { x: i - 0.55, y: 0.001, z: -0.05 }));
  }

  // Dos paredes: fondo e izquierda, con el canto superior azul
  g.add(pared(6.2, 3.2, 0.12, { x: -0.05, y: 1.6, z: -3.09 }));
  g.add(pared(0.12, 3.2, 6.2, { x: -3.09, y: 1.6, z: -0.05 }));
  g.add(mesh(new THREE.BoxGeometry(6.2, 0.04, 0.14), azul, { x: -0.05, y: 3.22, z: -3.09 }));
  g.add(mesh(new THREE.BoxGeometry(0.14, 0.04, 6.2), azul, { x: -3.09, y: 3.22, z: -0.05 }));
  // Zócalos: una línea continua que recorre la habitación (continuidad)
  g.add(mesh(new THREE.BoxGeometry(6.1, 0.1, 0.03), azul, { x: 0, y: 0.05, z: -3.02 }));
  g.add(mesh(new THREE.BoxGeometry(0.03, 0.1, 6.1), azul, { x: -3.02, y: 0.05, z: 0 }));

  // Ventana en la pared izquierda
  const ventana = new THREE.Group();
  ventana.name = 'ventana';
  const vidrio = mesh(new THREE.PlaneGeometry(1.5, 1.2),
    mat(C.crema, { name: 'cielo', emissive: C.crema, emissiveIntensity: 0.9, roughness: 1 }), { ry: Math.PI / 2 });
  vidrio.castShadow = false;
  ventana.add(vidrio);
  const luna = mesh(new THREE.CircleGeometry(0.13, 32), mat(C.crema, { emissive: C.crema, emissiveIntensity: 1 }), { x: 0.005, y: 0.28, z: 0.35, ry: Math.PI / 2 });
  luna.name = 'luna';
  luna.visible = false;
  ventana.add(luna);
  // Marco: [ancho X, alto Y, largo Z, y, z]
  for (const [w, h, d, y, z] of [
    [0.06, 1.32, 0.06, 0, -0.78], [0.06, 1.32, 0.06, 0, 0.78], // laterales
    [0.06, 0.06, 1.62, 0.63, 0], [0.06, 0.06, 1.62, -0.63, 0], // arriba y abajo
    [0.04, 1.2, 0.04, 0, 0], [0.04, 0.04, 1.5, 0, 0],          // cruz central
  ]) {
    ventana.add(mesh(new THREE.BoxGeometry(w, h, d), azul, { x: 0.01, y, z }));
  }
  ventana.add(caja(0.16, 0.04, 1.7, azul, { x: 0.06, y: -0.66 }, 0.01));
  ventana.position.set(-3.02, 1.75, 0.6);
  g.add(ventana);

  // Escritorio (zona escritorio)
  g.add(caja(2.5, 0.05, 0.78, azul, { x: -0.7, y: 0.735, z: -2.62 }, 0.015));
  for (const x of [-1.9, 0.5]) {
    g.add(caja(0.05, 0.71, 0.7, azul, { x, y: 0.355, z: -2.62 }, 0.01));
  }
  g.add(caja(0.5, 0.4, 0.66, azul, { x: 0.2, y: 0.5, z: -2.62 }, 0.01)); // cajonera
  g.add(caja(0.16, 0.02, 0.02, mat(C.crema), { x: 0.2, y: 0.55, z: -2.28 }, 0.005));

  // Silla
  const silla = new THREE.Group();
  silla.add(caja(0.5, 0.07, 0.48, mat(C.azulClaro), { y: 0.46 }, 0.03));
  silla.add(caja(0.48, 0.42, 0.06, mat(C.azulClaro), { y: 0.82, z: 0.24 }, 0.03));
  silla.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 12), azul, { y: 0.22 }));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    silla.add(caja(0.28, 0.03, 0.04, azul, { x: Math.cos(a) * 0.14, y: 0.03, z: Math.sin(a) * 0.14, ry: -a }, 0.01));
  }
  silla.position.set(-0.35, 0, -1.55);
  silla.rotation.y = 0.5;
  g.add(silla);

  // Alfombra: región común bajo la zona de trabajo
  const alfombra = mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.015, 64), mat(C.azulClaro, { roughness: 1 }), { x: -0.6, y: 0.008, z: -1.5 });
  alfombra.scale.z = 0.75;
  alfombra.castShadow = false;
  g.add(alfombra);
  const centro = mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.017, 64), mat(C.crema, { roughness: 1 }), { x: -0.6, y: 0.01, z: -1.5 });
  centro.scale.z = 0.75;
  centro.castShadow = false;
  g.add(centro);

  // Estante NFC sobre el escritorio
  g.add(caja(1.7, 0.04, 0.34, azul, { x: -0.75, y: 1.6, z: -2.86 }, 0.01));
  for (const x of [-1.5, 0]) g.add(caja(0.04, 0.16, 0.26, azul, { x, y: 1.5, z: -2.9 }, 0.01));
  // Un par de libros para que el estante se lea como estante
  const libros = [[C.azulClaro, 0.3], [C.crema, 0.26], [C.azul, 0.28]];
  libros.forEach(([color, h], i) => g.add(caja(0.05, h, 0.22, mat(color), { x: -0.02 + i * 0.06, y: 1.62 + h / 2, z: -2.86 }, 0.008)));

  // Mueble de impresión 3D
  g.add(caja(1.5, 0.78, 0.7, mat(C.cremaOscuro), { x: 1.95, y: 0.4, z: -2.65 }, 0.02));
  g.add(caja(1.54, 0.04, 0.74, azul, { x: 1.95, y: 0.8, z: -2.65 }, 0.01));
  for (const x of [1.58, 2.32]) g.add(caja(0.2, 0.02, 0.02, azul, { x, y: 0.5, z: -2.29 }, 0.005));
  g.add(mesh(new THREE.BoxGeometry(0.01, 0.7, 0.01), azul, { x: 1.95, y: 0.4, z: -2.3 }));

  // Cuadro: silueta de cóndor planeando sobre el mueble
  const cuadro = new THREE.Group();
  cuadro.add(caja(0.9, 0.62, 0.04, azul, {}, 0.01));
  cuadro.add(mesh(new THREE.PlaneGeometry(0.8, 0.52), mat(C.crema), { z: 0.021 }));
  const sil = new THREE.Shape();
  sil.moveTo(0, 0.05);
  sil.lineTo(0.08, 0.03);
  sil.lineTo(0.27, 0.04);
  for (const [x, y] of [[0.34, 0.06], [0.29, 0.03], [0.35, 0.02], [0.29, 0.0], [0.33, -0.02], [0.26, -0.02]]) sil.lineTo(x, y);
  sil.lineTo(0.08, -0.03);
  sil.lineTo(0.03, -0.09);
  sil.lineTo(-0.03, -0.09);
  sil.lineTo(-0.08, -0.03);
  for (const [x, y] of [[-0.26, -0.02], [-0.33, -0.02], [-0.29, 0.0], [-0.35, 0.02], [-0.29, 0.03], [-0.34, 0.06]]) sil.lineTo(x, y);
  sil.lineTo(-0.27, 0.04);
  sil.lineTo(-0.08, 0.03);
  sil.lineTo(0, 0.05);
  cuadro.add(mesh(new THREE.ShapeGeometry(sil), mat(C.azul), { z: 0.023, y: 0.02 }));
  cuadro.position.set(1.95, 1.85, -3.0);
  g.add(cuadro);

  return g;
}

// ---------- Foco con hilo (interruptor de modo claro / oscuro) ----------

function foco() {
  const g = new THREE.Group();
  g.name = 'interruptor_foco';
  const azul = mat(C.azul);
  // Cable que baja desde fuera de cuadro
  g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 3.4, 8), azul, { y: 1.85 }));
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.12, 24), azul, { y: 0.06 }));
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 24), mat(C.azulClaro, { metalness: 0.3 }), { y: -0.02 }));
  // Vidrio tipo Edison
  const perfil = [
    [0, -0.27], [0.03, -0.265], [0.075, -0.23], [0.095, -0.17], [0.09, -0.1], [0.06, -0.06], [0.035, -0.04], [0.035, -0.035],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const vidrio = mesh(new THREE.LatheGeometry(perfil, 32), new THREE.MeshStandardMaterial({
    name: 'foco_vidrio', color: C.crema, emissive: 0xffd2a8, emissiveIntensity: 1.6, transparent: true, opacity: 0.85, roughness: 0.2,
  }));
  vidrio.name = 'foco_vidrio';
  vidrio.castShadow = false;
  g.add(vidrio);
  const filamento = mesh(new THREE.TorusGeometry(0.03, 0.004, 6, 20, Math.PI), mat(C.terracota, { emissive: C.terracota, emissiveIntensity: 2 }), { y: -0.15 });
  filamento.name = 'foco_filamento';
  filamento.castShadow = false;
  g.add(filamento);
  // Hilo con la cuenta terracota en la punta: lo único "tocable" del foco tiene el color de acento
  const hilo = new THREE.Group();
  hilo.name = 'foco_hilo';
  hilo.add(mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.5, 6), mat(C.cremaOscuro), { y: -0.25 }));
  hilo.add(mesh(new THREE.SphereGeometry(0.03, 16, 12).scale(1, 1.3, 1), mat(C.terracota), { y: -0.52 }));
  hilo.position.set(0.045, -0.02, 0);
  g.add(hilo);
  // Zona de toque invisible y generosa: el hilo es muy finito para apuntarle
  const toque = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.85, 12), new THREE.MeshBasicMaterial({ visible: false }));
  toque.position.y = -0.3;
  toque.name = 'foco_zona_toque';
  g.add(toque);
  return g;
}

// ---------- Mascota ----------

/**
 * Cóndor andino, la mascota de la marca. Mira hacia +Z con las alas abiertas en
 * X. Rasgos: cuerpo negro (azul de la paleta), collar blanco, parches blancos
 * sobre las alas, cabeza pelada con cresta, pico curvo y las plumas de la punta
 * del ala abiertas como dedos. Las alas son hijas con nombre propio (ala_izq,
 * ala_der) para que la web las pueda mover: planear, aletear al aterrizar y
 * plegarlas cuando se posa.
 */
export function construirCondor() {
  const g = new THREE.Group();
  g.name = 'mascota_condor';
  const plumaje = mat(C.azul, { roughness: 0.85 });
  const blanco = mat(C.crema, { roughness: 0.95 });
  const piel = mat(C.azulClaro, { roughness: 0.6 });
  const pico = mat(C.cremaOscuro, { roughness: 0.5 });
  const parcheMat = mat(C.crema, { roughness: 0.95, side: THREE.DoubleSide });

  // Cuerpo y cola en abanico
  g.add(mesh(new THREE.SphereGeometry(1, 32, 20).scale(0.24, 0.22, 0.5), plumaje));
  const cola = new THREE.Shape();
  cola.moveTo(-0.06, 0);
  cola.lineTo(-0.16, -0.28);
  cola.quadraticCurveTo(0, -0.33, 0.16, -0.28);
  cola.lineTo(0.06, 0);
  const geoCola = new THREE.ExtrudeGeometry(cola, { depth: 0.025, bevelEnabled: false });
  geoCola.rotateX(Math.PI / 2);
  g.add(mesh(geoCola, plumaje, { y: 0.02, z: -0.42 }));

  // Collar blanco y esponjoso
  const collar = mesh(new THREE.TorusGeometry(0.12, 0.065, 12, 28), blanco, { y: 0.06, z: 0.42 });
  collar.scale.set(1, 1, 0.7);
  g.add(collar);
  // Cuello y cabeza pelada
  g.add(mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.14, 16), piel, { y: 0.08, z: 0.5, rx: Math.PI / 2 - 0.4 }));
  g.add(mesh(new THREE.SphereGeometry(0.1, 24, 16).scale(0.9, 0.9, 1.15), piel, { y: 0.13, z: 0.6 }));
  // Cresta (carúncula): el único toque terracota del ave
  const cresta = mesh(new THREE.SphereGeometry(0.07, 16, 10).scale(0.35, 0.75, 1.2), mat(C.terracota), { y: 0.22, z: 0.62 });
  g.add(cresta);
  // Pico corto y curvo, de carroñero
  const p = new THREE.Group();
  p.add(mesh(new THREE.ConeGeometry(0.045, 0.13, 12), pico, { rx: Math.PI / 2 }));
  p.add(mesh(new THREE.TorusGeometry(0.035, 0.016, 8, 12, Math.PI / 1.4), pico, { z: 0.05, y: -0.02, ry: Math.PI / 2, rz: 0.6 }));
  p.position.set(0, 0.11, 0.72);
  g.add(p);
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.SphereGeometry(0.018, 12, 8), mat(C.azulProfundo), { x: s * 0.075, y: 0.16, z: 0.66 }));
  }
  const patas = new THREE.Group();
  patas.name = 'patas';
  for (const s of [-1, 1]) {
    patas.add(mesh(new THREE.SphereGeometry(0.06, 12, 8).scale(0.7, 0.3, 1.2), piel, { x: s * 0.08 }));
  }
  patas.position.set(0, -0.12, -0.35);
  g.add(patas);

  // Alas anchas con las primarias abiertas como dedos en la punta
  const forma = new THREE.Shape();
  forma.moveTo(0, 0.18);
  forma.quadraticCurveTo(0.55, 0.21, 1.0, 0.15);
  const dedos = [[1.42, 0.12], [1.05, 0.08], [1.47, 0.03], [1.07, -0.01], [1.46, -0.06], [1.06, -0.09], [1.38, -0.14], [1.0, -0.15]];
  for (const [x, y] of dedos) forma.lineTo(x, y);
  forma.quadraticCurveTo(0.55, -0.24, 0, -0.22);
  forma.lineTo(0, 0.18);
  const geoAla = new THREE.ExtrudeGeometry(forma, { depth: 0.03, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 12 });
  geoAla.rotateX(Math.PI / 2);
  // Parche blanco de las secundarias, sobre la cara de arriba
  const parche = new THREE.Shape();
  parche.moveTo(0.12, -0.04);
  parche.lineTo(0.92, -0.02);
  parche.lineTo(0.94, -0.13);
  parche.quadraticCurveTo(0.5, -0.2, 0.12, -0.18);
  parche.lineTo(0.12, -0.04);
  const geoParche = new THREE.ShapeGeometry(parche, 8);
  geoParche.rotateX(Math.PI / 2);
  for (const [nombre, s] of [['ala_izq', 1], ['ala_der', -1]]) {
    const ala = new THREE.Group();
    ala.name = nombre;
    ala.add(mesh(geoAla, plumaje));
    ala.add(mesh(geoParche, parcheMat, { y: 0.017 }));
    ala.position.set(s * 0.14, 0.07, 0.05);
    ala.scale.x = s;
    g.add(ala);
  }
  return g;
}

/** Arma la habitación home office con los productos, el foco y la mascota. */
export function construirEscenaProvisoria(ids) {
  const raiz = new THREE.Group();
  raiz.name = 'escena_provisoria';
  raiz.add(habitacion());

  for (const id of ids) {
    const construir = CONSTRUCTORES[id];
    const u = UBICACION[id];
    if (!construir || !u) continue;
    const producto = construir();
    producto.name = id;
    producto.position.set(u.x, u.y, u.z);
    producto.rotation.y = u.ry;
    producto.scale.setScalar(u.esc);
    raiz.add(producto);
  }

  const interruptor = foco();
  interruptor.position.set(1.0, 2.8, -2.3); // sobre la punta del escritorio, en pared libre
  raiz.add(interruptor);

  const condor = construirCondor();
  condor.scale.setScalar(0.28);
  condor.position.set(0, 2.6, -0.8); // centro del vuelo, sobre la habitación
  condor.userData.vuelo = true;
  condor.userData.radio = 1.3;
  raiz.add(condor);

  return raiz;
}

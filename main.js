// Catálogo 3D: una habitación home office con nuestros productos.
// Carga la escena exportada de Blender (assets/escena.glb) o, si todavía no
// existe, la escena provisoria. Al tocar un producto, el cóndor vuela hasta
// él, la cámara lo sigue, se posa encima y aparece el panel con los detalles.
// El foco con hilo cambia entre modo claro y oscuro.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { construirEscenaProvisoria } from './placeholder.js';

const RUTA_ESCENA = 'assets/escena.glb';
const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (id) => document.getElementById(id);
const ui = {
  contenedor: $('escena'),
  cargando: $('cargando'),
  etiqueta: $('etiqueta'),
  ayuda: $('ayuda'),
  panel: $('panel'),
  volver: $('volver'),
  categoria: $('panel-categoria'),
  nombre: $('panel-nombre'),
  resumen: $('panel-resumen'),
  detalles: $('panel-detalles'),
  precio: $('panel-precio'),
  cta: $('panel-cta'),
  indice: $('indice'),
  cambiarTema: $('cambiar-tema'),
};

// ---------- Renderer, cámara, luces ----------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Neutral respeta los colores de la paleta mejor que ACES (no los lava ni los vira).
renderer.toneMapping = THREE.NeutralToneMapping;
ui.contenedor.appendChild(renderer.domElement);

const escena = new THREE.Scene();
escena.background = new THREE.Color();

const pmrem = new THREE.PMREMGenerator(renderer);
escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const hemi = new THREE.HemisphereLight();
escena.add(hemi);
const sol = new THREE.DirectionalLight(); // de día es el sol, de noche la luna; entra por la ventana
sol.position.set(-6, 6.5, 2.5);
sol.target.position.set(0, 0.5, -1.2);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 });
sol.shadow.bias = -0.0004;
sol.shadow.normalBias = 0.02;
sol.shadow.radius = 4;
escena.add(sol, sol.target);
const luzFoco = new THREE.PointLight(0xffd9b3, 0, 0, 2);
escena.add(luzFoco);

const camara = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.05, 100);
const vistaInicial = {
  direccion: new THREE.Vector3(5.9, 3.3, 7.4).normalize(),
  distancia: 10,
  objetivo: new THREE.Vector3(-0.15, 1.0, -1.55),
  posicion: new THREE.Vector3(),
};

const controles = new OrbitControls(camara, renderer.domElement);
controles.enableDamping = true;
controles.enablePan = false;
const LIMITES_GENERAL = { minPolarAngle: 0.55, maxPolarAngle: 1.35, minAzimuthAngle: 0.02, maxAzimuthAngle: 1.45 };

function calcularVistaInicial() {
  // En pantallas angostas la cámara se aleja para que entre la habitación.
  const medioHorizontal = Math.atan(Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2) * camara.aspect);
  vistaInicial.distancia = THREE.MathUtils.clamp(3.9 / Math.tan(medioHorizontal), 8, 15);
  vistaInicial.posicion.copy(vistaInicial.objetivo).addScaledVector(vistaInicial.direccion, vistaInicial.distancia);
}

function limitesGenerales() {
  Object.assign(controles, LIMITES_GENERAL, { minDistance: 3.5, maxDistance: vistaInicial.distancia + 1.5 });
}

// ---------- Modo claro / oscuro ----------

const TEMAS = {
  claro: {
    fondo: 0xf6f2e7, cielo: 0xfffaf0, suelo: 0xd9cbb8, hemi: 1.15,
    sol: 0xfff0dc, solI: 1.7, foco: 3.2, vidrio: 1.6, filamento: 2.2,
    ventana: 0xf6f2e7, ventanaI: 0.95, pantalla: 0.3, ambiente: 0.5,
  },
  oscuro: {
    fondo: 0x15284a, cielo: 0x3d5a8c, suelo: 0x15284a, hemi: 1.15,
    sol: 0x7d9bd0, solI: 0.8, foco: 0, vidrio: 0, filamento: 0,
    ventana: 0x1d355b, ventanaI: 0.7, pantalla: 1.5, ambiente: 0.1,
  },
};
const CLAVES_COLOR = ['fondo', 'cielo', 'suelo', 'sol', 'ventana'];
escena.background.set(TEMAS[document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro'].fondo);
const actual = {};
let objetivoTema;
let temaNombre = document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro';

function fijarTema(nombre, { inmediato = false, guardar = true } = {}) {
  temaNombre = nombre;
  objetivoTema = TEMAS[nombre];
  document.documentElement.dataset.tema = nombre;
  ui.cambiarTema.textContent = nombre === 'claro' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
  if (guardar) { try { localStorage.setItem('tema', nombre); } catch { /* sin almacenamiento */ } }
  if (inmediato || reducirMovimiento) {
    for (const [k, v] of Object.entries(objetivoTema)) actual[k] = CLAVES_COLOR.includes(k) ? new THREE.Color(v) : v;
  }
  if (refs.luna) refs.luna.visible = nombre === 'oscuro';
}

function alternarTema() {
  fijarTema(temaNombre === 'claro' ? 'oscuro' : 'claro');
}

const _c = new THREE.Color();
function actualizarTema(dt) {
  const k = 1 - Math.exp(-dt * 5);
  for (const [clave, meta] of Object.entries(objetivoTema)) {
    if (CLAVES_COLOR.includes(clave)) actual[clave].lerp(_c.set(meta), k);
    else actual[clave] += (meta - actual[clave]) * k;
  }
  escena.background.copy(actual.fondo);
  hemi.color.copy(actual.cielo);
  hemi.groundColor.copy(actual.suelo);
  hemi.intensity = actual.hemi;
  sol.color.copy(actual.sol);
  sol.intensity = actual.solI;
  luzFoco.intensity = actual.foco;
  escena.environmentIntensity = actual.ambiente;
  if (refs.vidrio) refs.vidrio.material.emissiveIntensity = actual.vidrio;
  if (refs.filamento) refs.filamento.material.emissiveIntensity = actual.filamento;
  if (refs.cielo) { refs.cielo.emissive.copy(actual.ventana); refs.cielo.color.copy(actual.ventana); refs.cielo.emissiveIntensity = actual.ventanaI; }
  for (const m of refs.pantallas) m.emissiveIntensity = actual.pantalla;
}

ui.cambiarTema.addEventListener('click', alternarTema);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  let guardado = null;
  try { guardado = localStorage.getItem('tema'); } catch { /* nada */ }
  if (!guardado) fijarTema(e.matches ? 'oscuro' : 'claro', { guardar: false });
});

// ---------- Estado ----------

/** @type {Map<string, {raiz: THREE.Object3D, datos: object, base: number, escala: number}>} */
const productos = new Map();
const seleccionables = [];
const refs = { vidrio: null, filamento: null, hilo: null, foco: null, cielo: null, luna: null, pantallas: [] };
let catalogo;
let enfocado = null;
let resaltado = null; // id de producto o 'foco'
let viaje = null;
let mezclador = null;
let tiron = null;
let ave = null;

// ---------- Carga ----------

async function cargarCatalogo() {
  const r = await fetch('catalogo.json');
  if (!r.ok) throw new Error(`catalogo.json: ${r.status}`);
  return r.json();
}

async function cargarEscena(ids) {
  try {
    const gltf = await new GLTFLoader().loadAsync(RUTA_ESCENA);
    const camBlender = gltf.scene.getObjectByName('camara_inicio');
    if (camBlender) {
      camBlender.updateWorldMatrix(true, false);
      const pos = camBlender.getWorldPosition(new THREE.Vector3());
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camBlender.getWorldQuaternion(new THREE.Quaternion()));
      const d = pos.length();
      vistaInicial.objetivo.copy(pos).addScaledVector(dir, d);
      vistaInicial.direccion.copy(dir).negate();
    }
    gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (gltf.animations.length) {
      mezclador = new THREE.AnimationMixer(gltf.scene);
      for (const clip of gltf.animations) mezclador.clipAction(clip).play();
    }
    return gltf.scene;
  } catch (err) {
    console.info(`Sin ${RUTA_ESCENA} (${err.message ?? err}); uso la escena provisoria.`);
    return construirEscenaProvisoria(ids);
  }
}

function prepararReferencias(modelo) {
  refs.foco = modelo.getObjectByName('interruptor_foco');
  refs.vidrio = modelo.getObjectByName('foco_vidrio');
  refs.filamento = modelo.getObjectByName('foco_filamento');
  refs.hilo = modelo.getObjectByName('foco_hilo');
  refs.luna = modelo.getObjectByName('luna');
  modelo.traverse((o) => {
    if (!o.isMesh) return;
    const nombre = o.material?.name ?? '';
    if (nombre.startsWith('pantalla')) refs.pantallas.push(o.material);
    if (nombre === 'cielo') refs.cielo = o.material;
  });
  if (refs.foco) {
    refs.foco.userData.interruptor = true;
    refs.foco.traverse((o) => { if (o.isMesh) seleccionables.push(o); });
    refs.hilo && (refs.hilo.userData.yBase = refs.hilo.position.y);
    modelo.updateMatrixWorld(true);
    (refs.vidrio ?? refs.foco).getWorldPosition(luzFoco.position);
    luzFoco.position.y -= 0.12;
  }
}

async function iniciar() {
  catalogo = await cargarCatalogo();
  const ids = catalogo.productos.map((p) => p.id);
  const modelo = await cargarEscena(ids);
  escena.add(modelo);

  for (const datos of catalogo.productos) {
    const raiz = modelo.getObjectByName(datos.id);
    if (!raiz) {
      console.warn(`No hay ningún objeto llamado "${datos.id}" en la escena.`);
      continue;
    }
    raiz.userData.productoId = datos.id;
    raiz.traverse((o) => { if (o.isMesh) seleccionables.push(o); });
    productos.set(datos.id, { raiz, datos, base: raiz.scale.x, escala: 1 });
  }
  prepararReferencias(modelo);
  prepararMascota(modelo);
  fijarTema(temaNombre, { inmediato: true, guardar: false });

  construirIndice();
  calcularVistaInicial();
  camara.position.copy(vistaInicial.posicion);
  controles.target.copy(vistaInicial.objetivo);
  limitesGenerales();
  controles.update();
  ui.cargando.remove();

  const inicial = decodeURIComponent(location.hash.slice(1));
  if (productos.has(inicial)) enfocar(inicial, { inmediato: true });
}

function construirIndice() {
  const zonas = catalogo.zonas ?? [{ id: undefined, nombre: '' }];
  for (const zona of zonas) {
    const deZona = [...productos.values()].filter((p) => zonas.length === 1 || p.datos.zona === zona.id);
    if (!deZona.length) continue;
    const li = document.createElement('li');
    li.className = 'zona';
    const lista = document.createElement('ul');
    lista.setAttribute('aria-label', zona.nombre);
    if (zona.nombre) {
      const t = document.createElement('span');
      t.className = 'zona-nombre';
      t.textContent = zona.nombre;
      t.setAttribute('aria-hidden', 'true');
      li.appendChild(t);
    }
    for (const { datos } of deZona) {
      const item = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = datos.corto ?? datos.nombre;
      b.title = datos.nombre;
      b.dataset.id = datos.id;
      b.addEventListener('click', () => (enfocado === datos.id ? volver() : enfocar(datos.id)));
      item.appendChild(b);
      lista.appendChild(item);
    }
    li.appendChild(lista);
    ui.indice.appendChild(li);
  }
}

// ---------- Mascota: vuela en círculos y guía la cámara ----------

const _v = new THREE.Vector3();

function prepararMascota(modelo) {
  const obj = modelo.getObjectByName('mascota_condor');
  if (!obj) return;
  obj.rotation.order = 'YXZ';
  const alas = [obj.getObjectByName('ala_izq'), obj.getObjectByName('ala_der')].filter(Boolean);
  ave = {
    obj,
    vuela: Boolean(obj.userData.vuelo),
    centro: obj.position.clone(),
    yawInicial: obj.rotation.y,
    radio: Number(obj.userData.radio) || 1.5,
    escalaVuelo: obj.scale.x,
    escalaPosado: obj.scale.x * 0.72,
    alas: alas.map((a) => ({ obj: a, signo: Math.sign(a.scale.x) || 1, largo: Math.abs(a.scale.x) })),
    patas: obj.getObjectByName('patas'),
    patasBase: obj.getObjectByName('patas')?.position.clone(),
    fase: 0.9,
    estado: 'circulando', // circulando | volando | posado
    plegado: 0,
    ruta: null,
    yawPosado: 0,
  };
  if (ave.vuela) colocarEnCirculo(ave.fase);
}

function puntoCirculo(f, destino = new THREE.Vector3()) {
  return destino.set(ave.centro.x + Math.cos(f) * ave.radio, ave.centro.y + Math.sin(f * 2.3) * 0.12, ave.centro.z + Math.sin(f) * ave.radio);
}

function colocarEnCirculo(f) {
  puntoCirculo(f, ave.obj.position);
  ave.obj.rotation.set(-Math.cos(f * 2.3) * 0.06, Math.atan2(-Math.sin(f), Math.cos(f)), 0.32);
}

const bezier = (r, t, out) => {
  const u = 1 - t;
  return out.set(0, 0, 0)
    .addScaledVector(r.p0, u * u * u).addScaledVector(r.p1, 3 * u * u * t)
    .addScaledVector(r.p2, 3 * u * t * t).addScaledVector(r.p3, t * t * t);
};

/** Arma una ruta curva desde donde está el ave hasta `destino`. */
function trazarRuta(destino, { llegada, alLlegar, duracion }) {
  const p0 = ave.obj.position.clone();
  const adelante = new THREE.Vector3(Math.sin(ave.obj.rotation.y), 0, Math.cos(ave.obj.rotation.y));
  const distancia = p0.distanceTo(destino);
  const p1 = p0.clone().addScaledVector(adelante, Math.min(distancia * 0.45, 1.2)).add(new THREE.Vector3(0, 0.25, 0));
  const p2 = destino.clone().add(llegada);
  ave.ruta = { p0, p1, p2, p3: destino.clone(), t0: performance.now(), dur: duracion ?? THREE.MathUtils.clamp(1.1 + distancia * 0.35, 1.4, 2.4) * 1000, alLlegar };
  ave.estado = 'volando';
  return ave.ruta.dur;
}

function posicionPosado(p) {
  // Arriba del producto, un poco hacia atrás para no taparle el frente.
  p.raiz.scale.setScalar(p.base);
  const caja = new THREE.Box3().setFromObject(p.raiz);
  const centro = caja.getCenter(new THREE.Vector3());
  const frente = new THREE.Vector3(Math.sin(p.raiz.rotation.y), 0, Math.cos(p.raiz.rotation.y));
  const fondo = Math.min(caja.max.z - caja.min.z, caja.max.x - caja.min.x) * 0.18;
  return new THREE.Vector3(centro.x, caja.max.y + ave.escalaPosado * 0.2, centro.z).addScaledVector(frente, -fondo);
}

function actualizarMascota(dt) {
  if (!ave) return;
  const { obj } = ave;

  if (ave.estado === 'circulando' && ave.vuela) {
    ave.fase += dt * 0.32;
    colocarEnCirculo(ave.fase);
  } else if (ave.estado === 'volando') {
    const r = ave.ruta;
    const t = Math.min((performance.now() - r.t0) / r.dur, 1);
    const k = suavizarVuelo(t);
    bezier(r, k, obj.position);
    // Mira hacia donde va
    bezier(r, Math.min(k + 0.02, 1), _v).sub(obj.position);
    if (_v.lengthSq() > 1e-8 && t < 0.92) {
      const yaw = Math.atan2(_v.x, _v.z);
      obj.rotation.y = girarHacia(obj.rotation.y, yaw, dt * 8);
      obj.rotation.x = THREE.MathUtils.clamp(-Math.atan2(_v.y, Math.hypot(_v.x, _v.z)), -0.5, 0.5);
    }
    obj.rotation.z *= 1 - Math.min(dt * 4, 1);
    if (t === 1) {
      if (r.alLlegar === 'posar') ave.estado = 'posado';
      else { ave.estado = 'circulando'; }
      ave.ruta = null;
    }
  } else if (ave.estado === 'posado') {
    obj.rotation.y = girarHacia(obj.rotation.y, ave.yawPosado, dt * 4);
    obj.rotation.x *= 1 - Math.min(dt * 6, 1);
    obj.rotation.z *= 1 - Math.min(dt * 6, 1);
  }

  // Alas: planear, aletear al despegar y aterrizar, plegarlas posado.
  const metaPlegado = ave.estado === 'posado' ? 1 : 0;
  ave.plegado += (metaPlegado - ave.plegado) * Math.min(dt * 7, 1);
  const pl = ave.plegado;
  let aleteo = 0;
  if (ave.estado === 'volando') {
    const t = (performance.now() - ave.ruta.t0) / ave.ruta.dur;
    const fuerza = t < 0.25 ? 1 - t / 0.25 : t > 0.65 ? (t - 0.65) / 0.35 : 0.15;
    aleteo = Math.sin(performance.now() / 1000 * 16) * 0.65 * fuerza;
  } else if (ave.estado === 'circulando') {
    aleteo = Math.max(0, Math.sin(ave.fase * 5)) ** 3 * 0.22;
  }
  for (const a of ave.alas) {
    a.obj.rotation.z = (aleteo * (1 - pl) - 0.25 * pl) * a.signo;
    a.obj.rotation.y = 1.35 * pl * a.signo;
    a.obj.scale.x = a.signo * a.largo * (1 - 0.45 * pl);
  }
  if (ave.patas) ave.patas.position.lerpVectors(ave.patasBase, _v.set(0, -0.2, 0.02), pl);
  obj.scale.setScalar(THREE.MathUtils.lerp(ave.escalaVuelo, ave.escalaPosado, pl));
}

const suavizarVuelo = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
function girarHacia(actualAng, meta, k) {
  const dif = Math.atan2(Math.sin(meta - actualAng), Math.cos(meta - actualAng));
  return actualAng + dif * Math.min(k, 1);
}

// ---------- Selección con el puntero ----------

const raycaster = new THREE.Raycaster();
const puntero = new THREE.Vector2();
let inicioToque = null;

function objetivoBajo(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  puntero.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(puntero, camara);
  const hit = raycaster.intersectObjects(seleccionables, false)[0];
  for (let o = hit?.object; o; o = o.parent) {
    if (o.userData.productoId) return o.userData.productoId;
    if (o.userData.interruptor) return 'foco';
  }
  return null;
}

function textoEtiqueta(id) {
  if (id === 'foco') return temaNombre === 'claro' ? 'Tirá del hilo para apagar la luz' : 'Tirá del hilo para prender la luz';
  return productos.get(id).datos.nombre;
}

renderer.domElement.addEventListener('pointerdown', (ev) => { inicioToque = { x: ev.clientX, y: ev.clientY }; });

renderer.domElement.addEventListener('pointermove', (ev) => {
  if (ev.pointerType !== 'mouse') return;
  const id = ev.buttons ? null : objetivoBajo(ev);
  resaltado = id && id !== enfocado ? id : null;
  renderer.domElement.style.cursor = resaltado ? 'pointer' : '';
  if (resaltado) {
    ui.etiqueta.textContent = textoEtiqueta(resaltado);
    ui.etiqueta.style.left = `${ev.clientX}px`;
    ui.etiqueta.style.top = `${ev.clientY}px`;
    ui.etiqueta.hidden = false;
  } else {
    ui.etiqueta.hidden = true;
  }
});

renderer.domElement.addEventListener('pointerleave', () => { resaltado = null; ui.etiqueta.hidden = true; });

renderer.domElement.addEventListener('pointerup', (ev) => {
  if (!inicioToque) return;
  const movido = Math.hypot(ev.clientX - inicioToque.x, ev.clientY - inicioToque.y);
  inicioToque = null;
  if (movido > 6) return; // fue un arrastre para orbitar
  const id = objetivoBajo(ev);
  if (id === 'foco') tirarDelHilo();
  else if (id && id !== enfocado) enfocar(id);
  else if (!id && enfocado) volver();
});

addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && enfocado) volver(); });
ui.volver.addEventListener('click', () => volver());

// ---------- Foco con hilo ----------

function tirarDelHilo() {
  if (reducirMovimiento || !refs.hilo) { alternarTema(); return; }
  if (tiron && !tiron.cambio) return; // ya se está tirando
  tiron = { t0: performance.now(), cambio: false };
}

function actualizarTiron() {
  if (!tiron) return;
  const t = (performance.now() - tiron.t0) / 1000;
  const BAJADA = 0.14;
  let dy;
  if (t < BAJADA) dy = -0.09 * (t / BAJADA);
  else dy = -0.09 * Math.exp(-(t - BAJADA) * 8) * Math.cos((t - BAJADA) * 22);
  if (!tiron.cambio && t >= BAJADA) { tiron.cambio = true; alternarTema(); }
  refs.hilo.position.y = refs.hilo.userData.yBase + dy;
  if (refs.foco) refs.foco.rotation.z = 0.05 * Math.exp(-t * 2.2) * Math.sin(t * 6.5);
  if (t > 2.5) {
    refs.hilo.position.y = refs.hilo.userData.yBase;
    if (refs.foco) refs.foco.rotation.z = 0;
    tiron = null;
  }
}

// ---------- Enfocar y volver ----------

const _caja = new THREE.Box3();
const _esfera = new THREE.Sphere();

function encuadre(raiz) {
  _caja.setFromObject(raiz);
  if (ave) _caja.max.y += ave.escalaPosado * 0.45; // deja lugar para el cóndor posado
  _caja.getBoundingSphere(_esfera);
  const centro = _esfera.center.clone();
  const fovV = THREE.MathUtils.degToRad(camara.fov);
  const angosto = camara.aspect < 1;
  const fovEfectivo = angosto ? 2 * Math.atan(Math.tan(fovV / 2) * camara.aspect) : fovV;
  const distancia = (_esfera.radius / Math.sin(fovEfectivo / 2)) * (angosto ? 1.4 : 1.85);

  const frente = new THREE.Vector3(Math.sin(raiz.rotation.y), 0, Math.cos(raiz.rotation.y));
  const elevacion = 0.34;
  const dir = frente.multiplyScalar(Math.cos(elevacion)).setY(Math.sin(elevacion)).normalize();
  const posicion = centro.clone().addScaledVector(dir, distancia);
  const objetivo = centro.clone();

  // Correr el encuadre para que el panel no tape el objeto.
  const adelante = objetivo.clone().sub(posicion).normalize();
  const derecha = new THREE.Vector3().crossVectors(adelante, camara.up).normalize();
  const arriba = new THREE.Vector3().crossVectors(derecha, adelante);
  const medioAlto = distancia * Math.tan(fovV / 2);
  const corrimiento = new THREE.Vector3();
  if (innerWidth > 760) {
    const anchoPanel = ui.panel.offsetWidth || 380;
    corrimiento.addScaledVector(derecha, ((anchoPanel / 2 + 16) / (innerWidth / 2)) * medioAlto * camara.aspect);
  } else {
    const altoPanel = ui.panel.offsetHeight || innerHeight * 0.45;
    corrimiento.addScaledVector(arriba, -((altoPanel / 2 + 42) / (innerHeight / 2)) * medioAlto);
  }
  posicion.add(corrimiento);
  objetivo.add(corrimiento);
  return { posicion, objetivo, distancia, azimut: Math.atan2(dir.x, dir.z) };
}

/**
 * Mueve la cámara. Si `seguir` es true, durante el viaje la cámara mira al
 * cóndor y recién al final se asienta sobre el producto: el ave "la lleva".
 */
function viajar(posicion, objetivo, { inmediato = false, duracion = 1000, seguir = false, alTerminar } = {}) {
  if (inmediato || reducirMovimiento) {
    camara.position.copy(posicion);
    controles.target.copy(objetivo);
    viaje = null;
    alTerminar?.();
    controles.update();
    return;
  }
  viaje = {
    t0: performance.now(), dur: duracion, seguir, alTerminar,
    desdePos: camara.position.clone(), desdeObj: controles.target.clone(),
    hastaPos: posicion, hastaObj: objetivo,
  };
}

function mostrarPanel(datos) {
  ui.categoria.textContent = datos.categoria ?? '';
  ui.nombre.textContent = datos.nombre;
  ui.resumen.textContent = datos.resumen ?? '';
  ui.detalles.replaceChildren(...(datos.detalles ?? []).map((d) => {
    const li = document.createElement('li');
    li.textContent = d;
    return li;
  }));
  ui.precio.textContent = datos.precio ?? '';
  const wa = catalogo.contacto?.whatsapp;
  if (wa) {
    ui.cta.href = `https://wa.me/${wa}?text=${encodeURIComponent(`Hola! Quería consultar por: ${datos.nombre}`)}`;
    ui.cta.hidden = false;
  } else {
    ui.cta.hidden = true;
  }
  ui.panel.hidden = false;
}

function marcarIndice() {
  for (const b of ui.indice.querySelectorAll('button')) b.setAttribute('aria-current', String(b.dataset.id === enfocado));
}

function enfocar(id, { inmediato = false } = {}) {
  const p = productos.get(id);
  if (!p) return;
  enfocado = id;
  resaltado = null;
  p.escala = 1;
  p.raiz.scale.setScalar(p.base);
  ui.etiqueta.hidden = true;
  ui.ayuda.style.opacity = '0';
  mostrarPanel(p.datos); // antes del encuadre, para medir el panel
  const { posicion, objetivo, distancia, azimut } = encuadre(p.raiz);

  const fijarLimites = () => Object.assign(controles, {
    minDistance: distancia * 0.6, maxDistance: distancia * 1.8,
    minAzimuthAngle: azimut - 0.9, maxAzimuthAngle: azimut + 0.9,
    minPolarAngle: 0.4, maxPolarAngle: 1.45,
  });

  let duracion = 1000;
  if (ave) {
    const destino = posicionPosado(p);
    ave.yawPosado = Math.atan2(posicion.x - destino.x, posicion.z - destino.z); // mira a quien mira
    if (inmediato || reducirMovimiento) {
      ave.obj.position.copy(destino);
      ave.obj.rotation.set(0, ave.yawPosado, 0);
      ave.estado = 'posado';
      ave.plegado = 1;
    } else {
      duracion = trazarRuta(destino, { llegada: new THREE.Vector3(0, 0.55, 0), alLlegar: 'posar' });
    }
  }
  viajar(posicion, objetivo, { inmediato, duracion, seguir: Boolean(ave), alTerminar: fijarLimites });
  history.replaceState(null, '', `#${id}`);
  marcarIndice();
}

function volver() {
  if (!enfocado) return;
  enfocado = null;
  ui.panel.hidden = true;
  ui.ayuda.style.opacity = '1';
  let duracion = 1100;
  if (ave?.vuela) {
    // Despega y retoma el círculo un poco más adelante de donde lo dejó.
    ave.fase += 0.6;
    const destino = puntoCirculo(ave.fase);
    const tangente = new THREE.Vector3(-Math.sin(ave.fase), 0, Math.cos(ave.fase));
    if (reducirMovimiento) { colocarEnCirculo(ave.fase); ave.estado = 'circulando'; ave.plegado = 0; }
    else duracion = Math.max(duracion, trazarRuta(destino, { llegada: tangente.multiplyScalar(-0.8), alLlegar: 'circular' }));
  } else if (ave) {
    // Un cóndor que no vuela en círculos vuelve a esperar donde lo ubicaron en Blender.
    ave.yawPosado = ave.yawInicial;
    if (reducirMovimiento) { ave.obj.position.copy(ave.centro); ave.obj.rotation.set(0, ave.yawInicial, 0); }
    else duracion = Math.max(duracion, trazarRuta(ave.centro, { llegada: new THREE.Vector3(0, 0.55, 0), alLlegar: 'posar' }));
  }
  viajar(vistaInicial.posicion.clone(), vistaInicial.objetivo.clone(), { duracion, alTerminar: limitesGenerales });
  history.replaceState(null, '', location.pathname + location.search);
  marcarIndice();
}

// ---------- Bucle ----------

const suavizar = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const suave = (a, b, t) => { const x = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const reloj = new THREE.Clock();
const _obj = new THREE.Vector3();

function cuadro() {
  const dtReal = Math.min(reloj.getDelta(), 0.25);
  const dt = Math.min(dtReal, 0.05);

  if (objetivoTema) actualizarTema(dtReal);
  actualizarTiron();
  if (!reducirMovimiento) {
    actualizarMascota(dt);
    mezclador?.update(dt);
  }

  if (viaje) {
    const t = Math.min((performance.now() - viaje.t0) / viaje.dur, 1);
    camara.position.lerpVectors(viaje.desdePos, viaje.hastaPos, suavizar(t));
    if (viaje.seguir && ave) {
      // Del punto de vista inicial pasa a seguir al ave, y al final se asienta en el producto.
      _obj.lerpVectors(viaje.desdeObj, ave.obj.position, suave(0, 0.3, t));
      controles.target.lerpVectors(_obj, viaje.hastaObj, suave(0.55, 1, t));
    } else {
      controles.target.lerpVectors(viaje.desdeObj, viaje.hastaObj, suavizar(t));
    }
    camara.lookAt(controles.target);
    if (t === 1) {
      const fin = viaje.alTerminar;
      viaje = null;
      fin?.();
      controles.update();
    }
  } else {
    controles.update();
  }
  controles.enabled = !viaje;

  for (const [id, p] of productos) {
    const meta = id === resaltado ? 1.06 : 1;
    p.escala += (meta - p.escala) * Math.min(dt * 12, 1);
    p.raiz.scale.setScalar(p.base * p.escala);
  }

  renderer.render(escena, camara);
  requestAnimationFrame(cuadro);
}

addEventListener('resize', () => {
  camara.aspect = innerWidth / innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  calcularVistaInicial();
  if (enfocado) enfocar(enfocado, { inmediato: true });
  else if (!viaje) { camara.position.copy(vistaInicial.posicion); controles.target.copy(vistaInicial.objetivo); limitesGenerales(); }
});

iniciar().catch((err) => {
  console.error(err);
  ui.cargando.textContent = 'No se pudo cargar el catálogo.';
});
requestAnimationFrame(cuadro);

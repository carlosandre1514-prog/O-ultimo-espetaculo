'use strict';
/* Céu noturno: uma cúpula com shader único (1 draw call) que acompanha a câmera.
   Degradê do horizonte (cor da neblina) ao zênite, estrelas que cintilam, nuvens que passam devagar
   iluminadas pela lua, e a lua com halo. Desenhado primeiro e sem profundidade: o cenário cobre por cima.
   Some no subsolo. */
(function (OE) {
  const SK = {};
  OE.Sky = SK;
  SK.init = function (scene) {
    const moon = new THREE.Vector3(-0.45, 0.62, 0.42).normalize();
    SK.mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      uniforms: { uFog: { value: new THREE.Color(0x0a0d14) }, uTime: { value: 0 }, uMoon: { value: moon }, uStars: { value: OE.Q.name === 'suave' ? 0.6 : 1 } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
      fragmentShader: [
        'uniform vec3 uFog; uniform float uTime; uniform vec3 uMoon; uniform float uStars; varying vec3 vDir;',
        'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
        'float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1,0)), f.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), f.x), f.y); }',
        'float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n(p); p *= 2.03; a *= 0.5; } return s; }',
        'void main(){',
        '  vec3 d = normalize(vDir); float e = d.y;',
        '  vec3 zen = vec3(0.012, 0.016, 0.035); vec3 col = mix(uFog, zen, smoothstep(-0.02, 0.55, e));',
        '  // estrelas',
        '  vec2 sp = d.xz / (e + 1.05) * 260.0; float st = step(0.9965, h(floor(sp))) * smoothstep(0.05, 0.35, e);',
        '  st *= 0.6 + 0.4 * sin(uTime * 2.0 + h(floor(sp) + 7.0) * 40.0); col += vec3(0.85, 0.88, 1.0) * st * uStars;',
        '  // lua e halo',
        '  float m = dot(d, uMoon); col += vec3(0.75, 0.8, 0.95) * smoothstep(0.9994, 0.9997, m); col += vec3(0.16, 0.19, 0.26) * pow(max(m, 0.0), 90.0) + vec3(0.05, 0.06, 0.09) * pow(max(m, 0.0), 8.0);',
        '  // nuvens',
        '  vec2 cp = d.xz / (e + 0.18) * 1.6 + vec2(uTime * 0.004, uTime * 0.0015); float c = smoothstep(0.42, 0.85, fbm(cp));',
        '  vec3 cc = mix(vec3(0.03, 0.035, 0.05), vec3(0.16, 0.17, 0.21), pow(max(m, 0.0), 6.0) * 0.8 + 0.2);',
        '  col = mix(col, cc, c * 0.85 * smoothstep(0.0, 0.25, e));',
        '  col = mix(uFog, col, smoothstep(-0.05, 0.12, e));',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'].join('\n')
    });
    SK.mesh = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), SK.mat); SK.mesh.renderOrder = -100; SK.mesh.frustumCulled = false; scene.add(SK.mesh);
  };
  SK.update = function (dt, cam) {
    if (!SK.mesh) return; SK.mesh.position.copy(cam.position); SK.mat.uniforms.uTime.value += dt;
    if (OE.scene.fog) SK.mat.uniforms.uFog.value.copy(OE.scene.fog.color);
    SK.mesh.visible = cam.position.y > -1.2 && !(OE.game && OE.game.mapView);
  };
})(window.OE);

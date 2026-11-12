'use strict';
/* Níveis de gráfico no estilo dos jogos mobile de mapa grande (Free Fire e afins):
   o jogador escolhe Suave / Padrão / Alto e o FPS (30 ou 60); tudo é decidido NA CARGA,
   nada muda sozinho durante o jogo (sem resolução adaptativa).
     - luzes reais simultâneas (o maior custo no celular)
     - material: Phong (barato) x Standard/PBR (caro)
     - textura 256 x 512 px, relevo (bump) só no Alto
     - distância de visão + neblina mais densa
     - densidade e alcance da grama, poeira, refletores da tenda
     - antisserrilhado e densidade de pixels FIXA por nível
   Celular/aparelho fraco começa no Suave; a escolha fica salva no aparelho. */
(function (OE) {
  const PRESETS = {
    suave:  { label: 'Suave',  lights: 2, pbr: false, tex: 256, bump: false, far: 72,  fog: 1.35, grass: 0.45, grassDist: 26, dust: false, spots: false, aa: false, dpr: 1.0, lodStruct: 70, lodDetail: 32, lodClutter: 14, propDist: 45, shadow: 0 },
    padrao: { label: 'Padrão', lights: 4, pbr: false, tex: 512, bump: false, far: 95,  fog: 1.12, grass: 0.75, grassDist: 34, dust: true,  spots: true,  aa: true,  dpr: 1.5, lodStruct: 88, lodDetail: 42, lodClutter: 18, propDist: 60, shadow: 512 },
    alto:   { label: 'Alto',   lights: 6, pbr: true,  tex: 512, bump: true,  far: 115, fog: 1.0,  grass: 1.0,  grassDist: 42, dust: true,  spots: true,  aa: true,  dpr: 2.0, lodStruct: 100, lodDetail: 50, lodClutter: 22, propDist: 80, shadow: 1024 }
  };
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  OE.saveQuality = (preset, fps) => { try { localStorage.setItem('oe.quality', preset); localStorage.setItem('oe.fps', String(fps)); } catch (e) {} };
  // GPU real (WEBGL_debug_renderer_info) + RAM: celular de 3 GB com Adreno 6xx/Mali-G7x roda o Padrão liso;
  // GPUs de entrada (Adreno 3xx/4xx/50x, Mali-4xx/T/G31/G51/G52, PowerVR) ficam no Suave.
  function gpuName() {
    try { const c = document.createElement('canvas'), gl = c.getContext('webgl'); if (!gl) return '';
      const ext = gl.getExtension('WEBGL_debug_renderer_info'); const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); return String(r || ''); } catch (e) { return ''; }
  }
  function autoPreset() {
    const mobile = (navigator.userAgentData && navigator.userAgentData.mobile) || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches;
    const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4, gpu = gpuName();
    OE.gpu = gpu;
    if (mobile) {
      let tier = 1;                                             // 0 suave, 1 padrão, 2 alto
      const ad = gpu.match(/Adreno[^0-9]*(\d{3})/i), ma = gpu.match(/Mali-?(G|T)?(\d+)/i);
      if (ad) { const n = +ad[1]; tier = n >= 730 ? 2 : n >= 610 ? 1 : 0; }
      else if (ma) { const n = +ma[2], g = (ma[1] || '').toUpperCase(); tier = g !== 'G' ? 0 : n >= 710 ? 2 : (n >= 72 && n < 100) || n >= 610 ? 1 : 0; }
      else if (/PowerVR|SGX|Vivante|VideoCore/i.test(gpu)) tier = 0;
      else if (/Xclipse|Immortalis|Apple/i.test(gpu)) tier = 2;
      // deviceMemory arredonda para baixo em potência de 2: aparelho de 3 GB informa 2
      if (mem < 2) tier = 0; else if (mem < 8) tier = Math.min(tier, 1);
      if (cores < 6) tier = Math.min(tier, 1);
      return ['suave', 'padrao', 'alto'][tier];
    }
    if (/SwiftShader|llvmpipe|Software/i.test(gpu)) return 'suave';
    if (/Intel.*(HD|UHD) Graphics( [2-6]\d\d)?\b/i.test(gpu) && !/Iris|Arc/i.test(gpu)) return 'padrao';
    return mem <= 4 ? 'padrao' : 'alto';
  }
  const urlQ = (location.search.match(/q=(suave|padrao|alto)/) || [])[1];
  const name = urlQ || get('oe.quality') || autoPreset();
  OE.Q = Object.assign({ name, fps: +(get('oe.fps') || 60) }, PRESETS[name] || PRESETS.suave);
  OE.Q.presets = PRESETS;
  OE.charId = () => get('oe.char') || 'lucas';
})(window.OE);

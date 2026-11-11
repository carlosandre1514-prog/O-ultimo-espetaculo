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
    suave:  { label: 'Suave',  lights: 2, pbr: false, tex: 256, bump: false, far: 72,  fog: 1.35, grass: 0.45, grassDist: 26, dust: false, spots: false, aa: false, dpr: 1.0, lodStruct: 70, lodDetail: 32, lodClutter: 14, propDist: 45 },
    padrao: { label: 'Padrão', lights: 4, pbr: false, tex: 512, bump: false, far: 95,  fog: 1.12, grass: 0.75, grassDist: 34, dust: true,  spots: true,  aa: true,  dpr: 1.5, lodStruct: 88, lodDetail: 42, lodClutter: 18, propDist: 60 },
    alto:   { label: 'Alto',   lights: 6, pbr: true,  tex: 512, bump: true,  far: 115, fog: 1.0,  grass: 1.0,  grassDist: 42, dust: true,  spots: true,  aa: true,  dpr: 2.0, lodStruct: 100, lodDetail: 50, lodClutter: 22, propDist: 80 }
  };
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  OE.saveQuality = (preset, fps) => { try { localStorage.setItem('oe.quality', preset); localStorage.setItem('oe.fps', String(fps)); } catch (e) {} };
  function autoPreset() {
    const mobile = (navigator.userAgentData && navigator.userAgentData.mobile) || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches;
    const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
    if (mobile) return mem >= 8 && cores >= 8 ? 'padrao' : 'suave';
    return mem <= 4 ? 'padrao' : 'alto';
  }
  const urlQ = (location.search.match(/q=(suave|padrao|alto)/) || [])[1];
  const name = urlQ || get('oe.quality') || autoPreset();
  OE.Q = Object.assign({ name, fps: +(get('oe.fps') || 60) }, PRESETS[name] || PRESETS.suave);
  OE.Q.presets = PRESETS;
})(window.OE);

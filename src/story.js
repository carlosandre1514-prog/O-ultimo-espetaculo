'use strict';
/* O ÚLTIMO ESPETÁCULO — história, capítulos, documentos, enigmas e finais.
   Fluxo:
   0 Chegada   — o portão está ABERTO e uma caixinha toca. Ao entrar, ele se fecha sozinho: você está preso.
   1 Investigar— documentos e gravações contam a noite de 14/03/1987. Chaves abrem novas áreas
                 (alojamentos -> camarim 2 -> subsolo; depósito -> fusível -> gerador).
   2 Subsolo   — sala de controle, arquivos (senha = data da tragédia) e a sala secreta do proprietário.
   3 A verdade — você foi atraído: seu nome está na lista do "elenco". A caixinha original mantém a noite.
   4 Final     — com a energia ligada, quebre a caixinha no picadeiro: o Mestre enlouquece, o portão se abre.
                 Fuja = "O espetáculo foi interrompido". Pego nessa hora = "Agora você faz parte do espetáculo". */
(function (OE) {
  const St = { ch: 0, docs: new Map(), found: new Set(), flags: {} };
  OE.Story = St;
  const $ = id => document.getElementById(id);

  St.objective = function (t) { St.obj = t; const e = $('obj'); if (!e) return; e.textContent = t; e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); };
  St.setChapter = function (n, obj) { if (n <= St.ch && obj === undefined) return; St.ch = Math.max(St.ch, n); if (obj) St.objective(obj); OE.Audio.setTheme && OE.Audio.setTheme(St.ch); };

  /* ---------- documentos e gravações ---------- */
  const DOCS = [
    ['carta', 'Carta sem remetente', 'documento', 'Se você quer saber o que aconteceu com os desaparecidos do Gran Circo Estrela, venha sozinho, depois da meia-noite.\nO portão estará aberto.\n\nNão traga ninguém. O espetáculo só começa quando a plateia está completa.\n\n— Um amigo do espetáculo'],
    ['ingresso', 'Ingresso amassado', 'documento', 'GRAN CIRCO ESTRELA\nO ÚLTIMO ESPETÁCULO\nSessão das 21h — 14 / 03 / 1987\nFileira 7, cadeira 4\n\nNo verso, a lápis: "o código de tudo é a data".'],
    ['programa', 'Programa do espetáculo', 'documento', 'Esta noite, pela primeira e ÚLTIMA vez:\nO MESTRE DE CERIMÔNIAS apresenta o seu ELENCO ETERNO.\nTrapezistas que nunca caem. Palhaços que nunca envelhecem. Uma plateia que nunca vai embora.\n\nPedimos que ninguém saia antes do fim.'],
    ['contrato', 'Contrato de artista', 'documento', 'Cláusula 9: o artista que assinar este contrato pertencerá ao espetáculo enquanto o espetáculo durar.\nCláusula 10: o espetáculo dura para sempre.\n\nAssinatura do proprietário: um borrão vermelho.'],
    ['fita1', 'Fita cassete — "Ensaio 300"', 'gravação', '[chiado]\n— Ensaio número trezentos. Eles riem, mas não é o suficiente. Nunca é suficiente.\n— O espetáculo perfeito precisa de um elenco que nunca vá embora... e de uma plateia que nunca saia.\n— A caixinha vai segurar a noite. Enquanto ela tocar, nada termina.\n[uma risada grave, distorcida]\n[fim da gravação]'],
    ['jornal', 'Recorte de jornal — 15/03/1987', 'documento', 'TRAGÉDIA NO CIRCO: 37 DESAPARECIDOS\nDurante a apresentação de ontem, as luzes do Gran Circo Estrela se apagaram por cerca de um minuto. A música continuou tocando. Quando a energia voltou, artistas e espectadores haviam sumido. O proprietário não foi encontrado. A polícia lacrou o local.'],
    ['fita2', 'Fita cassete — "Para o próximo"', 'gravação', '[chiado]\n— Se você está ouvindo isto, já entrou. O portão sempre fecha.\n— Ele te escolheu. Todos nós fomos escolhidos.\n— A caixinha original fica com ele, lá embaixo, na sala dele. Quebre-a no picadeiro, com as luzes acesas, e talvez o espetáculo acabe.\n— Não deixe ele te pegar no escuro...\n[fim da gravação]'],
    ['foto', 'Foto do elenco de 1987', 'foto', 'Uma fotografia desbotada do elenco, em frente à lona.\nNa última fileira da plateia, atrás dos artistas, um rosto que você conhece muito bem.\nO seu.'],
    ['lista', 'Caderno do proprietário', 'documento', 'Lista do próximo espetáculo:\n— Trapezista: ok\n— Domador: ok\n— Plateia: ok\n— Protagonista: chegando. O sangue dele estava na fileira 7 naquela noite.\n\nEle acha que veio investigar. Ele veio para o ensaio.']
  ];
  DOCS.forEach(([id, title, kind, text]) => St.docs.set(id, { id, title, kind, text }));
  St.read = function (id) {
    const d = St.docs.get(id); if (!d) return; const first = !St.found.has(id); St.found.add(id);
    if (d.kind === 'gravação') OE.Audio.play('tape', null, 1);
    OE.UI.note((d.kind === 'gravação' ? '▶ ' : '') + d.title, d.text);
    if (first) { St.renderJournal(); St.onFound(id); }
  };
  St.renderJournal = function () {
    const e = $('journal'); if (!e) return;
    e.innerHTML = '<h4>Diário · ' + St.found.size + ' de ' + St.docs.size + ' encontrados</h4>' +
      [...St.docs.values()].map(d => St.found.has(d.id) ? '<button data-doc="' + d.id + '">' + (d.kind === 'gravação' ? '▶ ' : d.kind === 'foto' ? '▣ ' : '✎ ') + d.title + '</button>' : '<span>???</span>').join('');
    e.querySelectorAll('[data-doc]').forEach(b => b.addEventListener('click', () => St.read(b.dataset.doc)));
  };
  // Documento no mapa: papel/fita/foto que dá para pegar
  St.place = function (id, x, y, z, yaw) {
    const d = St.docs.get(id), mesh = OE.partMesh(b => {
      if (d.kind === 'gravação') { b.box(OE.MAT.rubber, 0, 0, 0, 0.1, 0.017, 0.064); b.box(OE.MAT.paint, 0, 0.017, 0, 0.07, 0.002, 0.03, { tint: 0xd8d0b8 }); }
      else if (d.kind === 'foto') b.box(OE.MAT.paint, 0, 0, 0, 0.15, 0.004, 0.11, { tint: 0xc8b898 });
      else b.box(OE.MAT.paint, 0, 0, 0, 0.21, 0.003, 0.28, { tint: 0xe0d6bc });
    });
    mesh.position.set(x, y, z); mesh.rotation.y = yaw || 0; OE.addDyn(mesh);
    const glow = OE.Lights.add({ x, y: y + 0.05, z, size: 0.012, color: 0xffe0a0, intensity: 0, mode: 'pulse', noLight: true, halo: 0.18 });
    OE.Interact.add({ pos: new THREE.Vector3(x, y + 0.05, z), radius: 1.6, label: () => 'Ler: ' + d.title, use: () => { St.read(id); glow.on = false; } });
  };

  /* ---------- enigma: painel com senha ---------- */
  St.keypad = function (door, code) {
    const box = $('keypad'), disp = $('kpDisp'); let val = '';
    const show = () => { disp.textContent = (val + '____').slice(0, 4).split('').join(' '); };
    box.classList.add('on'); OE.game.paused = true; show();
    box.onclick = e => {
      const k = e.target.dataset.k; if (!k) return; OE.Audio.play('click', null, 0.5);
      if (k === 'x') { box.classList.remove('on'); OE.game.paused = false; return; }
      if (k === '<') val = val.slice(0, -1); else if (val.length < 4) val += k; show();
      if (val.length === 4) setTimeout(() => {
        if (val === code) { door.lock = null; box.classList.remove('on'); OE.game.paused = false; OE.Audio.play('switch', door.pos, 1); OE.UI.msg('A trava cedeu. 14/03 — a data de tudo.', 3); OE.emit('navChanged'); St.setChapter(2); }
        else { OE.Audio.play('locked', null, 1); val = ''; show(); disp.classList.add('err'); setTimeout(() => disp.classList.remove('err'), 400); }
      }, 220);
    };
  };

  /* ---------- gatilhos ---------- */
  St.onFound = function (id) {
    if (id === 'lista' || id === 'foto') { if (St.found.has('lista')) St.objective(OE.state.items.has('caixinha') ? 'Leve a caixinha ao picadeiro, com as luzes acesas' : 'Pegue a caixinha de música original'); }
    if (St.ch < 1 && St.found.size >= 3) St.setChapter(1, 'Descubra o que aconteceu na noite de 14/03/1987');
  };
  St.update = function (dt, P) {
    if (!OE.game.running) return;
    // portão se fecha quando você entra
    if (St.ch === 0 && !St.flags.trapped && P.pos.z < 93 && P.pos.y > -1 && Math.abs(P.pos.x) < 40) St.trap();
    if (St.ch === 0 && St.flags.trapped && OE.state.items.has('chave_camarim')) St.setChapter(1, 'Os camarins guardam segredos. Encontre o camarim 2');
    if (P.pos.y < -2 && !St.flags.under) { St.flags.under = true; St.setChapter(2, 'Explore o subsolo. Encontre os arquivos do circo'); }
    if (St.final) St.finalUpdate(dt, P);
  };
  St.trap = function (silent) {
    St.flags.trapped = true; const gates = OE.doors.filter(d => d.name === 'portão');
    gates.forEach(g => { g.lock = null; g.close('player-force'); g.target = 0; g.lock = 'sealed'; });
    if (silent) return;
    OE.Audio.play('metal', { x: 0, y: 1, z: 100 }, 1.5); setTimeout(() => OE.Audio.play('laugh', { x: 0, y: 3, z: 40 }, 0.8), 1200);
    OE.UI.msg('O portão se fechou sozinho atrás de você.', 4); St.objective('Você está preso. Encontre outra saída');
  };
  // caixinha original (sala secreta) e final
  St.pickBox = function () {
    OE.state.items.add('caixinha'); OE.ITEMS.caixinha = 'Caixinha de música original'; OE.UI.inventory();
    St.setChapter(3, OE.state.power ? 'Leve a caixinha ao picadeiro e quebre-a' : 'Ligue o gerador: o picadeiro precisa de luz');
    OE.Audio.play('sting', null, 1); OE.UI.msg('A caixinha está quente. A melodia toca sozinha dentro dela.', 4);
  };
  St.ringReady = () => OE.state.items.has('caixinha') && !St.final;
  St.breakBox = function () {
    if (!OE.state.power) { OE.UI.msg('Está escuro demais. O espetáculo só termina com as luzes acesas.', 3); return; }
    St.final = { t: 0 }; OE.state.items.delete('caixinha'); OE.UI.inventory(); St.setChapter(4, 'FUJA PELO PORTÃO PRINCIPAL!');
    OE.Audio.play('crack', null, 1); OE.Audio.play('laugh', null, 1.4);
    OE.Lights.emitters.forEach(e => { if (e.group === 'tenda' || e.mode === 'cycle') e.mode = 'strobe'; });
    OE.doors.filter(d => d.name === 'portão').forEach(g => { g.lock = null; g.toggle({ x: 0, z: 103 }, 'story'); });
    const E = OE.game.enemy; E.enraged = true; E.state = 'chase'; E.aware = 3; E.lastSeen = OE.game.player.pos.clone();
    OE.game.setCheckpoint({ name: 'Picadeiro', x: 0, y: 0, z: 8, yaw: 0, r: 2 }, true);
    OE.UI.msg('A música para. Todas as luzes do circo acendem de uma vez. Ele grita.', 5);
  };
  St.finalUpdate = function (dt, P) {
    St.final.t += dt; const E = OE.game.enemy;
    if (E.enraged && E.state !== 'chase' && E.state !== 'grab' && Math.random() < dt * 0.3) { E.state = 'chase'; E.aware = 3; E.lastSeen = P.pos.clone(); }
    if (P.pos.z > 101.5 && !St.ended) St.ending(true);
  };
  St.ending = function (good) {
    St.ended = true; OE.game.paused = true; const e = $('ending');
    $('endT').textContent = good ? 'O ESPETÁCULO FOI INTERROMPIDO' : 'AGORA VOCÊ FAZ PARTE DO ESPETÁCULO';
    $('endB').textContent = good ? 'Do lado de fora, o silêncio é absoluto. Atrás de você, as luzes da lona se apagam uma a uma.\nPela primeira vez desde 1987, a música não volta a tocar.\n\nOu quase.' : 'Você acorda na fileira 7, cadeira 4. A plateia inteira olha para o picadeiro.\nO Mestre de Cerimônias faz uma reverência.\n\nO último espetáculo ainda não terminou.';
    e.classList.add('on', good ? 'good' : 'bad'); if (document.pointerLockElement) document.exitPointerLock();
    OE.Audio.play(good ? 'musicbox' : 'laugh', null, 1);
  };
  // morte durante a fuga final = final ruim
  OE.on('caught', () => { if (St.final && !St.ended) setTimeout(() => St.ending(false), 3800); });

  /* ---------- início ---------- */
  St.intro = function (done) {
    const e = $('intro'), lines = ['Gran Circo Estrela. Fechado desde 14 de março de 1987.', 'Trinta e sete pessoas desapareceram durante a última apresentação.', 'Ontem, uma carta sem remetente chegou até você.', '"O portão estará aberto."'];
    e.classList.add('on'); let i = 0; const p = $('introL');
    const next = () => { if (i >= lines.length) { e.classList.remove('on'); done(); return; } p.style.opacity = 0; setTimeout(() => { p.textContent = lines[i++]; p.style.opacity = 1; setTimeout(next, 3200); }, 600); };
    e.onclick = () => { i = lines.length; next(); }; next();
  };
  // depois da cinemática: os amigos sumiram, o portão está lacrado
  St.startAfterCine = function () {
    St.found.add('carta'); St.renderJournal(); St.flags.trapped = true;
    St.objective('Seus amigos sumiram. Encontre uma saída e descubra a verdade');
    OE.UI.msg('Eles estavam aqui um segundo atrás.', 4);
  };
  St.start = function () {
    St.found.add('carta'); St.renderJournal();
    St.objective('Investigue o circo. O portão está aberto');
    OE.UI.msg('Uma caixinha de música toca em algum lugar lá dentro...', 4); OE.Audio.play('musicbox', { x: 0, y: 2, z: 20 }, 0.9);
  };
})(window.OE);

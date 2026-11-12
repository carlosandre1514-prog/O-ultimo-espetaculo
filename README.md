# O Último Espetáculo

Jogo de terror em primeira pessoa num complexo circense abandonado — o **Gran Circo Estrela**, fechado em 1987
depois do "último espetáculo". Roda no navegador (PC e Android), instala como app (PWA), funciona offline e
também sai em **um único arquivo HTML** que abre direto no celular.

Tecnologia: **Three.js r128** (o mesmo do MiniBlender), sem nenhum download de textura: tudo é gerado na carga.

## APK (Android)
A cada envio para o GitHub, o workflow **Gerar APK** (`.github/workflows/android.yml`) compila o app e publica o
`.apk` na página **Releases** do repositório. No celular: abra Releases, baixe o `.apk` mais recente e permita
"instalar apps desconhecidos". O app (`android/`) é uma casca nativa com WebView: abre direto na horizontal, em tela
cheia, com o jogo inteiro embutido (funciona sem internet); o botão voltar pausa.

## PC (Windows)
O mesmo workflow gera também `O-Ultimo-Espetaculo-PC-Windows-vX.zip` (Electron, pasta `desktop/`) e anexa ao mesmo
Release do APK. Extraia e abra `O Ultimo Espetaculo.exe` — tela cheia (F11 alterna), GPU dedicada preferida, o jogo é
servido por um servidor local 127.0.0.1 (como o WebViewAssetLoader do Android), funciona sem internet.

## Qualidade visual x desempenho (alvo: Android com 3 GB de RAM liso)
- **Nível automático pela GPU real** (`WEBGL_debug_renderer_info`) + RAM + núcleos: Adreno 610+/Mali-G72+ → Padrão,
  Adreno 730+/Mali-G710+/Xclipse com 8 GB → Alto, GPUs de entrada → Suave. Sempre pode trocar no menu.
- **Sombras dinâmicas da lanterna** (Padrão 512, Alto 1024; Suave sem): só o cone da lanterna (18 m), mapa de sombra
  atualizado uma vez por quadro e só com a lanterna acesa (o espelho não refaz a sombra).
- **Céu noturno** num único shader (degradê que se funde à neblina, estrelas, lua com halo, nuvens passando).
- **Granulado de filme + vinheta** por CSS (composição na GPU, custo ~zero; desligado no Suave).
- **Sem engasgos:** o detalhe de cada setor é construído uma vez e mantido; na tela de carga a câmera passa por todos os
  setores com lanterna e sombra ligadas para compilar todos os shaders antes do jogo começar.

## Rodar

```bash
python3 -m http.server 8000      # na pasta do projeto
# abra http://localhost:8000
python3 tools/build_single.py    # gera dist/UltimoEspetaculo.html (arquivo único, abre sem servidor)
```

Controles — **PC:** WASD andar · mouse olhar · Shift correr · C agachar · E interagir/esconder/sair · F lanterna ·
F3 desempenho · V espectador · M planta vista de cima. **Celular:** lado esquerdo anda, lado direito olha, botões
🔦 🏃 ⤓ ✋.

## O mapa

```
     D Alojamentos        C Bastidores/Camarins     E Depósito          galpão + escada
     (bunks, cozinha,     (camarins, maquiagem,     (porta-paletes,     de serviço
      refeitório)          vestiário, escritórios)   mezanino)
                                │ passagem coberta
     G Parque              B GRANDE TENDA  ─────────  F Área dos animais
     roda-gigante,         arquibancadas, picadeiro,   estábulo, baias, jaulas,
     carrossel, barracas,  passarelas a 9,5 m           carroças-jaula
     bate-bate, Trem
     Fantasma                praça de entrada
                       A ENTRADA: portão acorrentado, bilheterias, guarita
                          estrada e estacionamento (fora da cerca)
     H SUBSOLO (y = -4,5): sob os bastidores, túnel até o galpão dos animais, sala secreta
```

| Setor | Arquivo | Destaques |
|---|---|---|
| A Entrada | `src/map/CircusEntrance.js` | Portão de ferro sob arco com letreiro, 2 bilheterias integradas à cerca, guarita, carros, outdoor, catracas. **3 entradas alternativas**: porta dos fundos da bilheteria oeste e dois buracos na cerca |
| B Tenda | `src/map/MainCircusTent.js` | Lona rasgada sobre 4 mastros de 24 m + 12 intermediários + 36 de parede, cabos e estacas, picadeiro, 4 blocos de arquibancada de 8 fileiras (dá para subir e andar **embaixo** delas), portal com cortinas e coreto, passarelas técnicas (anel + pontes + plataforma central) com **duas escadas**, trecho da passarela desabado, refletores que acendem sozinhos (SpotLight real + cone de luz) |
| C Bastidores | `src/map/Backstage.js` | Corredor + 12 ambientes: sala de preparação, 2 escritórios, saguão, figurinos, escada do subsolo, 2 camarins (espelhos com lâmpadas, quase todas queimadas), maquiagem, vestiário com armários, banheiros com cabines |
| D Alojamentos | `src/map/Dormitories.js` | 4 alojamentos com beliches, 2 quartos de artistas, banheiro coletivo, cozinha, refeitório |
| E Depósito | `src/map/Warehouse.js` | Galpão 40×38×9 m, porta de enrolar emperrada a 1 m (passa agachado), porta-paletes, labirinto de caixotes, contêiner, objetos sob lona, mezanino com escritório |
| F Animais | `src/map/AnimalArea.js` | Pátio cercado, estábulo com baias e portões de ferro, ração, lavagem, equipamentos, selaria, jaula dos leões, carroças-jaula, galpão com a escada de serviço |
| G Parque | `src/map/AbandonedPark.js` | Roda-gigante de 27 m (2 gôndolas caídas), carrossel com cavalos, 6 barracas, bate-bate, Trem Fantasma com corredores internos, árvores, mato alto |
| H Subsolo | `src/map/Underground.js` | Túneis, casa do gerador, sala elétrica, duto técnico (só agachado — o inimigo não passa), exaustores, casa de bombas, depósitos e uma **sala secreta** atrás de uma estante empurrável |

Arquitetura real: paredes com espessura geradas por `Arch.plan` (cada face com o acabamento do seu cômodo),
portas com batente, janelas com peitoril, caixilho e vidro (às vezes quebrado), telhados de duas águas com empenas,
escadas com corrimão, guarda-corpos, treliças, cercas de tela com arame farpado. Deterioração em textura
(ferrugem, tinta descascando, umidade subindo das paredes, rachaduras, lona com buracos) e em geometria
(tábuas soltas, cacos, entulho, lonas sobre objetos, mato).

### Brinquedos do parque (modelados no MiniBlender)
`tools/build_rides_miniblender.mjs` abre o MiniBlender (repositório irmão) num navegador automatizado e modela cada
brinquedo pela API dele (primitivas, modificadores Array e Mirror, materiais), exporta GLB e anota colisores e
esconderijos. `tools/optimize_models.cjs` junta cada brinquedo numa malha só com textura-paleta (1 draw call) e o jogo
aplica ferrugem e sujeira no shader. Brinquedos: **montanha-russa** (trem parado na subida, trilho arrancado,
carrinho descarrilado), **barco viking**, **chapéu mexicano**, **xícaras malucas**, **torre de queda** (30 m),
**trenzinho infantil** e **tobogã gigante** — além de roda-gigante, carrossel, bate-bate e Trem Fantasma.

## Online (cooperativo, até 6)
Na tela inicial: **CRIAR SALA ONLINE** gera um código de 4 letras; os amigos digitam o código e tocam em **ENTRAR NA
SALA**; o anfitrião toca em **COMEÇAR PARTIDA**. Cada um joga com um adolescente diferente (se dois escolherem o mesmo,
o segundo recebe outro). Conexão P2P (WebRTC) via PeerJS, com o serviço público de apresentação do PeerJS (sem conta).
O anfitrião roda a IA do Mestre de Cerimônias, que caça o jogador visível mais próximo; portas, itens, gerador,
documentos, final e mortes são compartilhados — quem é pego vê a morte em 1ª pessoa, os outros em 3ª.
Teste: `node tests/coop.mjs` (servidor PeerJS local + dois navegadores). Funciona no APK e no navegador; não no
artefato do Claude, que bloqueia WebRTC. Redes móveis muito restritivas podem impedir a conexão direta (sem TURN).

## História e cinemática
- **Cinemática de abertura** (`src/cinematic.js`, ~45 s, no motor, com os 6 adolescentes): a estrada à noite, o grupo
  chega, falas diante do portão aberto, a caixinha toca e uma silhueta de cartola aparece na praça, o protagonista
  entra primeiro e o portão se fecha sozinho, os amigos batem nas grades, apagão com a risada do Mestre — quando a
  luz volta, eles sumiram. A câmera entra nos olhos do protagonista e o jogo começa. Botão "PULAR".
- **História** (`src/story.js`): capítulos, 9 documentos/gravações (diário no menu de pausa), painel com senha
  (14/03), caixinha de música original na sala secreta, final no picadeiro com energia ligada e fuga pelo portão
  — dois finais.
- **Diretor de terror** (`src/director.js`): risadas, crianças, passos atrás, silhuetas que somem quando olhadas,
  portas que se abrem sozinhas, luzes em rajada, brinquedos que ligam sozinhos, manequins que mudam de lugar e a
  caixinha distorcida que anuncia o Mestre de Cerimônias quando ele está perto.

## Sistemas

| Sistema | Arquivo |
|---|---|
| Jogador em 1ª pessoa (colisão, degraus, agachar, fôlego, passos com ruído, lanterna, espectador) | `src/engine/player.js` |
| Colisões (caixas orientadas + cilindros, hash espacial, raios de visão) | `src/engine/collision.js` |
| **Esconderijos** (`HidingSpots`) | `src/engine/hiding.js` |
| **Objetos interativos** (`InteractiveObjects`) | `src/engine/interact.js` |
| **Iluminação/atmosfera** (`EnvironmentLighting`) | `src/engine/lighting.js` |
| Setores, carga/descarga, oclusão e LOD | `src/engine/sectors.js`, `src/engine/builder.js` |
| Inimigo (O Palhaço) e navegação | `src/engine/enemy.js`, `src/engine/nav.js` |
| Áudio sintetizado (vento, caixinha de música, rangidos, coração) | `src/engine/audio.js` |
| Modelos GLB externos / Meshy.ai | `src/engine/models.js`, `tools/meshy_generate.mjs` |

### Esconderijos (101 no mapa)
- **Fechados (35):** guarda-roupas, armários de madeira e da cozinha, armários metálicos, baús, cabines de banheiro.
- **Abertos (41):** debaixo de camas, beliches, mesas e bancos; atrás de cortinas, do palco, de equipamentos, balcões.
- **Improvisados (25):** lixeiras grandes e caçambas (com tampa), caixote gigante, contêiner, feno, cocho de ração,
  gôndola caída, embaixo das arquibancadas, entre tubulações.

Cada um tem ponto de entrada, animação (porta/tampa abre, câmera entra, fecha), câmera com limites de olhar
(rente ao chão embaixo da cama, frestas do armário metálico desenhadas na tela), ocupação, ponto de saída
**validado contra colisões** (se a frente estiver bloqueada, tenta laterais) e regras com o inimigo:
se ele **viu você entrar**, vai até lá e te puxa; se não viu, um esconderijo aberto ainda pode te denunciar
quando ele passa perto; lanterna acesa lá dentro aumenta muito a exposição.

### Objetos interativos (todos funcionais)
76 portas (madeira, metal, grade, portão de baia; trancadas por chave, emperradas, **ferrolho de um lado só = atalho**),
porta de enrolar e portão de correr, gavetas que guardam itens, interruptores e alavancas (grupos de luz),
gerador (precisa do fusível; liga a energia e faz um barulho enorme), estante empurrável, caixinhas de música
(distração), garrafas/latas no chão (ruído se você não estiver agachado), bilhetes.

Progressão de exemplo: chave do cadeado (guarita) → abre o portão por dentro · chave do camarim 2 (criado-mudo do
alojamento) → chave do subsolo (penteadeira do camarim 2) → subsolo · chave do escritório (bancada do depósito) →
fusível → gerador → energia (porta de enrolar, luzes, roda-gigante).

### Níveis de gráfico (como nos jogos mobile de mapa grande)
Na tela inicial: **Suave / Padrão / Alto** e **30 / 60 FPS** (fica salvo no aparelho; celular começa no Suave).
Tudo é fixado na carga, nada muda sozinho durante o jogo.

| | Suave | Padrão | Alto |
|---|---|---|---|
| Luzes reais ao mesmo tempo | 2 | 4 | 6 |
| Material | Phong | Phong | PBR (Standard) |
| Texturas / relevo | 256 px, sem relevo | 512 px, sem relevo | 512 px, com relevo |
| Distância de visão | 72 m (neblina +35%) | 95 m | 115 m |
| Grama | 45%, até 26 m | 75%, até 34 m | 100%, até 42 m |
| Poeira, refletores da tenda | não | sim | sim |
| Antisserrilhado / densidade de pixels | não / 1× | sim / 1,5× | sim / 2× |

Medição no mesmo quadro (navegador sem GPU): Suave ≈ 6× mais rápido que Alto.

### Desempenho
- Geometria estática **mesclada** por material/célula de 40 m; materiais e geometrias compartilhados.
- **InstancedMesh** para grama, árvores e todas as lâmpadas; todos os halos de luz em **um** `THREE.Points`.
- **Frustum culling** por pedaço + plano distante casado com a neblina.
- **Oclusão por ambiente (PVS):** dentro da tenda/prédios só desenha o que dá para ver pelas aberturas; subsolo
  e superfície se excluem (exceto junto das escadas).
- **Carregamento por setores:** miudezas criadas ao chegar perto (~48 m) e **descarregadas** ao se afastar (~72 m),
  com seus colisores; interiores só aparecem perto dos prédios; portas/gavetas cortadas por distância.
- **LOD:** miudezas somem a 22 m, estrutura a 100 m.
- Iluminação: pool fixo de 6 PointLights redistribuídas para as lâmpadas mais relevantes (o número de luzes nunca
  muda → sem recompilar shaders), sem sombras dinâmicas.
- Resolução fixa (até 2× DPR), antialias ligado — **nada de resolução adaptativa nem desfoque**.

Medição em Chromium headless (SwiftShader, sem GPU): 76–240 draw calls e 60–183 mil triângulos conforme o ponto
do mapa. A meta de ≤150 draw calls do Motor-Engine-3D é atingida no subsolo, estábulo e depósito; praça, parque e
alojamentos ficam entre 200 e 240.

## Testes

```bash
node tests/smoke.mjs        # carrega, sem erros
node tests/gameplay.mjs     # portas, esconderijos, caminhada por todo o grafo, pontos de prisão
node tests/enemy.mjs        # perseguição/captura, esconderijo visto, navegação
node tests/perf.mjs         # draw calls e triângulos em 10 pontos
W=960 H=540 node tests/shots.mjs <pasta> '[{"n":"x","walk":[0,0,20],"yaw":0,"flash":true}]'
```

Última execução: 76/76 portas abrem e fecham; 101/101 esconderijos com entrada, câmera, saída livre; 0 pontos
onde o jogador fica preso (400 amostras); o robô percorreu 13 046 trechos com a física real e travou em 86, quase
todos porque o teste deixa **todas** as portas abertas e a folha bloqueia o corredor; o inimigo alcança
1242 de 1255 pontos e chegou a 24 de 25 destinos aleatórios; captura e respawn no checkpoint funcionam.

## Reaproveitado dos outros repositórios
- **MiniBlender:** Three.js r128 e GLTFLoader, a malha humana do MakeHuman (vira o corpo do Palhaço via
  `tools/build_enemy.py`), a textura de terno, o esquema de PWA (manifest + service worker) e o gerador de arquivo
  único (`tools/build_single.py`).
- **Motor-Engine-3D:** o orçamento de quadro (≤150 draw calls, ≤300 mil triângulos, ≤8 luzes) e as técnicas de
  instancing, culling e zero alocação no laço guiaram o motor.

## Meshy.ai (integrado)
Modelos do Meshy já no jogo (`assets/models/`, carregados por `src/engine/models.js` a partir do `manifest.json`):

| Modelo | Origem | Onde | Tamanho |
|---|---|---|---|
| **O Palhaço (inimigo)** — "Undead Killer Clown" da conta | imagem→3D, *remesh* 2,7 mi → 31 mil triângulos, **esqueleto** com clipes de andar e correr | inimigo; a IA mistura parado/andar/correr pela velocidade | 4,8 MB + 2×30 KB |
| Cavalo de carrossel | texto→3D | carrossel (parque) | 1,2 MB |
| Estátua de palhaço com balões | texto→3D | parque | 1,0 MB |
| Carrocinha de pipoca | texto→3D | praça de entrada | 1,3 MB |
| Canhão de circo | texto→3D | depósito | 1,3 MB |
| Manequim com fantasia de palhaço | texto→3D | camarim 1 | 1,3 MB |
| Placa de bilheteria | texto→3D | estacionamento | 1,2 MB |

- `tools/meshy_generate.mjs` — gera (em paralelo, retomável: os IDs ficam em `meshy_tasks.json`) e baixa (`--download`)
  os modelos e o palhaço com esqueleto, e escreve o manifesto. Precisa de `MESHY_API_KEY`.
- `tools/optimize_models.cjs` — deixa os GLB leves para celular: texturas 1024 px JPEG, deduplicação, e os arquivos de
  animação só com os ossos (de 222 MB para ~12 MB).
- Sem o manifesto, o jogo volta aos modelos procedurais (o palhaço feito com a malha do MakeHuman).

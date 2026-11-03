// Claw Pop: a neon claw-machine shop. Aim, drop, pray the weak claw holds. Prizes fill a collection; coins open new machines.
import * as THREE from './vendor/three.module.min.js'
import * as CANNON from './vendor/cannon-es.js'

const Q = new URLSearchParams(location.search)
const BOT = Q.has('bot')
const $ = (id) => document.getElementById(id)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]

// ---------------------------------------------------------------- text
const TEXT = {
  en: { play: 'PLAY', again: 'PLAY AGAIN', home: 'Shop', settings: 'Settings', close: 'Close', paused: 'Paused', resume: 'Resume', quit: 'Leave machine', music: 'Music', sfx: 'Sound', shake: 'Vibration', language: 'Language', on: 'On', off: 'Off', drop: 'DROP', tries: 'TRIES', upgrades: 'Upgrades', book: 'Collection', got: 'GOT IT!', close1: 'SO CLOSE!', miss: 'MISS', fresh: 'NEW!', common: 'Common', rare: 'Shiny', legend: 'Golden', unlock: 'Unlock', result: 'Prizes', none: 'No prize this time...', more: '+3 tries', double: 'Coins x2', aim: 'Drag to move the claw, then DROP', max: 'MAX', lvl: 'Lv', upGrip: 'Grip', upGripD: 'Claw holds tighter', upTries: 'Tries', upTriesD: '+1 try per game', upMagnet: 'Aim help', upMagnetD: 'Off-center grabs hold', upLuck: 'Luck', upLuckD: 'More shiny & golden', m0: 'Bear Party', m1: 'Hero Plush', m2: 'Keychains', m3: 'Capsules', m4: 'Giant Plush', m5: 'Golden Claw', start: "ESCAPE", story: "Locked in the claw shop at 3 AM. Open 6 doors before dawn.", door: "DOOR", keyHint: "Catch the plush with the key!", opened: "DOOR OPEN!", escaped: "ESCAPED!", failDawn: "The sun came up...", failCoins: "Out of coins...", best: "Best", farthest: "Farthest", timeL: "Time", hold: "HOLD ON! TAP!", tap: "TAP!", saved: "SAVED!", blackout: "BLACKOUT!", guard: "GUARD! FREEZE!", spotted: "SPOTTED! -3", quake: "SHAKING!", toolPick: "Pick a tool", cont: "+10 coins & continue", contT: "+2 min & continue", retry: "TRY AGAIN", newBest: "NEW RECORD!", tMagnet: "Magnet", tMagnetD: "Next grab never slips", tHammer: "Hammer", tHammerD: "Tap to shake the pile", tSticky: "Sticky claw", tStickyD: "3 grabs hold tighter", tLight: "Flashlight", tLightD: "See in blackouts", tWallet: "Wallet", tWalletD: "+6 coins now", tWatch: "Stopwatch", tWatchD: "+90 s before dawn" },
  ko: { play: '뽑기 시작', again: '한 번 더', home: '가게로', settings: '설정', close: '닫기', paused: '일시정지', resume: '계속', quit: '기계에서 나가기', music: '배경음', sfx: '효과음', shake: '진동', language: '언어', on: '켬', off: '끔', drop: '내려!', tries: '남은 판', upgrades: '강화', book: '도감', got: '뽑았다!', close1: '아깝다!', miss: '꽝', fresh: 'NEW!', common: '보통', rare: '반짝', legend: '황금', unlock: '열기', result: '뽑은 인형', none: '이번엔 꽝...', more: '+3판 더', double: '코인 2배', aim: '끌어서 좌우 · 앞뒤로 맞추고 내려!', max: '최대', lvl: 'Lv', upGrip: '집게 힘', upGripD: '더 꽉 잡는다', upTries: '판 수', upTriesD: '한 게임에 +1판', upMagnet: '조준 보정', upMagnetD: '살짝 빗나가도 잡는다', upLuck: '행운', upLuckD: '반짝 · 황금이 더 자주', m0: '곰돌이 파티', m1: '영웅 인형', m2: '열쇠고리', m3: '캡슐 뽑기', m4: '왕 큰 인형', m5: '황금 집게', start: "탈출 시작", story: "새벽 3시, 뽑기방에 갇혔다. 동트기 전에 문 6개를 열어라.", door: "문", keyHint: "열쇠 인형을 뽑아라!", opened: "문이 열렸다!", escaped: "탈출 성공!", failDawn: "날이 밝았다...", failCoins: "코인이 다 떨어졌다...", best: "최고 기록", farthest: "가장 멀리", timeL: "시간", hold: "꽉 잡아! 연타!", tap: "연타!", saved: "버텼다!", blackout: "정전!", guard: "경비다! 멈춰!", spotted: "들켰다! -3", quake: "흔들린다!", toolPick: "도구를 골라", cont: "+10코인으로 이어하기", contT: "+2분으로 이어하기", retry: "다시 도전", newBest: "신기록!", tMagnet: "자석", tMagnetD: "다음 한 번은 안 놓친다", tHammer: "망치", tHammerD: "눌러서 더미 흔들기", tSticky: "끈끈이 집게", tStickyD: "3번 동안 더 꽉", tLight: "손전등", tLightD: "정전에도 보인다", tWallet: "동전 지갑", tWalletD: "지금 코인 +6", tWatch: "멈춘 시계", tWatchD: "동트기까지 +90초" },
  es: { play: 'JUGAR', again: 'OTRA VEZ', home: 'Tienda', settings: 'Ajustes', close: 'Cerrar', paused: 'Pausa', resume: 'Seguir', quit: 'Salir de la máquina', music: 'Música', sfx: 'Sonido', shake: 'Vibración', language: 'Idioma', on: 'Sí', off: 'No', drop: '¡BAJA!', tries: 'INTENTOS', upgrades: 'Mejoras', book: 'Colección', got: '¡LO TENGO!', close1: '¡CASI!', miss: 'FALLO', fresh: '¡NUEVO!', common: 'Común', rare: 'Brillante', legend: 'Dorado', unlock: 'Abrir', result: 'Premios', none: 'Esta vez nada...', more: '+3 intentos', double: 'Monedas x2', aim: 'Arrastra para mover la garra y BAJA', max: 'MÁX', lvl: 'Nv', upGrip: 'Agarre', upGripD: 'La garra aprieta más', upTries: 'Intentos', upTriesD: '+1 intento por partida', upMagnet: 'Ayuda', upMagnetD: 'Agarra aunque falles un poco', upLuck: 'Suerte', upLuckD: 'Más brillantes y dorados', m0: 'Fiesta de osos', m1: 'Peluches héroes', m2: 'Llaveros', m3: 'Cápsulas', m4: 'Peluches gigantes', m5: 'Garra dorada', start: "¡ESCAPA!", story: "Encerrado en la tienda a las 3 AM. Abre 6 puertas antes del amanecer.", door: "PUERTA", keyHint: "¡Atrapa el peluche con la llave!", opened: "¡PUERTA ABIERTA!", escaped: "¡ESCAPASTE!", failDawn: "Amaneció...", failCoins: "Sin monedas...", best: "Récord", farthest: "Más lejos", timeL: "Tiempo", hold: "¡AGUANTA! ¡TOCA!", tap: "¡TOCA!", saved: "¡SALVADO!", blackout: "¡APAGÓN!", guard: "¡GUARDIA! ¡QUIETO!", spotted: "¡TE VIO! -3", quake: "¡TEMBLOR!", toolPick: "Elige una herramienta", cont: "+10 monedas y seguir", contT: "+2 min y seguir", retry: "REINTENTAR", newBest: "¡NUEVO RÉCORD!", tMagnet: "Imán", tMagnetD: "El próximo agarre no se suelta", tHammer: "Martillo", tHammerD: "Toca para sacudir la pila", tSticky: "Garra pegajosa", tStickyD: "3 agarres más firmes", tLight: "Linterna", tLightD: "Ves en los apagones", tWallet: "Cartera", tWalletD: "+6 monedas ya", tWatch: "Cronómetro", tWatchD: "+90 s antes del alba" },
  pt: { play: 'JOGAR', again: 'DE NOVO', home: 'Loja', settings: 'Ajustes', close: 'Fechar', paused: 'Pausa', resume: 'Continuar', quit: 'Sair da máquina', music: 'Música', sfx: 'Som', shake: 'Vibração', language: 'Idioma', on: 'Sim', off: 'Não', drop: 'DESCE!', tries: 'TENTATIVAS', upgrades: 'Melhorias', book: 'Coleção', got: 'PEGUEI!', close1: 'QUASE!', miss: 'ERROU', fresh: 'NOVO!', common: 'Comum', rare: 'Brilhante', legend: 'Dourado', unlock: 'Abrir', result: 'Prêmios', none: 'Nada desta vez...', more: '+3 tentativas', double: 'Moedas x2', aim: 'Arraste para mover a garra e DESCE', max: 'MÁX', lvl: 'Nv', upGrip: 'Pegada', upGripD: 'A garra aperta mais', upTries: 'Tentativas', upTriesD: '+1 tentativa por jogo', upMagnet: 'Mira', upMagnetD: 'Segura mesmo fora do centro', upLuck: 'Sorte', upLuckD: 'Mais brilhantes e dourados', m0: 'Festa dos ursos', m1: 'Pelúcias heróis', m2: 'Chaveiros', m3: 'Cápsulas', m4: 'Pelúcias gigantes', m5: 'Garra dourada', start: "FUGIR", story: "Preso na loja às 3h. Abra 6 portas antes do amanhecer.", door: "PORTA", keyHint: "Pegue a pelúcia com a chave!", opened: "PORTA ABERTA!", escaped: "ESCAPOU!", failDawn: "Amanheceu...", failCoins: "Sem moedas...", best: "Recorde", farthest: "Mais longe", timeL: "Tempo", hold: "SEGURA! TOQUE!", tap: "TOQUE!", saved: "SALVO!", blackout: "APAGÃO!", guard: "GUARDA! PARADO!", spotted: "TE VIU! -3", quake: "TREMOR!", toolPick: "Escolha uma ferramenta", cont: "+10 moedas e continuar", contT: "+2 min e continuar", retry: "TENTAR DE NOVO", newBest: "NOVO RECORDE!", tMagnet: "Ímã", tMagnetD: "A próxima pegada não escorrega", tHammer: "Martelo", tHammerD: "Toque para sacudir a pilha", tSticky: "Garra grudenta", tStickyD: "3 pegadas mais firmes", tLight: "Lanterna", tLightD: "Enxerga no apagão", tWallet: "Carteira", tWalletD: "+6 moedas agora", tWatch: "Cronômetro", tWatchD: "+90 s até o amanhecer" },
  ru: { play: 'ИГРАТЬ', again: 'ЕЩЁ РАЗ', home: 'Магазин', settings: 'Настройки', close: 'Закрыть', paused: 'Пауза', resume: 'Продолжить', quit: 'Уйти от автомата', music: 'Музыка', sfx: 'Звук', shake: 'Вибрация', language: 'Язык', on: 'Вкл', off: 'Выкл', drop: 'ВНИЗ!', tries: 'ПОПЫТКИ', upgrades: 'Улучшения', book: 'Коллекция', got: 'ЕСТЬ!', close1: 'ПОЧТИ!', miss: 'МИМО', fresh: 'НОВОЕ!', common: 'Обычная', rare: 'Блестящая', legend: 'Золотая', unlock: 'Открыть', result: 'Призы', none: 'В этот раз ничего...', more: '+3 попытки', double: 'Монеты x2', aim: 'Тяни, чтобы двигать клешню, потом ВНИЗ', max: 'МАКС', lvl: 'Ур', upGrip: 'Хватка', upGripD: 'Клешня держит крепче', upTries: 'Попытки', upTriesD: '+1 попытка за игру', upMagnet: 'Прицел', upMagnetD: 'Держит даже не по центру', upLuck: 'Удача', upLuckD: 'Больше блестящих и золотых', m0: 'Мишки', m1: 'Плюшевые герои', m2: 'Брелоки', m3: 'Капсулы', m4: 'Гиганты', m5: 'Золотая клешня', start: "СБЕЖАТЬ", story: "Заперт в магазине в 3 часа ночи. Открой 6 дверей до рассвета.", door: "ДВЕРЬ", keyHint: "Достань игрушку с ключом!", opened: "ДВЕРЬ ОТКРЫТА!", escaped: "ПОБЕГ!", failDawn: "Рассвело...", failCoins: "Монеты кончились...", best: "Рекорд", farthest: "Дальше всего", timeL: "Время", hold: "ДЕРЖИ! ЖМИ!", tap: "ЖМИ!", saved: "УДЕРЖАЛ!", blackout: "СВЕТ ПОГАС!", guard: "ОХРАНА! ЗАМРИ!", spotted: "ЗАМЕТИЛИ! -3", quake: "ТРЯСЁТ!", toolPick: "Выбери инструмент", cont: "+10 монет и дальше", contT: "+2 мин и дальше", retry: "ЕЩЁ РАЗ", newBest: "НОВЫЙ РЕКОРД!", tMagnet: "Магнит", tMagnetD: "Следующий захват не сорвётся", tHammer: "Молоток", tHammerD: "Нажми, чтобы встряхнуть кучу", tSticky: "Липкая клешня", tStickyD: "3 захвата крепче", tLight: "Фонарик", tLightD: "Видно без света", tWallet: "Кошелёк", tWalletD: "+6 монет сейчас", tWatch: "Секундомер", tWatchD: "+90 с до рассвета" },
  tr: { play: 'OYNA', again: 'TEKRAR', home: 'Dükkân', settings: 'Ayarlar', close: 'Kapat', paused: 'Duraklatıldı', resume: 'Devam', quit: 'Makineden çık', music: 'Müzik', sfx: 'Ses', shake: 'Titreşim', language: 'Dil', on: 'Açık', off: 'Kapalı', drop: 'BIRAK!', tries: 'HAK', upgrades: 'Yükseltmeler', book: 'Koleksiyon', got: 'ALDIM!', close1: 'KIL PAYI!', miss: 'ISKA', fresh: 'YENİ!', common: 'Sıradan', rare: 'Parlak', legend: 'Altın', unlock: 'Aç', result: 'Ödüller', none: 'Bu sefer olmadı...', more: '+3 hak', double: 'Jeton x2', aim: 'Pençeyi sürükle, sonra BIRAK', max: 'MAKS', lvl: 'Sv', upGrip: 'Kavrama', upGripD: 'Pençe daha sıkı tutar', upTries: 'Hak', upTriesD: 'Oyun başına +1 hak', upMagnet: 'Nişan', upMagnetD: 'Biraz kaçsa da tutar', upLuck: 'Şans', upLuckD: 'Daha çok parlak ve altın', m0: 'Ayı partisi', m1: 'Kahraman peluşlar', m2: 'Anahtarlıklar', m3: 'Kapsüller', m4: 'Dev peluşlar', m5: 'Altın pençe', start: "KAÇ", story: "Gece 3te dükkâna kilitlendin. Şafaktan önce 6 kapıyı aç.", door: "KAPI", keyHint: "Anahtarlı peluşu yakala!", opened: "KAPI AÇILDI!", escaped: "KAÇTIN!", failDawn: "Sabah oldu...", failCoins: "Jeton bitti...", best: "En iyi", farthest: "En uzak", timeL: "Süre", hold: "TUT! BAS!", tap: "BAS!", saved: "KURTARDIN!", blackout: "ELEKTRİK KESİLDİ!", guard: "BEKÇİ! KIPIRDAMA!", spotted: "GÖRÜLDÜN! -3", quake: "SARSINTI!", toolPick: "Bir alet seç", cont: "+10 jetonla devam", contT: "+2 dk ile devam", retry: "TEKRAR DENE", newBest: "YENİ REKOR!", tMagnet: "Mıknatıs", tMagnetD: "Sonraki tutuş kaymaz", tHammer: "Çekiç", tHammerD: "Yığını sallamak için bas", tSticky: "Yapışkan pençe", tStickyD: "3 tutuş daha sıkı", tLight: "El feneri", tLightD: "Karanlıkta görürsün", tWallet: "Cüzdan", tWalletD: "Hemen +6 jeton", tWatch: "Kronometre", tWatchD: "Şafağa +90 sn" },
  de: { play: 'SPIELEN', again: 'NOCHMAL', home: 'Laden', settings: 'Optionen', close: 'Schließen', paused: 'Pause', resume: 'Weiter', quit: 'Automat verlassen', music: 'Musik', sfx: 'Sound', shake: 'Vibration', language: 'Sprache', on: 'An', off: 'Aus', drop: 'RUNTER!', tries: 'VERSUCHE', upgrades: 'Upgrades', book: 'Sammlung', got: 'GESCHAFFT!', close1: 'KNAPP!', miss: 'DANEBEN', fresh: 'NEU!', common: 'Normal', rare: 'Glänzend', legend: 'Golden', unlock: 'Öffnen', result: 'Preise', none: 'Diesmal nichts...', more: '+3 Versuche', double: 'Münzen x2', aim: 'Ziehen zum Bewegen, dann RUNTER', max: 'MAX', lvl: 'St', upGrip: 'Griff', upGripD: 'Greifer hält fester', upTries: 'Versuche', upTriesD: '+1 Versuch pro Spiel', upMagnet: 'Zielhilfe', upMagnetD: 'Hält auch schräg', upLuck: 'Glück', upLuckD: 'Mehr glänzende und goldene', m0: 'Bärenparty', m1: 'Heldenplüsch', m2: 'Anhänger', m3: 'Kapseln', m4: 'Riesenplüsch', m5: 'Goldgreifer', start: "FLUCHT", story: "Um 3 Uhr im Greiferladen eingesperrt. Öffne 6 Türen vor dem Morgengrauen.", door: "TÜR", keyHint: "Schnapp dir das Plüschtier mit dem Schlüssel!", opened: "TÜR OFFEN!", escaped: "ENTKOMMEN!", failDawn: "Die Sonne ging auf...", failCoins: "Keine Münzen mehr...", best: "Rekord", farthest: "Am weitesten", timeL: "Zeit", hold: "FESTHALTEN! TIPPEN!", tap: "TIPP!", saved: "GEHALTEN!", blackout: "STROMAUSFALL!", guard: "WACHE! STILL!", spotted: "ERWISCHT! -3", quake: "ES WACKELT!", toolPick: "Wähle ein Werkzeug", cont: "+10 Münzen, weiter", contT: "+2 Min, weiter", retry: "NOCHMAL", newBest: "NEUER REKORD!", tMagnet: "Magnet", tMagnetD: "Nächster Griff rutscht nicht", tHammer: "Hammer", tHammerD: "Tippen rüttelt den Haufen", tSticky: "Klebegreifer", tStickyD: "3 Griffe fester", tLight: "Taschenlampe", tLightD: "Sicht bei Stromausfall", tWallet: "Geldbeutel", tWalletD: "+6 Münzen sofort", tWatch: "Stoppuhr", tWatchD: "+90 s bis zum Morgen" },
  fr: { play: 'JOUER', again: 'REJOUER', home: 'Boutique', settings: 'Réglages', close: 'Fermer', paused: 'Pause', resume: 'Reprendre', quit: 'Quitter la machine', music: 'Musique', sfx: 'Son', shake: 'Vibration', language: 'Langue', on: 'Oui', off: 'Non', drop: 'LÂCHE !', tries: 'ESSAIS', upgrades: 'Améliorations', book: 'Collection', got: 'ATTRAPÉ !', close1: 'PRESQUE !', miss: 'RATÉ', fresh: 'NOUVEAU !', common: 'Normal', rare: 'Brillant', legend: 'Doré', unlock: 'Ouvrir', result: 'Lots', none: 'Rien cette fois...', more: '+3 essais', double: 'Pièces x2', aim: 'Glisse pour bouger la pince, puis LÂCHE', max: 'MAX', lvl: 'Nv', upGrip: 'Prise', upGripD: 'La pince serre plus', upTries: 'Essais', upTriesD: '+1 essai par partie', upMagnet: 'Visée', upMagnetD: 'Tient même décentré', upLuck: 'Chance', upLuckD: 'Plus de brillants et dorés', m0: 'Fête des oursons', m1: 'Peluches héros', m2: 'Porte-clés', m3: 'Capsules', m4: 'Peluches géantes', m5: 'Pince dorée', start: "S'ÉVADER", story: "Enfermé dans la boutique à 3 h. Ouvre 6 portes avant l'aube.", door: "PORTE", keyHint: "Attrape la peluche à la clé !", opened: "PORTE OUVERTE !", escaped: "ÉVADÉ !", failDawn: "Le jour s'est levé...", failCoins: "Plus de pièces...", best: "Record", farthest: "Le plus loin", timeL: "Temps", hold: "TIENS BON ! TAPE !", tap: "TAPE !", saved: "SAUVÉ !", blackout: "PANNE !", guard: "GARDIEN ! STOP !", spotted: "REPÉRÉ ! -3", quake: "ÇA TREMBLE !", toolPick: "Choisis un outil", cont: "+10 pièces et continuer", contT: "+2 min et continuer", retry: "RÉESSAYER", newBest: "NOUVEAU RECORD !", tMagnet: "Aimant", tMagnetD: "La prochaine prise ne glisse pas", tHammer: "Marteau", tHammerD: "Tape pour secouer le tas", tSticky: "Pince collante", tStickyD: "3 prises plus fermes", tLight: "Lampe", tLightD: "Tu vois dans la panne", tWallet: "Porte-monnaie", tWalletD: "+6 pièces", tWatch: "Chrono", tWatchD: "+90 s avant l'aube" },
  ja: { play: 'プレイ', again: 'もう一回', home: 'お店へ', settings: '設定', close: '閉じる', paused: '一時停止', resume: '続ける', quit: '台から離れる', music: '音楽', sfx: '効果音', shake: '振動', language: '言語', on: 'オン', off: 'オフ', drop: 'おろす!', tries: '残り', upgrades: '強化', book: '図鑑', got: 'ゲット!', close1: 'おしい!', miss: 'ハズレ', fresh: 'NEW!', common: 'ふつう', rare: 'キラキラ', legend: 'ゴールド', unlock: '開放', result: '取れた景品', none: '今回はハズレ...', more: '+3回', double: 'コイン2倍', aim: 'ドラッグでアームを動かしておろす!', max: '最大', lvl: 'Lv', upGrip: 'アーム力', upGripD: 'しっかりつかむ', upTries: '回数', upTriesD: '1ゲーム+1回', upMagnet: 'ねらい補正', upMagnetD: '少しずれてもつかむ', upLuck: '運', upLuckD: 'キラキラ・ゴールドが出やすい', m0: 'クマパーティー', m1: 'ヒーローぬいぐるみ', m2: 'キーホルダー', m3: 'カプセル', m4: 'ジャンボぬいぐるみ', m5: 'ゴールドアーム', start: "脱出スタート", story: "午前3時、クレーンゲーム店に閉じ込められた。夜明けまでに扉を6つ開けろ。", door: "扉", keyHint: "鍵のぬいぐるみを取れ!", opened: "扉が開いた!", escaped: "脱出成功!", failDawn: "夜が明けた...", failCoins: "コインが尽きた...", best: "ベスト", farthest: "最高到達", timeL: "タイム", hold: "つかめ!連打!", tap: "連打!", saved: "耐えた!", blackout: "停電!", guard: "警備員!動くな!", spotted: "見つかった! -3", quake: "揺れる!", toolPick: "道具を選べ", cont: "+10コインで続ける", contT: "+2分で続ける", retry: "もう一度", newBest: "新記録!", tMagnet: "磁石", tMagnetD: "次の1回は落ちない", tHammer: "ハンマー", tHammerD: "タップで山を揺らす", tSticky: "ねばねばアーム", tStickyD: "3回しっかりつかむ", tLight: "懐中電灯", tLightD: "停電でも見える", tWallet: "がま口", tWalletD: "コイン+6", tWatch: "ストップウォッチ", tWatchD: "夜明けまで+90秒" },
  zh: { play: '开始', again: '再来一次', home: '回店里', settings: '设置', close: '关闭', paused: '已暂停', resume: '继续', quit: '离开机器', music: '音乐', sfx: '音效', shake: '震动', language: '语言', on: '开', off: '关', drop: '下爪!', tries: '剩余', upgrades: '升级', book: '图鉴', got: '抓到了!', close1: '差一点!', miss: '没抓到', fresh: '新!', common: '普通', rare: '闪亮', legend: '黄金', unlock: '解锁', result: '奖品', none: '这次没抓到...', more: '+3次', double: '金币x2', aim: '拖动移动爪子,然后下爪', max: '满级', lvl: 'Lv', upGrip: '爪力', upGripD: '抓得更紧', upTries: '次数', upTriesD: '每局+1次', upMagnet: '瞄准辅助', upMagnetD: '偏一点也能抓住', upLuck: '幸运', upLuckD: '更多闪亮和黄金', m0: '小熊派对', m1: '英雄玩偶', m2: '钥匙扣', m3: '扭蛋', m4: '超大玩偶', m5: '黄金爪', start: "开始逃脱", story: "凌晨3点被困在抓娃娃店。天亮前打开6扇门。", door: "门", keyHint: "抓住带钥匙的玩偶!", opened: "门开了!", escaped: "逃脱成功!", failDawn: "天亮了...", failCoins: "金币用完了...", best: "最佳", farthest: "最远", timeL: "用时", hold: "抓紧!连点!", tap: "连点!", saved: "稳住了!", blackout: "停电了!", guard: "保安!别动!", spotted: "被发现了! -3", quake: "在晃!", toolPick: "选一个道具", cont: "+10金币继续", contT: "+2分钟继续", retry: "再试一次", newBest: "新纪录!", tMagnet: "磁铁", tMagnetD: "下一次不会滑落", tHammer: "锤子", tHammerD: "点击摇晃娃娃堆", tSticky: "粘粘爪", tStickyD: "3次抓得更紧", tLight: "手电筒", tLightD: "停电也看得见", tWallet: "钱包", tWalletD: "立即+6金币", tWatch: "秒表", tWatchD: "天亮前+90秒" },
}
const LANGUAGES = { en: 'English', ko: '한국어', es: 'Español', pt: 'Português', ru: 'Русский', tr: 'Türkçe', de: 'Deutsch', fr: 'Français', ja: '日本語', zh: '简体中文' }
const LANG_KEYS = Object.keys(LANGUAGES)
let lang = 'en'
const t = (key) => TEXT[lang][key] ?? TEXT.en[key] ?? key

// ---------------------------------------------------------------- save
const SAVE_KEY = 'claw_pop'
const save = { bestDoor: 0, bestTime: 0, coins: 0, runs: 0, machine: 0, open: [true, false, false, false, false, false], up: { grip: 0, tries: 0, magnet: 0, luck: 0 }, owned: {}, music: 0.6, sfx: 0.9, shake: 1, lang: '' }
let saveTimer = 0
function writeSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const text = JSON.stringify(save)
    if (window.bridge?.storage) window.bridge.storage.set(SAVE_KEY, text).catch(() => {})
    else { try { localStorage.setItem(SAVE_KEY, text) } catch {} }
  }, 300)
}
async function readSave() {
  let text = null
  try {
    if (window.bridge?.storage) text = await window.bridge.storage.get(SAVE_KEY, false)
    else text = localStorage.getItem(SAVE_KEY)
  } catch {}
  if (typeof text !== 'string' || !text) return
  try {
    const old = JSON.parse(text)
    Object.assign(save, old, { up: { ...save.up, ...old.up }, owned: { ...old.owned } })
  } catch {}
}

// ---------------------------------------------------------------- platform
const platform = {
  ready: false, audioOn: true, paused: false, adOpen: false,
  message(name) { try { window.bridge?.platform?.sendMessage(name) } catch {} },
  async init() {
    const bridge = window.bridge
    if (!bridge || window.__noBridge) return
    try {
      bridge.engine = 'javascript'
      await bridge.initialize()
      this.ready = true
      this.audioOn = bridge.platform.isAudioEnabled !== false
      const events = bridge.EVENT_NAME
      bridge.platform.on(events.AUDIO_STATE_CHANGED, (on) => { this.audioOn = on; applyVolume() })
      bridge.platform.on(events.PAUSE_STATE_CHANGED, (on) => { this.paused = on; applyVolume(); if (on) pauseGame() })
      bridge.advertisement.on(events.INTERSTITIAL_STATE_CHANGED, (s) => this.onAd(s))
      bridge.advertisement.on(events.REWARDED_STATE_CHANGED, (s) => this.onReward(s))
    } catch (error) { console.warn('bridge', error) }
  },
  onAd(state) {
    if (state === 'opened') { this.adOpen = true; applyVolume() }
    if (state === 'closed' || state === 'failed') { this.adOpen = false; applyVolume() }
  },
  rewardDone: null, rewarded: false,
  onReward(state) {
    if (state === 'opened') { this.adOpen = true; applyVolume() }
    if (state === 'rewarded') this.rewarded = true
    if (state === 'closed' || state === 'failed') {
      this.adOpen = false; applyVolume()
      const done = this.rewardDone; this.rewardDone = null
      done?.(this.rewarded); this.rewarded = false
    }
  },
  // At most one full-screen ad per 3 minutes; a rewarded ad the player chose also resets the clock.
  lastAd: Date.now(),
  interstitial() {
    if (Date.now() - this.lastAd < 180000) return
    this.lastAd = Date.now()
    try { if (this.ready) window.bridge.advertisement.showInterstitial() } catch {}
  },
  rewardedAd(done) {
    if (!this.ready) { done(false); return }
    this.rewardDone = done; this.rewarded = false; this.lastAd = Date.now()
    try { window.bridge.advertisement.showRewarded() } catch { this.rewardDone = null; done(false) }
  },
}

// ---------------------------------------------------------------- sound
const audio = {
  ctx: null, buffers: {}, musicGain: null, sfxGain: null, master: null, source: null, current: '', wanted: '', motor: null,
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return }
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    this.ctx = new Ctx()
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination)
    this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master)
    this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master)
    // A soft electric hum for the claw motor, faded in while the claw moves.
    const osc = this.ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 92
    const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 420
    this.motor = this.ctx.createGain(); this.motor.gain.value = 0
    osc.connect(filter); filter.connect(this.motor); this.motor.connect(this.sfxGain); osc.start()
    this.motorOsc = osc
    applyVolume()
    for (const n of ['click', 'buy', 'deny', 'levelup', 'drop', 'grab', 'thud', 'slip', 'coin', 'win', 'rare']) this.load(n)
    this.load('lobby').then(() => this.music(this.wanted))
    this.load('play').then(() => this.music(this.wanted))
  },
  async load(name) {
    try {
      const data = await (await fetch(`audio/${name}.ogg`)).arrayBuffer()
      this.buffers[name] = await this.ctx.decodeAudioData(data)
    } catch (error) { console.warn('sound', name, error) }
  },
  play(name, volume = 1, rate = 1) {
    if (!this.ctx || !this.buffers[name]) return
    const source = this.ctx.createBufferSource(); source.buffer = this.buffers[name]; source.playbackRate.value = rate
    const gain = this.ctx.createGain(); gain.gain.value = volume
    source.connect(gain); gain.connect(this.sfxGain); source.start()
  },
  hum(level, pitch) {
    if (!this.motor) return
    this.motor.gain.setTargetAtTime(level * 0.09, this.ctx.currentTime, 0.05)
    this.motorOsc.frequency.setTargetAtTime(pitch, this.ctx.currentTime, 0.08)
  },
  music(name) {
    this.wanted = name
    if (!this.ctx || !this.buffers[name] || this.current === name) return
    this.source?.stop()
    const source = this.ctx.createBufferSource(); source.buffer = this.buffers[name]; source.loop = true
    source.connect(this.musicGain); source.start(); this.source = source; this.current = name
  },
}
function applyVolume() {
  if (!audio.ctx) return
  const silent = !platform.audioOn || platform.adOpen || platform.paused || document.hidden
  audio.master.gain.value = silent ? 0 : 1
  audio.musicGain.gain.value = save.music * 0.5
  audio.sfxGain.gain.value = save.sfx
}
document.addEventListener('visibilitychange', () => { applyVolume(); if (document.hidden) pauseGame() })
const buzz = (ms) => { if (save.shake && navigator.userActivation?.hasBeenActive) try { navigator.vibrate?.(ms) } catch {} }

// ---------------------------------------------------------------- data
// r: body radius in metres, w: weight (heavier slips more).
const KINDS = {}
const MACHINES = [
  { key: 'm0', kinds: ['bear', 'bunny', 'duck', 'frog', 'cat'], count: 26, grip: 0.62, cost: 0, neon: 0xff4fd8, body: 0xfff0fa, tier: 1 },
  { key: 'm1', kinds: ['knight', 'gambler', 'mage', 'hunter', 'necro', 'smith'], count: 22, grip: 0.56, cost: 250, neon: 0x4fc3ff, body: 0xeaf6ff, tier: 1.6 },
  { key: 'm2', kinds: ['chick', 'mushroom', 'ghost', 'slime'], count: 40, grip: 0.6, cost: 700, neon: 0xffd23f, body: 0xfff8dc, tier: 2.2 },
  { key: 'm3', kinds: ['capsule'], count: 30, grip: 0.5, cost: 1600, neon: 0x2ee6a6, body: 0xe9fff6, tier: 3 },
  { key: 'm4', kinds: ['whale', 'dino', 'panda', 'penguin'], count: 12, grip: 0.46, cost: 3500, neon: 0xff7a3d, body: 0xfff0e6, tier: 4 },
  { key: 'm5', kinds: ['crownbear', 'goldknight', 'gem'], count: 18, grip: 0.4, cost: 8000, neon: 0xffd700, body: 0x3a2f5a, tier: 6 },
]
const BOOK = MACHINES.map((m) => (m.key === 'm3' ? [] : m.kinds))
const CAPSULE_POOL = ['bear', 'bunny', 'duck', 'frog', 'cat', 'knight', 'gambler', 'mage', 'hunter', 'necro', 'smith', 'chick', 'mushroom', 'ghost', 'slime', 'whale', 'dino', 'panda', 'penguin']
const VALUE = [15, 50, 200]
const UPGRADES = [
  { id: 'grip', name: 'upGrip', desc: 'upGripD', base: 60, grow: 1.55, max: 10 },
  { id: 'tries', name: 'upTries', desc: 'upTriesD', base: 150, grow: 2, max: 4 },
  { id: 'magnet', name: 'upMagnet', desc: 'upMagnetD', base: 80, grow: 1.6, max: 8 },
  { id: 'luck', name: 'upLuck', desc: 'upLuckD', base: 110, grow: 1.6, max: 8 },
]
const upCost = (u) => Math.round(u.base * Math.pow(u.grow, save.up[u.id]))
function rollRarity(boost = 0) {
  const r = Math.random(), luck = save.up.luck
  if (r < 0.03 + luck * 0.005 + boost * 0.04) return 2
  if (r < 0.17 + luck * 0.025 + boost * 0.15) return 1
  return 0
}

// ---------------------------------------------------------------- plush models (vertex colours, one mesh each)
const COLOR = new THREE.Color()
function paint(geometry, color) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry
  COLOR.set(color)
  const count = g.attributes.position.count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) { colors[i * 3] = COLOR.r; colors[i * 3 + 1] = COLOR.g; colors[i * 3 + 2] = COLOR.b }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.deleteAttribute('uv')
  return g
}
function merge(parts) {
  let total = 0
  for (const p of parts) total += p.attributes.position.count
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3)
  let at = 0
  for (const p of parts) {
    pos.set(p.attributes.position.array, at * 3); nor.set(p.attributes.normal.array, at * 3); col.set(p.attributes.color.array, at * 3)
    at += p.attributes.position.count
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  out.setAttribute('color', new THREE.BufferAttribute(col, 3))
  out.computeBoundingSphere()
  return out
}
// Shapes are built for radius 1 and scaled to the kind's radius.
const S = (c, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, seg = 14) => paint(new THREE.SphereGeometry(1, seg, Math.max(8, seg - 4)).scale(sx, sy, sz).translate(x, y, z), c)
const CONE = (c, r, h, x, y, z, rx = 0, rz = 0, seg = 10) => paint(new THREE.ConeGeometry(r, h, seg).rotateX(rx).rotateZ(rz).translate(x, y, z), c)
const CYL = (c, r1, r2, h, x, y, z, rx = 0, seg = 14) => paint(new THREE.CylinderGeometry(r1, r2, h, seg).rotateX(rx).translate(x, y, z), c)
const BOX = (c, w, h, d, x, y, z, rz = 0) => paint(new THREE.BoxGeometry(w, h, d).rotateZ(rz).translate(x, y, z), c)
const TORUS = (c, r, tube, x, y, z) => paint(new THREE.TorusGeometry(r, tube, 6, 16).translate(x, y, z), c)
const INK = 0x24183f, BLUSH = 0xff8fb1, WHITE = 0xffffff
const face = (y = 0.12, spread = 0.36, blush = true) => {
  const parts = [S(INK, -spread, y, 0.88, 0.12, 0.15, 0.08, 8), S(INK, spread, y, 0.88, 0.12, 0.15, 0.08, 8), S(WHITE, -spread + 0.04, y + 0.05, 0.95, 0.04, 0.04, 0.02, 6), S(WHITE, spread + 0.04, y + 0.05, 0.95, 0.04, 0.04, 0.02, 6)]
  if (blush) parts.push(S(BLUSH, -0.58, y - 0.16, 0.76, 0.14, 0.08, 0.05, 8), S(BLUSH, 0.58, y - 0.16, 0.76, 0.14, 0.08, 0.05, 8))
  return parts
}
const body = (c) => S(c, 0, -0.02, 0, 1, 0.94, 0.96, 18)
const BUILD = {
  bear: () => [body(0xc98a55), S(0xc98a55, -0.62, 0.72, 0, 0.3), S(0xc98a55, 0.62, 0.72, 0, 0.3), S(0xf2d3b0, 0, -0.15, 0.78, 0.36, 0.26, 0.22), S(INK, 0, -0.06, 0.98, 0.1, 0.07, 0.05, 8), ...face(0.2, 0.34)],
  bunny: () => [body(0xfff6f2), S(0xfff6f2, -0.32, 1.1, 0, 0.2, 0.55, 0.16), S(0xfff6f2, 0.32, 1.1, 0, 0.2, 0.55, 0.16), S(0xffb3c9, -0.32, 1.1, 0.1, 0.1, 0.4, 0.08), S(0xffb3c9, 0.32, 1.1, 0.1, 0.1, 0.4, 0.08), S(0xff8fb1, 0, -0.02, 0.97, 0.08, 0.06, 0.05, 8), ...face(0.14, 0.38)],
  duck: () => [body(0xffd84a), S(0xff9f1c, 0, -0.1, 0.92, 0.34, 0.14, 0.3), S(0xffe680, -0.95, -0.1, 0, 0.18, 0.42, 0.4), S(0xffe680, 0.95, -0.1, 0, 0.18, 0.42, 0.4), S(0xffd84a, 0, 0.98, 0, 0.12, 0.22, 0.12), ...face(0.2, 0.36, false)],
  frog: () => [body(0x7ed957), S(WHITE, -0.4, 0.78, 0.3, 0.3), S(WHITE, 0.4, 0.78, 0.3, 0.3), S(INK, -0.4, 0.8, 0.56, 0.13, 0.15, 0.08, 8), S(INK, 0.4, 0.8, 0.56, 0.13, 0.15, 0.08, 8), S(0xb8f08f, 0, -0.35, 0.6, 0.6, 0.45, 0.4), S(0xff5d7a, 0, 0.05, 0.93, 0.32, 0.05, 0.05, 8), S(BLUSH, -0.62, 0.0, 0.74, 0.14, 0.08, 0.05, 8), S(BLUSH, 0.62, 0.0, 0.74, 0.14, 0.08, 0.05, 8)],
  cat: () => [body(0xb9b4c9), CONE(0xb9b4c9, 0.3, 0.5, -0.5, 0.9, 0, 0, 0.35, 4), CONE(0xb9b4c9, 0.3, 0.5, 0.5, 0.9, 0, 0, -0.35, 4), CONE(0xffb3c9, 0.15, 0.3, -0.5, 0.88, 0.1, 0, 0.35, 4), CONE(0xffb3c9, 0.15, 0.3, 0.5, 0.88, 0.1, 0, -0.35, 4), S(WHITE, 0, -0.18, 0.8, 0.4, 0.28, 0.2), S(0xff8fb1, 0, -0.05, 0.98, 0.08, 0.06, 0.05, 8), S(0x8d87a3, 0, 0.72, 0.62, 0.12, 0.2, 0.06, 8), ...face(0.16, 0.36)],
  knight: () => [body(0x6fb6ff), S(0xd7dde8, 0, 0.32, 0, 0.98, 0.72, 0.98, 18), BOX(INK, 0.07, 0.34, 0.2, -0.27, 0.28, 0.84), BOX(INK, 0.07, 0.34, 0.2, -0.09, 0.3, 0.88), BOX(INK, 0.07, 0.34, 0.2, 0.09, 0.3, 0.88), BOX(INK, 0.07, 0.34, 0.2, 0.27, 0.28, 0.84), CONE(0xe2433b, 0.22, 0.7, 0, 1.25, -0.1, -0.4, 0), S(0xe2433b, 0, -0.2, -0.75, 0.75, 0.6, 0.3)],
  gambler: () => [body(0x7ccf6a), CYL(0x22202e, 0.5, 0.5, 0.62, 0, 1.05, 0), CYL(0x22202e, 0.82, 0.82, 0.08, 0, 0.76, 0), BOX(0xe2433b, 0.6, 0.12, 0.62, 0, 0.82, 0.01), BOX(WHITE, 0.24, 0.3, 0.04, 0.0, 1.06, 0.5), CONE(0xe2433b, 0.18, 0.3, -0.18, -0.5, 0.86, 0, -Math.PI / 2, 6), CONE(0xe2433b, 0.18, 0.3, 0.18, -0.5, 0.86, 0, Math.PI / 2, 6), ...face(0.12, 0.34)],
  mage: () => [body(0xff9a4a), CONE(0xd8322f, 0.7, 1.15, 0, 1.25, -0.05, -0.2, 0.15), CYL(0xd8322f, 0.86, 0.86, 0.1, 0, 0.72, 0), S(0xffd23f, 0.12, 1.5, 0.05, 0.12), ...face(0.1, 0.36)],
  hunter: () => [body(0xbfe8ff), S(WHITE, 0, 0.3, -0.08, 1.02, 0.85, 0.98, 18), S(0xbfe8ff, 0, 0.0, 0.42, 0.7, 0.62, 0.62), S(0x8fd3ff, -0.5, 0.95, 0, 0.18, 0.18, 0.18), S(0x8fd3ff, 0.5, 0.95, 0, 0.18, 0.18, 0.18), ...face(0.04, 0.3)],
  necro: () => [body(0x7b4dff), CONE(0x6a3ae8, 0.62, 0.9, 0.1, 1.05, -0.2, -0.45, -0.3), S(0xc9b8ff, 0, 0.05, 0.55, 0.62, 0.56, 0.5), S(INK, -0.22, 0.1, 1.0, 0.11, 0.14, 0.05, 8), S(INK, 0.22, 0.1, 1.0, 0.11, 0.14, 0.05, 8), S(0xa98bff, 0, -0.75, 0.3, 0.7, 0.3, 0.6)],
  smith: () => [body(0xffb43d), TORUS(0x6b4a2a, 0.2, 0.06, -0.24, 0.66, 0.68), TORUS(0x6b4a2a, 0.2, 0.06, 0.24, 0.66, 0.68), S(0xbfeaff, -0.24, 0.66, 0.66, 0.15, 0.15, 0.06, 8), S(0xbfeaff, 0.24, 0.66, 0.66, 0.15, 0.15, 0.06, 8), BOX(0x6b4a2a, 1.6, 0.1, 0.4, 0, 0.66, 0.2), S(0xe0602b, 0, -0.42, 0.7, 0.62, 0.5, 0.32), ...face(0.12, 0.34)],
  chick: () => [body(0xfff07a), S(0xff9f1c, 0, -0.02, 0.97, 0.16, 0.1, 0.16, 8), S(0xfff07a, 0, 0.98, 0, 0.1, 0.24, 0.1), S(0xfff07a, 0.15, 0.95, 0, 0.08, 0.18, 0.08), ...face(0.2, 0.32)],
  mushroom: () => [S(0xfff1dc, 0, -0.25, 0, 0.7, 0.75, 0.7, 14), S(0xe8433b, 0, 0.32, 0, 1.06, 0.66, 1.06, 18), S(WHITE, -0.4, 0.72, 0.4, 0.2, 0.12, 0.2, 8), S(WHITE, 0.45, 0.65, 0.35, 0.18, 0.1, 0.18, 8), S(WHITE, 0, 0.88, -0.2, 0.22, 0.1, 0.22, 8), S(WHITE, -0.7, 0.42, -0.4, 0.16, 0.1, 0.16, 8), ...face(-0.2, 0.26).map((g) => g.translate(0, 0, -0.22))],
  ghost: () => [S(0xf4f1ff, 0, 0.1, 0, 0.95, 1.0, 0.95, 18), S(0xf4f1ff, -0.55, -0.72, 0, 0.32), S(0xf4f1ff, 0, -0.78, 0, 0.34), S(0xf4f1ff, 0.55, -0.72, 0, 0.32), S(0x7b4dff, 0, -0.22, 0.88, 0.14, 0.18, 0.06, 8), ...face(0.24, 0.34)],
  slime: () => [S(0x4fe3d0, 0, -0.18, 0, 1.08, 0.8, 1.08, 18), S(0x9ff5ea, -0.35, 0.3, 0.55, 0.22, 0.14, 0.1, 8), S(0x4fe3d0, 0, 0.62, 0, 0.18, 0.3, 0.18), ...face(0.0, 0.34)],
  capsule: () => [S(0xffffff, 0, 0, 0, 1, 1, 1, 18)],
  whale: () => [S(0x4f8fff, 0, 0, 0, 1.06, 0.88, 1.0, 18), S(0xdfeeff, 0, -0.42, 0.42, 0.78, 0.42, 0.55), CONE(0x4f8fff, 0.38, 0.5, 0, 0.2, -1.0, Math.PI / 2, 0, 3), S(0x9fd0ff, 0, 1.0, 0, 0.08, 0.22, 0.08), S(0x9fd0ff, -0.15, 1.12, 0, 0.06, 0.14, 0.06), ...face(0.08, 0.42)],
  dino: () => [body(0x5fd17a), CONE(0x2fa65a, 0.18, 0.34, 0, 1.0, -0.1, 0, 0, 4), CONE(0x2fa65a, 0.16, 0.3, 0, 0.82, -0.55, -0.6, 0, 4), CONE(0x2fa65a, 0.14, 0.26, 0, 0.4, -0.9, -1.1, 0, 4), S(0xb8f0c5, 0, -0.35, 0.62, 0.62, 0.48, 0.38), S(WHITE, -0.22, -0.02, 0.96, 0.07, 0.08, 0.04, 6), S(WHITE, 0.22, -0.02, 0.96, 0.07, 0.08, 0.04, 6), ...face(0.24, 0.38)],
  panda: () => [body(0xffffff), S(0x24202e, -0.62, 0.72, 0, 0.3), S(0x24202e, 0.62, 0.72, 0, 0.3), S(0x24202e, -0.36, 0.14, 0.82, 0.22, 0.27, 0.1, 10), S(0x24202e, 0.36, 0.14, 0.82, 0.22, 0.27, 0.1, 10), S(WHITE, -0.33, 0.18, 0.93, 0.06, 0.07, 0.04, 6), S(WHITE, 0.39, 0.18, 0.93, 0.06, 0.07, 0.04, 6), S(0x24202e, 0, -0.12, 0.96, 0.1, 0.07, 0.05, 8), S(BLUSH, -0.6, -0.12, 0.76, 0.14, 0.08, 0.05, 8), S(BLUSH, 0.6, -0.12, 0.76, 0.14, 0.08, 0.05, 8)],
  penguin: () => [body(0x2c3e70), S(WHITE, 0, -0.12, 0.42, 0.78, 0.82, 0.62), S(0xffa31a, 0, 0.0, 0.98, 0.16, 0.1, 0.14, 8), S(0xffa31a, -0.35, -0.92, 0.3, 0.24, 0.1, 0.3), S(0xffa31a, 0.35, -0.92, 0.3, 0.24, 0.1, 0.3), ...face(0.24, 0.32)],
  crownbear: () => [...BUILD.bear(), CYL(0xffd23f, 0.42, 0.36, 0.3, 0, 0.98, 0, 0, 8), CONE(0xffd23f, 0.1, 0.24, -0.3, 1.24, 0), CONE(0xffd23f, 0.1, 0.24, 0, 1.28, 0), CONE(0xffd23f, 0.1, 0.24, 0.3, 1.24, 0), S(0xff4f8b, 0, 0.98, 0.4, 0.08)],
  goldknight: () => BUILD.knight(),
  gem: () => [paint(new THREE.OctahedronGeometry(1, 0).scale(0.9, 1.15, 0.9), 0x5fe8ff), S(WHITE, -0.25, 0.3, 0.5, 0.12, 0.2, 0.06, 6), ...face(-0.1, 0.3, true).map((g) => g.translate(0, 0, -0.25))],
}
const KIND_SIZE = { m0: [0.105, 1], m1: [0.105, 1.05], m2: [0.075, 0.8], m3: [0.085, 0.9], m4: [0.16, 1.55], m5: [0.1, 1.15] }
for (const m of MACHINES) for (const id of m.kinds) {
  const [r, w] = KIND_SIZE[m.key]
  KINDS[id] = { id, r, w, machine: m.key, geometry: merge(BUILD[id]()).scale(r, r, r) }
}
for (const id of CAPSULE_POOL) KINDS[id].capsuleOK = true

const gradient = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat)
gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true
const PLUSH = [
  new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient }),
  new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient, emissive: 0x3a2a66, emissiveIntensity: 0.6 }),
  new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient, emissive: 0x6a4a00, emissiveIntensity: 0.7 }),
]
const capsuleTops = [0xff4f8b, 0x4fc3ff, 0xffd23f, 0x2ee6a6, 0xb06cff]
function capsuleGeometry(color, r) {
  return merge([S(color, 0, 0.02, 0, 1, 1, 1, 18).translate(0, 0, 0), S(0xffffff, 0, -0.04, 0, 1.0, 0.98, 1.0, 18)].map((g, i) => {
    const pos = g.attributes.position
    for (let k = 0; k < pos.count; k++) if (i === 0 ? pos.getY(k) < 0 : pos.getY(k) > 0) pos.setY(k, 0)
    return g
  })).scale(r, r, r)
}
const CAPSULE_GEOS = capsuleTops.map((c) => capsuleGeometry(c, KIND_SIZE.m3[0]))
const CAPSULE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.05 })

// ---------------------------------------------------------------- scene
const canvas = $('view')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
renderer.outputColorSpace = THREE.SRGBColorSpace
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1b1033)
scene.fog = new THREE.Fog(0x1b1033, 7, 16)
const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60)
const hemi = new THREE.HemisphereLight(0xfff0ff, 0x3a2266, 1.25); scene.add(hemi)
const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(1.5, 4, 3); scene.add(key)
const pinkLight = new THREE.PointLight(0xff4fd8, 6, 8, 1.6); pinkLight.position.set(-2.5, 2.6, 1.5); scene.add(pinkLight)
const cyanLight = new THREE.PointLight(0x4fc3ff, 6, 8, 1.6); cyanLight.position.set(2.5, 2.6, 1.5); scene.add(cyanLight)

// Room: checker floor, dark walls, neon strips on the ceiling (the shops in the user's photos).
function checker() {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const g = c.getContext('2d')
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#f4eef8' : '#1d1630'; g.fillRect(x * 64, y * 64, 64, 64) }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(10, 4); tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
const SPACING = 1.75
const ROOM_W = SPACING * MACHINES.length + 4
const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, 8).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: checker() }))
floorMesh.position.set(SPACING * (MACHINES.length - 1) / 2, -0.95, 1.6); scene.add(floorMesh)
const wall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, 5), new THREE.MeshLambertMaterial({ color: 0x2a1a4a }))
wall.position.set(SPACING * (MACHINES.length - 1) / 2, 1.5, -1.1); scene.add(wall)
const NEON = (c) => new THREE.MeshBasicMaterial({ color: c })
for (let i = 0; i < 3; i++) {
  const strip = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.04, 0.04), NEON(i % 2 ? 0x4fc3ff : 0xff4fd8))
  strip.position.set(SPACING * (MACHINES.length - 1) / 2, 2.9, -0.6 + i * 1.2); scene.add(strip)
}
const wallStrip = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.05, 0.03), NEON(0xff4fd8)); wallStrip.position.set(SPACING * (MACHINES.length - 1) / 2, 2.25, -1.08); scene.add(wallStrip)

// Machine interior in local metres: floor at y 0, x -0.5..0.5, z -0.45..0.45. Prize chute in the front-left corner.
const IN = { x0: -0.5, x1: 0.5, z0: -0.45, z1: 0.45, top: 1.42 }
const CHUTE = { x1: -0.18, z0: 0.12, wall: 0.17 }
const wallH = (m) => Math.max(CHUTE.wall, KIND_SIZE[m.key][0] * 1.6)
const HOME = { x: (IN.x0 + CHUTE.x1) / 2, z: (CHUTE.z0 + IN.z1) / 2 }
const AIM = { x0: -0.43, x1: 0.43, z0: -0.37, z1: 0.37 }
const CLAW_TOP = 1.2
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0, depthWrite: false, side: THREE.DoubleSide })
const acrylMat = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })
const darkMat = new THREE.MeshLambertMaterial({ color: 0x2a2440 })
const metalMat = new THREE.MeshStandardMaterial({ color: 0xdfe4ef, metalness: 0.85, roughness: 0.3 })

function signTexture(neon) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128
  const g = c.getContext('2d'); const col = '#' + neon.toString(16).padStart(6, '0')
  g.fillStyle = '#1b1033'; g.fillRect(0, 0, 512, 128)
  g.shadowColor = col; g.shadowBlur = 24; g.strokeStyle = col; g.lineWidth = 8; g.strokeRect(10, 10, 492, 108)
  g.font = '900 72px Arial Rounded MT Bold, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillStyle = '#ffffff'; g.fillText('CLAW POP', 256, 68)
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
function cabinet(m, index) {
  const g = new THREE.Group(); g.position.x = index * SPACING
  const bodyMat = new THREE.MeshLambertMaterial({ color: m.body })
  const neon = NEON(m.neon)
  const add = (geo, mat, x, y, z) => { const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); g.add(mesh); return mesh }
  add(new THREE.BoxGeometry(1.16, 0.95, 1.06), bodyMat, 0, -0.475, 0)
  add(new THREE.BoxGeometry(1.2, 0.05, 1.1), neon, 0, -0.02, 0)
  add(new THREE.BoxGeometry(0.36, 0.3, 0.02), darkMat, HOME.x, -0.48, 0.535)
  add(new THREE.BoxGeometry(0.4, 0.04, 0.03), neon, HOME.x, -0.3, 0.54)
  add(new THREE.BoxGeometry(0.4, 0.12, 0.3), bodyMat, 0.18, -0.08, 0.66)
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.1), metalMat, 0.08, 0.02, 0.66)
  add(new THREE.SphereGeometry(0.03, 10, 8), NEON(0xff4f8b), 0.08, 0.08, 0.66)
  add(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), neon, 0.28, -0.01, 0.66)
  for (const [x, z] of [[-0.54, -0.49], [0.54, -0.49], [-0.54, 0.49], [0.54, 0.49]]) {
    add(new THREE.BoxGeometry(0.06, IN.top + 0.05, 0.06), bodyMat, x, IN.top / 2, z)
    add(new THREE.BoxGeometry(0.015, IN.top, 0.015), neon, x + (x < 0 ? 0.035 : -0.035), IN.top / 2, z + (z < 0 ? 0.035 : -0.035))
  }
  add(new THREE.BoxGeometry(1.16, 0.34, 1.06), bodyMat, 0, IN.top + 0.17, 0)
  const sign = add(new THREE.PlaneGeometry(1.0, 0.25), new THREE.MeshBasicMaterial({ map: signTexture(m.neon) }), 0, IN.top + 0.17, 0.531)
  sign.renderOrder = 1
  add(new THREE.BoxGeometry(1.0, 0.012, 0.9), darkMat, 0, 0.0, 0)
  add(new THREE.BoxGeometry(1.0, IN.top, 0.01), new THREE.MeshLambertMaterial({ color: m.body === 0x3a2f5a ? 0x3a2f5a : 0xffe6f6 }), 0, IN.top / 2, IN.z0 - 0.005)
  // glass: front, sides
  const front = add(new THREE.PlaneGeometry(1.04, IN.top), glassMat, 0, IN.top / 2, IN.z1 + 0.03)
  front.renderOrder = 3
  for (const x of [-0.52, 0.52]) { const side = add(new THREE.PlaneGeometry(0.94, IN.top), glassMat, x, IN.top / 2, 0); side.rotation.y = Math.PI / 2; side.renderOrder = 3 }
  const streak = add(new THREE.PlaneGeometry(0.06, IN.top * 0.9), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false }), 0.25, IN.top / 2, IN.z1 + 0.035)
  streak.rotation.z = 0.35; streak.renderOrder = 4
  // prize chute acrylic shield
  const wh = wallH(m)
  const sh1 = add(new THREE.PlaneGeometry(IN.z1 - CHUTE.z0, wh), acrylMat, CHUTE.x1, wh / 2, (CHUTE.z0 + IN.z1) / 2); sh1.rotation.y = Math.PI / 2
  add(new THREE.PlaneGeometry(CHUTE.x1 - IN.x0, wh), acrylMat, (IN.x0 + CHUTE.x1) / 2, wh / 2, CHUTE.z0)
  add(new THREE.BoxGeometry(0.012, 0.012, IN.z1 - CHUTE.z0), neon, CHUTE.x1, wh, (CHUTE.z0 + IN.z1) / 2)
  add(new THREE.BoxGeometry(CHUTE.x1 - IN.x0, 0.012, 0.012), neon, (IN.x0 + CHUTE.x1) / 2, wh, CHUTE.z0)
  const holeMesh = add(new THREE.PlaneGeometry(CHUTE.x1 - IN.x0, IN.z1 - CHUTE.z0), new THREE.MeshBasicMaterial({ color: 0x07040f }), (IN.x0 + CHUTE.x1) / 2, 0.008, (CHUTE.z0 + IN.z1) / 2)
  holeMesh.rotation.x = -Math.PI / 2
  // gantry rails
  add(new THREE.BoxGeometry(1.0, 0.025, 0.025), metalMat, 0, IN.top - 0.03, -0.42)
  add(new THREE.BoxGeometry(1.0, 0.025, 0.025), metalMat, 0, IN.top - 0.03, 0.42)
  scene.add(g)
  return { group: g, plush: new THREE.Group(), m, index }
}
const cabinets = MACHINES.map(cabinet)
for (const c of cabinets) c.group.add(c.plush)

// Claw: bridge rail on x, carriage, cable, head, three prongs.
const claw = { x: HOME.x, z: HOME.z, y: CLAW_TOP, open: 0.2, tx: HOME.x, tz: HOME.z, group: new THREE.Group(), prongs: [], held: null, heldOffset: new THREE.Vector3(), sway: 0, swayV: 0 }
const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.88), metalMat)
const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.09), metalMat)
const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 6), new THREE.MeshLambertMaterial({ color: 0x333344 }))
const head = new THREE.Group()
head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.09, 16), metalMat))
const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 16).rotateX(Math.PI / 2), NEON(0xff4fd8)); ring.position.y = -0.03; head.add(ring)
for (let i = 0; i < 3; i++) {
  const pivot = new THREE.Group(); pivot.rotation.y = i * Math.PI * 2 / 3; pivot.position.y = -0.045
  const arm = new THREE.Group(); arm.position.z = 0.04
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.11, 0.012), metalMat); upper.position.y = -0.055
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.05, 0.012), metalMat); tip.position.set(0, -0.115, -0.018); tip.rotation.x = 0.7
  arm.add(upper, tip); pivot.add(arm); head.add(pivot); claw.prongs.push(arm)
}
claw.group.add(bridge, carriage, cable, head)
const aimDot = new THREE.Mesh(new THREE.RingGeometry(0.025, 0.04, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3355, transparent: true, opacity: 0.95, depthTest: false }))
const laser = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 6), new THREE.MeshBasicMaterial({ color: 0xff3355, transparent: true, opacity: 0.45, depthWrite: false }))
aimDot.renderOrder = 6; laser.renderOrder = 5
claw.group.add(aimDot, laser)
const TIP = 0.15

// ---------------------------------------------------------------- piles (static layout for the shop, physics for the active machine)
// Golden plush: recolour by brightness so faces stay readable (dark stays ink, the rest turns gold).
const goldGeos = {}
const GOLD_DARK = new THREE.Color(0x8a5a00), GOLD_LIGHT = new THREE.Color(0xfff0a0)
function goldGeometry(id) {
  if (goldGeos[id]) return goldGeos[id]
  const g = KINDS[id].geometry.clone(), col = g.attributes.color
  const c = new THREE.Color()
  for (let i = 0; i < col.count; i++) {
    c.setRGB(col.getX(i), col.getY(i), col.getZ(i))
    const l = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b
    if (l < 0.12) continue
    c.copy(GOLD_DARK).lerp(GOLD_LIGHT, Math.pow(clamp((l - 0.12) / 0.88, 0, 1), 0.6))
    col.setXYZ(i, c.r, c.g, c.b)
  }
  return (goldGeos[id] = g)
}
function plushMesh(id, rarity, capsuleColor = 0) {
  if (id === 'capsule') return new THREE.Mesh(CAPSULE_GEOS[capsuleColor], CAPSULE_MAT)
  if (id === 'goldknight' || id === 'crownbear') rarity = 2
  return new THREE.Mesh(rarity === 2 ? goldGeometry(id) : KINDS[id].geometry, PLUSH[rarity])
}
function rollItem(m) {
  const id = pick(m.kinds)
  const boost = m.key === 'm5' ? 1 : 0
  return { id, rarity: id === 'goldknight' || id === 'crownbear' ? 2 : rollRarity(boost), cap: Math.floor(Math.random() * capsuleTops.length) }
}
function packPile(m) {
  const items = [], r = KIND_SIZE[m.key][0]
  let layer = 0, tries = 0
  while (items.length < m.count && tries < 4000) {
    tries++
    const x = rnd(IN.x0 + r, IN.x1 - r), z = rnd(IN.z0 + r, IN.z1 - r)
    if (x < CHUTE.x1 + r + 0.04 && z > CHUTE.z0 - r - 0.04) continue
    const y = r + layer * r * 1.6 + rnd(0, r * 0.3)
    if (items.some((o) => Math.hypot(o.x - x, o.z - z) < r * 1.85 && Math.abs(o.y - y) < r * 1.5)) { if (tries % 120 === 0) layer++; continue }
    items.push({ ...rollItem(m), x, y, z, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(-0.5, 0.5), rnd(-Math.PI, Math.PI), rnd(-0.4, 0.4))) })
  }
  return items
}
function showPile(cab, items) {
  cab.plush.clear()
  for (const it of items) {
    const mesh = plushMesh(it.id, it.rarity, it.cap)
    mesh.position.set(it.x, it.y, it.z); mesh.quaternion.copy(it.q); cab.plush.add(mesh)
    it.mesh = mesh
  }
}
const piles = MACHINES.map((m, i) => { const items = packPile(m); showPile(cabinets[i], items); return items })
const settled = new Set()
function settle(index) { if (settled.has(index) || physics.active >= 0 && game.state === 'play') return; settled.add(index); buildPhysics(index); physics.world = null; physics.bodies = []; physics.active = -1 }

// Physics for the machine being played.
const physics = { world: null, bodies: [], clawBody: null, active: -1 }
function buildPhysics(index) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) })
  world.allowSleep = true
  world.defaultContactMaterial.friction = 0.55
  world.defaultContactMaterial.restitution = 0.04
  world.solver.iterations = 8
  const box = (hx, hy, hz, x, y, z) => { const b = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)) }); b.position.set(x, y, z); world.addBody(b) }
  box((IN.x1 - CHUTE.x1) / 2, 0.05, (IN.z1 - IN.z0) / 2, (IN.x1 + CHUTE.x1) / 2, -0.05, 0)
  box((CHUTE.x1 - IN.x0) / 2, 0.05, (CHUTE.z0 - IN.z0) / 2, (IN.x0 + CHUTE.x1) / 2, -0.05, (IN.z0 + CHUTE.z0) / 2)
  box(0.05, 1, 0.6, IN.x0 - 0.05, 0.9, 0); box(0.05, 1, 0.6, IN.x1 + 0.05, 0.9, 0)
  box(0.6, 1, 0.05, 0, 0.9, IN.z0 - 0.05); box(0.6, 1, 0.05, 0, 0.9, IN.z1 + 0.05)
  const wh = wallH(MACHINES[index])
  box(0.008, wh / 2, (IN.z1 - CHUTE.z0) / 2, CHUTE.x1 + 0.008, wh / 2, (CHUTE.z0 + IN.z1) / 2)
  box((CHUTE.x1 - IN.x0) / 2, wh / 2, 0.008, (IN.x0 + CHUTE.x1) / 2, wh / 2, CHUTE.z0 - 0.008)
  box(0.3, 0.05, 0.3, (IN.x0 + CHUTE.x1) / 2, -0.75, (CHUTE.z0 + IN.z1) / 2)
  const m = MACHINES[index], r = KIND_SIZE[m.key][0]
  physics.bodies = piles[index].map((it) => {
    const mass = 0.25 * KINDS[it.id].w
    const b = new CANNON.Body({ mass, shape: new CANNON.Sphere(r), linearDamping: 0.3, angularDamping: 0.55, sleepSpeedLimit: 0.06, sleepTimeLimit: 0.6 })
    b.position.set(it.x, it.y, it.z); b.quaternion.set(it.q.x, it.q.y, it.q.z, it.q.w)
    b.item = it; b.r = r; b.mass0 = mass
    world.addBody(b)
    return b
  })
  const cb = new CANNON.Body({ type: CANNON.Body.KINEMATIC, mass: 0, shape: new CANNON.Sphere(0.05) })
  cb.position.set(HOME.x, CLAW_TOP - 0.06, HOME.z); world.addBody(cb)
  physics.world = world; physics.clawBody = cb; physics.active = index
  for (let i = 0; i < 150; i++) world.step(1 / 60)
  // Anything that settled into or onto the chute goes back on top of the pile (no free prizes before the first drop).
  for (let round = 0; round < 3; round++) {
    let moved = false
    for (const b of physics.bodies) {
      if (b.position.x < CHUTE.x1 + b.r && b.position.z > CHUTE.z0 - b.r || b.position.y < 0) {
        b.position.set(rnd(0, IN.x1 - b.r), 0.6 + rnd(0, 0.2), rnd(IN.z0 + b.r, 0)); b.velocity.set(0, 0, 0); b.wakeUp(); moved = true
      }
    }
    if (!moved) break
    for (let i = 0; i < 90; i++) world.step(1 / 60)
  }
  syncPile()
}
function syncPile() {
  for (const b of physics.bodies) {
    if (b === undefined) continue
    const mesh = b.item.mesh
    mesh.position.set(b.position.x, b.position.y, b.position.z)
    mesh.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w)
    b.item.x = b.position.x; b.item.y = b.position.y; b.item.z = b.position.z; b.item.q.copy(mesh.quaternion)
  }
}
function setKinematic(b, on) {
  if (on) { b.type = CANNON.Body.KINEMATIC; b.mass = 0; b.updateMassProperties(); b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0) }
  else { b.type = CANNON.Body.DYNAMIC; b.mass = b.mass0; b.updateMassProperties(); b.wakeUp() }
}
// Highest plush top under a point (where the claw would touch first).
function surfaceUnder(x, z) {
  let top = 0.02, best = null, bestD = 9
  for (const b of physics.bodies) {
    if (b === claw.held) continue
    const d = Math.hypot(b.position.x - x, b.position.z - z)
    if (d < b.r * 0.85 + 0.05) {
      const ty = b.position.y + Math.sqrt(Math.max(0, (b.r + 0.03) ** 2 - d * d)) * 0.75
      if (ty > top) top = ty
      if (d < bestD) { bestD = d; best = b }
    }
  }
  return { top, best, d: bestD }
}

// ---------------------------------------------------------------- escape run
// Locked in the shop at 3 AM: open 6 doors (one key plush per machine) before dawn or before the coins run out.
const DOORS = MACHINES.length
const RUN_SECONDS = 900, START_COINS = 30
const TOOLS = [
  { id: 'magnet', icon: '🧲' }, { id: 'hammer', icon: '🔨' }, { id: 'sticky', icon: '🍯' },
  { id: 'light', icon: '🔦' }, { id: 'wallet', icon: '👛' }, { id: 'watch', icon: '⏱️' },
]
const TOOL_NAME = { magnet: 'tMagnet', hammer: 'tHammer', sticky: 'tSticky', light: 'tLight', wallet: 'tWallet', watch: 'tWatch' }
const game = { state: 'load', machine: 0, door: 0, coins: START_COINS, clock: RUN_SECONDS, elapsed: 0, timer: 12, phase: 'aim', phaseT: 0, pHold: 0, shake: 0, cardT: 0, checked: false, tools: [], magnet: 0, sticky: 0, hammer: 0, light: false, event: null, eventT: 0, eventStage: '', nextEvent: 40, qte: null, continued: false, won: false, reason: '', yawTarget: 0.25, lightLevel: 1, prizes: [] }
const input = { dx: 0, dz: 0, id: null, px: 0, py: 0, keys: new Set(), sx: 0, sy: 0, stick: null }
const keyWeight = () => 1 + game.door * 0.1

function startRun() {
  Object.assign(game, { door: 0, coins: START_COINS, clock: RUN_SECONDS, elapsed: 0, tools: [], magnet: 0, sticky: 0, hammer: 0, light: false, event: null, qte: null, nextEvent: 45, continued: false, won: false, reason: '', prizes: [] })
  hide_('title'); hide_('result'); show('hud')
  $('got').innerHTML = ''
  enterDoor(0)
  game.state = 'play'
  audio.unlock(); audio.music('play')
  platform.message('gameplay_started')
  sync()
}
function enterDoor(index) {
  game.machine = index; game.phase = 'aim'
  piles[index] = packPile(MACHINES[index]); showPile(cabinets[index], piles[index])
  buildPhysics(index)
  // The key plush sits deeper in each later machine; two tool capsules hide in the pile.
  const order = [...physics.bodies].sort((a, b) => b.position.y - a.position.y)
  const inside = order.filter((b) => b.position.x > AIM.x0 && b.position.x < AIM.x1 && b.position.z > AIM.z0 && b.position.z < AIM.z1)
  const key = inside[Math.floor(clamp(index * 0.17, 0, 0.85) * (inside.length - 1))] || order[0]
  key.item.key = true
  key.mass0 *= keyWeight(); setKinematic(key, false)
  key.item.mesh.add(keyMark())
  if (MACHINES[index].key !== 'm3') {
    for (const b of order.filter((o) => o !== key).sort(() => Math.random() - 0.5).slice(0, 2)) makeCapsule(b)
  }
  cabinets[index].group.add(claw.group)
  startTry()
  banner(`${t('door')} ${index + 1} / ${DOORS}`)
  setHint(t('keyHint'))
}
// A gold key and a glow ring riding on the key plush.
const KEY_MAT = new THREE.MeshToonMaterial({ color: 0xffd23f, gradientMap: gradient, emissive: 0x8a6000, emissiveIntensity: 0.8 })
const HALO_MAT = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })
function keyMark() {
  const g = new THREE.Group()
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 6, 14), KEY_MAT); ring.position.set(0, 0.03, 0.11)
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.06, 0.01), KEY_MAT); stem.position.set(0, -0.015, 0.11)
  const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.01), KEY_MAT); tooth.position.set(0.012, -0.04, 0.11)
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), HALO_MAT); halo.scale.setScalar(0.16); halo.userData.halo = true
  g.add(ring, stem, tooth, halo)
  return g
}
function makeCapsule(b) {
  const it = b.item
  const mesh = new THREE.Mesh(capsuleGeometry(capsuleTops[Math.floor(Math.random() * capsuleTops.length)], b.r), CAPSULE_MAT)
  cabinets[game.machine].plush.remove(it.mesh); cabinets[game.machine].plush.add(mesh)
  it.mesh = mesh; it.id = 'capsule'; it.tool = true
}
function startTry() {
  game.yawTarget = 0.25
  game.phase = 'aim'; game.timer = 12; game.phaseT = 0; game.qte = null
  claw.x = claw.tx = HOME.x; claw.z = claw.tz = HOME.z; claw.y = CLAW_TOP; claw.open = 0.2
  $('dropBtn').disabled = false
}
function dropClaw() {
  if (game.state !== 'play') return
  if (game.qte) { game.qte.got++; buzz(8); audio.play('click', 0.35, 1 + game.qte.got * 0.05); return }
  if (game.phase !== 'aim') return
  if (game.event === 'guard' && game.eventStage === 'beam') { spotted(); return }
  if (game.coins <= 0) return
  game.coins--
  game.phase = 'down'; game.phaseT = 0; setHint('')
  $('dropBtn').disabled = true
  audio.play('coin', 0.4, 1.3); audio.play('drop', 0.7); buzz(15)
}
function finishTry() {
  if (game.state !== 'play') return
  if (game.phase === 'transit') return
  if (game.coins <= 0) { fail('coins'); return }
  startTry()
}
function fail(reason) {
  if (game.state !== 'play') return
  game.reason = reason; game.won = false
  endRun()
}
function endRun() {
  game.state = 'result'
  audio.hum(0, 90); endEvent()
  save.runs++
  save.bestDoor = Math.max(save.bestDoor || 0, game.won ? DOORS : game.door)
  if (game.won && (!save.bestTime || game.elapsed < save.bestTime)) { save.bestTime = Math.round(game.elapsed); game.newBest = true } else game.newBest = false
  writeSave()
  hide_('hud'); $('qte').classList.add('hide'); show('result')
  renderResult()
  platform.message('gameplay_stopped')
  audio.music('lobby')
  if (save.runs >= 2) setTimeout(() => platform.interstitial(), 900)
}
function pauseGame() { if (game.state !== 'play') return; game.state = 'pause'; show('pause'); audio.hum(0, 90); platform.message('gameplay_stopped') }
function resumeGame() { if (game.state !== 'pause') return; hide_('pause'); game.state = 'play'; last = performance.now(); platform.message('gameplay_started') }

function decideGrab() {
  const { best, d } = surfaceUnder(claw.x, claw.z)
  if (!best || best.position.y + best.r < claw.y - TIP - best.r * 1.4) return null
  const reach = best.r + 0.06
  if (d > reach) return null
  const center = 1 - d / reach
  const w = KINDS[best.item.id === 'capsule' ? 'bear' : best.item.id].w * (best.item.key ? keyWeight() : 1)
  game.pHold = clamp(MACHINES[game.machine].grip * Math.pow(center, 0.6) / w * 1.15, 0.06, 0.94)
  if (game.sticky > 0) { game.sticky--; game.pHold = Math.sqrt(game.pHold); game.stickyGrab = true } else game.stickyGrab = false
  if (game.magnet > 0) { game.magnet--; game.pHold = 1; game.magnetGrab = true } else game.magnetGrab = false
  return best
}
function release(slip) {
  const b = claw.held
  if (!b) return
  claw.held = null
  setKinematic(b, false)
  b.velocity.set(rnd(-0.15, 0.15), slip ? 0.1 : -0.3, rnd(-0.15, 0.15))
  b.angularVelocity.set(rnd(-4, 4), rnd(-4, 4), rnd(-4, 4))
}
function slipNow() { release(true); banner(t('close1'), true); audio.play('slip', 0.8); buzz(30) }
// Button mashing to keep a slipping plush: the key plush always tests you at the top.
function startQte(need) {
  if (game.qte || !claw.held) return
  if (game.magnetGrab) return
  game.qte = { need: Math.max(3, need - (game.stickyGrab ? 2 : 0)), got: 0, t: 2.0 }
  $('qte').classList.remove('hide'); $('qteText').textContent = t('hold')
  $('dropBtn').disabled = false
  audio.play('slip', 0.5, 1.4); buzz([20, 30, 20])
}
function updateQte(dt) {
  const q = game.qte
  if (BOT && Math.random() < dt * 6.5) q.got++
  q.t -= dt
  claw.sway = Math.sin(performance.now() * 0.05) * (1 - q.got / q.need) * 0.6
  $('qteBar').style.width = Math.min(100, q.got / q.need * 100) + '%'
  if (q.got >= q.need) { game.qte = null; $('qte').classList.add('hide'); game.pHold = 1; banner(t('saved')); audio.play('grab', 0.8, 1.3); $('dropBtn').disabled = true }
  else if (q.t <= 0) { game.qte = null; $('qte').classList.add('hide'); slipNow(); $('dropBtn').disabled = true }
}
function collect(b) {
  physics.world.removeBody(b)
  physics.bodies.splice(physics.bodies.indexOf(b), 1)
  const pile = piles[game.machine]; pile.splice(pile.indexOf(b.item), 1)
  cabinets[game.machine].plush.remove(b.item.mesh)
  if (b.item.key) { openDoor(); return }
  if (b.item.tool) { offerTools(); return }
  let { id, rarity } = b.item
  if (id === 'capsule') { id = pick(CAPSULE_POOL); rarity = Math.max(rarity, rollRarity(0.6)) }
  const isNew = !save.owned[id]
  save.owned[id] = (save.owned[id] || 0) + 1
  const coins = [1, 2, 4][rarity]
  game.coins += coins
  game.prizes.push({ id, rarity })
  writeSave()
  if (isNew && !game.qte) showCard(id, rarity, isNew, coins)
  const img = document.createElement('img'); img.src = thumb(id, rarity); $('got').appendChild(img)
  banner(t('got'))
  audio.play(rarity ? 'rare' : 'win', 0.9); audio.play('coin', 0.7); buzz(rarity ? [40, 60, 80] : 50)
  game.shake = 0.25
}
function openDoor() {
  game.door++
  audio.play('rare', 1); audio.play('levelup', 0.8); buzz([60, 40, 120])
  game.shake = 0.5
  if (game.door >= DOORS) { game.won = true; banner(t('escaped')); setTimeout(() => { if (game.state === 'play') endRun() }, 1600); game.phase = 'transit'; return }
  banner(t('opened'))
  game.coins += 3
  release(false)
  game.phase = 'transit'; game.phaseT = 0
}
function offerTools() {
  audio.play('levelup', 0.7)
  const pool = TOOLS.filter((x) => !(x.id === 'light' && game.light)).sort(() => Math.random() - 0.5).slice(0, 3)
  if (BOT) { useTool(pool[0].id); return }
  game.state = 'pick'
  show('panel'); $('panelTitle').textContent = t('toolPick')
  const body = $('panelBody'); body.innerHTML = ''
  const wrap = document.createElement('div'); wrap.className = 'upgrades tools3'
  for (const tool of pool) {
    const b = document.createElement('button'); b.className = 'up can'
    b.innerHTML = `<b>${tool.icon} ${t(TOOL_NAME[tool.id])}</b><small>${t(TOOL_NAME[tool.id] + 'D')}</small>`
    b.onclick = () => { useTool(tool.id); hide_('panel'); $('panelClose').classList.remove('hide'); game.state = 'play'; last = performance.now() }
    wrap.appendChild(b)
  }
  body.appendChild(wrap); $('panelClose').classList.add('hide')
}
function useTool(id) {
  audio.play('buy', 0.8)
  if (id === 'wallet') game.coins += 6
  else if (id === 'watch') game.clock += 90
  else if (id === 'magnet') game.magnet++
  else if (id === 'sticky') game.sticky += 3
  else if (id === 'light') game.light = true
  else if (id === 'hammer') game.hammer++
  renderTools()
}
function renderTools() {
  const host = $('tools'); host.innerHTML = ''
  const add = (icon, n, fn) => { const b = document.createElement('button'); b.className = 'tool' + (fn ? ' act' : ''); b.innerHTML = `${icon}${n > 1 ? `<i>${n}</i>` : ''}`; if (fn) b.addEventListener('pointerdown', (e) => { e.stopPropagation(); fn() }); host.appendChild(b) }
  if (game.magnet) add('🧲', game.magnet)
  if (game.sticky) add('🍯', game.sticky)
  if (game.light) add('🔦', 1)
  if (game.hammer) add('🔨', game.hammer, useHammer)
}
function useHammer() {
  if (!game.hammer || game.state !== 'play') return
  game.hammer--; shakePile(1.2); game.shake = 0.6; audio.play('thud', 1, 0.7); buzz(80); renderTools()
}
function shakePile(power) {
  for (const b of physics.bodies) {
    if (b === claw.held) continue
    b.wakeUp(); b.velocity.set(rnd(-0.6, 0.6) * power, rnd(0.8, 1.6) * power, rnd(-0.6, 0.6) * power)
  }
}

// ---------------------------------------------------------------- live events
const EVENTS = ['blackout', 'guard', 'quake']
function startEvent() {
  const type = pick(EVENTS)
  game.event = type; game.eventT = 0; game.eventStage = 'warn'
  if (type === 'blackout') { banner(t('blackout'), true); audio.play('slip', 0.9, 0.6) }
  if (type === 'guard') { banner(t('guard'), true); audio.play('thud', 0.6, 0.6) }
  if (type === 'quake') { banner(t('quake'), true); audio.play('thud', 1, 0.5); buzz(200) }
}
function endEvent() {
  game.event = null; game.eventStage = ''
  $('beam').classList.remove('on'); $('vignette').classList.remove('on')
  game.nextEvent = rnd(28, 44) - game.door * 2
}
function updateEvent(dt) {
  if (!game.event) {
    if (game.door >= 1 && game.phase !== 'transit') game.nextEvent -= dt
    if (game.nextEvent <= 0 && (game.phase === 'aim' || game.phase === 'up' || game.phase === 'carry')) startEvent()
    return
  }
  game.eventT += dt
  if (game.event === 'blackout') {
    $('vignette').classList.add('on')
    if (game.eventT > 7) endEvent()
  } else if (game.event === 'guard') {
    if (game.eventStage === 'warn' && Math.floor(game.eventT * 2.5) !== Math.floor((game.eventT - dt) * 2.5)) audio.play('thud', 0.5, 0.6)
    if (game.eventStage === 'warn' && game.eventT > 1.6) { game.eventStage = 'beam'; $('beam').classList.add('on') }
    if (game.eventStage === 'beam' && game.eventT > 5.1) endEvent()
  } else if (game.event === 'quake') {
    game.shake = Math.max(game.shake, 0.35)
    if (Math.floor(game.eventT * 3) !== Math.floor((game.eventT - dt) * 3)) shakePile(0.35)
    if (claw.held && !game.qte && game.eventT < 0.2) startQte(5 + game.door)
    if (game.eventT > 2.2) endEvent()
  }
}
function spotted() {
  if (game.eventStage !== 'beam') return
  game.coins = Math.max(0, game.coins - 3)
  banner(t('spotted'), true); audio.play('deny', 1); buzz([80, 50, 80]); game.shake = 0.4
  endEvent()
  if (game.coins <= 0 && game.phase === 'aim') fail('coins')
}

function showCard(id, rarity, isNew, coins) {
  const card = $('card'); card.classList.add('hide')
  $('cardImg').src = thumb(id, rarity)
  $('cardNew').textContent = isNew ? t('fresh') : ''
  const rb = $('cardRarity'); rb.textContent = [t('common'), t('rare'), t('legend')][rarity]; rb.className = rarity ? 'r' + rarity : ''
  $('cardCoins').textContent = '+' + coins
  void card.offsetWidth; card.classList.remove('hide')
  const inner = card.firstElementChild; inner.style.animation = 'none'; void inner.offsetWidth; inner.style.animation = ''
  game.cardT = 1.3
}

function updateClaw(dt) {
  const speedAim = 0.42
  if (game.qte) updateQte(dt)
  if (game.phase === 'transit') {
    game.phaseT += dt
    audio.hum(0, 90)
    if (game.phaseT > 1.8 && !game.won) enterDoor(game.door)
    return
  }
  if (game.phase === 'aim') {
    game.timer -= dt
    if (BOT) botAim(dt)
    // Four directions in camera space: screen-right and screen-down follow the camera's current angle.
    let kx = 0, kz = 0
    if (input.keys.has('ArrowLeft') || input.keys.has('KeyA')) kx -= 1
    if (input.keys.has('ArrowRight') || input.keys.has('KeyD')) kx += 1
    if (input.keys.has('ArrowUp') || input.keys.has('KeyW')) kz -= 1
    if (input.keys.has('ArrowDown') || input.keys.has('KeyS')) kz += 1
    const a = view.yaw, sr = input.dx + (kx + input.sx) * speedAim * dt, sd = input.dz + (kz + input.sy) * speedAim * dt
    const mx = Math.cos(a) * sr + Math.sin(a) * sd, mz = -Math.sin(a) * sr + Math.cos(a) * sd
    if (Math.abs(mx) + Math.abs(mz) > 1e-4 && game.event === 'guard' && game.eventStage === 'beam') spotted()
    claw.tx = clamp(claw.tx + mx, AIM.x0, AIM.x1)
    claw.tz = clamp(claw.tz + mz, AIM.z0, AIM.z1)
    // Moving front/back swings the camera to the side so depth shows; moving left/right swings it back.
    if (Math.abs(mx) + Math.abs(mz) > 1e-5) game.yawTarget = 0.25 + 0.75 * Math.abs(mz) / (Math.abs(mx) + Math.abs(mz))
    input.dx = input.dz = 0
    const ox = claw.x, oz = claw.z
    claw.x = lerp(claw.x, claw.tx, 1 - Math.exp(-dt * 9))
    claw.z = lerp(claw.z, claw.tz, 1 - Math.exp(-dt * 9))
    const moving = Math.hypot(claw.x - ox, claw.z - oz) / Math.max(dt, 1e-4)
    audio.hum(clamp(moving * 6, 0, 1), 85 + moving * 60)
    if (game.timer <= 0) { if (game.event === 'guard' && game.eventStage === 'beam') game.timer = 0.5; else dropClaw() }
  } else if (game.phase === 'down') {
    claw.open = lerp(claw.open, 1, 1 - Math.exp(-dt * 8))
    const { top } = surfaceUnder(claw.x, claw.z)
    claw.y -= 0.55 * dt
    audio.hum(0.7, 70)
    if (claw.y - TIP <= top - 0.035 || claw.y - TIP <= 0.03) { game.phase = 'close'; game.phaseT = 0; audio.play('grab', 0.6) }
  } else if (game.phase === 'close') {
    game.phaseT += dt
    claw.open = lerp(claw.open, 0.12, 1 - Math.exp(-dt * 7))
    audio.hum(0.3, 120)
    if (game.phaseT > 0.5) {
      const b = decideGrab()
      if (b) {
        claw.held = b; setKinematic(b, true)
        claw.heldOffset.set(b.position.x - claw.x, b.position.y - claw.y, b.position.z - claw.z)
        claw.heldOffset.x *= 0.6; claw.heldOffset.z *= 0.6
        claw.heldOffset.y = Math.min(claw.heldOffset.y, -TIP + b.r * 0.3)
        claw.open = 0.35
      }
      game.phase = 'up'; game.phaseT = 0; game.checked = false
    }
  } else if (game.phase === 'up') {
    if (!game.qte) claw.y += 0.45 * dt
    audio.hum(game.qte ? 0.2 : 0.7, 110)
    if (claw.y >= CLAW_TOP && !game.qte) {
      claw.y = CLAW_TOP
      // The weak-claw jolt at the top: a failed roll (or any key plush) turns into a tap-to-hold test.
      if (claw.held) {
        if (claw.held.item.key) startQte(6 + game.door)
        else if (Math.random() > game.pHold) startQte(4 + game.door)
      } else { banner(t('miss'), true); audio.play('slip', 0.5) }
      game.phase = 'carry'; game.phaseT = 0
    }
  } else if (game.phase === 'carry') {
    if (!game.qte) {
      const dx = HOME.x - claw.x, dz = HOME.z - claw.z, d = Math.hypot(dx, dz)
      const step = 0.4 * dt
      if (d > step) { claw.x += dx / d * step; claw.z += dz / d * step } else { claw.x = HOME.x; claw.z = HOME.z }
      audio.hum(0.6, 100)
      if (!game.checked && claw.held && d < 0.25) {
        game.checked = true
        if (Math.random() > Math.pow(game.pHold, 0.18)) startQte(3 + game.door)
      }
      if (d <= step) { game.phase = 'open'; game.phaseT = 0 }
    }
  } else if (game.phase === 'open') {
    game.phaseT += dt
    claw.open = lerp(claw.open, 1, 1 - Math.exp(-dt * 8))
    audio.hum(0, 90)
    if (game.phaseT > 0.15 && claw.held) release(false)
    if (game.phaseT > 1.3) { claw.open = 0.2; finishTry() }
  }
  if (claw.held) {
    const b = claw.held
    claw.swayV += (-claw.sway * 40 - claw.swayV * 3) * dt
    claw.sway += claw.swayV * dt
    b.position.set(claw.x + claw.heldOffset.x + claw.sway * 0.02, claw.y + claw.heldOffset.y, claw.z + claw.heldOffset.z)
  }
  const cb = physics.clawBody
  const nx = claw.x, ny = claw.y - TIP + 0.05, nz = claw.z
  cb.velocity.set((nx - cb.position.x) / Math.max(dt, 1e-3), (ny - cb.position.y) / Math.max(dt, 1e-3), (nz - cb.position.z) / Math.max(dt, 1e-3))
  cb.position.set(nx, ny, nz)
}
const botState = { target: null }
function botAim() {
  if (game.event === 'guard' && game.eventStage !== '') return
  if (game.timer > 11.2) {
    let best = null, score = -9
    for (const b of physics.bodies) {
      const s = (b.item.key ? 1.5 : 0) + b.position.y * 2 - Math.hypot(b.position.x - HOME.x, b.position.z - HOME.z) * 0.6 + rnd(0, 0.3)
      if (s > score && b.position.x > AIM.x0 && b.position.x < AIM.x1 && b.position.z > AIM.z0 && b.position.z < AIM.z1) { score = s; best = b }
    }
    botState.target = best
  }
  if (botState.target) { claw.tx = botState.target.position.x; claw.tz = botState.target.position.z; game.yawTarget = 0.6 }
  if (game.timer < 10.2) dropClaw()
}

function updatePhysics(dt) {
  if (!physics.world) return
  physics.world.step(1 / 60, dt, 3)
  for (const b of [...physics.bodies]) {
    if (b.position.y < -0.12 && b.position.x < CHUTE.x1 && b.position.z > CHUTE.z0) { collect(b); continue }
    if (b.position.y < -1.5) { b.position.set(0, 0.6, 0); b.velocity.set(0, 0, 0) }
    if (b.position.y < 0.05 && b.sleepState === 0 && b.velocity.y < -1.2) audio.play('thud', 0.25, rnd(0.9, 1.15))
  }
  syncPile()
}
function updateRun(dt) {
  if (game.phase !== 'transit') { game.clock -= dt; game.elapsed += dt }
  if (game.clock <= 0) { game.clock = 0; fail('dawn'); return }
  updateEvent(dt)
  // Lights: dim in a blackout (the flashlight keeps half), pulse the key halo.
  const want = game.event === 'blackout' ? (game.light ? 0.55 : 0.07) : 1
  game.lightLevel = lerp(game.lightLevel, want, 1 - Math.exp(-dt * 6))
  hemi.intensity = 1.25 * game.lightLevel; key.intensity = 1.4 * game.lightLevel
  pinkLight.intensity = cyanLight.intensity = 6 * Math.max(0.25, game.lightLevel)
  HALO_MAT.opacity = 0.35 + Math.sin(performance.now() * 0.006) * 0.2
}

// ---------------------------------------------------------------- view
const view = { x: 0, y: 1.5, z: 4, lx: 0, ly: 0.6, lz: 0, yaw: 0 }
function poseFor(mode, index) {
  const aspect = camera.aspect, fov = THREE.MathUtils.degToRad(camera.fov)
  const tanV = Math.tan(fov / 2), tanH = tanV * aspect
  const cx = index * SPACING
  if (mode === 'play') {
    // The camera orbits the machine by view.yaw (0 = front, larger = more from the right side).
    const halfW = 0.66, halfH = 0.98
    const dist = Math.max(halfW / tanH, halfH / tanV) + 0.55
    return { x: cx + Math.sin(view.yaw) * dist, y: 0.95 + (aspect < 0.8 ? 0.05 : 0.1), z: Math.cos(view.yaw) * dist, lx: cx, ly: aspect < 0.8 ? 0.42 : 0.55, lz: 0 }
  }
  const halfW = aspect < 0.8 ? 0.95 : 1.6, halfH = 1.55
  const dist = Math.max(halfW / tanH, halfH / tanV) + 0.6
  return { x: cx, y: 1.0, z: dist, lx: cx, ly: aspect < 0.8 ? 0.15 : 0.35, lz: 0 }
}
function updateView(dt) {
  const mode = game.state === 'play' || game.state === 'pause' || game.state === 'result' ? 'play' : 'shop'
  // After the drop the camera eases back to the front to watch the claw carry the prize to the chute.
  const wantYaw = mode === 'play' && (game.phase === 'aim' || game.phase === 'down' || game.phase === 'close') && game.state !== 'result' ? (game.yawTarget ?? 0.25) : 0
  view.yaw = lerp(view.yaw, wantYaw, 1 - Math.exp(-dt * 2.2))
  const p = poseFor(mode, mode === 'shop' ? shopIndex : game.machine)
  for (const c of cabinets) c.group.visible = mode === 'shop' || c.index === game.machine
  const k = 1 - Math.exp(-dt * 4)
  for (const n of ['x', 'y', 'z', 'lx', 'ly', 'lz']) view[n] = lerp(view[n], p[n], k)
  let sx = 0, sy = 0
  if (game.shake > 0) { game.shake -= dt; sx = rnd(-1, 1) * game.shake * 0.02; sy = rnd(-1, 1) * game.shake * 0.02 }
  camera.position.set(view.x + sx, view.y + sy, view.z)
  camera.lookAt(view.lx, view.ly, view.lz)
  // claw parts
  bridge.position.set(claw.x, IN.top - 0.03, 0)
  carriage.position.set(claw.x, IN.top - 0.06, claw.z)
  const cableLen = IN.top - 0.08 - claw.y
  cable.scale.y = Math.max(0.01, cableLen); cable.position.set(claw.x, claw.y + cableLen / 2, claw.z)
  head.position.set(claw.x, claw.y, claw.z)
  head.rotation.z = claw.sway * 0.4
  for (const arm of claw.prongs) arm.rotation.x = -0.15 - claw.open * 0.55
  const showAim = game.state === 'play' && game.phase === 'aim' && physics.world
  aimDot.visible = laser.visible = !!showAim
  if (showAim) {
    const { top, best, d } = surfaceUnder(claw.x, claw.z)
    aimDot.position.set(claw.x, top + 0.004, claw.z)
    const good = best && d < (best.r + 0.06) * 0.5
    aimDot.material.color.set(good ? 0x2ee6a6 : 0xff3355); laser.material.color.set(good ? 0x2ee6a6 : 0xff3355)
    const len = claw.y - TIP - top
    laser.scale.y = Math.max(0.01, len); laser.position.set(claw.x, top + len / 2, claw.z)
  }
}

// ---------------------------------------------------------------- thumbnails (rendered once per kind and rarity)
const thumbs = {}
let thumbRenderer = null
function thumb(id, rarity) {
  const keyName = id + rarity
  if (thumbs[keyName]) return thumbs[keyName]
  if (!thumbRenderer) {
    thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    thumbRenderer.setSize(128, 128, false); thumbRenderer.outputColorSpace = THREE.SRGBColorSpace
  }
  const s = new THREE.Scene()
  s.add(new THREE.HemisphereLight(0xffffff, 0x8866aa, 1.6)); const l = new THREE.DirectionalLight(0xffffff, 1.6); l.position.set(1, 2, 3); s.add(l)
  const mesh = plushMesh(id, rarity); s.add(mesh)
  const r = KINDS[id].r
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 10); cam.position.set(0, r * 0.6, r * 5.2); cam.lookAt(0, r * 0.18, 0)
  thumbRenderer.setClearColor(0x000000, 0); thumbRenderer.render(s, cam)
  thumbs[keyName] = thumbRenderer.domElement.toDataURL('image/png')
  return thumbs[keyName]
}

// ---------------------------------------------------------------- UI
function show(id) { $(id).classList.remove('hide') }
function hide_(id) { $(id).classList.add('hide') }
function setHint(text) { $('hint').textContent = text; $('hint').classList.toggle('on', !!text) }
function banner(text, sad) { const b = $('banner'); b.textContent = text; b.classList.toggle('sad', !!sad); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on') }
let shopIndex = 0
function bookCount(index) { const list = BOOK[index]; return list.length ? `${list.filter((id) => save.owned[id]).length} / ${list.length}` : '?' }
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
const dawnClock = () => { const m = Math.floor((RUN_SECONDS - game.clock) / RUN_SECONDS * 180); return `${3 + Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} AM` }
function sync() {
  document.documentElement.lang = lang
  $('doorText').textContent = `${t('door')} ${Math.min(game.door + 1, DOORS)}/${DOORS}`
  $('coinText').textContent = game.coins
  $('clock').textContent = dawnClock()
  $('clock').classList.toggle('low', game.clock < 120)
  $('dropBtn').textContent = game.qte ? t('tap') : t('drop')
  $('mName').textContent = t('story')
  $('mInfo').textContent = save.bestTime ? `${t('best')} ${mmss(save.bestTime)}` : save.bestDoor ? `${t('farthest')}: ${t('door')} ${save.bestDoor}/${DOORS}` : ''
  $('playBtn').textContent = t('start')
  $('bookBtn').textContent = t('book')
  $('againBtn').textContent = t('retry'); $('homeBtn').textContent = t('home')
  $('moreBtn').textContent = game.reason === 'dawn' ? t('contT') : t('cont')
  $('pauseTitle').textContent = t('paused'); $('resumeBtn').textContent = t('resume'); $('quitBtn').textContent = t('quit')
  $('panelClose').textContent = t('close')
}
function renderResult() {
  $('resTitle').textContent = game.won ? t('escaped') : game.reason === 'dawn' ? t('failDawn') : t('failCoins')
  const host = $('resPrizes'); host.innerHTML = ''
  const line = (label, value) => { const d = document.createElement('div'); d.className = 'resLine'; d.innerHTML = `<span>${label}</span><b>${value}</b>`; host.appendChild(d) }
  line(t('door'), `${game.won ? DOORS : game.door} / ${DOORS}`)
  line(t('timeL'), mmss(game.elapsed))
  if (save.bestTime) line(t('best'), mmss(save.bestTime))
  else line(t('farthest'), `${t('door')} ${save.bestDoor}/${DOORS}`)
  if (game.newBest) { const n = document.createElement('div'); n.className = 'newBest'; n.textContent = t('newBest'); host.appendChild(n) }
  const got = document.createElement('div'); got.className = 'prizes'
  game.prizes.forEach((p, i) => { const img = document.createElement('img'); img.src = thumb(p.id, p.rarity); img.className = p.rarity ? 'r' + p.rarity : ''; img.style.animationDelay = i * 0.08 + 's'; got.appendChild(img) })
  host.appendChild(got)
  $('resCoins').parentElement.classList.add('hide')
  $('moreBtn').classList.toggle('hide', game.won || game.continued || !platform.ready)
  $('doubleBtn').classList.add('hide'); $('resUp').innerHTML = ''
  sync()
}
function renderUpgrades(host) {
  host.innerHTML = ''
  for (const u of UPGRADES) {
    const lv = save.up[u.id], maxed = lv >= u.max, cost = upCost(u)
    const b = document.createElement('button'); b.className = 'up' + (!maxed && save.coins >= cost ? ' can' : '')
    b.innerHTML = `<b>${t(u.name)} ${t('lvl')}${lv}</b><small>${t(u.desc)}</small><span class="cost">${maxed ? t('max') : `<span class="coin"></span>${cost}`}</span>`
    b.disabled = maxed
    b.onclick = () => {
      if (maxed || save.coins < cost) { audio.play('deny', 0.6); return }
      save.coins -= cost; save.up[u.id]++; writeSave(); audio.play('buy', 0.8); renderUpgrades(host); sync()
    }
    host.appendChild(b)
  }
}
function openPanel(kind) {
  show('panel'); hide_('title')
  const body = $('panelBody'); body.innerHTML = ''
  if (kind === 'up') { $('panelTitle').textContent = t('upgrades'); const host = document.createElement('div'); host.className = 'upgrades'; body.appendChild(host); renderUpgrades(host) }
  if (kind === 'book') { $('panelTitle').textContent = t('book'); renderBook(body) }
  if (kind === 'set') { $('panelTitle').textContent = t('settings'); renderSettings(body) }
  sync()
}
function renderBook(host) {
  const wrap = document.createElement('div'); wrap.className = 'book'
  MACHINES.forEach((m, i) => {
    if (!BOOK[i].length) return
    const h = document.createElement('h3'); h.innerHTML = `<span>${t(m.key)}</span><span>${bookCount(i)}</span>`; wrap.appendChild(h)
    const grid = document.createElement('div'); grid.className = 'grid'
    for (const id of BOOK[i]) {
      const n = save.owned[id] || 0
      const cell = document.createElement('div'); cell.className = 'cell' + (n ? '' : ' no')
      cell.innerHTML = `<img src="${thumb(id, 0)}" alt="">${n ? `<i>x${n}</i>` : ''}`
      grid.appendChild(cell)
    }
    wrap.appendChild(grid)
  })
  host.appendChild(wrap)
}
function renderSettings(host) {
  const row = (label, el) => { const d = document.createElement('label'); d.className = 'opt'; d.textContent = label; d.appendChild(el); host.appendChild(d) }
  const slider = (keyName) => { const s = document.createElement('input'); s.type = 'range'; s.min = 0; s.max = 1; s.step = 0.05; s.value = save[keyName]; s.oninput = () => { save[keyName] = +s.value; applyVolume(); writeSave() }; return s }
  row(t('music'), slider('music')); row(t('sfx'), slider('sfx'))
  const toggle = document.createElement('button'); toggle.className = 'sub'; toggle.textContent = save.shake ? t('on') : t('off')
  toggle.onclick = () => { save.shake = save.shake ? 0 : 1; writeSave(); toggle.textContent = save.shake ? t('on') : t('off') }
  row(t('shake'), toggle)
  const langBtn = document.createElement('button'); langBtn.className = 'sub'; langBtn.textContent = LANGUAGES[lang]
  langBtn.onclick = () => { lang = LANG_KEYS[(LANG_KEYS.indexOf(lang) + 1) % LANG_KEYS.length]; save.lang = lang; writeSave(); openPanel('set') }
  row(t('language'), langBtn)
}
function goShop() {
  game.state = 'shop'
  hide_('result'); hide_('panel'); hide_('pause'); hide_('hud'); show('title')
  shopIndex = 0
  physics.world = null; physics.bodies = []; physics.active = -1; settled.delete(0); settle(0)
  audio.hum(0, 90); audio.music('lobby')
  sync()
}

// ---------------------------------------------------------------- input
const tap = (id, fn) => $(id).addEventListener('click', () => { audio.unlock(); audio.play('click', 0.5); fn() })
tap('playBtn', startRun)
tap('bookBtn', () => openPanel('book'))
tap('setBtn', () => openPanel('set'))
tap('panelClose', () => { hide_('panel'); if (game.state === 'shop') show('title'); sync() })
tap('againBtn', startRun)
tap('homeBtn', goShop)
tap('pauseBtn', pauseGame)
tap('resumeBtn', resumeGame)
tap('quitBtn', () => { hide_('pause'); game.state = 'play'; fail('coins') })
$('dropBtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); audio.unlock(); dropClaw() })
tap('moreBtn', () => platform.rewardedAd((ok) => {
  if (!ok) return
  game.continued = true
  if (game.reason === 'dawn') game.clock += 120; else game.coins += 10
  game.reason = ''; game.state = 'play'
  hide_('result'); show('hud'); startTry(); audio.music('play'); platform.message('gameplay_started'); sync()
}))
canvas.addEventListener('pointerdown', (e) => {
  audio.unlock()
  if (game.state !== 'play') return
  input.id = e.pointerId; input.px = e.clientX; input.py = e.clientY
  canvas.setPointerCapture?.(e.pointerId)
})
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== input.id || game.phase !== 'aim') return
  const scale = 1.25 / Math.min(window.innerWidth, 700)
  input.dx += (e.clientX - input.px) * scale; input.dz += (e.clientY - input.py) * scale
  input.px = e.clientX; input.py = e.clientY
})
const lift = (e) => { if (e.pointerId === input.id) input.id = null }
// On-screen joystick: the knob's offset is the claw's speed in four directions.
const stick = $('stick'), knob = $('knob')
function stickMove(e) {
  const r = stick.getBoundingClientRect(), max = r.width * 0.32
  let x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2)
  const len = Math.hypot(x, y); if (len > max) { x *= max / len; y *= max / len }
  input.sx = x / max; input.sy = y / max
  knob.style.transform = `translate(${x}px, ${y}px)`
}
function stickEnd(e) { if (e.pointerId !== input.stick) return; input.stick = null; input.sx = input.sy = 0; knob.style.transform = '' }
stick.addEventListener('pointerdown', (e) => { e.stopPropagation(); audio.unlock(); input.stick = e.pointerId; stick.setPointerCapture?.(e.pointerId); stickMove(e) })
stick.addEventListener('pointermove', (e) => { if (e.pointerId === input.stick) stickMove(e) })
stick.addEventListener('pointerup', stickEnd); stick.addEventListener('pointercancel', stickEnd)
canvas.addEventListener('pointerup', lift); canvas.addEventListener('pointercancel', lift)
window.addEventListener('keydown', (e) => {
  input.keys.add(e.code)
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (game.state === 'play' && !e.repeat) dropClaw() }
  if (e.code === 'KeyH' && game.state === 'play') useHammer()
  if (e.code === 'Escape' || e.code === 'KeyP') { if (game.state === 'play') pauseGame(); else if (game.state === 'pause') resumeGame() }
})
window.addEventListener('keyup', (e) => input.keys.delete(e.code))
window.addEventListener('blur', () => input.keys.clear())

function resize() {
  const w = window.innerWidth, h = window.innerHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h; camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)

// ---------------------------------------------------------------- loop
let last = performance.now()
function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min(0.05, (now - last) / 1000); last = now
  if (game.state === 'play') { updateClaw(dt); updatePhysics(dt); if (game.state === 'play') updateRun(dt); sync() }
  else if (game.state === 'result' && physics.world) updatePhysics(dt)
  if (game.cardT > 0) { game.cardT -= dt; if (game.cardT <= 0) $('card').classList.add('hide') }
  const timeEl = $('time')
  timeEl.textContent = Math.max(0, Math.ceil(game.timer))
  if (game.state !== 'play') { $('vignette').classList.remove('on'); $('beam').classList.remove('on') }
  timeEl.classList.toggle('low', game.phase === 'aim' && game.timer < 4)
  timeEl.style.visibility = game.phase === 'aim' ? 'visible' : 'hidden'
  updateView(dt)
  renderer.render(scene, camera)
}

async function boot() {
  const bar = $('loadbar'); bar.style.width = '30%'
  await platform.init()
  bar.style.width = '60%'
  await readSave()
  const want = Q.get('lang') || save.lang || (platform.ready ? window.bridge.platform.language : navigator.language) || 'en'
  lang = LANG_KEYS.includes(Q.get('lang')) ? Q.get('lang') : LANG_KEYS.includes(save.lang) ? save.lang : (LANG_KEYS.find((k) => String(want).toLowerCase().startsWith(k)) || 'en')
  if (!save.coins && !save.runs) save.coins = 0
  shopIndex = 0
  if (Q.has('m')) { shopIndex = clamp(+Q.get('m'), 0, MACHINES.length - 1); save.open = save.open.map(() => true) }
  game.machine = shopIndex
  settle(shopIndex)
  resize(); sync()
  const p = poseFor('shop', shopIndex); Object.assign(view, p)
  bar.style.width = '100%'
  requestAnimationFrame((n) => { last = n; frame(n) })
  requestAnimationFrame(() => {
    hide_('loading'); platform.message('game_ready')
    if (BOT) startRun()
    else { game.state = 'shop'; show('title'); audio.music('lobby') }
  })
}
boot()
if (BOT || Q.has('debug')) window.__cp = { game, save, claw, physics, MACHINES, startRun, enterDoor }

/* Банк фраз. Каждая фраза — на одном языке, без мешанины. Добавлять можно прямо сюда. */
(() => {
  const P5 = window.P5;
  P5.PHR = {
    head: {
      poster: {
        fan: {
          ru: ["Голосуй за Пятёрку!", "Все за Пятёрку!", "Пятёрка — наш босс", "Дай Пятёрке победить", "Решаешь ты!", "Голос — Пятёрке",
               "Твой голос важен", "Пятёрка в топ!", "Один голос — одна победа", "Фан-сектор за Пятёрку", "Поддержи своего", "Только Пятёрка"],
          en: ["Vote for 5ORKA!", "Everyone for 5ORKA!", "5ORKA is our boss", "Let 5ORKA win", "It's your call!", "One vote. 5ORKA.",
               "Your vote matters", "5ORKA to the top!", "One vote, one win", "Fan zone for 5ORKA", "Back your guy", "Only 5ORKA"],
          pt: ["Vota no 5ORKA!", "Todos pelo 5ORKA!", "5ORKA é o nosso chefe", "Deixa o 5ORKA ganhar", "A escolha é tua!", "Um voto. 5ORKA.",
               "O teu voto conta", "5ORKA no topo!", "Um voto, uma vitória", "Torcida do 5ORKA", "Apoia o teu", "Só dá 5ORKA"],
        },
        zine: {
          ru: ["Пятёрка — наш босс!", "Король вернулся", "Босс всех боссов", "Не просто смотри — голосуй!", "Пятёрка. Точка.", "Это наш король",
               "Легенды не спят", "Сделано фанатами", "Голос решает всё", "Пятёрка или никто", "Слух прошёл: он победит", "Распечатай и повесь"],
          en: ["5ORKA is the boss!", "The king is back", "Boss of all bosses", "Don't just watch — vote!", "5ORKA. Period.", "That's our king",
               "Legends never sleep", "Made by fans", "Your vote decides", "5ORKA or nobody", "Word is: he wins", "Print it. Post it."],
          pt: ["O 5ORKA é o chefe!", "O rei voltou", "O chefão dos chefões", "Não só assiste — vota!", "5ORKA. Ponto.", "Esse é o nosso rei",
               "Lendas não dormem", "Feito pelos fãs", "O teu voto decide", "5ORKA ou ninguém", "Dizem que ele vence", "Imprime e cola"],
        },
        boss: {
          ru: ["Твой ход!", "Финальный босс", "Жми — голосуй!", "Босс ждёт тебя", "Новый рекорд?", "Уровень: легенда",
               "Твой голос важен", "Выбери героя", "Игра началась", "Комбо: голос + репост", "Ачивка: голос отдан", "Босс не проигрывает"],
          en: ["Your move!", "Final boss", "Press to vote!", "The boss awaits", "New high score?", "Level: legend",
               "Your vote matters", "Choose your hero", "Game on", "Combo: vote + share", "Achievement: voted", "The boss never loses"],
          pt: ["A tua vez!", "Chefão final", "Aperta e vota!", "O chefão te espera", "Novo recorde?", "Nível: lenda",
               "O teu voto conta", "Escolhe o teu herói", "O jogo começou", "Combo: voto + partilha", "Conquista: votou", "O chefão não perde"],
        },
        wanted: {
          ru: ["За хайп в особо крупных размерах", "За кражу всех сердец", "За слишком много побед", "За лучший стрим года", "За то, что снова в топе", "За угон чата"],
          en: ["For hype on a massive scale", "For stealing every heart", "For winning way too much", "For the best stream of the year", "For topping the charts again", "For hijacking the chat"],
          pt: ["Por hype em escala gigante", "Por roubar todos os corações", "Por ganhar demais", "Pela melhor live do ano", "Por estar no topo outra vez", "Por sequestrar o chat"],
        },
        news: {
          ru: ["Сенсация: Пятёрка в финале!", "Пятёрка снова в топе", "Все голосуют за Пятёрку", "Король вернулся", "Срочно: решает твой голос", "Хейтеры в шоке"],
          en: ["Breaking: 5ORKA in the final!", "5ORKA tops the charts again", "Everyone votes 5ORKA", "The king is back", "Urgent: your vote decides", "Haters in shock"],
          pt: ["Bomba: 5ORKA na final!", "5ORKA no topo outra vez", "Todos votam no 5ORKA", "O rei voltou", "Urgente: o teu voto decide", "Haters em choque"],
        },
      },
      meme: {
        ru: ["Босс грустит, потому что ты ещё не проголосовал", "Когда увидел Пятёрку в номинации", "Я после голосования за Пятёрку", "Хейтеры, когда Пятёрка снова в топе",
             "Опа, внезапный голос за Пятёрку", "Когда друг ещё не проголосовал", "Мама, я в телевизоре! (нет, я просто проголосовал)", "Когда стрим длится дольше, чем урок",
             "Я, когда объясняю, почему Пятёрка лучший", "Голосовать за Пятёрку — это не выбор, это традиция", "Когда сказали, что голосование закрывается", "Чат, когда Пятёрка говорит «последний раунд»"],
        en: ["Boss is sad because you haven't voted yet", "When you see 5ORKA got nominated", "Me after voting for 5ORKA", "Haters when 5ORKA is on top again",
             "Oops, a surprise vote for 5ORKA", "When your friend still hasn't voted", "Mom, I'm famous! (no, I just voted)", "When the stream is longer than class",
             "Me explaining why 5ORKA is the best", "Voting for 5ORKA isn't a choice, it's a tradition", "When they say voting closes soon", "Chat when 5ORKA says \"last round\""],
        pt: ["O chefe está triste porque você ainda não votou", "Quando vi o 5ORKA na votação", "Eu depois de votar no 5ORKA", "Os haters quando o 5ORKA volta ao topo",
             "Opa, um voto surpresa no 5ORKA", "Quando o teu amigo ainda não votou", "Mãe, tô famoso! (não, só votei)", "Quando a live dura mais que a aula",
             "Eu explicando por que o 5ORKA é o melhor", "Votar no 5ORKA não é escolha, é tradição", "Quando avisam que a votação vai fechar", "O chat quando o 5ORKA diz \"última rodada\""],
      },
      sticker: { ru: ["Голосуй!"], en: ["Vote!"], pt: ["Vota!"] },
    },
    sub: {
      fan: {
        ru: ["Пятёрка ★ 5ORKA ★ Slay 2026", "Все за Пятёрку ★ Slay 2026", "Фан-сектор ★ 5ORKA ★ №5", "Голосуй ★ Репости ★ Побеждай", "Slay 2026 ★ Наш выбор ★ 5ORKA", "Вперёд, Пятёрка ★ Мы с тобой"],
        en: ["5ORKA ★ Slay 2026 ★ Vote", "Fan zone ★ 5ORKA ★ No.5", "Everyone for 5ORKA ★ Slay 2026", "Vote ★ Share ★ Win", "Slay 2026 ★ Our pick ★ 5ORKA", "Go 5ORKA ★ We got you"],
        pt: ["O rei voltou ★ 5ORKA ★ Slay 2026", "Torcida ★ 5ORKA ★ Nº5", "Todos pelo 5ORKA ★ Slay 2026", "Vota ★ Partilha ★ Ganha", "Slay 2026 ★ A nossa escolha ★ 5ORKA", "Vai, 5ORKA ★ Estamos contigo"],
      },
      zine: {
        ru: ["это он", "легенда", "не благодари", "сохрани себе", "наш!", "голосуй, а то хуже будет", "лучший", "король, да"],
        en: ["that's him", "legend", "you're welcome", "save this", "ours!", "vote or else", "the best", "yes, the king"],
        pt: ["é ele", "lenda", "de nada", "salva isso", "nosso!", "vota ou já era", "o melhor", "sim, o rei"],
      },
      boss: {
        ru: ["ПЯТЁРКА вызывает тебя на SLAY 2026!", "Дикий ПЯТЁРКА появился!", "ПЯТЁРКА готов к финалу. А ты?", "Получено: +100 к хайпу", "Сохранись: проголосуй за ПЯТЁРКУ", "Босс выбрал тебя"],
        en: ["5ORKA challenges you at SLAY 2026!", "A wild 5ORKA appeared!", "5ORKA is ready for the final. Are you?", "Received: +100 hype", "Save your game: vote 5ORKA", "The boss chose you"],
        pt: ["5ORKA te desafia no SLAY 2026!", "Um 5ORKA selvagem apareceu!", "5ORKA está pronto pra final. E você?", "Recebido: +100 de hype", "Salva o jogo: vota no 5ORKA", "O chefão te escolheu"],
      },
      wanted: {
        ru: ["Твой голос", "Один голос", "Голос + репост", "Вечная слава"],
        en: ["Your vote", "One vote", "Vote + share", "Eternal glory"],
        pt: ["O teu voto", "Um voto", "Voto + partilha", "Glória eterna"],
      },
      news: {
        ru: ["Фанаты требуют победы на Slay 2026", "Эксперты: шансы высоки как никогда", "Голосование идёт прямо сейчас", "Подробности — по QR-коду"],
        en: ["Fans demand a win at Slay 2026", "Experts: chances higher than ever", "Voting is live right now", "Details in the QR code"],
        pt: ["Fãs exigem vitória no Slay 2026", "Especialistas: chances nunca foram tão altas", "A votação está aberta agora", "Detalhes no código QR"],
      },
    },
  };

  P5.UI = {
    ru: { qr: "Наведи камеру", vote: "Голосование", event: "Slay 2026", foot: ["Фан-сектор", "№5 · сезон 26"], qrNote: "↑ голосуй тут", boss: "БОСС", name: "Пятёрка", lvl: "УР. 99",
          round: "SLAY 2026 · финальный раунд", opts: ["▶ Голосовать", "Сбежать"], stamp: "Slay 2026", cont: "▶ Дальше", cont2: "Продолжить? 9",
          stats: ["Хайп", "Харизма", "Скилл"], wanted: "Разыскивается", wantedSub: "Живым или в топе", rewardLbl: "Награда",
          mast: "Пятёрка Таймс", dateline: "№5 · SLAY 2026 · цена: один голос", urgent: "Срочно!", qrBox: "Голосуй тут" },
    en: { qr: "Scan to vote", vote: "Voting", event: "Slay 2026", foot: ["Fan zone", "No.5 · season 26"], qrNote: "↑ vote here", boss: "BOSS", name: "5ORKA", lvl: "LV. 99",
          round: "SLAY 2026 · final round", opts: ["▶ Vote", "Run"], stamp: "Slay 2026", cont: "▶ Next", cont2: "Continue? 9",
          stats: ["Hype", "Charisma", "Skill"], wanted: "Wanted", wantedSub: "Dead or on top", rewardLbl: "Reward",
          mast: "The 5ORKA Times", dateline: "No.5 · SLAY 2026 · price: one vote", urgent: "Breaking!", qrBox: "Vote here" },
    pt: { qr: "Aponta a câmera", vote: "Votação", event: "Slay 2026", foot: ["Torcida 5ORKA", "Nº5 · temporada 26"], qrNote: "↑ vota aqui", boss: "BOSS", name: "5ORKA", lvl: "NV. 99",
          round: "SLAY 2026 · rodada final", opts: ["▶ Votar", "Fugir"], stamp: "Slay 2026", cont: "▶ Continuar", cont2: "Continuar? 9",
          stats: ["Hype", "Carisma", "Skill"], wanted: "Procura-se", wantedSub: "Vivo ou no topo", rewardLbl: "Recompensa",
          mast: "Jornal do 5ORKA", dateline: "Nº5 · SLAY 2026 · preço: um voto", urgent: "Urgente!", qrBox: "Vota aqui" },
  };

  P5.phraseList = (S, which) => {
    if (which === "sub") return P5.PHR.sub[S.style][S.lang];
    const h = P5.PHR.head[S.format];
    return S.format === "poster" ? h[S.style][S.lang] : h[S.lang];
  };
})();

/*
 * Данные площадок и афиши «Пушкинская карта · Казань».
 *
 * ВАЖНО: адреса и площадки собраны из открытых источников (2ГИС, Киноафиша, Яндекс Афиша,
 * culture.ru), координаты — приблизительные. Рейтинги, описания, сеансы и цены — ДЕМО-ДАННЫЕ,
 * их нужно заменить на актуальные перед сдачей (или подключить API афиши).
 *
 * Как добавить постер: в поле `image` укажите ссылку на картинку (или путь к файлу в папке img/),
 * например image: "img/empire.jpg". Без image показывается фирменная обложка.
 *
 * Как добавить трейлер: в поле `trailer` укажите ID ролика YouTube (часть после v=),
 * например trailer: "dQw4w9WgXcQ". Без ID кнопка «Трейлер» откроет поиск на YouTube.
 */

window.CATEGORIES = {
  cinema:  { label: "Кино",     color: "#8b8b8f" },
  theatre: { label: "Театр",    color: "#8b8b8f" },
  museum:  { label: "Музеи",    color: "#8b8b8f" },
  concert: { label: "Концерты", color: "#8b8b8f" },
};

// ---------- События ----------
window.EVENTS = {
  // Кино (российские фильмы с меткой «Пушкинская карта»)
  "f-empire": {
    type: "cinema", title: "Рождение империи", genre: "Историческая драма", age: "12+", duration: 128,
    rating: 7.4, votes: 18200, year: 2026,
    description: "Масштабная историческая картина о становлении государства: интриги двора, судьбы людей и выбор, который меняет страну.",
    trailer: null, palette: ["#3b1d0f", "#c2410c"],
  },
  "f-ninth": {
    type: "cinema", title: "Девятая планета", genre: "Фантастика", age: "16+", duration: 116,
    rating: 6.9, votes: 9400, year: 2026,
    description: "Экспедиция к далёкой планете оборачивается испытанием для экипажа: на краю Солнечной системы правила другие.",
    trailer: null, palette: ["#0b1a3a", "#2563eb"],
  },
  "f-iwillcome": {
    type: "cinema", title: "Я приду", genre: "Драма", age: "12+", duration: 104,
    rating: 7.1, votes: 5600, year: 2026,
    description: "История о возвращении домой, обещаниях, которые сложно сдержать, и людях, которые всё равно ждут.",
    trailer: null, palette: ["#1f2937", "#64748b"],
  },
  "f-smesh": {
    type: "cinema", title: "Смешарики сквозь вселенные", genre: "Анимация", age: "6+", duration: 92,
    rating: 7.6, votes: 12100, year: 2026,
    description: "Любимые герои отправляются в путешествие по параллельным мирам — яркий семейный мультфильм.",
    trailer: null, palette: ["#0e7490", "#facc15"],
  },
  "f-dedmobile": {
    type: "cinema", title: "Дедмобиль", genre: "Комедия", age: "12+", duration: 98,
    rating: 6.8, votes: 4300, year: 2026,
    description: "Дед, внук и очень старая машина отправляются в дорогу, которая сблизит всю семью.",
    trailer: null, palette: ["#14532d", "#84cc16"],
  },
  "f-saints": {
    type: "cinema", title: "Святые предприниматели", genre: "Комедия", age: "16+", duration: 101,
    rating: 6.6, votes: 3900, year: 2026,
    description: "Компания друзей запускает необычный бизнес — и быстро понимает, что благие намерения не всегда окупаются.",
    trailer: null, palette: ["#4a044e", "#e879f9"],
  },
  "f-tale": {
    type: "cinema", title: "Сказка о потерянном времени", genre: "Сказка", age: "6+", duration: 95,
    rating: 7.3, votes: 7700, year: 2026,
    description: "Новая экранизация классической сказки Евгения Шварца о детях, которые вдруг стали стариками.",
    trailer: null, palette: ["#422006", "#fbbf24"],
  },

  // Театр
  "t-pikovaya": {
    type: "theatre", title: "Пиковая дама", genre: "Драма · по А. С. Пушкину", age: "12+", duration: 150,
    rating: 8.6, votes: 640,
    description: "Германн, три карты и одержимость удачей. Классический текст Пушкина в постановке театра им. Качалова.",
    trailer: null, palette: ["#1c1917", "#b91c1c"],
  },
  "t-revizor": {
    type: "theatre", title: "Ревизор", genre: "Комедия · Н. В. Гоголь", age: "12+", duration: 170,
    rating: 8.8, votes: 910,
    description: "Уездный город принимает Хлестакова за ревизора. Самая узнаваемая русская комедия — живо и смешно.",
    trailer: null, palette: ["#292524", "#d97706"],
  },
  "t-zhenitba": {
    type: "theatre", title: "Женитьба", genre: "Комедия · Н. В. Гоголь", age: "12+", duration: 140,
    rating: 8.4, votes: 520,
    description: "Подколёсин никак не решится жениться. Совершенно невероятное событие в двух действиях.",
    trailer: null, palette: ["#3f1d38", "#f472b6"],
  },
  "t-dochka": {
    type: "theatre", title: "Капитанская дочка", genre: "Драма · по А. С. Пушкину", age: "12+", duration: 160,
    rating: 8.7, votes: 700,
    description: "Пётр Гринёв, Маша Миронова и пугачёвский бунт. «Береги честь смолоду».",
    trailer: null, palette: ["#0c0a09", "#a8a29e"],
  },
  "t-maskarad": {
    type: "theatre", title: "Маскарад", genre: "Драма · М. Ю. Лермонтов", age: "16+", duration: 150,
    rating: 8.9, votes: 830,
    description: "Лермонтовская драма о ревности и роковой ошибке. Синхронный перевод на русский язык.",
    trailer: null, palette: ["#111827", "#a855f7"],
  },
  "t-tribunal": {
    type: "theatre", title: "Трибунал", genre: "Трагифарс", age: "16+", duration: 130,
    rating: 8.5, votes: 410,
    description: "Острый и смешной спектакль театра им. Камала. Синхронный перевод на русский язык.",
    trailer: null, palette: ["#1e1b4b", "#6366f1"],
  },
  "t-onegin": {
    type: "theatre", title: "Евгений Онегин", genre: "Опера · П. И. Чайковский", age: "12+", duration: 190,
    rating: 9.0, votes: 1200,
    description: "Лирические сцены Чайковского по роману в стихах Пушкина. Оркестр, хор и солисты театра им. Джалиля.",
    trailer: null, palette: ["#1e293b", "#e2c27a"],
  },
  "t-nutcracker": {
    type: "theatre", title: "Щелкунчик", genre: "Балет · П. И. Чайковский", age: "0+", duration: 130,
    rating: 9.1, votes: 2100,
    description: "Главный зимний балет страны — волшебство, снег и музыка Чайковского.",
    trailer: null, palette: ["#172554", "#93c5fd"],
  },
  "t-shal": {
    type: "theatre", title: "Голубая шаль (Зәңгәр шәл)", genre: "Музыкальная драма · К. Тинчурин", age: "12+", duration: 150,
    rating: 8.7, votes: 380,
    description: "Классика татарского театра — история любви Булата и Мэгъвии. Синхронный перевод.",
    trailer: null, palette: ["#082f49", "#38bdf8"],
  },
  "t-romeo": {
    type: "theatre", title: "Ромео и Джульетта", genre: "Трагедия · У. Шекспир", age: "14+", duration: 140,
    rating: 8.3, votes: 350,
    description: "Шекспир для нового поколения — энергично, честно и про главное.",
    trailer: null, palette: ["#450a0a", "#f87171"],
  },
  "t-puppet": {
    type: "theatre", title: "Сказки Тукая", genre: "Кукольный спектакль", age: "6+", duration: 60,
    rating: 8.8, votes: 290,
    description: "Шурале, Су анасы и другие герои Габдуллы Тукая оживают в театре кукол.",
    trailer: null, palette: ["#052e16", "#4ade80"],
  },

  // Музеи
  "m-kremlin": {
    type: "museum", title: "Экскурсия по Казанскому Кремлю", genre: "Экскурсия", age: "0+", duration: 90,
    rating: 9.2, votes: 3100,
    description: "Башня Сююмбике, Благовещенский собор, мечеть Кул Шариф — объект Всемирного наследия ЮНЕСКО.",
    trailer: null, palette: ["#0f172a", "#e2e8f0"],
  },
  "m-gmii": {
    type: "museum", title: "Постоянная экспозиция ГМИИ РТ", genre: "Выставка", age: "0+", duration: 120,
    rating: 8.9, votes: 840,
    description: "Шишкин, Айвазовский, Фешин и русский авангард в особняке Сандецкого.",
    trailer: null, palette: ["#1c1917", "#fde68a"],
  },
  "m-national": {
    type: "museum", title: "Национальный музей Республики Татарстан", genre: "Выставка", age: "0+", duration: 120,
    rating: 8.7, votes: 1100,
    description: "Тысяча лет истории региона: археология, этнография, золото Волжской Булгарии.",
    trailer: null, palette: ["#134e4a", "#5eead4"],
  },

  // Концерты
  "c-symphony": {
    type: "concert", title: "Государственный симфонический оркестр РТ", genre: "Классическая музыка", age: "6+", duration: 120,
    rating: 9.3, votes: 960,
    description: "Вечер русской классики: Чайковский, Рахманинов, Прокофьев.",
    trailer: null, palette: ["#1a1a1a", "#f5b300"],
  },
};

// ---------- Площадки ----------
// coords: [долгота, широта]
window.VENUES = [
  // Кинотеатры в ТЦ
  {
    id: "kazanmall", name: "Киномакс-IMAX", place: "ТРЦ KazanMall", type: "cinema",
    address: "ул. Павлюхина, 91, 3 этаж", coords: [49.1485, 55.7689],
    site: "https://kinomax.ru", tags: ["IMAX", "ТРЦ", "Фудкорт"],
    events: ["f-empire", "f-ninth", "f-smesh", "f-dedmobile", "f-tale"],
  },
  {
    id: "tandem", name: "Киномакс-Тандем", place: "ТРК «Тандем»", type: "cinema",
    address: "пр. Ибрагимова, 56", coords: [49.0893, 55.8222],
    site: "https://kinomax.ru", tags: ["ТРК", "Парковка"],
    events: ["f-empire", "f-iwillcome", "f-smesh", "f-saints"],
  },
  {
    id: "yuzhny", name: "Киномакс-Club", place: "ТРЦ «Южный»", type: "cinema",
    address: "пр. Победы, 91", coords: [49.1995, 55.7512],
    site: "https://kinomax.ru", tags: ["ТРЦ"],
    events: ["f-ninth", "f-dedmobile", "f-tale"],
  },
  {
    id: "parkhouse", name: "Синема 5", place: "ТРЦ Park House", type: "cinema",
    address: "пр. Ямашева, 46/33", coords: [49.1200, 55.8279],
    site: "https://cinema5.ru", tags: ["ТРЦ", "Парковка"],
    events: ["f-empire", "f-ninth", "f-iwillcome", "f-saints", "f-smesh"],
  },
  {
    id: "respublika", name: "Синема 5", place: "ТЦ «Республика»", type: "cinema",
    address: "ул. Петербургская, 9", coords: [49.1252, 55.7858],
    site: "https://cinema5.ru", tags: ["ТЦ", "Центр"],
    events: ["f-iwillcome", "f-dedmobile", "f-tale"],
  },
  {
    id: "suvar", name: "Алмаз Синема Гранд", place: "ТЦ Suvar Plaza", type: "cinema",
    address: "ул. Спартаковская, 6", coords: [49.1327, 55.7727],
    site: "https://almazcinema.com/kzn/", tags: ["ТЦ", "Комфорт-залы"],
    events: ["f-iwillcome", "f-ninth", "f-smesh", "f-empire"],
  },
  {
    id: "rodina", name: "Алмаз Синема «Родина»", place: "ул. Баумана", type: "cinema",
    address: "ул. Баумана, 44/8", coords: [49.1196, 55.7903],
    site: "https://almazcinema.com/kzn/", tags: ["Исторический", "Центр"],
    events: ["f-empire", "f-tale", "f-saints"],
  },
  {
    id: "korston", name: "Кинотеатр «Корстон»", place: "ТРК «Корстон»", type: "cinema",
    address: "ул. Николая Ершова, 1а", coords: [49.1528, 55.7931],
    site: "https://cinema.korston.ru/kzn/", tags: ["ТРК", "Отель"],
    events: ["f-ninth", "f-smesh", "f-dedmobile"],
  },
  {
    id: "mir", name: "Кинотеатр «Мир»", place: "ул. Достоевского", type: "cinema",
    address: "ул. Достоевского, 30", coords: [49.1395, 55.7930],
    site: null, tags: ["Камерный"],
    events: ["f-iwillcome", "f-tale"],
  },

  // Театры
  {
    id: "kachalov", name: "Театр им. В. И. Качалова", place: "Большой драматический театр", type: "theatre",
    address: "ул. Баумана, 48", coords: [49.1213, 55.7886],
    site: null, tags: ["Драма", "С 1791 года"],
    events: ["t-pikovaya", "t-revizor", "t-zhenitba", "t-dochka"],
  },
  {
    id: "kamal", name: "Театр им. Г. Камала", place: "Татарский академический театр", type: "theatre",
    address: "ул. Хади Такташа, новое здание у оз. Нижний Кабан", coords: [49.1294, 55.7708],
    site: null, tags: ["Синхроперевод", "Новое здание"],
    events: ["t-maskarad", "t-tribunal"],
  },
  {
    id: "jalil", name: "Театр оперы и балета им. М. Джалиля", place: "Площадь Свободы", type: "theatre",
    address: "пл. Свободы, 2", coords: [49.1224, 55.7958],
    site: null, tags: ["Опера", "Балет"],
    events: ["t-onegin", "t-nutcracker"],
  },
  {
    id: "tinchurin", name: "Театр им. К. Тинчурина", place: "Татарский драматический театр", type: "theatre",
    address: "ул. Горького, 13", coords: [49.1318, 55.7935],
    site: null, tags: ["Синхроперевод"],
    events: ["t-shal"],
  },
  {
    id: "tuz", name: "Казанский ТЮЗ", place: "Театр юного зрителя", type: "theatre",
    address: "ул. Островского, 10", coords: [49.1160, 55.7868],
    site: null, tags: ["Молодёжный"],
    events: ["t-romeo"],
  },
  {
    id: "ekiyat", name: "Театр кукол «Экият»", place: "Татарский театр кукол", type: "theatre",
    address: "ул. Петербургская, 57", coords: [49.1355, 55.7781],
    site: null, tags: ["Для детей", "Архитектура"],
    events: ["t-puppet"],
  },

  // Музеи
  {
    id: "kremlin", name: "Казанский Кремль", place: "Музей-заповедник", type: "museum",
    address: "Кремль, Кремлёвская ул.", coords: [49.1062, 55.7987],
    site: null, tags: ["ЮНЕСКО"],
    events: ["m-kremlin"],
  },
  {
    id: "gmii", name: "ГМИИ РТ", place: "Музей изобразительных искусств", type: "museum",
    address: "ул. Карла Маркса, 64", coords: [49.1402, 55.7974],
    site: null, tags: ["Живопись"],
    events: ["m-gmii"],
  },
  {
    id: "natmuseum", name: "Национальный музей РТ", place: "Гостиный двор", type: "museum",
    address: "ул. Кремлёвская, 2", coords: [49.1102, 55.7950],
    site: null, tags: ["История"],
    events: ["m-national"],
  },

  // Концерты
  {
    id: "saidashev", name: "БКЗ им. С. Сайдашева", place: "Концертный зал", type: "concert",
    address: "пл. Свободы, 3", coords: [49.1252, 55.7963],
    site: null, tags: ["Оркестр", "Органный зал"],
    events: ["c-symphony"],
  },
];

// ---------- Генерация демо-сеансов на ближайшие 7 дней ----------
(function buildSessions() {
  const base = { cinema: [10.5, 13.25, 15.75, 18.5, 21.0, 22.75], theatre: [18.0, 19.0], museum: [10.0, 12.0, 14.0, 16.0], concert: [19.0] };
  const priceBase = { cinema: 250, theatre: 450, museum: 300, concert: 500 };
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  window.VENUES.forEach((v) => {
    v.sessions = {};
    v.events.forEach((eid) => {
      const ev = window.EVENTS[eid];
      const list = [];
      for (let d = 0; d < 7; d++) {
        const times = base[ev.type].filter(() => rnd() > (ev.type === "cinema" ? 0.45 : 0.55));
        if (ev.type !== "cinema" && d % 2 === 1) continue;
        times.forEach((t) => {
          const date = new Date(today); date.setDate(today.getDate() + d);
          date.setHours(Math.floor(t), Math.round((t % 1) * 60));
          const price = Math.round((priceBase[ev.type] + rnd() * priceBase[ev.type]) / 50) * 50;
          list.push({ date, price });
        });
      }
      v.sessions[eid] = list;
    });
  });
})();

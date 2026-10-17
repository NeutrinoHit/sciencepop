/*
 * Каталог библиотечки «Простыми словами».
 *
 * Темы идут от простого к сложному: каждая опирается только на предыдущие.
 * Поля лекции:
 *   title, description — вопрос и ответ одной строкой;
 *   slides  — HTML-слайды (пусто, пока лекция готовится);
 *   pdf     — PDF, если он нужен;
 *   youtube — ссылка на видео, когда оно опубликовано.
 */
const parts = [
  {
    title: "Из чего всё сделано",
    lectures: [
      {
        title: "Что такое вещество?",
        description: "Из чего состоит окружающий мир и что физики называют веществом.",
        slides: "01_matter.html",
        pdf: "Matter.pdf",
        youtube: ""
      },
      {
        title: "Как узнали про атомы?",
        description: "Как наблюдения и эксперименты сделали атомы частью физической картины мира.",
        slides: "02_how-we-know-atoms.html",
        pdf: "HowDoWeKnowAboutAtoms.pdf",
        youtube: ""
      },
      {
        title: "Что такое атом?",
        description: "Что находится внутри атома и почему привычная планетарная картинка требует уточнения.",
        slides: "03_what-is-atom.html",
        pdf: "WhatIsAtom.pdf",
        youtube: ""
      },
      {
        title: "Что находится внутри атомного ядра?",
        description: "Из чего состоит ядро и почему протоны в нём не разлетаются.",
        slides: "04_inside-nucleus.html",
        pdf: "InsideNucleus.pdf",
        youtube: ""
      },
      {
        title: "Из чего сделаны протон и нейтрон?",
        description: "Кварки и глюоны: почему кварк нельзя вытащить наружу поодиночке."
      },
      {
        title: "Почему некоторые ядра распадаются?",
        description: "Радиоактивность, период полураспада и как по ней узнают возраст находок."
      }
    ]
  },
  {
    title: "Свет и силы",
    lectures: [
      {
        title: "Что такое свет?",
        description: "Волна или частица — и почему этот вопрос сложнее, чем кажется."
      },
      {
        title: "Почему атомы светятся разными цветами?",
        description: "Спектры — отпечатки пальцев элементов: так узнают, из чего сделаны звёзды."
      },
      {
        title: "Сколько в природе сил?",
        description: "Четыре взаимодействия, которые управляют всем — от яблока до звезды."
      },
      {
        title: "Что такое поле?",
        description: "Как одно тело действует на другое на расстоянии."
      }
    ]
  },
  {
    title: "Частицы",
    lectures: [
      {
        title: "Что такое элементарная частица?",
        description: "Почему электрон считают неделимым и сколько таких частиц известно."
      },
      {
        title: "Что такое антивещество?",
        description: "Двойники частиц: при встрече с обычными частицами они исчезают, рождая свет и другие частицы."
      },
      {
        title: "Что такое нейтрино?",
        description: "Частица, которая пролетает сквозь Землю, почти ничего не задев."
      },
      {
        title: "Как поймать нейтрино?",
        description: "Детекторы под землёй и в глубине Байкала."
      },
      {
        title: "Откуда у частиц масса?",
        description: "Поле Хиггса простыми словами."
      },
      {
        title: "Зачем нужны ускорители?",
        description: "Как, разгоняя и сталкивая частицы, физики заглядывают внутрь вещества."
      }
    ]
  },
  {
    title: "Звёзды и Вселенная",
    lectures: [
      {
        title: "Почему светит Солнце?",
        description: "Термоядерные реакции в центре Солнца и нейтрино, которые о них рассказывают."
      },
      {
        title: "Откуда взялись химические элементы?",
        description: "Первые минуты Вселенной, звёзды и взрывы сверхновых."
      },
      {
        title: "Почему ночью темно?",
        description: "Простой вопрос, ответ на который говорит, что у Вселенной есть возраст."
      },
      {
        title: "Что такое тёмная материя?",
        description: "Невидимое вещество, которое выдаёт себя только притяжением."
      },
      {
        title: "Что такое чёрная дыра?",
        description: "Место, откуда не может выбраться даже свет."
      }
    ]
  }
];

function createLink(url, label, primary) {
  const link = document.createElement("a");
  link.href = url;
  link.textContent = label;
  if (primary) link.className = "primary";
  return link;
}

function createTag(label) {
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = label;
  return tag;
}

function createLecture(lecture, number) {
  const ready = Boolean(lecture.slides);
  const item = document.createElement("details");
  item.className = ready ? "lecture" : "lecture planned";
  if (number === 1) item.open = true;

  const summary = document.createElement("summary");
  const index = document.createElement("span");
  index.className = "number";
  index.textContent = String(number);
  summary.appendChild(index);
  summary.appendChild(document.createTextNode(lecture.title));
  item.appendChild(summary);

  const body = document.createElement("div");
  body.className = "lecture-body";

  const description = document.createElement("p");
  description.textContent = lecture.description;
  body.appendChild(description);

  const links = document.createElement("div");
  links.className = "links";
  if (ready) {
    links.appendChild(createLink(lecture.slides, "Открыть слайды", true));
    if (lecture.pdf) links.appendChild(createLink(lecture.pdf, "PDF"));
    links.appendChild(lecture.youtube ? createLink(lecture.youtube, "Видео") : createTag("видео готовится"));
  } else {
    links.appendChild(createTag("готовится"));
  }
  body.appendChild(links);

  item.appendChild(body);
  return item;
}

const lectureList = document.querySelector("[data-lecture-list]");
let lectureNumber = 0;
parts.forEach((part) => {
  const heading = document.createElement("h2");
  heading.textContent = part.title;
  lectureList.appendChild(heading);
  part.lectures.forEach((lecture) => {
    lectureNumber += 1;
    lectureList.appendChild(createLecture(lecture, lectureNumber));
  });
});

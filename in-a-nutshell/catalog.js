const lectures = [
  {
    title: "Что такое вещество?",
    description: "Из чего состоит окружающий мир и что физики называют веществом.",
    slides: "Matter/",
    youtube: ""
  },
  {
    title: "Как узнали про атомы?",
    description: "Как наблюдения и эксперименты сделали атомы частью физической картины мира.",
    slides: "HowDoWeKnowAboutAtoms/",
    youtube: ""
  },
  {
    title: "Что такое атом?",
    description: "Что находится внутри атома и почему привычная планетарная картинка требует уточнения.",
    slides: "WhatIsAtom/",
    youtube: ""
  },
  {
    title: "Что находится внутри атомного ядра?",
    description: "Из чего состоит ядро и где проходит следующий уровень строения вещества.",
    slides: "InsideNucleus/",
    youtube: ""
  }
];

function createLink(url, label) {
  const link = document.createElement("a");
  link.href = url;
  link.textContent = label;
  return link;
}

function createLecture(lecture, index) {
  const item = document.createElement("details");
  item.className = "lecture";
  if (index === 0) item.open = true;

  const summary = document.createElement("summary");
  summary.textContent = lecture.title;
  item.appendChild(summary);

  const body = document.createElement("div");
  body.className = "lecture-body";

  const description = document.createElement("p");
  description.textContent = lecture.description;
  body.appendChild(description);

  const links = document.createElement("div");
  links.className = "links";
  links.appendChild(createLink(lecture.slides, "Открыть слайды"));
  if (lecture.youtube) links.appendChild(createLink(lecture.youtube, "YouTube"));
  body.appendChild(links);

  item.appendChild(body);
  return item;
}

const lectureList = document.querySelector("[data-lecture-list]");
lectures.forEach((lecture, index) => lectureList.appendChild(createLecture(lecture, index)));

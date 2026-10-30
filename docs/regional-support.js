(() => {
  const root = document.querySelector("#regionalSupport");
  if (!root) return;

  const copy = {
    ru: {
      label: "РЕГИОНАЛЬНАЯ ПРОВЕРКА",
      title: "Куда обращаться в выбранной земле",
      intro: "Приём, распределение и компетентное ведомство зависят от земли и города. Выберите пилотный регион — покажем подтверждённую точку входа и полезные службы.",
      verified: "Официальные источники",
      focus: "Пилотный город",
      checked: "Проверено",
      directories: "Найти Jobcenter, Caritas, Tafel и переводчика рядом →",
      open: "Открыть официальный источник →",
      legal: "Это ориентир, а не гарантия размещения. Перед поездкой статус точки приёма проверяется повторно.",
      loading: "Загружаем проверенные региональные данные…",
      error: "Региональные данные сейчас недоступны. Используйте официальный источник перед поездкой.",
      categories: {
        arrival_center: "первичный приём", municipal_guidance: "городская информация",
        migration_office: "миграция и размещение", integration_advice: "интеграционная консультация",
        official_portals: "официальные порталы", migration_advice: "миграционные консультации",
        jobcenter: "Jobcenter и занятость", charity: "благотворительная помощь",
        food_support: "продуктовая помощь", interpreters: "переводчики",
      },
      regionNotes: {
        "baden-wuerttemberg-ueberlingen": "Для Überlingen компетентна городская Ausländerbehörde; Jobcenter и Sozialamt — Bodenseekreis, Wohngeld — Stadt Überlingen.",
        "north-rhine-westphalia": "Первая официальная точка для прибывших без жилья — LEA Bochum. Родственники, жильё, работа или учёба могут обосновать просьбу о конкретном городе, но решение принимает ведомство.",
        berlin: "Для первичного обращения используется Ankunftszentrum Ukraine в Reinickendorf. Часы приёма нужно проверять перед поездкой.",
        "baden-wuerttemberg-konstanz": "В Landkreis Konstanz приём продолжается по земельной и районной квоте. При частном жилье первый шаг — регистрация по месту жительства.",
      },
    },
    uk: {
      label: "РЕГІОНАЛЬНА ПЕРЕВІРКА",
      title: "Куди звертатися в обраній землі",
      intro: "Прийом, розподіл і компетентна установа залежать від землі та міста. Оберіть пілотний регіон — покажемо підтверджену точку входу й корисні служби.",
      verified: "Офіційні джерела",
      focus: "Пілотне місто",
      checked: "Перевірено",
      directories: "Знайти Jobcenter, Caritas, Tafel і перекладача поруч →",
      open: "Відкрити офіційне джерело →",
      legal: "Це орієнтир, а не гарантія розміщення. Перед поїздкою статус пункту прийому перевіряється повторно.",
      loading: "Завантажуємо перевірені регіональні дані…",
      error: "Регіональні дані зараз недоступні. Перед поїздкою скористайтеся офіційним джерелом.",
      categories: {
        arrival_center: "первинний прийом", municipal_guidance: "міська інформація",
        migration_office: "міграція та розміщення", integration_advice: "інтеграційна консультація",
        official_portals: "офіційні портали", migration_advice: "міграційні консультації",
        jobcenter: "Jobcenter і зайнятість", charity: "благодійна допомога",
        food_support: "продуктова допомога", interpreters: "перекладачі",
      },
      regionNotes: {
        "baden-wuerttemberg-ueberlingen": "В Überlingen відповідальна міська Ausländerbehörde; Jobcenter і Sozialamt — Bodenseekreis, Wohngeld — Stadt Überlingen.",
        "north-rhine-westphalia": "Перша офіційна точка для прибулих без житла — LEA Bochum. Родичі, житло, робота чи навчання можуть обґрунтувати прохання про конкретне місто, але рішення ухвалює установа.",
        berlin: "Для першого звернення використовується Ankunftszentrum Ukraine у Reinickendorf. Години прийому слід перевірити перед поїздкою.",
        "baden-wuerttemberg-konstanz": "У Landkreis Konstanz прийом триває за земельною та районною квотою. За приватного житла перший крок — реєстрація місця проживання.",
      },
    },
    de: {
      label: "REGIONALER CHECK",
      title: "Die richtige Anlaufstelle im gewählten Bundesland",
      intro: "Aufnahme, Verteilung und Zuständigkeit hängen von Bundesland und Ort ab. Wählen Sie eine Pilotregion für den bestätigten Einstieg und wichtige Hilfen.",
      verified: "Offizielle Quellen",
      focus: "Pilotstadt",
      checked: "Geprüft",
      directories: "Jobcenter, Caritas, Tafel und Sprachmittlung in der Nähe finden →",
      open: "Offizielle Quelle öffnen →",
      legal: "Dies ist eine Orientierung, keine Aufnahmegarantie. Der Status der Anlaufstelle wird vor der Reise erneut geprüft.",
      loading: "Geprüfte Regionaldaten werden geladen…",
      error: "Regionaldaten sind derzeit nicht verfügbar. Bitte prüfen Sie vor der Reise die offizielle Quelle.",
      categories: {
        arrival_center: "Erstaufnahme", municipal_guidance: "städtische Hinweise",
        migration_office: "Migration und Unterbringung", integration_advice: "Integrationsberatung",
        official_portals: "offizielle Portale", migration_advice: "Migrationsberatung",
        jobcenter: "Jobcenter und Arbeit", charity: "Wohlfahrt",
        food_support: "Lebensmittelhilfe", interpreters: "Sprachmittlung",
      },
      regionNotes: {
        "baden-wuerttemberg-ueberlingen": "In Überlingen ist die städtische Ausländerbehörde zuständig; Jobcenter und Sozialamt liegen beim Bodenseekreis, Wohngeld bei der Stadt.",
        "north-rhine-westphalia": "Die erste offizielle Anlaufstelle ohne Unterkunft ist die LEA Bochum. Familie, Wohnraum, Arbeit oder Studium können einen Ortswunsch begründen; die Behörde entscheidet.",
        berlin: "Für die erste Vorsprache dient das Ankunftszentrum Ukraine in Reinickendorf. Öffnungszeiten sind vor der Anreise zu prüfen.",
        "baden-wuerttemberg-konstanz": "Im Landkreis Konstanz erfolgt die Aufnahme nach Landes- und Kreisquote. Bei privater Unterkunft ist die Wohnsitzanmeldung der erste Schritt.",
      },
    },
    en: {
      label: "REGIONAL CHECK",
      title: "Where to go in the selected federal state",
      intro: "Reception, allocation and the responsible authority depend on the state and city. Select a pilot region to see a verified entry point and useful services.",
      verified: "Official sources",
      focus: "Pilot city",
      checked: "Checked",
      directories: "Find a nearby Jobcenter, Caritas, Tafel and interpreter →",
      open: "Open official source →",
      legal: "This is guidance, not a placement guarantee. Reception status is checked again before travel.",
      loading: "Loading verified regional data…",
      error: "Regional data is currently unavailable. Check the official source before travelling.",
      categories: {
        arrival_center: "initial reception", municipal_guidance: "municipal guidance",
        migration_office: "migration and housing", integration_advice: "integration advice",
        official_portals: "official portals", migration_advice: "migration advice",
        jobcenter: "Jobcenter and employment", charity: "charity support",
        food_support: "food support", interpreters: "interpreters",
      },
      regionNotes: {
        "baden-wuerttemberg-ueberlingen": "Überlingen has its city Ausländerbehörde; Jobcenter and Sozialamt are in Bodenseekreis, and housing benefit is handled by the city.",
        "north-rhine-westphalia": "The first official point for arrivals without accommodation is LEA Bochum. Family, housing, work or study may support a city request, but the authority decides.",
        berlin: "The initial contact point is the Ukraine Arrival Centre in Reinickendorf. Check opening hours before travelling.",
        "baden-wuerttemberg-konstanz": "The Konstanz district receives people under state and district quotas. With private housing, address registration is the first step.",
      },
    },
  };

  let regions = [];
  let selectedSlug = "north-rhine-westphalia";
  let selectedRegion = null;

  function language() {
    return window.uaDeI18n?.language || document.querySelector("#languageSelect")?.value || "ru";
  }

  function t() {
    return copy[language()] || copy.ru;
  }

  function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = String(value ?? "");
    return node.innerHTML;
  }

  function applyStaticCopy() {
    const current = t();
    document.querySelector("#regionalSupportLabel").textContent = current.label;
    document.querySelector("#regionalSupportTitle").textContent = current.title;
    document.querySelector("#regionalSupportIntro").textContent = current.intro;
    document.querySelector("#regionalVerification").textContent = current.verified;
    document.querySelector("#regionalFocusLabel").textContent = current.focus;
    document.querySelector("#regionalDirectoriesSummary").textContent = current.directories;
    document.querySelector("#regionalLegalNote").textContent = current.legal;
  }

  function formatDate(value) {
    const locales = { ru: "ru-RU", uk: "uk-UA", de: "de-DE", en: "en-GB" };
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : `${t().checked}: ${new Intl.DateTimeFormat(locales[language()] || "ru-RU", {
          day: "2-digit", month: "2-digit", year: "numeric",
        }).format(date)}`;
  }

  function renderPicker() {
    const picker = document.querySelector("#regionalPicker");
    picker.innerHTML = regions.map((region) => `
      <button type="button" role="tab" aria-selected="${region.slug === selectedSlug}"
        class="${region.slug === selectedSlug ? "is-active" : ""}"
        data-region-slug="${escapeHtml(region.slug)}">
        <strong>${escapeHtml(region.short_name)}</strong>
        <span>${escapeHtml(region.focus_city)}</span>
      </button>
    `).join("");
  }

  function renderRegion(region) {
    selectedRegion = region;
    document.querySelector("#regionalStatusBadge").textContent = t().verified;
    document.querySelector("#regionalStatusName").textContent = region.name;
    document.querySelector("#regionalStatusText").textContent =
      t().regionNotes[region.slug] || region.status_note;
    document.querySelector("#regionalFocusCity").textContent = region.focus_city;
    document.querySelector("#regionalCheckedAt").textContent =
      formatDate(region.verification.last_verified_at);

    document.querySelector("#regionalServiceGrid").innerHTML = region.services.map((service) => `
      <article class="regional-service">
        <span>${escapeHtml(t().categories[service.category] || service.category.replaceAll("_", " "))}</span>
        <h3>${escapeHtml(service.name)}</h3>
        <p>${escapeHtml(service.address || service.audience)}</p>
        ${service.phone ? `<small>${escapeHtml(service.phone)}</small>` : ""}
        ${service.email ? `<small>${escapeHtml(service.email)}</small>` : ""}
        <a href="${escapeHtml(service.url)}" target="_blank" rel="noreferrer">${escapeHtml(t().open)}</a>
      </article>
    `).join("");

    document.querySelector("#regionalDirectoryGrid").innerHTML = region.directories.map((item) => `
      <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(t().categories[item.category] || item.category.replaceAll("_", " "))}</span>
      </a>
    `).join("");
  }

  async function selectRegion(slug) {
    selectedSlug = slug;
    renderPicker();
    document.querySelector("#regionalStatusText").textContent = t().loading;
    try {
      const response = await fetch(`/api/regions/${encodeURIComponent(slug)}`);
      if (!response.ok) throw new Error(String(response.status));
      const payload = await response.json();
      renderRegion(payload.region);
    } catch {
      document.querySelector("#regionalStatusText").textContent = t().error;
      document.querySelector("#regionalServiceGrid").innerHTML = "";
    }
  }

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-region-slug]");
    if (button) selectRegion(button.dataset.regionSlug);
  });

  window.addEventListener("ua-de:languagechange", () => {
    applyStaticCopy();
    renderPicker();
    if (selectedRegion) renderRegion(selectedRegion);
  });
  window.addEventListener("ua-de:route-location", (event) => {
    const location = event.detail || {};
    const picker = document.querySelector("#regionalPicker");
    if (location.known && location.city === "Überlingen") {
      picker.hidden = true;
      selectRegion("baden-wuerttemberg-ueberlingen");
    } else {
      picker.hidden = true;
      selectedRegion = null;
      document.querySelector("#regionalStatusName").textContent = location.city || "";
      document.querySelector("#regionalStatusText").textContent = {
        ru: "Точное местное ведомство пока не установлено. Используйте официальный поиск по месту проживания.",
        uk: "Точну місцеву установу ще не встановлено. Скористайтеся офіційним пошуком за місцем проживання.",
        de: "Die örtlich zuständige Stelle ist noch nicht ermittelt. Nutzen Sie die amtliche Suche für Ihren Wohnort.",
        en: "The local authority is not yet identified. Use the official directory for your address.",
      }[language()] || "";
      document.querySelector("#regionalServiceGrid").innerHTML = "";
    }
  });

  applyStaticCopy();
  fetch("/api/regions")
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then((payload) => {
      regions = payload.regions || [];
      renderPicker();
      return selectRegion(selectedSlug);
    })
    .catch(() => {
      document.querySelector("#regionalStatusText").textContent = t().error;
    });
})();

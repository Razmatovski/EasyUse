
import { gsap } from 'gsap';
import ScrollToPlugin from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);
const translations: Record<string, any> = {};
const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID;

const state: any = { plumbing: {}, bathrooms: 1 };
const params = new URLSearchParams(window.location.search);
state.utm = {
  source: params.get('utm_source') || undefined,
  medium: params.get('utm_medium') || undefined,
  campaign: params.get('utm_campaign') || undefined,
  term: params.get('utm_term') || undefined,
  content: params.get('utm_content') || undefined
};
const utmParams = {
  utm_source: state.utm.source,
  utm_medium: state.utm.medium,
  utm_campaign: state.utm.campaign,
  utm_term: state.utm.term,
  utm_content: state.utm.content
};

function gaEvent(name: string, params: Record<string, any> = {}) {
  const gtag = (window as any).gtag;
  if (gtag) gtag('event', name, { ...utmParams, ...params });
}

function getClientId(): Promise<string | undefined> {
  return new Promise(resolve => {
    const gtag = (window as any).gtag;
    if (!gtag || !measurementId) return resolve(undefined);
    gtag('get', measurementId, 'client_id', (cid: string) => resolve(cid));
  });
}

async function setLanguage(lang: string) {
  if (!translations[lang]) {
    const res = await fetch(`/i18n/${lang}.json`);
    translations[lang] = await res.json();
  }
  const dict = translations[lang];
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key && dict[key]) el.textContent = dict[key];
  });
  state.lang = lang;
}

const langSel = document.getElementById('lang') as HTMLSelectElement;
langSel.value = (navigator.language || 'pl').substring(0, 2);
if (!['pl', 'en', 'ua'].includes(langSel.value)) langSel.value = 'pl';
setLanguage(langSel.value);
langSel.addEventListener('change', e => setLanguage((e.target as HTMLSelectElement).value));

const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const hero = document.getElementById('hero') as HTMLElement;
const form = document.getElementById('quiz') as HTMLFormElement;
const steps = Array.from(document.querySelectorAll<HTMLElement>('.step'));
const prevBtn = document.getElementById('prevBtn') as HTMLButtonElement;
const nextBtn = document.getElementById('nextBtn') as HTMLButtonElement;
let currentStep = 0;

form.style.display = 'none';

function showStep(i: number) {
  steps.forEach((s, idx) => {
    if (idx === i) {
      s.style.display = 'block';
      gsap.fromTo(s, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
    } else if (s.style.display !== 'none') {
      gsap.to(s, { autoAlpha: 0, duration: 0.3, onComplete: () => (s.style.display = 'none') });
    } else {
      s.style.display = 'none';
    }
  });
  prevBtn.style.display = i === 0 ? 'none' : 'inline-block';
  nextBtn.style.display = i === steps.length - 1 ? 'none' : 'inline-block';
}

startBtn.onclick = () => {
  gaEvent('start');
  getClientId().then(cid => (state.ga_client_id = cid));
  gsap.to(hero, { autoAlpha: 0, duration: 0.3, onComplete: () => (hero.style.display = 'none') });
  form.style.display = 'block';
  gsap.fromTo(form, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
  showStep(0);
};

prevBtn.onclick = () => {
  if (currentStep > 0) {
    currentStep--;
    showStep(currentStep);
  }
};

nextBtn.onclick = async () => {
  if (currentStep === 0) {
    state.postal_code = (document.getElementById('postal_code') as HTMLInputElement).value;
  }
  if (currentStep === 1) {
    const a = document.querySelector('input[name="area"]:checked') as HTMLInputElement | null;
    if (a) state.area_m2 = a.value;
    state.bathrooms =
      parseInt((document.getElementById('bathrooms') as HTMLInputElement).value) || 1;
  }
  if (currentStep === 2) {
    const s = document.querySelector('input[name="scope"]:checked') as HTMLInputElement | null;
    if (s) state.scope = s.value;
  }
  if (currentStep === 3) {
    const t = document.querySelector('input[name="tile"]:checked') as HTMLInputElement | null;
    if (t) state.tile_type = t.value;
  }
  if (currentStep === 4) {
    state.plumbing = {
      wall_hung_wc: parseInt((document.getElementById('wall_hung_wc') as HTMLInputElement).value) || 0,
      shower_or_bath: parseInt((document.getElementById('shower_or_bath') as HTMLInputElement).value) || 0,
      vanity_sink: parseInt((document.getElementById('vanity_sink') as HTMLInputElement).value) || 0,
      rain_shower: parseInt((document.getElementById('rain_shower') as HTMLInputElement).value) || 0,
      floor_heating: parseInt((document.getElementById('floor_heating') as HTMLInputElement).value) || 0
    };
  }
  if (currentStep === 5) {
    state.name = (document.getElementById('name') as HTMLInputElement).value;
    state.phone = (document.getElementById('phone') as HTMLInputElement).value;
    const res = await fetch('/api/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area_m2: state.area_m2,
        scope: state.scope,
        tile_type: state.tile_type,
        plumbing: state.plumbing,
        bathrooms: state.bathrooms,
        postal_code: state.postal_code
      })
    });
    const data = await res.json();
    state.estimate = {
      low: data.low,
      high: data.high,
      days_min: data.days_min,
      days_max: data.days_max
    };
    state.serviceable = data.serviceable;
    state.distance_km = data.distance_km;
    document.getElementById('result')!.textContent =
      `${data.low}-${data.high} PLN, ${data.days_min}-${data.days_max} dni`;
    state.ga_client_id = await getClientId();
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    const wa = buildWhatsAppLink({
      phone: '48500111222',
      lang: state.lang,
      payload: { name: state.name, phone: state.phone, estimate: data }
    });
    (document.getElementById('waLink') as HTMLAnchorElement).href = wa;
    (document.getElementById('callLink') as HTMLAnchorElement).href = 'tel:48500111222';
    gaEvent('lead_submit');
  }
  gaEvent('step_completed', { step: currentStep });
  if (currentStep < steps.length - 1) {
    currentStep++;
    showStep(currentStep);
    if (currentStep === steps.length - 1) {
      gsap.to(window, { duration: 0.5, scrollTo: steps[currentStep] });
    }
  }
};

function buildWhatsAppLink(opts: { phone: string; lang: string; payload: any }) {
  const t = {
    pl: (p: any) =>
      `Dzień dobry! Interesuje mnie łazienka pod klucz. Szacunek: ${p.estimate.low}-${p.estimate.high} PLN, termin: ${p.estimate.days_min}-${p.estimate.days_max} dni. Proszę o kontakt.`,
    en: (p: any) =>
      `Hello! I'm interested in a turnkey bathroom. Estimate: ${p.estimate.low}-${p.estimate.high} PLN, timeline: ${p.estimate.days_min}-${p.estimate.days_max} days. Please contact me.`,
    ua: (p: any) =>
      `Вітаю! Цікавить санвузол під ключ. Оцінка: ${p.estimate.low}-${p.estimate.high} PLN, термін: ${p.estimate.days_min}-${p.estimate.days_max} днів. Прошу зв’язок.`
  }[opts.lang as 'pl' | 'en' | 'ua'](opts.payload);
  return `https://wa.me/${opts.phone}?text=${encodeURIComponent(t)}`;
}

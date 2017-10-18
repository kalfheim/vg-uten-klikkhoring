// Totally fucked hosts. Just ignore them...
const ignoredHosts = [
  'vglive.no',
  'direkte.vg.no',
];

function superFetch(url) {
  if (url.indexOf('https://www.vg.no/') === 0) {
    return fetch(url);
  }

  // let's hope this thing is up most of the time
  return fetch(`https://cors-baby.herokuapp.com/${url}`);
}

async function fetchMetaFromAnything(url) {
  const html = await (
    await superFetch(url)
  ).text();

  return {
    title: html.match(/<meta (?:name|property)="(?:twitter|og):title" content="([^"]+)"/)[1],
    description: html.match(/<meta (?:name|property)="(?:twitter|og):description" content="([^"]+)"/)[1],
  };
}

async function fetchMetaFromVGTV(url) {
  const id = url.match(/\/video\/([0-9]+)\//)[1];

  const { title, description } = await (
    await superFetch(`https://svp.vg.no/svp/api/v1/vgtv/assets/${id}?appName=heihei`)
  ).json();

  return { title, description };
}

async function fetchMetaFromMinMote(url) {
  const id = url.match(/\/artikkel\/([0-9]+)\//)[1];

  const { title, preamble: description } = await (
    await superFetch(`http://www.minmote.no/api/v1/articles/${id}`)
  ).json();

  return { title, description };
}

async function fetchMetaFromGodt(url) {
  const id = url.match(/\/artikkel\/([0-9]+)\//)[1];

  const { title, preamble: description } = await (
    await superFetch(`http://www.godt.no/api/articles/${id}`)
  ).json();

  return { title, description };
}

function fetcherFetcher(host) {
  if (ignoredHosts.indexOf(host) !== -1) {
    return;
  }

  if (host === 'www.vgtv.no') {
    return fetchMetaFromVGTV.bind(null);
  }

  switch (host) {
    case 'www.vgtv.no':
      return fetchMetaFromVGTV.bind(null);

    case 'www.minmote.no':
      return fetchMetaFromMinMote.bind(null);

    case 'www.godt.no':
      return fetchMetaFromGodt.bind(null);

    default:
      return fetchMetaFromAnything.bind(null);
  }
}

function cleanseHeadlines(extract) {
  extract
    .querySelectorAll([
      '.article-content > h3',
      '.article-content > h4',
      '.df-article-content > h3',
      '.df-article-content > h4',
    ].join(','))
    .forEach(node => node.remove());
}

async function unwrapClickbait(extract) {
  const anchor = extract.querySelector('a');

  if (! anchor || ! anchor.href) {
    return;
  }

  const { title, description } = await (fetcherFetcher(anchor.host))(anchor.href);

  const headlines = document.createElement('div');

  headlines.innerHTML = `
    <h3 class="vg-fs38" style="margin-bottom: .5rem; line-height: .9;">
      <span class="vg-fs38"><a href="${anchor.href}">${title}</a></span>
    </h3>
    <h4 class="vg-fs20">
      <span class="vg-fs20"><a href="${anchor.href}" style="color: #444;">${description}</a></span>
    </h4>
  `;

  cleanseHeadlines(extract);

  const articleContent = extract.querySelector('.article-content, .df-article-content');

  articleContent.appendChild(headlines);
}

function initbaby() {
  const observer = new IntersectionObserver((entries, observer) => {
    entries
      .filter(entry => entry.isIntersecting)
      .forEach(entry => {
        observer.unobserve(entry.target);

        unwrapClickbait(entry.target);
      });
  });

  const extracts = document.querySelectorAll('.article-extract, .df-article');

  extracts.forEach(extract => observer.observe(extract));
}

if (document.readyState === 'complete') {
  initbaby();
} else {
  document.addEventListener('load', initbaby());
}

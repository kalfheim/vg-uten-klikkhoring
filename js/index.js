// Totally fucked hosts. Just ignore them...
const ignoredHosts = [
  'vglive.no',
  'direkte.vg.no',
];

function injectCss(css) {
  const element = document.createElement('style');

  element.appendChild(document.createTextNode(css));

  document.head.appendChild(element);
}

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

  const template = document.createElement('template');
  template.innerHTML = html;

  function meta(attribute) {
    const meta = template.content.querySelector(`meta[${attribute}]`);

    if (! meta) {
      return;
    }

    return meta.content;
  }

  return {
    title: meta('property="og:title"') || meta('property="twitter:title"') || template.content.querySelector('title').innerText,
    description: meta('name=description') || meta('property="og:description"') || meta('property="twitter:description"'),
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
  const clickbaits = extract.querySelectorAll([
    '.article-content > h3',
    '.article-content > h4',
    '.df-article-content > h3',
    '.df-article-content > h4',
  ].join(','));

  const originalHeadline = Array.from(clickbaits).map(node => node.innerText).join('\n');

  clickbaits.forEach(node => node.remove());

  return originalHeadline;
}

async function unwrapClickbait(extract) {
  const anchor = extract.querySelector('a');

  if (! anchor || ! anchor.href) {
    return;
  }

  const { title, description } = await (fetcherFetcher(anchor.host))(anchor.href);

  const originalHeadline = cleanseHeadlines(extract);

  const headlines = document.createElement('div');

  headlines.innerHTML = `
    <div class="no-clickbait-here" data-original="${originalHeadline}">
      <h3 class="vg-fs38">
        <span class="vg-fs38"><a href="${anchor.href}">${title}</a></span>
      </h3>
      <h4 class="vg-fs20">
        <span class="vg-fs20"><a href="${anchor.href}">${description}</a></span>
      </h4>
    </div>
  `;

  const articleContent = extract.querySelector('.article-content, .df-article-content');

  articleContent.appendChild(headlines);
}

function initbaby() {
  injectCss(`
    .no-clickbait-here h3 {
      position: relative;
      margin-bottom: .5rem;
      line-height: .9;
    }

    .no-clickbait-here {
      position: relative;
    }

    .no-clickbait-here::before {
      position: absolute;
      left: .5rem;
      top: 0;
      content: attr(data-original);
      opacity: 0;
      transition: transform ease-in-out .25s,
                  opacity ease-in-out .15s;
      font-size: 1.25rem;
      font-family: Liberation Serif, Times New Roman, Times, serif;
      font-weight: bold;
      color: #000;
      background-color: #fff;
      padding: .5rem .75rem;
      border-radius: .125rem;
      box-shadow: 0 .125rem .25rem 0 rgba(0,0,0,.1);
    }

    .no-clickbait-here:hover::before {
      opacity: 1;
      transform: translateY(-135%) rotate(360deg);
    }

    .no-clickbait-here a {
      color: #444;
    }
  `);

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

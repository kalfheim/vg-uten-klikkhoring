function cleanseHeadlines(extract) {
  extract
    .querySelectorAll([
      '.article-content > *:not(.df-img-container)',
      '.df-article-content > *:not(.df-img-container)',
    ].join(','))
    .forEach(node => node.remove());
}

function findArticleUrl(extract) {
  const anchor = extract.querySelector('a');

  if (! anchor || ! anchor.href) {
    return;
  }

  if (anchor.host !== 'www.vg.no') {
    return;
  }

  return anchor.href.replace('http://', 'https://');
}

async function fetchArticleMeta(url) {
  const response = await fetch(url);

  const value = await response.text();

  return {
    title: value.match(/<meta name="twitter:title" content="([^"]+)">/)[1],
    description: value.match(/<meta name="twitter:description" content="([^"]+)">/)[1],
  };
}

async function unwrapClickbait(extract) {
  const articleUrl = findArticleUrl(extract);

  if (! articleUrl) {
    return;
  }

  const { title, description } = await fetchArticleMeta(articleUrl);

  const headlines = document.createElement('div');

  headlines.innerHTML = `
    <h3 class="vg-fs38" style="margin-bottom: .5rem; line-height: .9;">
      <span class="vg-fs38"><a href="${articleUrl}">${title}</a></span>
    </h3>
    <h4 class="vg-fs20">
      <span class="vg-fs20"><a href="${articleUrl}" style="color: #444;">${description}</a></span>
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

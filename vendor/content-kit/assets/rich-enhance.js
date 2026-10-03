(function () {
   /* ── SVG icons for copy button ── */
   const ICON_COPY =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
   const ICON_CHECK =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
   const ICON_REPLAY =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';

   /* ── Code block copy ── */
   let copyDelegated = false;
   function enhanceCodeCopy() {
      if (copyDelegated) return;
      copyDelegated = true;

      // Populate all copy buttons with the clipboard icon
      document.querySelectorAll('.md-code-copy').forEach((btn) => {
         if (!btn.innerHTML.trim()) btn.innerHTML = ICON_COPY;
      });

      document.addEventListener('click', (e) => {
         const btn = e.target.closest('.md-code-copy');
         if (!btn) return;

         const wrap = btn.closest('.md-code-wrap');
         if (!wrap) return;

         const code = wrap.querySelector('pre code');
         if (!code) return;

         const text = code.textContent || '';
         navigator.clipboard.writeText(text).then(() => {
            btn.innerHTML = ICON_CHECK;
            btn.style.color = '#c3e88d';
            btn.style.borderColor = 'rgba(195, 232, 141, 0.4)';
            setTimeout(() => {
               btn.innerHTML = ICON_COPY;
               btn.style.color = '';
               btn.style.borderColor = '';
            }, 2000);
         });
      });
   }

   /* ── Terminal animation + replay ── */
   function enhanceTerm(root = document) {
      root.querySelectorAll('.md-term-wrap[data-anim="true"]').forEach((wrap) => {
         if (wrap.dataset.enhanced === 'true') return;
         wrap.dataset.enhanced = 'true';

         const code = wrap.querySelector('pre code');
         if (!code) return;

         const original = code.textContent || '';
         const lines = original.split('\n');

         // Add replay icon to button
         const replayBtn = wrap.querySelector('.md-term-replay');
         if (replayBtn) {
            replayBtn.innerHTML = ICON_REPLAY + ' Replay';
         }

         function runAnimation() {
            code.textContent = '';
            let lineIndex = 0;
            function typeNext() {
               if (lineIndex >= lines.length) return;
               const line = lines[lineIndex];
               code.textContent += (lineIndex ? '\n' : '') + line;
               lineIndex += 1;
               setTimeout(typeNext, 120);
            }
            typeNext();
         }

         // Store replay handler on the element for cleanup
         wrap._replayHandler = () => runAnimation();
         if (replayBtn) {
            replayBtn.addEventListener('click', wrap._replayHandler);
         }

         runAnimation();
      });
   }

   /* ── Mermaid render + zoom ── */
   let mermaidPollTimer = null;
   /** Which mode the current theme was set up for, so a change redraws what is already drawn. */
   let mermaidInitializedFor = null;

   const MERMAID_FONT = 'Noto Sans, ui-sans-serif, system-ui';
   const MERMAID_FONT_SIZE = '18px';

   const MERMAID_DARK = {
      background: '#222326',
      primaryColor: '#3C3D40',
      edgeLabelBackground: '#222326',
      clusterBkg: '#222326',
      clusterBorder: '#45f3ff',
      fontFamily: MERMAID_FONT,
      fontSize: MERMAID_FONT_SIZE,
      textColor: '#D7D7D9',
      nodeTextColor: '#D7D7D9',
      lineColor: '#45f3ff',
      border1: '#45f3ff',
   };

   const MERMAID_LIGHT = {
      background: '#FFFFFF',
      primaryColor: '#F4F4F5',
      primaryTextColor: '#27272A',
      primaryBorderColor: '#D4D4D8',
      secondaryColor: '#E4E4E7',
      tertiaryColor: '#FAFAFA',
      edgeLabelBackground: '#FFFFFF',
      clusterBkg: '#FAFAFA',
      clusterBorder: '#A1A1AA',
      fontFamily: MERMAID_FONT,
      fontSize: MERMAID_FONT_SIZE,
      textColor: '#27272A',
      nodeTextColor: '#27272A',
      lineColor: '#3F3F46',
      border1: '#3F3F46',
   };

   /**
    * Whether the page is dark. Inside the app the root element carries the class; a published
    * article may only have the system preference to go on.
    */
   function isDarkMode() {
      const root = document.documentElement;
      if (root.classList.contains('dark')) return true;
      if (root.classList.contains('light')) return false;
      return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
   }

   function ensureMermaidTheme(dark) {
      if (mermaidInitializedFor === dark) return;
      window.mermaid.initialize({
         startOnLoad: false,
         securityLevel: 'strict',
         theme: dark ? 'dark' : 'default',
         themeVariables: dark ? MERMAID_DARK : MERMAID_LIGHT,
      });
      mermaidInitializedFor = dark;
   }

   if (window.matchMedia) {
      window
         .matchMedia('(prefers-color-scheme: dark)')
         .addEventListener('change', () => enhanceMermaid(document));
   }

   // The app switches mode by class, with no event of its own to listen for.
   new MutationObserver(() => enhanceMermaid(document)).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
   });

   /** Each render gets its own scope id, so a redraw in the new theme cannot come back cached. */
   let mermaidRenderCount = 0;

   async function doRenderMermaid(el) {
      // The source is kept aside on the first render, because rendering replaces it: the element
      // then holds the previous SVG, whose text is markup and styling rather than the diagram.
      const src = el.dataset.mermaidSrc ?? el.textContent ?? '';
      el.dataset.mermaidSrc = src;

      const id = `mermaid-${++mermaidRenderCount}`;
      try {
         const { svg } = await window.mermaid.render(id, src);
         el.innerHTML = svg;
      } catch (err) {
         console.error('Mermaid render failed', err);
      }
   }

   async function enhanceMermaid(root = document) {
      const blocks = root.querySelectorAll('[data-enhance="mermaid"]');
      if (!blocks.length) return;

      if (!window.mermaid) {
         if (mermaidPollTimer) return;
         mermaidPollTimer = setInterval(() => {
            if (window.mermaid) {
               clearInterval(mermaidPollTimer);
               mermaidPollTimer = null;
               enhanceMermaid(document);
            }
         }, 75);
         setTimeout(() => {
            if (mermaidPollTimer) {
               clearInterval(mermaidPollTimer);
               mermaidPollTimer = null;
            }
         }, 10000);
         return;
      }

      const dark = isDarkMode();
      if (mermaidInitializedFor !== dark) {
         // Whatever is already drawn was drawn in the other mode, so it has to be drawn again.
         for (const el of blocks) delete el.dataset.enhanced;
         ensureMermaidTheme(dark);
      }

      for (const el of blocks) {
         if (el.dataset.enhanced === 'true') continue;
         el.dataset.enhanced = 'true';
         await doRenderMermaid(el);
      }
   }

   let mermaidZoomDelegated = false;
   function enhanceMermaidZoom() {
      if (mermaidZoomDelegated) return;
      mermaidZoomDelegated = true;

      document.addEventListener('click', (e) => {
         const wrap = e.target.closest('.md-mermaid');
         if (!wrap || !wrap.querySelector('svg')) return;

         const dialog = document.createElement('dialog');
         dialog.className = 'md-mermaid-dialog';

         const clone = wrap.querySelector('svg').cloneNode(true);
         clone.style.maxWidth = '100%';
         clone.style.maxHeight = '85vh';
         clone.style.height = 'auto';
         dialog.appendChild(clone);

         document.body.appendChild(dialog);
         try {
            dialog.showModal();
         } catch (err) {
            console.error('Mermaid dialog failed', err);
         }

         dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.close();
         });

         dialog.addEventListener('close', () => dialog.remove());
      });
   }

   /* ── Image zoom ── */
   let zoomDelegated = false;
   function enhanceZoom() {
      if (zoomDelegated) return;
      zoomDelegated = true;

      document.addEventListener('click', (e) => {
         const wrap = e.target.closest('[data-enhance="zoom"]');
         if (!wrap) return;

         const img = wrap.querySelector('img');
         if (!img) return;

         const dialog = document.createElement('dialog');
         dialog.className = 'md-img-dialog';

         const inner = document.createElement('div');
         inner.className = 'md-img-dialog-inner';

         const bigImg = document.createElement('img');
         bigImg.src = img.src;
         bigImg.alt = img.alt;

         const caption = wrap.querySelector('figcaption');
         if (caption) {
            const cap = document.createElement('div');
            cap.className = 'md-img-dialog-caption';
            cap.textContent = caption.textContent;
            inner.appendChild(bigImg);
            inner.appendChild(cap);
         } else {
            inner.appendChild(bigImg);
         }

         dialog.appendChild(inner);
         document.body.appendChild(dialog);

         try {
            dialog.showModal();
         } catch (err) {
            console.error('[zoom] showModal() failed:', err);
         }

         dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.close();
         });

         dialog.addEventListener('close', () => dialog.remove());
      });
   }

   /* ── Link preview hover card ── */
   let previewDelegated = false;
   let previewCard = null;
   let previewHideTimer = null;
   let activePreviewLink = null;
   let previewIframeTimer = null;

   function getEventElementTarget(target) {
      if (target instanceof Element) return target;
      if (target && target.parentElement instanceof Element) return target.parentElement;
      return null;
   }

   function ensurePreviewCard() {
      if (previewCard) return previewCard;

      previewCard = document.createElement('div');
      previewCard.className = 'md-link-preview';
      previewCard.setAttribute('data-link-preview-card', '');
      previewCard.setAttribute('hidden', '');
      previewCard.innerHTML = `
       <div class="md-link-preview__iframe-wrap" hidden>
         <iframe
           class="md-link-preview__iframe"
           referrerpolicy="no-referrer"
           sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
         ></iframe>
       </div>
       <div class="md-link-preview__media" hidden>
         <img class="md-link-preview__image" alt="" loading="lazy" />
       </div>
       <div class="md-link-preview__domain"></div>
       <div class="md-link-preview__title"></div>
       <div class="md-link-preview__description" hidden></div>
       <div class="md-link-preview__url"></div>
       <div class="md-link-preview__hint">Opens in new tab</div>
     `;

      previewCard.addEventListener('pointerenter', () => {
         if (previewHideTimer) clearTimeout(previewHideTimer);
      });

      previewCard.addEventListener('pointerleave', () => {
         hidePreviewSoon();
      });

      document.body.appendChild(previewCard);
      return previewCard;
   }

   function isPreviewableLink(link) {
      if (!link) return false;
      const href = link.getAttribute('data-preview-link') || link.getAttribute('href') || '';
      return /^https?:\/\//i.test(href);
   }

   function getPreviewData(link) {
      const rawHref = link.getAttribute('data-preview-link') || link.href;
      const url = new URL(rawHref, window.location.href);
      const text = (link.textContent || '').trim();

      return {
         href: url.href,
         domain: url.hostname.replace(/^www\./, ''),
         title: link.getAttribute('data-preview-title') || text || url.hostname,
         description: link.getAttribute('data-preview-description') || '',
         image: link.getAttribute('data-preview-image') || '',
         useIframe: link.getAttribute('data-preview-iframe') === 'true',
         shortUrl:
            url.pathname && url.pathname !== '/'
               ? `${url.hostname}${url.pathname}${url.search || ''}`
               : url.hostname,
      };
   }

   function positionPreviewCard(link) {
      const card = ensurePreviewCard();
      const rect = link.getBoundingClientRect();

      card.hidden = false;
      card.style.top = '0px';
      card.style.left = '0px';

      const cardRect = card.getBoundingClientRect();
      const gap = 10;
      const margin = 12;

      // The card is `position: fixed`, so it lives in viewport coordinates: use the link's
      // viewport rect directly and never add scroll offsets (the page may be scrolled while
      // the link's `top` is relative to the body's padding box).
      let top = rect.bottom + gap;
      let left = rect.left;

      if (left + cardRect.width > window.innerWidth - margin) {
         left = window.innerWidth - cardRect.width - margin;
      }

      if (top + cardRect.height > window.innerHeight - margin) {
         top = rect.top - cardRect.height - gap;
      }

      card.style.top = `${Math.max(margin, top)}px`;
      card.style.left = `${Math.max(margin, left)}px`;
   }

   function resetPreviewRichMedia() {
      const card = ensurePreviewCard();
      const iframeWrap = card.querySelector('.md-link-preview__iframe-wrap');
      const iframe = card.querySelector('.md-link-preview__iframe');
      const media = card.querySelector('.md-link-preview__media');
      const image = card.querySelector('.md-link-preview__image');

      if (previewIframeTimer) {
         clearTimeout(previewIframeTimer);
         previewIframeTimer = null;
      }

      iframe.removeAttribute('src');
      iframeWrap.hidden = true;

      image.removeAttribute('src');
      image.alt = '';
      media.hidden = true;
   }

   function tryRenderIframePreview(data) {
      const card = ensurePreviewCard();
      const iframeWrap = card.querySelector('.md-link-preview__iframe-wrap');
      const iframe = card.querySelector('.md-link-preview__iframe');

      if (!data.useIframe) return false;

      let settled = false;

      function failIframePreview() {
         if (settled) return;
         settled = true;
         iframe.removeAttribute('src');
         iframeWrap.hidden = true;
      }

      function succeedIframePreview() {
         if (settled) return;
         settled = true;
         iframeWrap.hidden = false;
      }

      iframeWrap.hidden = true;
      iframe.onload = () => {
         succeedIframePreview();
      };
      iframe.onerror = () => {
         failIframePreview();
      };

      previewIframeTimer = setTimeout(() => {
         failIframePreview();
      }, 2200);

      iframe.src = data.href;
      return true;
   }

   function renderPreviewCard(data) {
      const card = ensurePreviewCard();
      const media = card.querySelector('.md-link-preview__media');
      const image = card.querySelector('.md-link-preview__image');
      const domain = card.querySelector('.md-link-preview__domain');
      const title = card.querySelector('.md-link-preview__title');
      const description = card.querySelector('.md-link-preview__description');
      const url = card.querySelector('.md-link-preview__url');

      resetPreviewRichMedia();

      domain.textContent = data.domain;
      title.textContent = data.title;
      url.textContent = data.shortUrl;

      if (data.description) {
         description.textContent = data.description;
         description.hidden = false;
      } else {
         description.textContent = '';
         description.hidden = true;
      }

      tryRenderIframePreview(data);

      if (!data.useIframe && data.image) {
         image.src = data.image;
         image.alt = `${data.domain} preview`;
         media.hidden = false;

         image.onerror = () => {
            image.removeAttribute('src');
            image.alt = '';
            media.hidden = true;
         };
      } else if (data.image) {
         image.src = data.image;
         image.alt = `${data.domain} preview`;
         media.hidden = false;

         image.onerror = () => {
            image.removeAttribute('src');
            image.alt = '';
            media.hidden = true;
         };
      }
   }

   function showPreview(link) {
      if (!isPreviewableLink(link)) return;
      if (previewHideTimer) clearTimeout(previewHideTimer);

      activePreviewLink = link;
      const data = getPreviewData(link);
      renderPreviewCard(data);
      positionPreviewCard(link);
   }

   function hidePreviewSoon() {
      if (previewHideTimer) clearTimeout(previewHideTimer);
      previewHideTimer = setTimeout(() => {
         if (!previewCard) return;
         previewCard.hidden = true;
         activePreviewLink = null;
         resetPreviewRichMedia();
      }, 120);
   }

   function enhanceLinkPreviews() {
      if (previewDelegated) return;
      previewDelegated = true;

      document.addEventListener('pointerover', (e) => {
         const el = getEventElementTarget(e.target);
         const link = el ? el.closest('a[data-preview-link]') : null;
         if (!link) return;
         showPreview(link);
      });

      document.addEventListener('pointerout', (e) => {
         const el = getEventElementTarget(e.target);
         const link = el ? el.closest('a[data-preview-link]') : null;
         if (!link) return;

         const next = getEventElementTarget(e.relatedTarget);
         if (next && (link.contains(next) || (previewCard && previewCard.contains(next)))) {
            return;
         }

         hidePreviewSoon();
      });

      document.addEventListener('focusin', (e) => {
         const el = getEventElementTarget(e.target);
         const link = el ? el.closest('a[data-preview-link]') : null;
         if (!link) return;
         showPreview(link);
      });

      document.addEventListener('focusout', (e) => {
         const el = getEventElementTarget(e.target);
         const link = el ? el.closest('a[data-preview-link]') : null;
         if (!link) return;

         const next = getEventElementTarget(e.relatedTarget);
         if (next && previewCard && previewCard.contains(next)) {
            return;
         }

         hidePreviewSoon();
      });

      document.addEventListener('keydown', (e) => {
         if (e.key === 'Escape' && previewCard && !previewCard.hidden) {
            previewCard.hidden = true;
            activePreviewLink = null;
            resetPreviewRichMedia();
         }
      });

      window.addEventListener(
         'scroll',
         () => {
            if (activePreviewLink && previewCard && !previewCard.hidden) {
               positionPreviewCard(activePreviewLink);
            }
         },
         { passive: true },
      );

      window.addEventListener('resize', () => {
         if (activePreviewLink && previewCard && !previewCard.hidden) {
            positionPreviewCard(activePreviewLink);
         }
      });
   }

   /* ── Main entry ── */
   function enhanceAll(root = document) {
      enhanceTerm(root);
      enhanceMermaid(root);
      enhanceCodeCopy();
      enhanceMermaidZoom();
      enhanceZoom();
      enhanceLinkPreviews();
   }

   if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => enhanceAll(document), { once: true });
   } else {
      enhanceAll(document);
   }

   document.addEventListener('blog:enhance', () => enhanceAll(document));
})();

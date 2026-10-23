(() => {
  'use strict';
  const config = window.YSKG_CONTACT || {};
  const form = document.getElementById('yskgInquiry');
  const panel = document.getElementById('yskgInquiryPanel');
  if (!form || !/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(config.endpoint || '')) return;
  if (config.enabled !== true) return;
  panel.hidden = false;
  document.querySelectorAll('[data-yskg-contact-link]').forEach(link => {
    link.href = '#yskgInquiryPanel';
    link.removeAttribute('target');
  });
  const status = document.getElementById('yskgInquiryStatus');
  const fields = form.querySelector('fieldset');
  const button = form.querySelector('button[type="submit"]');
  let busy = false, completed = false;
  const inform = message => { status.textContent = message; status.focus(); };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || completed || !form.reportValidity()) return;
    const data = new FormData(form);
    if (data.get('_gotcha')) return;
    busy = true;
    fields.disabled = true;
    button.textContent = '送信しています…';
    form.setAttribute('aria-busy', 'true');
    inform('お問い合わせを送信しています。');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST', body: data, headers: { Accept: 'application/json' },
        signal: controller.signal, credentials: 'omit', referrerPolicy: 'origin'
      });
      if (!response.ok) {
        inform(response.status === 429
          ? '現在、送信を受け付けられません。時間をおいてお試しいただくか、下のGoogleフォームをご利用ください。'
          : '送信を完了できませんでした。入力内容をご確認のうえ、再度お試しください。');
        return;
      }
      // A successful response acknowledges backend acceptance, not email delivery.
      completed = true;
      button.textContent = '送信済み';
      form.reset();
      inform('お問い合わせを受け付けました。内容を確認のうえ、2〜3営業日以内にご返信いたします。');
      // Never pass field values, email, name, company or free text to Analytics.
      // QA mode still submits to the configured backend, but omits the GA4 event.
      if (config.testMode !== true && typeof window.gtag === 'function') {
        try { window.gtag('event', 'generate_lead', { form_id: 'yskg_inquiry', method: 'website_form' }); }
        catch (_) { /* Analytics failure must not turn a received inquiry into an error. */ }
      }
    } catch (_) {
      inform('通信が途切れたため、受付結果を確認できませんでした。入力内容は残っています。重複送信を避けるため、少し時間をおいてからご確認ください。');
    } finally {
      clearTimeout(timer);
      busy = false;
      form.removeAttribute('aria-busy');
      if (!completed) { fields.disabled = false; button.textContent = '相談内容を送信する'; }
    }
  });
})();

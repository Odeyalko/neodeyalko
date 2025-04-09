const PROXIES = [
  {
    url: "https://api.allorigins.win/get?url=",
    encode: true,
    headers: {}
  },
  {
    url: "https://corsproxy.io/?",
    encode: true,
    headers: {}
  },
  {
    url: "https://proxy.cors.sh/",
    encode: false,
    headers: {
      'x-cors-api-key': 'temp_09a95c02e6b34600d3c60b4d3a4a6147'
    }
  }
];

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const inputElem = document.getElementById('productUrl');
  const resultDiv = document.getElementById('result');
  const spinner = document.getElementById('loading');

  resultDiv.innerHTML = '';
  const userInput = inputElem.value.trim();

  if (!userInput) {
    resultDiv.innerHTML = '<p class="error">Введите ссылку или SKU.</p>';
    return;
  }

  let productUrl, originalSku;
  
  try {
    if (!userInput.startsWith('http')) {
      originalSku = userInput;
      productUrl = `https://www.lamoda.ru/p/${userInput}/`;
    } else {
      const match = userInput.match(/\/p\/([a-zA-Z0-9]+)/);
      if (!match?.[1]) throw new Error('Неверный формат ссылки');
      originalSku = match[1];
      productUrl = userInput;
    }

    spinner.classList.remove('hidden');
    const html = await fetchHTML(productUrl);
    const skuSupplier = extractSKU(html);

    resultDiv.innerHTML = `
      <div class="result-box">
        <div class="success">Найденный артикул:</div>
        <div class="sku-value">${skuSupplier}</div>
        <a href="${productUrl}" target="_blank" class="link">Открыть товар</a>
      </div>
    `;

  } catch (error) {
    resultDiv.innerHTML = `
      <div class="error-box">
        <div class="error">Ошибка: ${error.message}</div>
        <div class="guide">
          <h3>Рекомендации:</h3>
          <ul>
            <li>Проверьте правильность ссылки/SKU</li>
            <li>Обновите страницу и попробуйте снова</li>
            <li>Используйте VPN при необходимости</li>
          </ul>
        </div>
      </div>
    `;
  } finally {
    spinner.classList.add('hidden');
  }
});

async function fetchHTML(targetUrl) {
  let lastError;
  
  for (const {url: proxy, encode, headers} of PROXIES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const processedUrl = encode ? 
        proxy + encodeURIComponent(targetUrl) :
        proxy + targetUrl;

      const response = await fetch(processedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          ...headers
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        lastError = new Error(`HTTP Error ${response.status}`);
        continue;
      }

      const content = proxy.includes('allorigins') ? 
        (await response.json()).contents : 
        await response.text();

      if (content.includes('sku_supplier')) return content;
      throw new Error('Invalid content');

    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  
  throw new Error(lastError?.message || 'Не удалось подключиться к серверам');
}

function extractSKU(html) {
  // Улучшенный поиск JSON данных
  const jsonData = html.match(/<script[^>]*id="nuxt-data"[^>]*>(.+?)<\/script>/s);
  if (jsonData) {
    try {
      const parsed = JSON.parse(jsonData[1]);
      return parsed?.payload?.product?.sku_supplier || 
             parsed?.payload?.payload?.product?.sku_supplier;
    } catch (e) {
      console.warn('JSON Parse Error:', e);
    }
  }

  // Резервный поиск
  const skuMatch = html.match(/"sku_supplier":\s*"([\w]+)"/);
  if (skuMatch) return skuMatch[1];

  throw new Error('Артикул не найден');
}

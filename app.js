const PROXIES = [
  "https://api.allorigins.win/get?url=",
  "https://proxy.cors.sh/",
  "https://cors-anywhere.herokuapp.com/"
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
          <h3>Как исправить:</h3>
          <ul>
            <li>Используйте полную ссылку вида:<br>
            https://www.lamoda.ru/p/mp002xw05ezl/...</li>
            <li>Или введите только SKU: mp002xw05ezl</li>
            <li>Попробуйте другой прокси (VPN)</li>
          </ul>
        </div>
      </div>
    `;
  } finally {
    spinner.classList.add('hidden');
  }
});

async function fetchHTML(url) {
  let lastError;
  
  for (const proxy of PROXIES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      let proxyUrl;
      if (proxy === 'https://proxy.cors.sh/') {
        proxyUrl = proxy + url;
      } else {
        proxyUrl = proxy + encodeURIComponent(url);
      }

      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'X-Cors-API-Key': 'temp_09a95c02e6b34600d3c60b4d3a4a6147',
          ...(proxy.includes('allorigins') && {'Accept': 'application/json'})
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        lastError = new Error(`Ошибка прокси: ${response.status}`);
        continue;
      }

      const data = proxy.includes('allorigins') 
        ? (await response.json()).contents
        : await response.text();

      if (data.includes('sku_supplier')) return data;
      throw new Error('Невалидный ответ');

    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  
  throw new Error(lastError?.message || 'Все прокси недоступны');
}

function extractSKU(html) {
  const jsonMatch = html.match(/<script type="application\/json" id="nuxt-data">(.+?)<\/script>/s);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      return data.payload.product.sku_supplier || 
             data.payload.payload.product.sku_supplier;
    } catch (e) {
      console.error('JSON parse error:', e);
    }
  }

  const directMatch = html.match(/"sku_supplier":\s*"(\w+)"/);
  if (directMatch) return directMatch[1];

  throw new Error('Артикул не найден в HTML');
}

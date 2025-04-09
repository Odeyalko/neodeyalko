const PROXIES = [
  {
    url: 'https://cors-anywhere.herokuapp.com/',
    method: 'prefix',
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  },
  {
    url: 'https://api.codetabs.com/v1/proxy/?quest=',
    method: 'prefix',
    headers: {}
  },
  {
    url: 'https://thingproxy.freeboard.io/fetch/',
    method: 'prefix',
    headers: {}
  },
  {
    url: 'https://yacdn.org/proxy/',
    method: 'prefix',
    headers: {}
  }
];

async function fetchProductData(url) {
  let lastError = null;
  
  for (const proxy of PROXIES) {
    try {
      const proxyUrl = proxy.method === 'prefix' 
        ? proxy.url + encodeURIComponent(url)
        : `${proxy.url}?url=${encodeURIComponent(url)}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          ...proxy.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        lastError = `HTTP Error ${response.status}`;
        continue;
      }

      const html = await response.text();
      const sku = extractSKU(html);
      
      if (!sku) {
        lastError = 'SKU not found in response';
        continue;
      }

      return sku;

    } catch (error) {
      lastError = error.message;
      continue;
    }
  }

  throw new Error(`All proxies failed: ${lastError}`);
}

function extractSKU(html) {
  // Улучшенный поиск с учётом разных вариантов вёрстки
  const patterns = [
    /"sku_supplier":\s*"([^"]+)"/,
    /<meta[^>]+sku_supplier[^>]+content="([^"]+)"/i,
    /data-sku-supplier="([^"]+)"/i
  ];

  for (const regex of patterns) {
    const match = html.match(regex);
    if (match && match[1]) return match[1];
  }

  return null;
}

// Пример использования
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const input = document.getElementById('productUrl').value.trim();
  const resultDiv = document.getElementById('result');
  
  try {
    if (!input) throw new Error('Введите URL или SKU');
    
    const url = input.startsWith('http') 
      ? input
      : `https://www.lamoda.ru/p/${input}/`;

    const sku = await fetchProductData(url);
    
    resultDiv.innerHTML = `
      <div class="success">
        Артикул поставщика: <strong>${sku}</strong>
        <div class="actions">
          <a href="${url}" target="_blank">Открыть товар</a>
          <button onclick="copyToClipboard('${sku}')">Копировать</button>
        </div>
      </div>
    `;
    
  } catch (error) {
    resultDiv.innerHTML = `
      <div class="error">
        Ошибка: ${error.message}
        <div class="tips">
          Попробуйте:
          <ul>
            <li>Проверить интернет-соединение</li>
            <li>Обновить страницу</li>
            <li>Использовать другой формат ввода</li>
          </ul>
        </div>
      </div>
    `;
  }
});

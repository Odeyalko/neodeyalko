// app.js
const PROXIES = [
  'https://api.codetabs.com/v1/proxy/?quest=',
  'https://corsproxy.io/?',
  'https://proxy.webserverapi.com/',
  'https://www.cors-api.org/api/api?url='
];

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const input = document.getElementById('productUrl').value.trim();
  const resultDiv = document.getElementById('result');
  const loader = document.getElementById('loader');
  
  resultDiv.innerHTML = '';
  loader.style.display = 'block';

  try {
    if (!input) throw new Error('Введите ссылку или артикул');
    
    // Автоматическое определение типа ввода
    const { url, sku } = processInput(input);
    
    // Попытка получения данных
    const html = await fetchWithProxies(url);
    const supplierSku = extractSupplierSku(html);
    
    // Отображение результата
    resultDiv.innerHTML = createSuccessHTML(supplierSku, url);
    
  } catch (error) {
    resultDiv.innerHTML = createErrorHTML(error);
  } finally {
    loader.style.display = 'none';
  }
});

// Обработка различных форматов ввода
function processInput(input) {
  let url, sku;
  
  if (/^https?:\/\//i.test(input)) {
    const match = input.match(/\/p\/([\w-]+)/i);
    if (!match) throw new Error('Неверный формат ссылки');
    sku = match[1];
    url = input;
  } else {
    sku = input;
    url = `https://www.lamoda.ru/p/${input}/`;
  }
  
  return { url, sku };
}

// Обход CORS через несколько прокси
async function fetchWithProxies(url) {
  let lastError;
  
  for (const proxy of PROXIES) {
    try {
      const proxyUrl = proxy + encodeURIComponent(url);
      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 5000
      });
      
      if (!response.ok) continue;
      
      const html = await response.text();
      if (/sku_supplier/i.test(html)) return html;
      
    } catch (error) {
      lastError = error;
    }
  }
  
  throw new Error(lastError?.message || 'Все прокси недоступны');
}

// Парсинг SKU
function extractSupplierSku(html) {
  const patterns = [
    /"sku_supplier":\s*"([^"]+)"/,
    /data-product-sku="([^"]+)"/,
    /<meta[^>]+product_id[^>]+content="([^"]+)"/i
  ];
  
  for (const regex of patterns) {
    const match = html.match(regex);
    if (match) return match[1];
  }
  
  throw new Error('Артикул не найден');
}

// Генератор HTML
function createSuccessHTML(sku, url) {
  return `
    <div class="success">
      <h3>✅ Найден артикул поставщика:</h3>
      <div class="sku">${sku}</div>
      <div class="actions">
        <a href="${url}" target="_blank" class="btn">Открыть товар</a>
        <button onclick="copyToClipboard('${sku}')" class="btn">Копировать</button>
      </div>
    </div>
  `;
}

function createErrorHTML(error) {
  return `
    <div class="error">
      <h3>⛔ Ошибка!</h3>
      <p>${error.message}</p>
      <div class="help">
        <p>Примеры правильного формата:</p>
        <ul>
          <li>Полная ссылка:<br>
          <code>https://www.lamoda.ru/p/MP002XW0OIJF/...</code></li>
          <li>Только артикул:<br>
          <code>MP002XW0OIJF</code></li>
        </ul>
      </div>
    </div>
  `;
}

// Вспомогательная функция
function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
}

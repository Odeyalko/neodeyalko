const PROXY_URL = 'https://86fcc51b.odeyalko.pages.dev';

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const inputElem = document.getElementById('productUrl');
  const resultDiv = document.getElementById('result');
  const spinner = document.getElementById('loading');

  resultDiv.innerHTML = '';
  const userInput = inputElem.value.trim();

  if (!userInput) {
    showError('Введите ссылку или SKU.');
    return;
  }

  try {
    spinner.classList.remove('hidden');
    
    const { url, sku } = processInput(userInput);
    const skuSupplier = await fetchData(url);
    
    showResult(skuSupplier, url);
  } catch (error) {
    showError(error.message);
  } finally {
    spinner.classList.add('hidden');
  }

  function processInput(input) {
    if (!input.startsWith('http')) {
      return { 
        url: `https://www.lamoda.ru/p/${input}/`,
        sku: input 
      };
    }
    
    const match = input.match(/\/p\/([\w-]+)/);
    if (!match) throw new Error('Неверный формат ссылки');
    
    return { 
      url: input,
      sku: match[1] 
    };
  }

  async function fetchData(url) {
    const response = await fetch(`${PROXY_URL}/?url=${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status}`);
    }
    
    const html = await response.text();
    return extractSKU(html);
  }

  function extractSKU(html) {
    const regex = /"sku_supplier":\s*"([^"]+)"/;
    const match = html.match(regex);
    return match?.[1] || 'Артикул не найден';
  }

  function showResult(sku, url) {
    resultDiv.innerHTML = `
      <div class="result">
        <h3>Результат:</h3>
        <div class="sku">${sku}</div>
        <a href="${url}" target="_blank" class="link">Открыть товар</a>
      </div>
    `;
  }

  function showError(message) {
    resultDiv.innerHTML = `
      <div class="error">
        <h3>Ошибка!</h3>
        <p>${message}</p>
        <div class="examples">
          Примеры корректных данных:
          <ul>
            <li>https://www.lamoda.ru/p/MP002XW0OIJF/</li>
            <li>MP002XW0OIJF</li>
          </ul>
        </div>
      </div>
    `;
  }
});

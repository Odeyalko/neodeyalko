document.addEventListener('DOMContentLoaded', () => {
    const PROXIES = [
        'https://api.allorigins.win/get?url=',
        'https://corsproxy.io/?',
        'https://proxy.webserverapi.com/'
    ];

    // Инициализация элементов
    const elements = {
        input: document.getElementById('productUrl'),
        button: document.getElementById('analyzeBtn'),
        result: document.querySelector('#result .result-content'),
        spinner: document.getElementById('loading'),
        resultCard: document.getElementById('result')
    };

    // Проверка элементов
    if (!elements.input || !elements.button || !elements.result || !elements.spinner) {
        console.error('Ошибка инициализации элементов');
        return;
    }

    elements.button.addEventListener('click', async () => {
        try {
            resetUI();
            const input = elements.input.value.trim();
            
            if (!input) {
                showError('Введите ссылку или SKU');
                return;
            }

            const { url } = processInput(input);
            const html = await fetchHTML(url);
            const sku = extractSKU(html);
            
            showResult(sku, url);
            elements.resultCard.classList.add('success');

        } catch (error) {
            elements.resultCard.classList.add('error');
            showError(error.message);
        } finally {
            elements.spinner.classList.add('hidden');
        }
    });

    function processInput(input) {
        let url, sku;
        
        if (/^https?:\/\//i.test(input)) {
            const match = input.match(/\/p\/([\w-]+)/i);
            if (!match) throw new Error('Неверный формат ссылки');
            sku = match[1];
            url = input;
        } else {
            if (!/^[\w-]+$/i.test(input)) throw new Error('Некорректный формат SKU');
            sku = input;
            url = `https://www.lamoda.ru/p/${sku}/`;
        }
        
        return { url, sku };
    }

    async function fetchHTML(url) {
        let lastError;
        
        for (const proxy of PROXIES) {
            try {
                const proxyUrl = proxy + encodeURIComponent(url);
                const response = await fetch(proxyUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                    }
                });
                
                if (!response.ok) continue;
                
                const content = proxy.includes('allorigins') 
                    ? (await response.json()).contents 
                    : await response.text();
                
                if (content.includes('sku_supplier')) return content;
                
            } catch (error) {
                lastError = error;
            }
        }
        
        throw new Error(lastError?.message || 'Не удалось получить данные');
    }

    function extractSKU(html) {
        const patterns = [
            /"sku_supplier":\s*"([^"]+)"/,
            /data-product-sku="([^"]+)"/,
            /<meta[^>]+sku_supplier[^>]+content="([^"]+)"/i
        ];
        
        for (const regex of patterns) {
            const match = html.match(regex);
            if (match) return match[1];
        }
        throw new Error('Артикул не найден');
    }

    function resetUI() {
        elements.spinner.classList.remove('hidden');
        elements.resultCard.classList.remove('success', 'error');
        elements.result.innerHTML = '';
    }

    function showResult(sku, url) {
        elements.result.innerHTML = `
            <div class="sku-value">${sku}</div>
            <a href="${url}" target="_blank" class="sku-link">Открыть товар</a>
        `;
    }

    function showError(message) {
        elements.result.innerHTML = `
            <div class="error-message">
                ${message}
                <div class="manual-guide">
                    <h3>Примеры корректного ввода:</h3>
                    <ul>
                        <li>https://www.lamoda.ru/p/mp002xw05ezl/</li>
                        <li>mp002xw05ezl</li>
                    </ul>
                </div>
            </div>
        `;
    }
});

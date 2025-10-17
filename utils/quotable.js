import axios from 'axios';

/**
 * Отримує випадкову цитату з API ZenQuotes.
 * Цитата повертається у форматі: "Текст цитати - Автор"
 * @returns {Promise<string>} Повертає текст цитати.
 */
export async function getQuote() {
    try {
        // ВИКОРИСТОВУЄМО ZenQuotes API, який дає випадкові цитати
        const apiUrl = 'https://zenquotes.io/api/random'; 
        
        // 1. Виконуємо HTTP GET запит
        const response = await axios.get(apiUrl);
        
        // Очікувана структура відповіді: [{ q: "...", a: "..." }]
        const quoteArray = response.data;
        
        // 2. Перевіряємо та форматуємо відповідь
        if (quoteArray && quoteArray.length > 0) {
            const { q } = quoteArray[0]; // q - quote, a - author
            
            if (q) {
                 const quoteText = `${q}`;
                 return quoteText;
            }
        }
        
        return 'The chat bot says: I received data, but it was not a valid quote.';
        
    } catch (error) {
        // Логуємо помилку і повертаємо запасну відповідь, щоб не зупиняти додаток
        console.error('Error fetching quote from ZenQuotes API:', error.message);
        return 'The chat bot says: I am currently unable to provide a quote, but hello!';
    }
}
import axios from 'axios';

/**
 * Отримує випадкову цитату з API ZenQuotes.
 * Цитата повертається у форматі: "Текст цитати - Автор"
 * @returns {Promise<string>} Повертає текст цитати.
 */
export async function getQuote() {
    try {
        const apiUrl = 'https://zenquotes.io/api/random'; 
        const response = await axios.get(apiUrl);    
        const quoteArray = response.data;
        
        if (quoteArray && quoteArray.length > 0) {
            const { q } = quoteArray[0]; // q - quote, a - author
            
            if (q) {
                 const quoteText = `${q}`;
                 return quoteText;
            }
        }
        
        return 'I received data, but it was not a valid quote.';
        
    } catch (error) {
        // Логуємо помилку і повертаємо запасну відповідь, щоб не зупиняти додаток
        console.error('Error fetching quote from ZenQuotes API:', error.message);
        return 'I am currently unable to provide a quote, but hello!';
    }
}
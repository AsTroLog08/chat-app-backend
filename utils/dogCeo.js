import axios from 'axios';

/**
 * Отримує випадкову цитату з API ZenQuotes.
 * Цитата повертається у форматі: "Текст цитати - Автор"
 * @returns {Promise<string>} Повертає текст цитати.
 */
export async function dogCeo() {
    try {
        // ВИКОРИСТОВУЄМО ZenQuotes API, який дає випадкові цитати
        const apiUrl = 'https://dog.ceo/api/breeds/image/random'; 
        
        // 1. Виконуємо HTTP GET запит
        const response = await axios.get(apiUrl);
        
        // Очікувана структура відповіді: [{ message: "...", status: "..." }]
        const { message, status } = response.data;
        
        // 2. Перевіряємо та форматуємо відповідь
        if (status === 'success' && message) {
            // Повертаємо URL зображення
            return message; 
        }
        
        
        return 'The chat bot says: I received data, but it was not a valid quote.';
        
    } catch (error) {
        // Логуємо помилку і повертаємо запасну відповідь, щоб не зупиняти додаток
        console.error('Error fetching quote from ZenQuotes API:', error.message);
        return 'The chat bot says: I am currently unable to provide a quote, but hello!';
    }
}
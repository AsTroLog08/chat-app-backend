import axios from 'axios';

/**
 * Отримує випадковий URL зображення собаки з Dog CEO API.
 * @returns {Promise<string>} Повертає URL зображення собаки або URL замінника у разі помилки.
 */
export async function dogCeo() {
    const apiUrl = 'https://dog.ceo/api/breeds/image/random';

    try {

        const response = await axios.get(apiUrl);
        const { message: imageUrl, status } = response.data;
        
        if (status === 'success' && imageUrl) {
            return imageUrl; 
        }
        
        return 'https://via.placeholder.com/150?text=Dog+URL+Error';
        
    } catch (error) {
        console.error('Error fetching image from Dog CEO API:', error.message);
        return 'https://via.placeholder.com/150?text=API+Failed';
    }
}
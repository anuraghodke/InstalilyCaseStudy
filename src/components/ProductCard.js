import React, { useState, useEffect } from 'react';
import './ProductCard.css';

// Store translations to avoid redundant API calls
const translationCache = new Map();

// Fetch translation from Google Translate API
const translateToSpanish = async (text) => {
  if (translationCache.has(text)) {
    return translationCache.get(text);
  }

  const apiKey = process.env.REACT_APP_GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    console.error('Google Translate API key is missing. Please set REACT_APP_GOOGLE_TRANSLATE_API_KEY in your .env file.');
    return text; 
  }

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: 'es',
          format: 'text',
        }),
      }
    );

    const data = await response.json();

    if (data.data?.translations?.[0]?.translatedText) {
      const translatedText = data.data.translations[0].translatedText;
      // Cache translation
      translationCache.set(text, translatedText);
      return translatedText;
    } else {
      console.error('Google Translate API error:', data.error?.message || 'Unknown error');
      return text; 
    }
  } catch (error) {
    console.error('Error fetching translation from Google Translate API:', error);
    return text;
  }
};

const ProductCard = ({ product, language }) => {
  const [quantity, setQuantity] = useState(1);
  const [translatedName, setTranslatedName] = useState(product?.name || '');
  const [translatedDescription, setTranslatedDescription] = useState(product?.description || '');

  const handleIncrement = () => {
    setQuantity(prev => prev + 1);
  };

  const handleDecrement = () => {
    setQuantity(prev => (prev > 1 ? prev - 1 : 1));
  };

  // Fetch translations when language changes to Spanish
  useEffect(() => {
    const fetchTranslations = async () => {
      if (language === 'Spanish' && product) {
        const translatedName = await translateToSpanish(product.name);
        const translatedDescription = await translateToSpanish(product.description);
        setTranslatedName(translatedName);
        setTranslatedDescription(translatedDescription);
      } else {
        setTranslatedName(product?.name || '');
        setTranslatedDescription(product?.description || '');
      }
    };

    fetchTranslations();
  }, [language, product]);

  if (!product) {
    return (
      <div className="message-bubble">
        {language === 'English'
          ? 'Please select a product to view details'
          : 'Por favor, seleccione un producto para ver los detalles'}
      </div>
    );
  }

  const ratingPercent = parseFloat(product.starRating) || 0;

  return (
    <div className="product-card-container">
      <h2>{translatedName}</h2>
      <img src={product.image} alt={translatedName} className="product-image" />
      <div className="quantity-bar">
        <span>{language === 'English' ? 'Quantity' : 'Cantidad'}</span>
        <div className="quantity-controls">
          <button className="quantity-btn" onClick={handleDecrement}>-</button>
          <span className="quantity-value">{quantity}</span>
          <button className="quantity-btn" onClick={handleIncrement}>+</button>
        </div>
      </div>
      <div className="rating">
        <div className="star-rating">
          <div className="stars-empty">★★★★★</div>
          <div className="stars-filled" style={{ width: `${ratingPercent}%` }}>
            ★★★★★
          </div>
        </div>
        <span className="reviews">
          ({product.numberOfReviews}{' '}
          {language === 'English' ? 'Reviews' : 'Reseñas'})
        </span>
      </div>
      <h3 className="description-title">
        {language === 'English' ? 'Product Description' : 'Descripción del Producto'}
      </h3>
      <p className="description">{translatedDescription}</p>
      <span className="price">{product.price}</span>
      <a
        href={product.partUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="view-in-store-btn"
      >
        {language === 'English' ? 'View in Store' : 'Ver en la Tienda'}
      </a>
    </div>
  );
};

export default ProductCard;
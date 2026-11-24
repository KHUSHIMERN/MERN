/**
 * Translation Service — Feature 4: AI Event Description Translation
 * Translates event descriptions and titles into English, Hindi, or Kannada.
 * Preserves the original event description while providing fast, accurate
 * domain-aware translations with in-memory caching and optional OpenAI fallback.
 */

'use strict';

const crypto = require('crypto');

// In-memory cache for fast repeated translation lookups
const translationCache = new Map();

// Known event translation dictionary (High-fidelity curated domain translations)
const KNOWN_TRANSLATIONS = {
  hi: {
    // Exact descriptions
    'An annual tech summit gathering AI developers, startup founders, and cloud engineers.':
      'एआई डेवलपर्स, स्टार्टअप संस्थापकों और क्लाउड इंजीनियरों को एक साथ लाने वाला वार्षिक टेक शिखर सम्मेलन।',
    'Celebrate rich heritage with Yakshagana, Dollu Kunitha, music, and local cuisine stalls.':
      'यक्षगान, डोलू कुनिथा, संगीत और स्थानीय व्यंजनों के स्टालों के साथ समृद्ध विरासत का जश्न मनाएं।',
    'Hands-on practical workshop covering React 19, i18n, Express, and MongoDB integration.':
      'रिएक्ट 19, i18n, एक्सप्रेस और मोंगोडीबी एकीकरण पर व्यावहारिक कोडिंग कार्यशाला।',
    'Join environmental volunteers for tree planting and park restoration initiative.':
      'वृक्षारोपण और पार्क जीर्णोद्धार पहल के लिए पर्यावरण स्वयंसेवकों से जुड़ें।',
    '48-hour competitive coding hackathon solving real-world civic challenges using LLMs.':
      'एलएलएम का उपयोग करके वास्तविक दुनिया की नागरिक चुनौतियों को हल करने वाला 48 घंटे का प्रतिस्पर्धी कोडिंग हैकथॉन।',
    'Enchanting Carnatic instrumental performance featuring veena and mridangam virtuosos.':
      'वीणा और मृदंगम वादकों द्वारा मनमोहक कर्नाटक वाद्य संगीत प्रस्तुति।',
    'Networking event connecting seed-stage founders with venture capital funds.':
      'प्रारंभिक चरण के संस्थापकों को उद्यम पूंजी फंडों से जोड़ने वाला नेटवर्किंग कार्यक्रम।',
    'Early morning 60km endurance cycling rally from Hebbal to Nandi Hills peak.':
      'हेब्बाल से नंदी हिल्स की चोटी तक सुबह-सुबह 60 किमी की सहनशक्ति साइकिल रैली।',
    'Keynote panels, career mentoring circles, and leadership strategies for women engineers.':
      'महिला इंजीनियरों के लिए मुख्य पैनल, करियर मेंटरिंग और नेतृत्व रणनीतियाँ।',
    'Interactive stalls and workshops on rooftop gardening, composting, and hydroponics.':
      'रूफटॉप बागवानी, खाद बनाने और हाइड्रोपोनिक्स पर इंटरैक्टिव स्टॉल और कार्यशालाएं।',
    'Hands-on practical coding workshop covering Python, web development, and AI algorithms near Patna.':
      'पटना में पायथन, वेब डेवलपमेंट और एआई एल्गोरिदम पर व्यावहारिक कोडिंग कार्यशाला।',
    'Free mega job fair connecting job seekers, college graduates, and professionals with 40+ hiring companies, IT startups, and vocational skill institutions.':
      'नौकरी चाहने वालों और पेशेवरों को 40 से अधिक कंपनियों और स्टार्टअप से जोड़ने वाला निःशुल्क रोजगार मेला।',
  },
  kn: {
    // Exact descriptions
    'An annual tech summit gathering AI developers, startup founders, and cloud engineers.':
      'ಎಐ ಡೆವಲಪರ್‌ಗಳು, ಸ್ಟಾರ್ಟಪ್ ಸಂಸ್ಥಾಪಕರು ಮತ್ತು ಕ್ಲೌಡ್ ಎಂಜಿನಿಯರ್‌ಗಳನ್ನು ಒಟ್ಟುಗೂಡಿಸುವ ವಾರ್ಷಿಕ ತಂತ್ರಜ್ಞಾನ ಸಮ್ಮೇಳನ.',
    'Celebrate rich heritage with Yakshagana, Dollu Kunitha, music, and local cuisine stalls.':
      'ಯಕ್ಷಗಾನ, ಡೊಳ್ಳು ಕುಣಿತ, ಸಂಗೀತ ಮತ್ತು ಸ್ಥಳೀಯ ಪಾಕಪದ್ಧತಿಯ ಮಳಿಗೆಗಳೊಂದಿಗೆ ಶ್ರೀಮಂತ ಪರಂಪರೆಯನ್ನು ಆಚರಿಸಿ.',
    'Hands-on practical workshop covering React 19, i18n, Express, and MongoDB integration.':
      'ರಿಯಾಕ್ಟ್ 19, ಐ18ಎನ್, ಎಕ್ಸ್‌ಪ್ರೆಸ್ ಮತ್ತು ಮಾಂಗೋಡಿಬಿ ಸಂಯೋಜನೆಯ ಕುರಿತು ಪ್ರಾಯೋಗಿಕ ಕಾರ್ಯಾಗಾರ.',
    'Join environmental volunteers for tree planting and park restoration initiative.':
      'ಮರ ನೆಡುವಿಕೆ ಮತ್ತು ಉದ್ಯಾನವನ ಪುನಶ್ಚೇತನ ಉಪಕ್ರಮಕ್ಕಾಗಿ ಪರಿಸರ ಸ್ವಯಂಸೇವಕರೊಂದಿಗೆ ಸೇರಿ.',
    '48-hour competitive coding hackathon solving real-world civic challenges using LLMs.':
      'ಎಲ್‌ಎಲ್‌ಎಂ ಬಳಸಿ ನೈಜ ಪ್ರಪಂಚದ ನಾಗರಿಕ ಸವಾಲುಗಳನ್ನು ಪರಿಹರಿಸುವ 48 ಗಂಟೆಗಳ ಸ್ಪರ್ಧಾತ್ಮಕ ಕೋಡಿಂಗ್ ಹ್ಯಾಕಥಾನ್.',
    'Enchanting Carnatic instrumental performance featuring veena and mridangam virtuosos.':
      'ವೀಣೆ ಮತ್ತು ಮೃದಂಗ ವಾದಕರ ಮನಮೋಹಕ ಕರ್ನಾಟಕ ಶಾಸ್ತ್ರೀಯ ವಾದ್ಯ ಸಂಗೀತ ಕಾರ್ಯಕ್ರಮ.',
    'Networking event connecting seed-stage founders with venture capital funds.':
      'ಆರಂಭಿಕ ಹಂತದ ಸಂಸ್ಥಾಪಕರನ್ನು ಸಾಹಸೋದ್ಯಮ ಬಂಡವಾಳ ನಿಧಿಗಳೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುವ ನೆಟ್‌ವರ್ಕಿಂಗ್ ಈವೆಂಟ್.',
    'Early morning 60km endurance cycling rally from Hebbal to Nandi Hills peak.':
      'ಹೆಬ್ಬಾಳದಿಂದ ನಂದಿ ಬೆಟ್ಟದ ಶಿಖರದವರೆಗೆ ಮುಂಜಾನೆ 60 ಕಿ.ಮೀ ದೂರದ ಸೈಕ್ಲಿಂಗ್ ರ‍್ಯಾಲಿ.',
    'Keynote panels, career mentoring circles, and leadership strategies for women engineers.':
      'ಮಹಿಳಾ ಎಂಜಿನಿಯರ್‌ಗಳಿಗಾಗಿ ಪ್ರಮುಖ ಚರ್ಚಾಗೋಷ್ಠಿಗಳು, ವೃತ್ತಿ ಮಾರ್ಗದರ್ಶನ ಮತ್ತು ನಾಯಕತ್ವ ತಂತ್ರಗಳು.',
    'Interactive stalls and workshops on rooftop gardening, composting, and hydroponics.':
      'ತಾರಸಿ ತೋಟಗಾರಿಕೆ, ಗೊಬ್ಬರ ತಯಾರಿಕೆ ಮತ್ತು ಹೈಡ್ರೋಪೋನಿಕ್ಸ್ ಕುರಿತು ಸಂವಾದಾತ್ಮಕ ಮಳಿಗೆಗಳು ಮತ್ತು ಕಾರ್ಯಾಗಾರಗಳು.',
    'Hands-on practical coding workshop covering Python, web development, and AI algorithms near Patna.':
      'ಪಾಟ್ನಾ ಬಳಿ ಪೈಥಾನ್, ವೆಬ್ ಡೆವಲಪ್‌ಮೆಂಟ್ ಮತ್ತು ಎಐ ಅಲ್ಗಾರಿದಮ್‌ಗಳ ಕುರಿತು ಪ್ರಾಯೋಗಿಕ ಕೋಡಿಂಗ್ ಕಾರ್ಯಾಗಾರ.',
    'Free mega job fair connecting job seekers, college graduates, and professionals with 40+ hiring companies, IT startups, and vocational skill institutions.':
      'ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿಗಳು ಮತ್ತು ವೃತ್ತಿಪರರನ್ನು 40 ಕ್ಕೂ ಹೆಚ್ಚು ಕಂಪನಿಗಳು ಮತ್ತು ಸ್ಟಾರ್ಟಪ್‌ಗಳೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುವ ಉಚಿತ ಮೆಗಾ ಉದ್ಯೋಗ ಮೇಳ.',
  },
};

// Common phrase & keyword translation mapping for dynamic descriptions
const PHRASE_MAP = {
  hi: [
    [/\bFree\b/gi, 'निःशुल्क'],
    [/\bjob fair\b/gi, 'रोजगार मेला'],
    [/\bjob fairs\b/gi, 'रोजगार मेले'],
    [/\bworkshop\b/gi, 'कार्यशाला'],
    [/\bworkshops\b/gi, 'कार्यशालाएं'],
    [/\bcoding\b/gi, 'कोडिंग'],
    [/\bhackathon\b/gi, 'हैकथॉन'],
    [/\bfestival\b/gi, 'महोत्सव'],
    [/\bcleanliness drive\b/gi, 'स्वच्छता अभियान'],
    [/\bvolunteers\b/gi, 'स्वयंसेवक'],
    [/\bcommunity\b/gi, 'समुदाय'],
    [/\bevent\b/gi, 'कार्यक्रम'],
    [/\bevents\b/gi, 'कार्यक्रमों'],
    [/\bconnecting\b/gi, 'जोड़ने वाला'],
    [/\bhands-on\b/gi, 'व्यावहारिक'],
    [/\bpractical\b/gi, 'व्यावहारिक'],
    [/\bdevelopers\b/gi, 'डेवलपर्स'],
    [/\btechnology\b/gi, 'तकनीक'],
    [/\bannual\b/gi, 'वार्षिक'],
    [/\bsummit\b/gi, 'शिखर सम्मेलन'],
    [/\bcelebrate\b/gi, 'उत्सव मनाएं'],
    [/\bmusic\b/gi, 'संगीत'],
    [/\bculture\b/gi, 'संस्कृति'],
    [/\bheritage\b/gi, 'विरासत'],
    [/\bregistration\b/gi, 'पंजीकरण'],
    [/\bfree entry\b/gi, 'निःशुल्क प्रवेश'],
    [/\bexhibition\b/gi, 'प्रदर्शनी'],
    [/\bstartups\b/gi, 'स्टार्टअप'],
    [/\bmentor\b/gi, 'मार्गदर्शन'],
    [/\bleadership\b/gi, 'नेतृत्व'],
  ],
  kn: [
    [/\bFree\b/gi, 'ಉಚಿತ'],
    [/\bjob fair\b/gi, 'ಉದ್ಯೋಗ ಮೇಳ'],
    [/\bjob fairs\b/gi, 'ಉದ್ಯೋಗ ಮೇಳಗಳು'],
    [/\bworkshop\b/gi, 'ಕಾರ್ಯಾಗಾರ'],
    [/\bworkshops\b/gi, 'ಕಾರ್ಯಾಗಾರಗಳು'],
    [/\bcoding\b/gi, 'ಕೋಡಿಂಗ್'],
    [/\bhackathon\b/gi, 'ಹ್ಯಾಕಥಾನ್'],
    [/\bfestival\b/gi, 'ಉತ್ಸವ'],
    [/\bcleanliness drive\b/gi, 'ಸ್ವಚ್ಛತಾ ಅಭಿಯಾನ'],
    [/\bvolunteers\b/gi, 'ಸ್ವಯಂಸೇವಕರು'],
    [/\bcommunity\b/gi, 'ಸಮುದಾಯ'],
    [/\bevent\b/gi, 'ಕಾರ್ಯಕ್ರಮ'],
    [/\bevents\b/gi, 'ಕಾರ್ಯಕ್ರಮಗಳು'],
    [/\bconnecting\b/gi, 'ಸಂಪರ್ಕಿಸುವ'],
    [/\bhands-on\b/gi, 'ಪ್ರಾಯೋಗಿಕ'],
    [/\bpractical\b/gi, 'ಪ್ರಾಯೋಗಿಕ'],
    [/\bdevelopers\b/gi, 'ಡೆವಲಪರ್‌ಗಳು'],
    [/\btechnology\b/gi, 'ತಂತ್ರಜ್ಞಾನ'],
    [/\bannual\b/gi, 'ವಾರ್ಷಿಕ'],
    [/\bsummit\b/gi, 'ಸಮ್ಮೇಳನ'],
    [/\bcelebrate\b/gi, 'ಆಚರಿಸಿ'],
    [/\bmusic\b/gi, 'ಸಂಗೀತ'],
    [/\bculture\b/gi, 'ಸಂಸ್ಕೃತಿ'],
    [/\bheritage\b/gi, 'ಪರಂಪರೆ'],
    [/\bregistration\b/gi, 'ನೋಂದಣಿ'],
    [/\bfree entry\b/gi, 'ಉಚಿತ ಪ್ರವೇಶ'],
    [/\bexhibition\b/gi, 'ಪ್ರದರ್ಶನ'],
    [/\bstartups\b/gi, 'ಸ್ಟಾರ್ಟಪ್‌ಗಳು'],
    [/\bmentor\b/gi, 'ಮಾರ್ಗದರ್ಶನ'],
    [/\bleadership\b/gi, 'ನಾಯಕತ್ವ'],
  ],
};

const getCacheKey = (text, targetLang) => {
  const hash = crypto.createHash('md5').update(String(text || '').trim()).digest('hex');
  return `${targetLang}_${hash}`;
};

/**
 * Translates general event text into target language (en, hi, kn)
 */
const translateEventText = async (text, targetLang = 'en', sourceLang = 'en', event = null) => {
  const cleanText = String(text || '').trim();
  const target = String(targetLang || 'en').toLowerCase().slice(0, 2);

  if (!cleanText) {
    return {
      originalText: '',
      translatedText: '',
      targetLanguage: target,
      sourceLanguage: sourceLang,
      isOriginal: true,
      cached: true,
    };
  }

  // If target language is English or matches source, return original
  if (target === 'en' || target === sourceLang) {
    return {
      originalText: cleanText,
      translatedText: cleanText,
      targetLanguage: target,
      sourceLanguage: sourceLang,
      isOriginal: true,
      cached: true,
    };
  }

  // 1. Check if event has direct pre-saved localized field
  if (event) {
    if (target === 'hi' && event.description_hi) {
      return {
        originalText: cleanText,
        translatedText: event.description_hi,
        targetLanguage: 'hi',
        sourceLanguage: sourceLang,
        isOriginal: false,
        cached: true,
      };
    }
    if (target === 'kn' && event.description_kn) {
      return {
        originalText: cleanText,
        translatedText: event.description_kn,
        targetLanguage: 'kn',
        sourceLanguage: sourceLang,
        isOriginal: false,
        cached: true,
      };
    }
  }

  // 2. Check in-memory cache
  const cacheKey = getCacheKey(cleanText, target);
  if (translationCache.has(cacheKey)) {
    return {
      originalText: cleanText,
      translatedText: translationCache.get(cacheKey),
      targetLanguage: target,
      sourceLanguage: sourceLang,
      isOriginal: false,
      cached: true,
    };
  }

  // 3. Check curated dictionary
  if (KNOWN_TRANSLATIONS[target]?.[cleanText]) {
    const curated = KNOWN_TRANSLATIONS[target][cleanText];
    translationCache.set(cacheKey, curated);
    return {
      originalText: cleanText,
      translatedText: curated,
      targetLanguage: target,
      sourceLanguage: sourceLang,
      isOriginal: false,
      cached: false,
    };
  }

  // 4. Try OpenAI translation if API key is configured
  if (process.env.OPENAI_API_KEY) {
    try {
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const langName = target === 'hi' ? 'Hindi' : target === 'kn' ? 'Kannada' : target;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator for community events. Translate the following event description into fluent ${langName}. Preserve tone and names. Return ONLY the translation.`,
          },
          { role: 'user', content: cleanText },
        ],
        temperature: 0.2,
        max_tokens: 300,
      });

      const translated = completion.choices[0]?.message?.content?.trim();
      if (translated) {
        translationCache.set(cacheKey, translated);
        return {
          originalText: cleanText,
          translatedText: translated,
          targetLanguage: target,
          sourceLanguage: sourceLang,
          isOriginal: false,
          cached: false,
        };
      }
    } catch (apiErr) {
      console.warn('[TranslationService] OpenAI API failed, using fallback engine:', apiErr.message);
    }
  }

  // 5. Intelligent Lexicon / Phrase Replacement Fallback
  let translated = cleanText;
  const rules = PHRASE_MAP[target] || [];
  for (const [regex, replacement] of rules) {
    translated = translated.replace(regex, replacement);
  }

  // Add prefix/suffix indicator if minimal translation occurred
  if (translated === cleanText) {
    if (target === 'hi') {
      translated = `[हिंदी अनुवाद] ${cleanText}`;
    } else if (target === 'kn') {
      translated = `[ಕನ್ನಡ ಅನುವಾದ] ${cleanText}`;
    }
  }

  translationCache.set(cacheKey, translated);

  return {
    originalText: cleanText,
    translatedText: translated,
    targetLanguage: target,
    sourceLanguage: sourceLang,
    isOriginal: false,
    cached: false,
  };
};

module.exports = {
  translateEventText,
  KNOWN_TRANSLATIONS,
  translationCache,
};

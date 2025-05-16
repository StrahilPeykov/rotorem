export default {
  defaultLocale: 'bg',
  locales: [
    {
      locale: 'bg',
      name: 'Български',
      dir: 'ltr',
    },
    {
      locale: 'en',
      name: 'English',
      dir: 'ltr',
    }
  ],
  routingStrategy: 'prefix-other-locales',
  routes: {
    'bg': {
      'services': 'услуги',
      'reviews': 'отзиви',
      'contact': 'контакти',
      'book': 'запазете-час',
      'thankyou': 'благодарим',
    }
  }
};
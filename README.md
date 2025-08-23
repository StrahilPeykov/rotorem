# RotoRem Varna - Professional Appliance Repair Service

A modern, responsive website for RotoRem Varna, a professional appliance repair service based in Varna, Bulgaria. Built with Astro, TypeScript, and Tailwind CSS.

## About RotoRem

RotoRem provides professional in-home appliance repair services throughout Varna and surrounding areas (up to 20km radius). We specialize in:

- **Washing Machines & Dryers** - All major brands
- **Dishwashers** - Professional repair and maintenance
- **Ovens & Cooktops** - Electric appliance specialists
- **Electrical Services** - Certified electrical work

**Key Features:**
- Same-day repair service
- In-home service (no need to transport heavy appliances)
- 30 BGN (15,32 €) diagnostic fee
- Professional warranty on all repairs
- Serving all Varna neighborhoods

## Tech Stack

- **Framework:** [Astro 5.7.13](https://astro.build/)
- **Styling:** [Tailwind CSS 3.4.17](https://tailwindcss.com/) + [DaisyUI 5.0.35](https://daisyui.com/)
- **Language:** TypeScript
- **Internationalization:** Custom i18n solution (Bulgarian/English)
- **Deployment:** Netlify
- **Analytics:** Google Analytics 4
- **Package Manager:** pnpm

## Features

### Multi-language Support
- **Bulgarian** (default) - Primary market
- **English** - International visitors
- SEO-optimized URLs for both languages

### Performance Optimized
- Static site generation with Astro
- Optimized images (WebP/AVIF support)
- Minimal JavaScript bundle
- Service worker for offline capabilities
- Web Vitals monitoring

### Business Features
- **Online Booking System** - Integrated with Google Sheets
- **Service Area Coverage** - Interactive map showing service areas
- **Customer Reviews** - Testimonials and Google Reviews integration
- **FAQ Section** - Common questions and answers
- **Contact Forms** - Multiple ways to reach the business

### SEO & Analytics
- Structured data (LocalBusiness schema)
- Meta tags optimization
- Sitemap generation
- Google Analytics 4 integration
- Search engine friendly URLs

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Hero.astro
│   ├── Services.astro
│   ├── Contact.astro
│   ├── FAQ.astro
│   └── ...
├── layouts/            # Page layouts
│   └── Base.astro
├── pages/              # File-based routing
│   ├── index.astro     # Homepage (Bulgarian)
│   ├── en/             # English pages
│   ├── services/       # Service-specific pages
│   ├── blog/           # Blog section
│   └── ...
├── i18n/               # Internationalization
│   ├── ui.ts           # Translation strings
│   └── utils.ts        # i18n utilities
└── netlify/            # Netlify functions
    └── functions/
```

## 🛠️ Development

### Prerequisites
- Node.js 18+ 
- pnpm 8+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd rotorem-varna

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Available Scripts

```bash
pnpm dev        # Start development server (localhost:4321)
pnpm build      # Build for production
pnpm preview    # Preview production build
pnpm format     # Format code with Biome
pnpm lint       # Lint code with Biome
pnpm report     # Generate Lighthouse report
```

### Environment Variables

Create a `.env` file with:

```env
PUBLIC_GA_MEASUREMENT_ID=your_ga_id
PUBLIC_GOOGLE_SCRIPT_URL=your_google_apps_script_url
NETLIFY_AUTH_TOKEN=your_netlify_token
NETLIFY_SITE_ID=your_site_id
```

## Deployment

The site is configured for automatic deployment on Netlify:

1. **Build Command:** `pnpm install --no-frozen-lockfile && pnpm build`
2. **Publish Directory:** `dist`
3. **Environment Variables:** Set in Netlify dashboard

### Google Sheets Integration

The booking system integrates with Google Sheets via Google Apps Script:
- Form submissions are stored in a Google Sheet
- Real-time availability checking
- Email notifications for new bookings

## Service Areas

RotoRem serves the following areas in Varna, Bulgaria:
- **City Center** (Център)
- **Chayka** (Чайка)
- **Mladost** (Младост)
- **Asparuhovo** (Аспарухово)
- **Levski** (Левски)
- **Vladislav Varnenchik** (Владислав Варненчик)
- **Galata** (Галата)

## Contact Information

- **Phone:** +359 89 834 0982
- **Email:** n.ivanov.ivanov@abv.bg
- **Service Area:** Varna + 20km radius
- **Working Hours:** Monday-Friday 8:00-17:00

## Contributing

This is a commercial website for RotoRem Varna. For any issues or suggestions, please contact the development team.

## License

© 2025 RotoRem Varna. All rights reserved.

---

**Built with ❤️ for the people of Varna, Bulgaria**

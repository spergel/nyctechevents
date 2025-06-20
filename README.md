# NYC Events & Communities

A website that aggregates and displays NYC tech events, communities, and locations. Built with Next.js 15 and powered by a Python scraper system that collects events from multiple sources.

🌆 **Live Site**: [https://nycevents.vercel.app](https://nycevents.vercel.app)

## 🚀 Features

### Frontend (Next.js)
- **Modern UI**: Clean interface with interactive displays
- **Event Discovery**: Browse upcoming tech events with filtering and search
- **Community Directory**: Explore NYC tech communities and their locations
- **Interactive Maps**: Location-based event discovery
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Events automatically updated via GitHub Actions

### Backend (Python Scraper)
- **Multi-Source Aggregation**: Collects events from 8+ different sources
- **Smart Categorization**: AI-powered event categorization using keyword matching
- **Deduplication**: Intelligent merging of duplicate events across sources
- **Twitter Integration**: Automated tweet generation and posting
- **Scheduled Updates**: Daily automated scraping via GitHub Actions

## 🏗️ Architecture

```
nycevents/
├── app/                    # Next.js frontend application
│   ├── components/ui/      # Reusable UI components
│   ├── events/            # Events page
│   ├── communities/       # Communities page
│   ├── locations/         # Locations page
│   └── types/             # TypeScript type definitions
├── scraper/               # Python backend scraper
│   ├── scrapers/          # Individual scraper modules
│   ├── data/              # Generated data files
│   └── tweets/            # Tweet generation
├── public/data/           # Static data files
└── .github/workflows/     # GitHub Actions automation
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **Mapbox GL** - Interactive maps
- **Vercel Analytics** - Performance monitoring

### Backend
- **Python 3.10+** - Scraping and data processing
- **Requests** - HTTP requests
- **BeautifulSoup** - HTML parsing
- **Tweepy** - Twitter API integration
- **Google Generative AI** - Tweet generation
- **GitHub Actions** - Automated workflows

## 🔧 Scraper System

The backend scraper system consists of three main components that work together to collect, process, and distribute event data:

### 1. **run_all.py** - Main Orchestrator
The central coordinator that manages the entire scraping workflow:

```bash
python -m scraper.run_all
```

**Key Features:**
- **Multi-scraper execution**: Runs all configured scrapers in parallel
- **Error handling**: Graceful failure handling with detailed logging
- **Data combination**: Merges events from multiple sources
- **Categorization pipeline**: Automatically categorizes events
- **Output management**: Generates final event files for the frontend

**Configuration:**
- Scrapers are configured in `scraper/scrapers/calendar_configs.py`
- Supports both Google Calendar and ICS calendar sources
- Easy to add new event sources

### 2. **categorize_events.py** - AI-Powered Categorization
Intelligent event categorization using keyword matching and metadata analysis:

```bash
python -m scraper.categorize_events input.json output.json
```

**Key Features:**
- **Smart categorization**: 8 predefined categories (Tech Talks, Hackathons, Networking, etc.)
- **Confidence scoring**: Each categorization includes a confidence level
- **Deduplication**: Merges duplicate events from different sources
- **Location generation**: Automatically creates location entries for venues
- **Metadata enhancement**: Adds community associations and event types

**Categories:**
- Tech Talks & Conferences
- Hackathons & Competitions
- Networking & Social
- Workshops & Training
- Startup & Entrepreneurship
- Tech Innovation
- Special Interest Tech
- Coworking & Workspace

### 3. **tweet_generator.py** - Social Media Automation
Automated tweet generation and posting for upcoming events:

```bash
python -m scraper.tweet_generator
```

**Key Features:**
- **AI-powered content**: Uses Google Gemini to generate engaging tweets
- **Thread creation**: Posts event threads with multiple events
- **Smart filtering**: Targets events 2 days in advance
- **URL shortening**: Automatically shortens event links
- **Error handling**: Graceful fallbacks for API failures

**Tweet Strategy:**
- Posts daily at 8 AM UTC
- Creates a main tweet with event count
- Replies with individual event details
- Uses AI to generate engaging descriptions
- Includes shortened event URLs

## 📋 TODO & Future Improvements

### 🔍 Better Event Information Scraping
- **Enhanced metadata extraction**: Capture more detailed event information
- **Speaker information**: Extract and store speaker names and bios
- **Event capacity**: Scrape and display event capacity limits
- **Registration details**: Better handling of registration requirements
- **Event images**: Extract and store event images/thumbnails
- **Social media links**: Capture event social media accounts
- **Contact information**: Extract organizer contact details

### 🏷️ Improved Tagging System
- **Dynamic tag generation**: AI-powered tag creation based on event content
- **Hierarchical categories**: Implement subcategories and tag relationships
- **Skill level tags**: Add beginner/intermediate/advanced classifications
- **Technology tags**: Auto-detect and tag relevant technologies (AI, Web3, etc.)
- **Industry tags**: Categorize by industry focus (fintech, healthtech, etc.)
- **Accessibility tags**: Tag events with accessibility information
- **Cost tags**: Better categorization of free/paid events
- **Time-based tags**: Morning/afternoon/evening event classifications

### 🚀 Additional Features
- **Event recommendations**: Suggest similar events to users
- **Calendar integration**: Allow users to add events to their calendars
- **Email notifications**: Send event reminders to users
- **Advanced search**: Implement full-text search with filters
- **Event analytics**: Track popular events and categories
- **API endpoints**: Create public API for event data
- **Mobile app**: Develop native mobile applications

### 🔄 Automated Workflows
- **Implement a more robust de-duplication algorithm.**
- **Add more data sources for events (e.g., Eventbrite, Meetup, specific venues).**
- **Improve the categorization of events using more sophisticated NLP techniques.**
- **Add support for more social media platforms for tweet generation.**
- **Add `https://www.nyc.gov/events/index.html`**
- **Add `https://experience.arcgis.com/experience/d826b115c87841d491c2b41fcb175305`**
- **Add `https://api-portal.nyc.gov` (official Event Calendar API)**

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- Python 3.10+
- Git

### Frontend Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/nycevents.git
cd nycevents

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Run development server
npm run dev
```

### Backend Setup
   ```bash
# Install Python dependencies
   pip install -r requirements.txt

# Set up environment variables
cp .env.example .env.local
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Google Calendar API (for event scraping)
   GOOGLE_API_KEY=your_google_api_key

# Twitter API (for automated tweets)
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret

# Gemini API (for tweet generation)
GEMINI_API_KEY=your_gemini_api_key

# Vercel (for deployment)
VERCEL_TOKEN=your_vercel_token
VERCEL_PROJECT_ID=your_project_id
VERCEL_ORG_ID=your_org_id
```

### API Key Setup

#### Google Calendar API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or use existing one
3. Enable Google Calendar API
4. Create API key in Credentials section
5. Add API key to GitHub Secrets as `GOOGLE_API_KEY`

#### Twitter API
1. Apply for Twitter API access at [developer.twitter.com](https://developer.twitter.com/)
2. Create a new app and generate API keys
3. Add keys to GitHub Secrets

#### Gemini API
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to GitHub Secrets as `GEMINI_API_KEY`

## 🚀 Deployment

### Vercel (Recommended)
The site is automatically deployed to Vercel via GitHub Actions:

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deployments happen automatically on push to main

### Manual Deployment
```bash
# Build the application
npm run build

# Deploy to Vercel
npx vercel --prod
```

## 🔄 Automated Workflows

### Daily Event Updates
The GitHub Actions workflow (`manage-events.yml`) runs daily at 8 AM UTC:

1. **Scrapes Events**: Runs all configured scrapers
2. **Processes Data**: Categorizes and deduplicates events
3. **Generates Tweets**: Creates and posts event threads
4. **Updates Repository**: Commits new data files
5. **Deploys**: Triggers Vercel deployment

### Manual Trigger
You can manually trigger the workflow from the GitHub Actions tab.

## 📊 Data Sources

The scraper collects events from:

### Calendar Sources
- **Google Calendars**: Fractal, Telos, SideQuest, NYC Resistor, etc.
- **ICS Calendars**: Luma-based community calendars
- **Pioneer Works**: Arts and technology events

### Event Aggregators
- **Gary's Guide**: NYC tech events
- **Interference Archive**: Radical events
- **Index Space**: Creative technology events
- **Fabrik**: Maker community events

### Configuration
Event sources are configured in `scraper/scrapers/calendar_configs.py`:
- Add new Google Calendar IDs
- Configure ICS calendar URLs
- Enable/disable specific scrapers

## 🎨 Customization

### Adding New Event Sources
1. Create a new scraper in `scraper/scrapers/`
2. Add configuration to `calendar_configs.py`
3. Update the `SCRAPERS` list
4. Test with `python -m scraper.run_all`

### Styling
The theme uses CSS custom properties defined in `app/globals.css`:
- `--nyc-orange`: Primary accent color
- `--terminal-color`: Terminal green
- `--nyc-white`: Text color

### Components
UI components are in `app/components/ui/`:
- `ConsoleLayout`: Main layout wrapper
- `HolographicDisplay`: Animated displays
- `CyberLink`: Styled navigation links
- `Panel`: Content containers

## 🧪 Development

### Running Scrapers Locally
```bash
# Run all scrapers
python -m scraper.run_all

# Run specific scraper
python -m scraper.scrapers.google_calendar_scraper

# Generate tweets
python -m scraper.tweet_generator
```

### Testing
```bash
# Frontend tests
npm run test

# Linting
npm run lint

# Type checking
npx tsc --noEmit
```

## 📈 Monitoring

### Analytics
- **Vercel Analytics**: Built-in performance monitoring
- **GitHub Actions**: Workflow success/failure tracking
- **Logs**: Scraper logs in `scraper.log` and `categorizer.log`

### Health Checks
- Monitor GitHub Actions workflow status
- Check Vercel deployment status
- Review scraper logs for errors

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Use conventional commit messages
- Test scrapers locally before pushing
- Update documentation for new features

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- NYC tech community for event data
- Luma for calendar infrastructure
- Vercel for hosting and deployment
- GitHub for CI/CD automation

## 📞 Support

For questions or issues:
- Open a GitHub issue
- Check the [live site](https://nycevents.vercel.app)
- Review scraper logs for debugging

---

Built with ❤️ for the NYC tech community
# 🏐 Volleyball Coach - Rotation Analysis Tool

A professional volleyball coaching application for analyzing team rotations, formations, and player positioning across different volleyball systems.

**Live App**: https://jamesfungtc-sudo.github.io/volleyball-coach-app/

![Volleyball Coach App](https://img.shields.io/badge/Status-Live-brightgreen) ![GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-blue) ![React](https://img.shields.io/badge/Built%20with-React-61dafb) ![PWA](https://img.shields.io/badge/PWA-Enabled-purple)

## 📋 Features

### ✅ **Currently Implemented**
- 🎯 **Interactive Rotation Viewer** - Navigate through all 6 rotations with Previous/Next controls
- 🏐 **Team Configuration** - Set up teams with players, systems, and starting positions
- 📊 **Dual Formation Display** - See serving and in-rally formations side-by-side
- 🔄 **Multiple Volleyball Systems** - Support for 5-1 (OH>S), 5-1 (MB>S), 4-2, and 6-2 systems
- 📱 **Responsive Design** - Optimized for iPhone, iPad, and desktop
- ⚡ **PWA Functionality** - Works offline with service worker
- 🎨 **Visual Team Differentiation** - Team A (red) vs Team B (blue) color coding
- 🏟️ **Realistic Court Layout** - Teams face each other across the net with proper positioning
- 📝 **InGame Stats (Phase 1 & 2)** - Point-by-point recording with conditional action types and live scoring

### 🚧 **In Development**
- 📊 **InGame Stats (Phase 3)** - Statistics dashboard with charts and analytics
- 🗄️ **Database Integration (Phase 4)** - Supabase backend with real-time sync

### 🚧 **Planned Features**
- 👥 **Team Management** - Player profiles and roster management
- 📈 **Advanced Analytics** - Rotation efficiency analysis

## 🏗️ Technical Architecture

### **Frontend Stack**
- **React 19** - Modern functional components with hooks
- **TypeScript** - Type-safe development for InGame Stats feature
- **React Router** - HashRouter for GitHub Pages compatibility
- **Vite 7** - Fast build tool and development server
- **Zod** - Runtime validation for forms
- **CSS3** - Responsive grid layouts and flexbox
- **PWA** - Service worker for offline functionality

### **Project Structure**
```
src/
├── components/
│   ├── layout/PageLayout.jsx          # Main page wrapper
│   └── navigation/NavigationBar.jsx   # Burger menu navigation
├── features/
│   ├── rotations/
│   │   └── components/
│   │       ├── RotationMapViewer.jsx  # Main rotation interface
│   │       └── TeamConfigPanel.jsx    # Team setup form
│   ├── inGameStats/                   # NEW: InGame Stats feature
│   │   ├── components/
│   │   │   ├── PointEntryForm.tsx     # 5-step point entry workflow
│   │   │   ├── PointByPointList.tsx   # 3-column point display
│   │   │   ├── WinLossToggle.tsx      # Win/Loss selector
│   │   │   ├── SegmentedControl.tsx   # Action type selector
│   │   │   ├── ConditionalDropdown.tsx # Subcategory/location selector
│   │   │   └── PlayerSelector.tsx     # Player selection
│   │   ├── context/
│   │   │   └── MatchContext.tsx       # Match state management
│   │   └── utils/
│   │       ├── formHelpers.ts         # Conditional logic helpers
│   │       └── formValidation.ts      # Zod validation schemas
│   └── shared/
│       └── components/
│           └── AdvancedVolleyballCourt.jsx # Court visualization
├── pages/
│   ├── RotationsPage.jsx              # Rotation viewer
│   └── StatsPage.tsx                  # NEW: InGame stats (TypeScript)
├── types/
│   └── inGameStats.types.ts           # TypeScript definitions
├── constants/
│   └── actionTypes.ts                 # Win/Loss action types structure
├── utils/
│   └── volleyballSystems.js           # Core volleyball logic
└── App.jsx                            # Main app with routing
```

### **Core Volleyball Logic** 
All volleyball rules and rotation calculations are centralized in `src/utils/volleyballSystems.js`:
- ✅ **4 Volleyball Systems** - 5-1 (OH>S), 5-1 (MB>S), 4-2, 6-2
- ✅ **6 Sequential Rotations** - Complete rotation cycle
- ✅ **Libero Substitution Rules** - Back row positions (P1, P5, P6)
- ✅ **Formation Calculations** - Serving vs in-rally positioning
- ✅ **Position Mapping** - Correct volleyball court positions

## 🚀 Deployment & GitHub Integration

### **GitHub Repository**
- **Owner**: `jamesfungtc-sudo`
- **Repo**: `volleyball-coach-app`
- **URL**: https://github.com/jamesfungtc-sudo/volleyball-coach-app

### **GitHub Pages Setup**
- **Hosting**: GitHub Pages (unlimited bandwidth)
- **Build**: GitHub Actions automated deployment
- **Base Path**: `/volleyball-coach-app/` (configured in vite.config.js)
- **Router**: HashRouter for static hosting compatibility

### **Deployment Workflow**
```yaml
# .github/workflows/deploy.yml
- Triggers on push to main branch
- Installs Node.js and dependencies
- Builds with Vite
- Deploys to GitHub Pages
- ~3-5 minute deployment time
```

## 🔧 Development & Maintenance

### **Local Development**
```bash
# Clone repository
git clone https://github.com/jamesfungtc-sudo/volleyball-coach-app.git
cd volleyball-coach-app

# Install Node.js 22+ (if needed)
# Install nvm first: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22

# Install dependencies
npm install

# Start development server
npm run dev
# → Local: http://localhost:5173/volleyball-coach-app/

# Build for production
npm run build

# Preview production build
npm run preview
```

### **Testing Locally vs Live**

**Option 1: Local Development (Recommended for testing)**
```bash
# Start dev server
npm run dev

# Open in browser
# → http://localhost:5173/volleyball-coach-app/

# Test your changes, fix bugs
# Changes appear instantly with hot reload
```

**Option 2: Live Production (After testing locally)**
```bash
# Commit and push to deploy
git add .
git commit -m "Your changes"
git push

# Wait 3-5 minutes for GitHub Actions deployment
# View live at: https://jamesfungtc-sudo.github.io/volleyball-coach-app/
```

### **Git Configuration**
```bash
# Ensure correct GitHub account
git config --global user.name "jamesfungtc-sudo"
git config --global user.email "jamesfungtc@gmail.com"

# Remote repository
git remote -v
# origin  https://github.com/jamesfungtc-sudo/volleyball-coach-app.git
```

### **Making Changes & Deployment**
```bash
# 1. Make your changes
# Edit files in src/

# 2. Test locally
npm run dev

# 3. Build and test production version
npm run build
npm run preview

# 4. Commit changes
git add .
git commit -m "Your descriptive commit message

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# 5. Push to GitHub (triggers auto-deployment)
git push https://jamesfungtc-sudo:YOUR_GITHUB_TOKEN@github.com/jamesfungtc-sudo/volleyball-coach-app.git main

# 6. Wait 3-5 minutes for GitHub Pages deployment
# Check status: https://github.com/jamesfungtc-sudo/volleyball-coach-app/actions
```

### **Authentication Tokens**
- **Token Format**: `ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **Scopes Required**: `repo`, `workflow`
- **Usage**: Push changes to repository
- **Security**: Never commit tokens to git - store securely

## 📐 Responsive Design Specifications

### **Breakpoints**
- **Mobile (≤768px)**: Vertical stacking, single column layout
- **iPad (768px-1024px)**: Side-by-side courts, optimized spacing  
- **Desktop (≥1025px)**: Full layout with sticky configuration panel

### **Court Layout**
- **Team A**: Bottom half, facing up (red circles)
- **Team B**: Top half, facing down (blue circles)
- **Positions**: Correctly oriented for volleyball (P1 server in back right)
- **Net**: Single horizontal line separating teams

## 🐛 Troubleshooting

### **Common Issues**

**1. Blank Page/Not Loading**
- Check GitHub Actions deployment status
- Verify HashRouter is used (not BrowserRouter)
- Clear browser cache with hard refresh (Ctrl+F5)

**2. JavaScript Bundle Not Loading**
- Verify base path in vite.config.js: `base: '/volleyball-coach-app/'`
- Check asset paths in built index.html

**3. Authentication Issues**
- Ensure GitHub token has `repo` and `workflow` permissions
- Use format: `git push https://username:token@github.com/...`

**4. Responsive Design Issues**
- Test on different devices and orientations
- Check CSS media queries in component files

## 📊 Performance Metrics

- **Bundle Size**: ~257KB total (with TypeScript InGame Stats)
- **Load Time**: <2 seconds on good connection
- **Lighthouse Score**: PWA optimized
- **Offline Capability**: Service worker enabled
- **Node.js Required**: v20.19+ or v22.12+ (v22.20.0 recommended)

## 🔮 InGame Stats Development Roadmap

### **✅ Phase 1: Foundation (Complete)**
- TypeScript type definitions
- ACTION_TYPES constant with exact OldTool structure
- Match state management with Context API
- Form validation with Zod

### **✅ Phase 2: Point Entry UI (Complete)**
- 5-step point entry workflow
- Conditional rendering (Win/Loss → Category → Subcategory → Location/Tempo → Player)
- Point-by-point list with 3-column layout
- Live scoring and undo functionality
- iPad-optimized touch targets

### **🚧 Phase 3: Statistics Dashboard (In Progress)**
- Summary statistics (3 key metrics)
- 8 analytical charts (Chart.js):
  - Hit vs Ace Ratio (Home & Opponent)
  - Attack K/D Efficiency (Home & Opponent)
  - Kill Zones by Player (Home & Opponent)
  - Attack Positions (Home & Opponent)
- View toggle between point list and statistics

### **🚧 Phase 4: Database Integration (Planned)**
- Supabase/PostgreSQL backend
- Real-time point synchronization
- Offline-first with IndexedDB
- Match history and data persistence

### **🔮 Future Enhancements**
- Player performance tracking across matches
- Rotation effectiveness metrics
- Heat maps for player positions
- Export data to CSV/PDF
- Multiple team support

## 📝 Development History

### **Key Milestones**
1. **Initial Development** - React app with volleyball rotation logic
2. **Multi-page Architecture** - Added navigation and routing
3. **Rotation Viewer** - Interactive single-rotation interface
4. **GitHub Pages Migration** - Moved from Netlify for unlimited bandwidth
5. **Mobile Optimization** - iPad/iPhone responsive design
6. **Team Positioning** - Correct volleyball court orientation
7. **TypeScript Migration** - Added TypeScript for InGame Stats feature
8. **InGame Stats Phase 1 & 2** - Point entry system with conditional logic (2025-10-02)

### **Technical Documentation**
- **[IMPLEMENTATION_PLAN_InGameStats.md](IMPLEMENTATION_PLAN_InGameStats.md)** - Complete implementation plan for InGame Stats feature
- **[QUICK_START_InGameStats.md](QUICK_START_InGameStats.md)** - Quick reference for developers
- **[ARCHITECTURE_DIAGRAM_InGameStats.md](ARCHITECTURE_DIAGRAM_InGameStats.md)** - Visual system architecture
- **[MANUAL_TESTING_CHECKLIST.md](MANUAL_TESTING_CHECKLIST.md)** - 60+ test cases for quality assurance
- **[OldTool/](OldTool/)** - Original Retool app analysis and documentation

### **Technical Debt**
- Unit tests needed for InGame Stats components and utilities
- Phase 3 (Statistics Dashboard) implementation pending
- Phase 4 (Database integration) design complete, implementation pending

---

**Built with ❤️ for volleyball coaches everywhere**

🤖 *Generated with [Claude Code](https://claude.ai/code)*

*Co-Authored-By: Claude <noreply@anthropic.com>*

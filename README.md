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

### 🚧 **Planned Features (Coming Soon Pages)**
- 📊 **Team Statistics** - Performance analytics and metrics
- 📈 **Advanced Analytics** - Rotation efficiency analysis
- 👥 **Team Management** - Player profiles and roster management

## 🏗️ Technical Architecture

### **Frontend Stack**
- **React 18** - Modern functional components with hooks
- **React Router** - HashRouter for GitHub Pages compatibility
- **Vite** - Fast build tool and development server
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
│   └── shared/
│       └── components/
│           └── AdvancedVolleyballCourt.jsx # Court visualization
├── pages/                             # Route components
├── utils/
│   └── volleyballSystems.js          # Core volleyball logic
└── App.jsx                           # Main app with routing
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

# Install dependencies
npm install

# Start development server
npm run dev
# → http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
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

- **Bundle Size**: ~245KB total (optimized)
- **Load Time**: <2 seconds on good connection
- **Lighthouse Score**: PWA optimized
- **Offline Capability**: Service worker enabled

## 🔮 Future Enhancements

### **Phase 1: Statistics**
- Player performance tracking
- Rotation effectiveness metrics
- Match analysis tools

### **Phase 2: Advanced Analytics**
- Heat maps for player positions
- Success rate analysis by formation
- Export data to CSV/PDF

### **Phase 3: Team Management**
- Player profiles and stats
- Multiple team support
- Save/load configurations

## 📝 Development History

### **Key Milestones**
1. **Initial Development** - React app with volleyball rotation logic
2. **Multi-page Architecture** - Added navigation and routing
3. **Rotation Viewer** - Interactive single-rotation interface
4. **GitHub Pages Migration** - Moved from Netlify for unlimited bandwidth
5. **Mobile Optimization** - iPad/iPhone responsive design
6. **Team Positioning** - Correct volleyball court orientation

### **Technical Debt**
- Coming soon pages need full implementation
- Consider adding unit tests for volleyball logic
- Potential migration to TypeScript for better type safety

---

**Built with ❤️ for volleyball coaches everywhere**

🤖 *Generated with [Claude Code](https://claude.ai/code)*

*Co-Authored-By: Claude <noreply@anthropic.com>*

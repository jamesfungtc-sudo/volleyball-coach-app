# Claude Code Agents for Volleyball Coach App

This directory contains specialized Claude Code agents tailored for developing and maintaining the Volleyball Coach application.

## Available Agents

### 1. **frontend-developer** 🎨
**Use for:** Building React components, implementing responsive layouts, client-side state management

**Capabilities:**
- React 19+ features including Actions, Server Components
- Next.js 15+ App Router (if needed in future)
- Performance optimization (React.memo, useMemo, useCallback)
- Modern state management (Zustand, Jotai, Valtio, React Query)
- Tailwind CSS and CSS-in-JS styling
- Accessibility (WCAG compliance, ARIA patterns)
- Testing with React Testing Library

**When to use:**
- Building new pages (Statistics, Analytics, Teams)
- Creating reusable UI components
- Optimizing rendering performance
- Implementing responsive designs for iPad/mobile

---

### 2. **ui-ux-designer** 🎯
**Use for:** Interface design, user experience optimization, design systems

**Capabilities:**
- Design systems and atomic design methodology
- Accessibility-first design (WCAG 2.1/2.2 compliance)
- User research and journey mapping
- Responsive design and mobile-first approaches
- Color systems and typography
- Interaction design and micro-animations

**When to use:**
- Designing new features or pages
- Improving user experience and navigation
- Creating consistent design patterns
- Optimizing for iPad coaching workflows

---

### 3. **test-automator** ✅
**Use for:** Test automation, quality assurance, TDD workflows

**Capabilities:**
- Test-Driven Development (TDD) with red-green-refactor cycles
- Vitest/Jest test framework setup
- React Testing Library for component testing
- API testing and integration testing
- Performance testing and load testing
- CI/CD pipeline integration

**When to use:**
- Setting up test infrastructure
- Writing unit tests for volleyball logic
- Component testing for React components
- Implementing TDD workflows
- Performance and regression testing

---

### 4. **performance-engineer** ⚡
**Use for:** Performance optimization, monitoring, scalability

**Capabilities:**
- Core Web Vitals optimization (LCP, FID, CLS)
- Bundle size optimization and code splitting
- Caching strategies (application, CDN, browser)
- Load testing and scalability analysis
- Real User Monitoring (RUM) and APM
- Database query optimization

**When to use:**
- Optimizing app performance (currently displays 24 courts)
- Reducing bundle size and load times
- Implementing caching strategies
- Setting up performance monitoring
- Optimizing for offline PWA functionality

---

### 5. **data-scientist** 📊
**Use for:** Data visualization, analytics, statistics features

**Capabilities:**
- Data analysis and statistical modeling
- Chart libraries (D3.js, Chart.js, Plotly)
- Machine learning for player/team insights
- Data visualization best practices
- Dashboard design and KPI tracking
- Python/R data processing (if needed)

**When to use:**
- Building attack heatmaps (Phase 2 roadmap)
- Creating statistics dashboards
- Implementing performance analytics
- Player performance tracking
- Data-driven coaching insights

---

## How to Use These Agents

### In Claude Code CLI
```bash
# General syntax
@agent-name your request here

# Examples:
@frontend-developer Build a statistics tracking component for volleyball matches
@ui-ux-designer Design the in-game stats page layout for iPad
@test-automator Write tests for the volleyball rotation calculations
@performance-engineer Optimize the court rendering for 24 simultaneous courts
@data-scientist Create a heatmap visualization for attack positions
```

### Best Practices

1. **Use agents proactively** - They are designed to be called when working on related tasks
2. **Combine agents** - Use multiple agents for complex features (e.g., ui-ux-designer + frontend-developer)
3. **Specify context** - Provide details about your volleyball app when asking
4. **Reference existing code** - Point agents to current implementation patterns

### Project-Specific Context

When using these agents, provide this context:
- **Tech Stack:** React 19, Vite, React Router, PWA
- **Current Features:** Rotation visualization, 4 volleyball systems support
- **Roadmap:** Statistics tracking, heatmaps, team management
- **Target Device:** Primarily iPad for in-game coaching
- **Design:** Responsive, mobile-first, offline-capable

## Agent Source

These agents are sourced from [wshobson/agents](https://github.com/wshobson/agents) - a production-ready collection of Claude Code subagents.

## Customization

You can customize these agents by:
1. Editing the `.md` files directly
2. Adding project-specific knowledge
3. Adjusting the behavioral traits for your needs
4. Creating new agents based on these templates

---

**Built for the Volleyball Coach App** 🏐

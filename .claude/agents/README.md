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

### 6. **architect-review** 🏗️ ⭐ (BEST FOR LOGIC & PURPOSE ANALYSIS)
**Use for:** Understanding system design rationale, architectural decisions, and logical reasoning

**Capabilities:**
- Clean Architecture and Domain-Driven Design (DDD) analysis
- Microservices and distributed systems evaluation
- SOLID principles and design pattern assessment
- Service boundaries and bounded context analysis
- **Evaluates if code implementation matches intended business purpose**
- Identifies architectural violations and anti-patterns
- Assesses scalability and maintainability implications
- Reviews configuration and infrastructure decisions

**When to use:**
- **Analyzing OldTool files to understand system design rationale**
- Understanding why architectural decisions were made
- Evaluating if current implementation serves business needs
- Reviewing service boundaries and domain logic
- Assessing technical debt and refactoring opportunities
- Planning system evolution and migrations

---

### 7. **business-analyst** 💼 ⭐ (BEST FOR USER VALUE ANALYSIS)
**Use for:** Understanding user value, business impact, and strategic purpose

**Capabilities:**
- **Connects technical features to business outcomes and user value**
- KPI framework development and success metrics
- Customer and market analytics
- Data storytelling and executive insights
- ROI analysis and business impact assessment
- **Evaluates "why does this feature exist?" and "what value does it provide?"**
- Strategic recommendations based on business objectives
- Financial modeling and customer lifecycle analysis

**When to use:**
- **Analyzing OldTool to understand coaching workflow value**
- Understanding what problems the app solves for users
- Evaluating feature priorities based on user impact
- Assessing if implementation delivers intended value
- Planning roadmap based on business outcomes
- Identifying gaps between user needs and current features

---

### 8. **code-reviewer** 🔍
**Use for:** Comprehensive code quality, security, and multi-language analysis

**Capabilities:**
- AI-powered code analysis with modern tools
- Security vulnerability detection (OWASP Top 10)
- Performance optimization and scalability review
- Configuration and infrastructure review
- **Multi-language support (JavaScript, Python, Java, Go, etc.)**
- Database query optimization
- Test coverage and code quality metrics
- Production reliability and error handling

**When to use:**
- **Reviewing OldTool code files (RTF, JSON) for technical quality**
- Security audits and vulnerability assessment
- Performance bottleneck identification
- Code quality and maintainability review
- Legacy code analysis before migration
- Production deployment readiness checks

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

# NEW: Analysis agents for understanding OldTool
@architect-review Analyze the OldTool system design and explain the logical reasoning behind its architecture
@business-analyst Review OldTool and explain what user value it provides for volleyball coaches
@code-reviewer Review the OldTool code for quality, security, and migration considerations
```

### Recommended Workflow for Analyzing OldTool

For comprehensive understanding of your OldTool system, use this sequence:

1. **Start with business-analyst** - Understand WHAT user value it provides and WHY it exists
2. **Then use architect-review** - Understand HOW the system is designed and the logical reasoning
3. **Finally use code-reviewer** - Understand technical quality and migration considerations

Example:
```bash
# Step 1: Understand user value and purpose
@business-analyst Review the files in OldTool/ directory and explain:
- What problems does this app solve for volleyball coaches?
- What is the core user value and workflow?
- What features are most critical for users?

# Step 2: Understand architectural design and logic
@architect-review Analyze the OldTool/ files and explain:
- What is the system architecture and design rationale?
- How do the components work together?
- What are the key design decisions and why were they made?

# Step 3: Understand technical implementation
@code-reviewer Review the OldTool/ code files and assess:
- Code quality and technical patterns used
- Security considerations and potential vulnerabilities
- What needs attention when migrating to the new React app?
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

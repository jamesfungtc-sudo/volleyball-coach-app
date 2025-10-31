# Development Guidelines

## Common Issues and Best Practices

### 1. React Infinite Re-render Loop Prevention

**Problem:** Calling functions that return new object/array references outside of useEffect and using their result as a dependency causes infinite re-render loops, which can block React Router navigation and freeze the application.

**Example of BAD code:**
```tsx
const MyComponent = () => {
  const { getData } = useContext(SomeContext);

  // ❌ BAD: Called outside useEffect
  const data = getData();

  useEffect(() => {
    // This will cause infinite loop because data is a new reference each render
    doSomething(data);
  }, [data]);

  return <div>{/* ... */}</div>;
};
```

**Example of GOOD code:**
```tsx
const MyComponent = () => {
  const { getData } = useContext(SomeContext);

  // ✅ GOOD: Call getData inside useEffect
  useEffect(() => {
    const data = getData();
    doSomething(data);
  }, [getData]); // Or use specific state dependencies

  // ✅ GOOD: Or call in render if needed for display only
  const data = getData();

  return <div>{data.map(/* ... */)}</div>;
};
```

**Symptoms:**
- Browser console error: "Maximum update depth exceeded"
- Page freezes or becomes unresponsive
- Unable to navigate away from the page using React Router
- High CPU usage

**Solution:**
1. Move function calls that return objects/arrays inside useEffect
2. Use specific state values as dependencies instead of derived data
3. If you need the data in render, call the function directly in the return statement or just before it (not before useEffect that depends on it)

**Real Example from this project:**
```tsx
// ❌ BEFORE (OpponentAnalysis/EventEntryWorkflow.tsx)
export const EventEntryWorkflow = () => {
  const { getCurrentEvents } = useOpponentAnalysis();

  const currentEvents = getCurrentEvents(); // Called outside useEffect

  useEffect(() => {
    currentEvents.forEach(/* ... */); // Uses currentEvents
    setRecentPlayers(/* ... */);
  }, [currentEvents]); // currentEvents is a new array reference every render!

  return <CourtGrid events={currentEvents} />;
};

// ✅ AFTER (Fixed)
export const EventEntryWorkflow = () => {
  const { state, getCurrentEvents } = useOpponentAnalysis();

  useEffect(() => {
    const currentEvents = getCurrentEvents(); // Called inside useEffect
    currentEvents.forEach(/* ... */);
    setRecentPlayers(/* ... */);
  }, [state.events, state.selectedSet, state.selectedEventType, getCurrentEvents]);

  const currentEvents = getCurrentEvents(); // Safe to call here for render

  return <CourtGrid events={currentEvents} />;
};
```

### 2. Service Worker Cache Issues (PWA)

**Problem:** Service workers cache content in development mode, causing stale content to be served even after code changes.

**Symptoms:**
- Code changes don't appear in the browser
- Old version of pages continue to show
- Navigation routes to new pages but shows old content

**Solution:**
1. **During development:**
   - Open Browser DevTools (F12)
   - Go to Application tab → Service Workers
   - Click "Unregister" for all service workers
   - Go to Application tab → Cache Storage
   - Delete all caches
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

2. **To prevent in development:**
   - Consider disabling service worker in dev mode in `vite.config.js`:
   ```javascript
   VitePWA({
     registerType: 'autoUpdate',
     devOptions: {
       enabled: false  // Disable SW in dev mode
     }
   })
   ```

3. **Clear dev-dist folder:**
   ```bash
   rm -rf dev-dist/
   ```

### 3. PageLayout Best Practices

**Pattern:** All pages should use the `PageLayout` component wrapper for consistent structure and proper React Router mounting/unmounting.

**Example:**
```tsx
import PageLayout from '../components/layout/PageLayout';

function MyPage() {
  return (
    <PageLayout
      title="Page Title"           // Optional - omit to hide header
      subtitle="Page description"  // Optional
      className="my-page"          // Page-specific class
    >
      {/* Page content */}
    </PageLayout>
  );
}
```

**Note:** PageLayout conditionally renders the header only if `title` prop is provided.

## Checklist Before Committing

- [ ] No "Maximum update depth exceeded" errors in console
- [ ] All useEffect hooks have correct dependency arrays
- [ ] Functions returning objects/arrays are not called outside useEffect if used as dependencies
- [ ] Service worker cache cleared if testing PWA features
- [ ] Navigation between all pages works correctly
- [ ] No console errors or warnings

## Testing Navigation

After making changes to page components:

1. Navigate to the changed page
2. Try navigating to at least 2 other pages
3. Navigate back to the changed page
4. Check browser console for errors
5. Verify no "Maximum update depth exceeded" errors

## Getting Help

If you encounter the "Maximum update depth exceeded" error:

1. Check the component file and line number in the error message
2. Look for `useEffect` hooks in that component
3. Find any function calls happening before the useEffect
4. Check if those function calls return objects/arrays
5. Move the function calls inside the useEffect or remove them from dependencies

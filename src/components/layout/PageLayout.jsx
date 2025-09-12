import './PageLayout.css'

function PageLayout({ 
  title, 
  subtitle, 
  children, 
  className = '',
  headerClassName = '',
  contentClassName = '' 
}) {
  return (
    <div className={`page-layout ${className}`}>
      <header className={`page-header ${headerClassName}`}>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </header>
      
      <main className={`page-content ${contentClassName}`}>
        {children}
      </main>
    </div>
  )
}

export default PageLayout
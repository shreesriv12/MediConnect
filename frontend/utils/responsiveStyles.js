// Responsive Tailwind utility classes for consistent breakpoints across the app
// Mobile-first: base styles for mobile, then sm: (640px), md: (768px), lg: (1024px), xl: (1280px)

export const responsiveClasses = {
  // Layout classes
  mainContainer: 'flex flex-col sm:flex-row h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
  sidebar: 'w-full sm:w-80 lg:w-96 bg-white/90 backdrop-blur-xl border-b sm:border-r border-slate-200/60 shadow-2xl overflow-hidden flex flex-col',
  mainContent: 'flex-1 flex flex-col overflow-hidden',
  
  // Text sizing (mobile-first)
  heading1: 'text-2xl sm:text-3xl md:text-4xl font-bold',
  heading2: 'text-xl sm:text-2xl font-bold',
  heading3: 'text-lg sm:text-xl font-semibold',
  
  heading1Responsive: 'text-xl sm:text-2xl md:text-3xl font-bold',
  heading2Responsive: 'text-lg sm:text-xl md:text-2xl font-bold',
  heading3Responsive: 'text-base sm:text-lg font-semibold',
  
  bodyText: 'text-xs sm:text-sm md:text-base',
  smallText: 'text-xs sm:text-xs md:text-sm',
  
  // Padding/Margin (mobile-first)
  sectionPadding: 'p-3 sm:p-4 md:p-6',
  cardPadding: 'p-2 sm:p-3 md:p-4',
  spacing: 'space-y-2 sm:space-y-3 md:space-y-4',
  
  // Button sizing
  buttonSmall: 'px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm',
  buttonMedium: 'px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base',
  buttonLarge: 'px-4 sm:px-6 py-2.5 sm:py-3 text-base sm:text-lg',
  
  // Icon sizing
  iconSmall: 'w-4 sm:w-5 h-4 sm:h-5',
  iconMedium: 'w-5 sm:w-6 h-5 sm:h-6',
  iconLarge: 'w-6 sm:w-8 h-6 sm:h-8',
  
  // Avatar sizing
  avatarSmall: 'w-8 sm:w-10 h-8 sm:h-10',
  avatarMedium: 'w-10 sm:w-12 h-10 sm:h-12',
  avatarLarge: 'w-12 sm:w-16 h-12 sm:h-16',
  
  // Gap/spacing between items
  gapSmall: 'gap-1 sm:gap-2',
  gapMedium: 'gap-2 sm:gap-3 md:gap-4',
  gapLarge: 'gap-3 sm:gap-4 md:gap-6',
  
  // Grid columns
  gridResponsive: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  
  // Video container
  videoContainer: 'w-full h-screen sm:h-auto sm:w-auto aspect-video',
  
  // Hide/Show based on breakpoint
  mobileOnly: 'sm:hidden',
  tabletUp: 'hidden sm:block',
  tabletOnly: 'hidden sm:block lg:hidden',
  desktopUp: 'hidden lg:block',
};

// Mobile-first responsive Tailwind classes
export const responsive = (baseClass = '', smClass = '', mdClass = '', lgClass = '') => {
  const classes = [baseClass];
  if (smClass) classes.push(`sm:${smClass}`);
  if (mdClass) classes.push(`md:${mdClass}`);
  if (lgClass) classes.push(`lg:${lgClass}`);
  return classes.join(' ');
};

// Example usage patterns:
// heading: responsiveClasses.heading2Responsive
// text: responsiveClasses.bodyText
// padding: responsiveClasses.sectionPadding
// custom: responsive('text-sm', 'text-base', 'text-lg', 'text-xl')

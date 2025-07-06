// Style constants for consistent styling across all components
export const styles = {
  // Brand colors
  primary: 'bg-purple-600 hover:bg-purple-700',
  primaryText: 'text-purple-600',
  
  // Consistent spacing
  containerPadding: 'px-4 md:px-6 lg:px-8',
  sectionSpacing: 'py-12 md:py-16 lg:py-20',
  
  // Card styles (use for all cards)
  card: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6',
  cardHover: 'hover:shadow-md transition-shadow duration-200',
  
  // Button styles (use for all buttons)
  buttonPrimary: 'bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium',
  buttonSecondary: 'bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium',
  
  // Modal styles
  modalOverlay: 'fixed inset-0 bg-black bg-opacity-50 z-50',
  modalContent: 'bg-white rounded-lg shadow-xl max-w-md w-full mx-4',
  
  // Dashboard layout
  dashboardSidebar: 'bg-gray-900 text-white w-64',
  dashboardContent: 'flex-1 bg-gray-50',
  
  // Form styles
  input: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500',
  label: 'block text-sm font-medium text-gray-700 mb-2',
  error: 'text-red-600 text-sm mt-1',
  
  // Typography
  heading1: 'text-3xl font-bold text-gray-900',
  heading2: 'text-2xl font-semibold text-gray-900',
  heading3: 'text-xl font-medium text-gray-900',
  bodyText: 'text-gray-600',
  
  // Status colors
  statusPending: 'bg-yellow-100 text-yellow-800',
  statusConfirmed: 'bg-green-100 text-green-800',
  statusCancelled: 'bg-red-100 text-red-800',
  statusCompleted: 'bg-blue-100 text-blue-800',
};

export default styles;
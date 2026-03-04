const SkeletonLoader = ({ 
  className = "",
  rows = 3,
  type = "default" 
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`card ${className}`}>
            <div className="animate-pulse">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        )

      case 'table':
        return (
          <div className={`space-y-3 ${className}`}>
            {/* Table Header */}
            <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-4 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
            
            {/* Table Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-6 gap-4 p-4 bg-white border rounded-lg">
                {Array.from({ length: 6 }).map((_, colIndex) => (
                  <div 
                    key={colIndex} 
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{ animationDelay: `${(rowIndex * 6 + colIndex) * 100}ms` }}
                  ></div>
                ))}
              </div>
            ))}
          </div>
        )

      case 'dashboard':
        return (
          <div className={`space-y-6 ${className}`}>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="card">
                  <div className="animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="card">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'form':
        return (
          <div className={`space-y-6 ${className}`}>
            <div className="card">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-24 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'list':
        return (
          <div className={`space-y-3 ${className}`}>
            {Array.from({ length: rows }).map((_, index) => (
              <div key={index} className="card">
                <div className="animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="w-16 h-6 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'timeline':
        return (
          <div className={`space-y-4 ${className}`}>
            {Array.from({ length: rows }).map((_, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1 card">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      default:
        return (
          <div className={`animate-pulse space-y-3 ${className}`}>
            {Array.from({ length: rows }).map((_, index) => (
              <div 
                key={index} 
                className="h-4 bg-gray-200 rounded"
                style={{ 
                  width: `${Math.random() * 40 + 60}%`,
                  animationDelay: `${index * 200}ms`
                }}
              ></div>
            ))}
          </div>
        )
    }
  }

  return renderSkeleton()
}

export default SkeletonLoader
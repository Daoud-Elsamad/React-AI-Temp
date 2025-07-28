import { PageWrapper } from '@/components/layout/PageWrapper';

export function DashboardPage() {
  const stats = [
    {
      name: 'Total Users',
      value: '12,543',
      change: '+12%',
      changeType: 'positive',
    },
    {
      name: 'Active Sessions',
      value: '2,847',
      change: '+5%',
      changeType: 'positive',
    },
    {
      name: 'Page Views',
      value: '45,632',
      change: '-2%',
      changeType: 'negative',
    },
    {
      name: 'Conversion Rate',
      value: '3.2%',
      change: '+0.8%',
      changeType: 'positive',
    },
  ];

  const recentActivity = [
    {
      id: 1,
      user: 'John Doe',
      action: 'Created new project',
      time: '2 hours ago',
    },
    {
      id: 2,
      user: 'Jane Smith',
      action: 'Updated profile settings',
      time: '4 hours ago',
    },
    {
      id: 3,
      user: 'Mike Johnson',
      action: 'Completed task assignment',
      time: '6 hours ago',
    },
    {
      id: 4,
      user: 'Sarah Wilson',
      action: 'Uploaded new documents',
      time: '8 hours ago',
    },
  ];

  return (
    <PageWrapper
      title="Dashboard"
      subtitle="Overview of your application metrics and activity"
    >
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(stat => (
            <div
              key={stat.name}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    stat.changeType === 'positive'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}
                >
                  {stat.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart Placeholder */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Analytics Overview
            </h3>
            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-600 dark:text-gray-400">
                  Chart placeholder
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Charts will be added in future phases
                </p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivity.map(activity => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{activity.user}</span>{' '}
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
              <div className="text-2xl mb-2">📝</div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Create Report
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate new analytics report
              </p>
            </button>
            <button className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
              <div className="text-2xl mb-2">👥</div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Manage Users
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add or modify user accounts
              </p>
            </button>
            <button className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
              <div className="text-2xl mb-2">⚙️</div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                System Settings
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure application settings
              </p>
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

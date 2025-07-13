'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Mail, 
  RefreshCw, 
  Server, 
  TrendingUp,
  Filter,
  Download,
  Search
} from 'lucide-react'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  environment: string
  services: {
    database: ServiceStatus
    email: ServiceStatus
    filesystem: ServiceStatus
    memory: ServiceStatus
    external: ServiceStatus
  }
  metadata: {
    nodeVersion: string
    platform: string
    requestId: string
  }
}

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  details?: string
  lastChecked: string
}

interface LogEntry {
  timestamp: string
  level: string
  levelName: string
  message: string
  component: string
  userId?: string
  requestId?: string
  metadata?: Record<string, any>
}

interface LogsResponse {
  success: boolean
  data: {
    logs: LogEntry[]
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

const MonitoringDashboard: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [logFilter, setLogFilter] = useState({
    level: '',
    component: '',
    search: ''
  })
  const [logLimit, setLogLimit] = useState(50)

  // Fetch health status
  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealthStatus(data)
    } catch (error) {
      console.error('Failed to fetch health status:', error)
    }
  }

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        limit: logLimit.toString(),
        offset: '0'
      })
      
      if (logFilter.level) params.append('level', logFilter.level)
      if (logFilter.component) params.append('component', logFilter.component)
      
      const response = await fetch(`/api/monitoring/logs?${params}`)
      const data: LogsResponse = await response.json()
      
      if (data.success) {
        let filteredLogs = data.data.logs
        
        // Apply search filter
        if (logFilter.search) {
          filteredLogs = filteredLogs.filter(log => 
            log.message.toLowerCase().includes(logFilter.search.toLowerCase()) ||
            log.component.toLowerCase().includes(logFilter.search.toLowerCase())
          )
        }
        
        setLogs(filteredLogs)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    }
  }

  // Refresh all data
  const refreshData = async () => {
    setRefreshing(true)
    await Promise.all([fetchHealthStatus(), fetchLogs()])
    setRefreshing(false)
  }

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchHealthStatus(), fetchLogs()])
      setLoading(false)
    }
    
    loadData()
  }, [])

  // Refresh data when filters change
  useEffect(() => {
    fetchLogs()
  }, [logFilter, logLimit])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500'
      case 'degraded': return 'bg-yellow-500'
      case 'unhealthy': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  // Get log level color
  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'debug': return 'bg-gray-500'
      case 'info': return 'bg-blue-500'
      case 'warn': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      case 'critical': return 'bg-red-700'
      default: return 'bg-gray-500'
    }
  }

  // Export logs
  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Level', 'Component', 'Message', 'User ID', 'Request ID'],
      ...logs.map(log => [
        log.timestamp,
        log.levelName,
        log.component,
        log.message,
        log.userId || '',
        log.requestId || ''
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading monitoring data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Monitoring</h1>
        <Button 
          onClick={refreshData} 
          disabled={refreshing}
          className="bg-primary hover:bg-primary/90"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthStatus && (
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(healthStatus.status)}`} />
                  <span className="capitalize font-medium">{healthStatus.status}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Uptime: {Math.floor(healthStatus.uptime / 3600)}h {Math.floor((healthStatus.uptime % 3600) / 60)}m
                </div>
                <div className="text-sm text-gray-600">
                  Version: {healthStatus.version}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Server className="h-5 w-5 mr-2" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthStatus && (
              <div className="space-y-2">
                {Object.entries(healthStatus.services).map(([key, service]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(service.status)}`} />
                      <span className="text-sm capitalize">{key}</span>
                    </div>
                    {service.responseTime && (
                      <span className="text-xs text-gray-500">
                        {service.responseTime}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Logs</span>
                <span className="text-sm font-medium">{logs.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Errors</span>
                <span className="text-sm font-medium text-red-600">
                  {logs.filter(l => l.levelName === 'ERROR').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Warnings</span>
                <span className="text-sm font-medium text-yellow-600">
                  {logs.filter(l => l.levelName === 'WARN').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Details */}
      {healthStatus && healthStatus.status !== 'healthy' && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">System Health Issues Detected</div>
            <div className="mt-2 space-y-1">
              {Object.entries(healthStatus.services)
                .filter(([_, service]) => service.status !== 'healthy')
                .map(([key, service]) => (
                  <div key={key} className="text-sm">
                    <span className="font-medium capitalize">{key}:</span> {service.details}
                  </div>
                ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Log Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Log Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="level">Log Level</Label>
              <select
                id="level"
                className="w-full mt-1 p-2 border rounded-md"
                value={logFilter.level}
                onChange={(e) => setLogFilter({ ...logFilter, level: e.target.value })}
              >
                <option value="">All Levels</option>
                <option value="DEBUG">Debug</option>
                <option value="INFO">Info</option>
                <option value="WARN">Warning</option>
                <option value="ERROR">Error</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="component">Component</Label>
              <select
                id="component"
                className="w-full mt-1 p-2 border rounded-md"
                value={logFilter.component}
                onChange={(e) => setLogFilter({ ...logFilter, component: e.target.value })}
              >
                <option value="">All Components</option>
                <option value="api">API</option>
                <option value="auth">Authentication</option>
                <option value="database">Database</option>
                <option value="email">Email</option>
                <option value="booking">Booking</option>
                <option value="middleware">Middleware</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search logs..."
                value={logFilter.search}
                onChange={(e) => setLogFilter({ ...logFilter, search: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="limit">Limit</Label>
              <select
                id="limit"
                className="w-full mt-1 p-2 border rounded-md"
                value={logLimit}
                onChange={(e) => setLogLimit(parseInt(e.target.value))}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              System Logs
            </CardTitle>
            <Button 
              onClick={exportLogs}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Level</th>
                  <th className="text-left p-2">Component</th>
                  <th className="text-left p-2">Message</th>
                  <th className="text-left p-2">Request ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, logLimit).map((log, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-2">
                      <Badge 
                        className={`${getLogLevelColor(log.levelName)} text-white`}
                      >
                        {log.levelName}
                      </Badge>
                    </td>
                    <td className="p-2 text-sm">{log.component}</td>
                    <td className="p-2 text-sm max-w-md truncate" title={log.message}>
                      {log.message}
                    </td>
                    <td className="p-2 text-xs text-gray-500">
                      {log.requestId?.substring(0, 8) || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {logs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No logs found matching the current filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MonitoringDashboard
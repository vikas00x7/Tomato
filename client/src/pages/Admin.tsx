import { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, PieChart, List, Shield, Settings, MapPin, Users, Activity, FileText } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartPieChart, Pie, Cell, LineChart, Line
} from 'recharts';

interface BotLog {
  id: number;
  timestamp: string;
  ipAddress: string;
  userAgent: string | null;
  path: string | null;
  country: string | null;
  isBotConfirmed: boolean;
  botType: string | null;
  bypassAttempt: boolean;
  source: string | null;
}

// Analytics data interface
interface AnalyticsData {
  totalVisits: number;
  uniqueIPs: number;
  botCount: number;
  humanCount: number;
  bypassAttempts: number;
  countryDistribution: Record<string, number>;
  pageVisits: Record<string, number>;
  sourceDistribution: Record<string, number>;
  dailyTraffic: Record<string, number>;
  topIPs: { ip: string; count: number }[];
}

// Define tabs for the admin dashboard
type TabType = 'analytics' | 'logs' | 'ip-management' | 'bot-policy' | 'cloudflare';

// COLORS for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

interface IPListEntry {
  ipAddress: string;
  addedAt: string;
  reason: string;
}

interface BotPolicy {
  enabled: boolean;
  threshold: number;
  challengeType: 'simple' | 'complex' | 'captcha';
  blockDuration: number;
  customMessages: {
    detected: string;
    blocked: string;
    challenge: string;
    success: string;
  }
}

interface CloudflareCredentials {
  apiKey: string;
  email: string;
  accountId: string;
  zoneId: string;
  isConfigured?: boolean;
  skipValidation?: boolean;
  useMockMode?: boolean;
}

interface CloudflareLog {
  id: string;
  timestamp: string;
  ipAddress: string;
  country: string;
  path: string;
  action: string;
  botScore: number | null;
  botCategory: string | null;
}

const AdminPage = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [blacklist, setBlacklist] = useState<IPListEntry[]>([]);
  const [whitelist, setWhitelist] = useState<IPListEntry[]>([]);
  const [botPolicy, setBotPolicy] = useState<BotPolicy>({
    enabled: true,
    threshold: 70,
    challengeType: 'simple',
    blockDuration: 24,
    customMessages: {
      detected: 'Bot activity detected',
      blocked: 'Your access has been blocked due to suspicious activity',
      challenge: 'Please complete the challenge to continue',
      success: 'Challenge completed successfully',
    }
  });
  const [cloudflareCredentials, setCloudflareCredentials] = useState<CloudflareCredentials & {
    skipValidation?: boolean;
    useMockMode?: boolean;
  }>({
    apiKey: '',
    email: '',
    accountId: '',
    zoneId: '',
    isConfigured: false,
    skipValidation: process.env.NODE_ENV === 'development', // Default to skip validation in development
    useMockMode: process.env.NODE_ENV === 'development'     // Default to mock mode in development
  });
  const [cloudflareLogs, setCloudflareLogs] = useState<CloudflareLog[]>([]);
  const [cloudflareLogsLoading, setCloudflareLogsLoading] = useState(false);
  const [cloudflareCredentialsLoading, setCloudflareCredentialsLoading] = useState(false);
  const [cloudflareLogFilters, setCloudflareLogFilters] = useState<{
    startDate: string;
    endDate: string;
    ipAddress: string;
    botScore: string;
    page: number;
    limit: number;
  }>({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    ipAddress: '',
    botScore: '',
    page: 1,
    limit: 100
  });
  const [cloudflarePagination, setCloudflarePagination] = useState<{
    total: number;
    page: number;
    limit: number;
  }>({
    total: 0,
    page: 1,
    limit: 100
  });
  const [policyLoading, setPolicyLoading] = useState(false);
  const [newIPAddress, setNewIPAddress] = useState('');
  const [newIPReason, setNewIPReason] = useState('');
  const [ipManagementTab, setIpManagementTab] = useState<'blacklist' | 'whitelist'>('blacklist');
  const [ipListLoading, setIpListLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ipFilter, setIpFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastLogCount, setLastLogCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('logs'); // Default to logs tab
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to fetch analytics data
  const fetchAnalytics = async () => {
    if (!isAuthenticated) return;
    
    try {
      setAnalyticsLoading(true);
      const response = await fetch(`/api/analytics?key=${encodeURIComponent(apiKey.trim())}`);
      
      if (response.status === 401) {
        toast({
          title: "Authentication Failed",
          description: "Invalid API key. Please check and try again.",
          variant: "destructive"
        });
        setIsAuthenticated(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data.",
        variant: "destructive"
      });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Function to fetch logs
  const fetchLogs = async (isRefresh = false, silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      
      // Use query parameter approach only
      const response = await fetch(`/api/logs?key=${encodeURIComponent(apiKey.trim())}`);
      
      if (response.status === 401) {
        // Specific error for unauthorized
        toast({
          title: "Authentication Failed",
          description: "Invalid API key. Please check and try again.",
          variant: "destructive"
        });
        setIsAuthenticated(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const data = await response.json();
      const newLogs = data.logs || [];
      
      // Check if we have new logs
      const hasNewLogs = newLogs.length > lastLogCount;
      setLogs(newLogs);
      setLastLogCount(newLogs.length);
      
      if (!isAuthenticated) {
        setIsAuthenticated(true);
        // First-time authentication success toast
        toast({
          title: "Success",
          description: "Authentication successful!",
        });
        
        // Fetch analytics data after successful authentication
        fetchAnalytics();
      } else if (isRefresh && !silent) {
        // Refresh success toast
        toast({
          title: "Logs Refreshed",
          description: `Successfully retrieved ${newLogs.length} logs.`,
        });
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to fetch logs. Check your API key.",
          variant: "destructive"
        });
      }
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        console.log('Network error during silent polling, continuing...');
      } else {
        setIsAuthenticated(false);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Setup automatic polling for new logs
  useEffect(() => {
    // Clear any existing interval when component mounts or unmounts
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Only start polling if authenticated and auto-refresh is enabled
    if (isAuthenticated && autoRefresh) {
      console.log('Starting real-time log polling...');
      
      // Poll every 5 seconds for new logs (silently)
      pollingIntervalRef.current = setInterval(() => {
        console.log('Polling for new logs...');
        fetchLogs(false, true);
      }, 5000);
    }
    
    // Cleanup interval on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isAuthenticated, autoRefresh]);
  
  // When tab changes to analytics, fetch analytics data
  useEffect(() => {
    if (activeTab === 'analytics' && isAuthenticated && !analytics) {
      fetchAnalytics();
    }
  }, [activeTab, isAuthenticated, analytics]);
  
  // Function to fetch logs by IP
  const fetchLogsByIp = async () => {
    if (!ipFilter.trim()) {
      fetchLogs();
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/logs?key=${encodeURIComponent(apiKey.trim())}&ipAddress=${encodeURIComponent(ipFilter.trim())}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Filtered logs response:', data);
      setLogs(data.logs || []);
      
      toast({
        title: "Logs Filtered",
        description: `Found ${data.logs.length} logs for IP ${ipFilter}`,
      });
    } catch (error) {
      console.error('Error fetching logs by IP:', error);
      toast({
        title: "Error",
        description: "Failed to filter logs. Try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to export logs
  const exportLogs = async () => {
    if (!isAuthenticated) return;
    
    try {
      const dataStr = JSON.stringify(logs, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      
      const exportFileDefaultName = `bot_logs_${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };
  
  // Function to clear all logs
  const clearAllLogs = async () => {
    if (!isAuthenticated) return;
    
    // Confirm with the user before deleting all logs
    if (!window.confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/logs?key=${encodeURIComponent(apiKey.trim())}`, {
        method: 'DELETE',
      });
      
      if (response.status === 401) {
        toast({
          title: "Authentication Failed",
          description: "Invalid API key. Please check and try again.",
          variant: "destructive"
        });
        setIsAuthenticated(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to clear logs');
      }
      
      // Clear logs locally
      setLogs([]);
      setLastLogCount(0);
      
      toast({
        title: "Success",
        description: "All logs have been cleared successfully.",
      });
    } catch (error) {
      console.error('Error clearing logs:', error);
      toast({
        title: "Error",
        description: "Failed to clear logs.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Handle authentication
  const handleAuthenticate = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "API key is required.",
        variant: "destructive"
      });
      return;
    }
    
    fetchLogs();
  };
  
  // Filter logs by IP
  const handleFilterByIp = () => {
    fetchLogsByIp();
  };
  
  // Prepare data for country distribution chart
  const countryChartData = useMemo(() => {
    if (!analytics?.countryDistribution) return [];
    
    return Object.entries(analytics.countryDistribution)
      .sort((a, b) => b[1] - a[1])
      .map(([country, count]) => ({
        name: country === 'unknown' ? 'Unknown' : country,
        value: count
      }));
  }, [analytics?.countryDistribution]);
  
  // Prepare data for bot vs human chart
  const botVsHumanData = useMemo(() => {
    if (!analytics) return [];
    
    return [
      { name: 'Human', value: analytics.humanCount },
      { name: 'Bot', value: analytics.botCount }
    ];
  }, [analytics]);
  
  // Prepare data for page visits chart
  const pageVisitsData = useMemo(() => {
    if (!analytics?.pageVisits) return [];
    
    return Object.entries(analytics.pageVisits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({
        name: path === 'unknown' ? '/' : path,
        visits: count
      }));
  }, [analytics?.pageVisits]);
  
  // Prepare data for traffic over time chart
  const trafficOverTimeData = useMemo(() => {
    if (!analytics?.dailyTraffic) return [];
    
    return Object.entries(analytics.dailyTraffic)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, count]) => ({
        date: date,
        visits: count
      }));
  }, [analytics?.dailyTraffic]);
  
  // Prepare data for source distribution chart
  const sourceDistributionData = useMemo(() => {
    if (!analytics?.sourceDistribution) return [];
    
    return Object.entries(analytics.sourceDistribution)
      .map(([source, count]) => ({
        name: source === 'unknown' ? 'Unknown' : source,
        value: count
      }));
  }, [analytics?.sourceDistribution]);
  
  // Function to render the current tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'analytics':
        return (
          <div className="space-y-6">
            {/* Analytics Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 flex items-start">
                <div className="rounded-full bg-blue-100 p-3 mr-4">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Total Visits</p>
                  <h3 className="text-2xl font-bold">{analyticsLoading ? '...' : analytics?.totalVisits || 0}</h3>
                </div>
              </Card>
              
              <Card className="p-4 flex items-start">
                <div className="rounded-full bg-green-100 p-3 mr-4">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Unique IPs</p>
                  <h3 className="text-2xl font-bold">{analyticsLoading ? '...' : analytics?.uniqueIPs || 0}</h3>
                </div>
              </Card>
              
              <Card className="p-4 flex items-start">
                <div className="rounded-full bg-red-100 p-3 mr-4">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Bot Visits</p>
                  <h3 className="text-2xl font-bold">{analyticsLoading ? '...' : analytics?.botCount || 0}</h3>
                </div>
              </Card>
              
              <Card className="p-4 flex items-start">
                <div className="rounded-full bg-orange-100 p-3 mr-4">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Bypass Attempts</p>
                  <h3 className="text-2xl font-bold">{analyticsLoading ? '...' : analytics?.bypassAttempts || 0}</h3>
                </div>
              </Card>
            </div>
            
            {/* Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bot vs Human Distribution */}
              <Card className="p-4">
                <h3 className="text-lg font-medium mb-2">Bot vs Human Traffic</h3>
                {analyticsLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <p>Loading chart data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartPieChart>
                      <Pie
                        data={botVsHumanData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {botVsHumanData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartPieChart>
                  </ResponsiveContainer>
                )}
              </Card>
              
              {/* Country Distribution */}
              <Card className="p-4">
                <h3 className="text-lg font-medium mb-2">Visitor Countries</h3>
                {analyticsLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <p>Loading chart data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={countryChartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" name="Visits" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
              
              {/* Page Visits */}
              <Card className="p-4">
                <h3 className="text-lg font-medium mb-2">Most Visited Pages</h3>
                {analyticsLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <p>Loading chart data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={pageVisitsData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="visits" fill="#82ca9d" name="Visits" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
              
              {/* Traffic Over Time */}
              <Card className="p-4">
                <h3 className="text-lg font-medium mb-2">Traffic Over Time</h3>
                {analyticsLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <p>Loading chart data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={trafficOverTimeData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="visits" stroke="#8884d8" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
            
            {/* Traffic Source Distribution */}
            <Card className="p-4">
              <h3 className="text-lg font-medium mb-2">Traffic Source Distribution</h3>
              {analyticsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <p>Loading chart data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartPieChart>
                    <Pie
                      data={sourceDistributionData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sourceDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartPieChart>
                </ResponsiveContainer>
              )}
            </Card>
            
            {/* Top IP Addresses */}
            <Card className="p-4">
              <h3 className="text-lg font-medium mb-4">Top IP Addresses</h3>
              {analyticsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <p>Loading data...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Visit Count</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics?.topIPs && analytics.topIPs.length > 0 ? (
                      analytics.topIPs.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.ip}</TableCell>
                          <TableCell>{item.count}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                  setIpFilter(item.ip);
                                  setActiveTab('logs');
                                  fetchLogsByIp();
                                }}
                              >
                                View Logs
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4">No data available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </Card>
            
            <div className="flex justify-end">
              <Button 
                onClick={fetchAnalytics} 
                disabled={analyticsLoading}
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {analyticsLoading ? 'Refreshing...' : 'Refresh Analytics'}
              </Button>
            </div>
          </div>
        );
      
      case 'logs':
        return (
          <>
            <div className="flex items-center mb-4 gap-4 flex-wrap">
              <Card className="p-4 flex items-center gap-2">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Filter by IP address" 
                    value={ipFilter}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIpFilter(e.target.value)}
                    className="w-64"
                  />
                  <Button onClick={handleFilterByIp} disabled={loading}>
                    {loading ? 'Loading...' : 'Filter'}
                  </Button>
                  <Button onClick={() => {setIpFilter(''); fetchLogs()}} variant="outline" disabled={loading}>
                    Clear
                  </Button>
                  <Button onClick={clearAllLogs} variant="destructive" disabled={loading}>
                    Clear All Logs
                  </Button>
                </div>
              </Card>
              
              <div className="ml-auto flex gap-2 items-center">
                <div className="flex items-center mr-2">
                  <input
                    type="checkbox"
                    id="autoRefresh"
                    checked={autoRefresh}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoRefresh(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="autoRefresh" className="text-sm">Auto-refresh</label>
                </div>
                <Button 
                  onClick={() => fetchLogs(true)}
                  variant="outline"
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {loading ? 'Refreshing...' : 'Refresh Logs'}
                </Button>
                <Button onClick={exportLogs}>
                  Export Logs
                </Button>
              </div>
            </div>
            
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Bot</TableHead>
                      <TableHead>BotType</TableHead>
                      <TableHead>Bypass</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">No logs found</TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{log.id}</TableCell>
                          <TableCell>{formatDate(log.timestamp)}</TableCell>
                          <TableCell>{log.ipAddress}</TableCell>
                          <TableCell>{log.source || 'N/A'}</TableCell>
                          <TableCell>{log.path || 'N/A'}</TableCell>
                          <TableCell>{log.country || 'N/A'}</TableCell>
                          <TableCell>
                            <span className={log.isBotConfirmed ? 'text-red-500' : 'text-green-500'}>
                              {log.isBotConfirmed ? 'Yes' : 'No'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={log.botType ? 'text-blue-500' : 'text-gray-500'}>
                              {log.botType || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={log.bypassAttempt ? 'text-orange-500' : 'text-gray-500'}>
                              {log.bypassAttempt ? 'Yes' : 'No'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
            
            <div className="mt-8 text-sm text-gray-500">
              <p>Total logs: {logs.length}</p>
              <p>Last updated: {new Date().toLocaleString()}</p>
              <p>Real-time updates: {autoRefresh ? 'Enabled' : 'Disabled'}</p>
            </div>
          </>
        );
      
      case 'ip-management':
        return (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex mb-4 border-b">
                <button 
                  className={`px-4 py-2 font-medium ${ipManagementTab === 'blacklist' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => {
                    setIpManagementTab('blacklist');
                    fetchBlacklist();
                  }}
                >
                  Blacklist
                </button>
                <button 
                  className={`px-4 py-2 font-medium ${ipManagementTab === 'whitelist' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => {
                    setIpManagementTab('whitelist');
                    fetchWhitelist();
                  }}
                >
                  Whitelist
                </button>
              </div>
              
              {/* Add IP Form */}
              <div className="mb-6 p-4 border rounded-md bg-gray-50">
                <h3 className="text-lg font-medium mb-3">
                  {ipManagementTab === 'blacklist' ? 'Add IP to Blacklist' : 'Add IP to Whitelist'}
                </h3>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm text-gray-600 mb-1 block">IP Address</label>
                    <Input 
                      placeholder="IP Address (e.g. 192.168.1.1)" 
                      value={newIPAddress}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewIPAddress(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm text-gray-600 mb-1 block">Reason (Optional)</label>
                    <Input 
                      placeholder="Reason for blacklisting" 
                      value={newIPReason}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewIPReason(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={ipManagementTab === 'blacklist' ? addToBlacklist : addToWhitelist}
                    disabled={ipListLoading || !newIPAddress.trim()}
                    className="whitespace-nowrap"
                  >
                    {ipListLoading ? 'Adding...' : ipManagementTab === 'blacklist' ? 'Block IP' : 'Whitelist IP'}
                  </Button>
                </div>
              </div>
              
              {/* IP List Table */}
              <h3 className="text-lg font-medium mb-3">
                {ipManagementTab === 'blacklist' ? 'Blocked IP Addresses' : 'Whitelisted IP Addresses'}
              </h3>
              
              {ipListLoading ? (
                <div className="py-8 text-center">Loading IP list...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Added On</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipManagementTab === 'blacklist' ? (
                      blacklist.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">No blocked IP addresses</TableCell>
                        </TableRow>
                      ) : (
                        blacklist.map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell>{entry.ipAddress}</TableCell>
                            <TableCell>{new Date(entry.addedAt).toLocaleString()}</TableCell>
                            <TableCell>{entry.reason || 'No reason provided'}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  onClick={() => removeFromBlacklist(entry.ipAddress)}
                                  disabled={ipListLoading}
                                >
                                  Remove
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => {
                                    setIpFilter(entry.ipAddress);
                                    setActiveTab('logs');
                                    fetchLogsByIp();
                                  }}
                                >
                                  View Logs
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )
                    ) : (
                      whitelist.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">No whitelisted IP addresses</TableCell>
                        </TableRow>
                      ) : (
                        whitelist.map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell>{entry.ipAddress}</TableCell>
                            <TableCell>{new Date(entry.addedAt).toLocaleString()}</TableCell>
                            <TableCell>{entry.reason || 'No reason provided'}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  onClick={() => removeFromWhitelist(entry.ipAddress)}
                                  disabled={ipListLoading}
                                >
                                  Remove
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => {
                                    setIpFilter(entry.ipAddress);
                                    setActiveTab('logs');
                                    fetchLogsByIp();
                                  }}
                                >
                                  View Logs
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )
                    )}
                  </TableBody>
                </Table>
              )}
              
              <div className="flex justify-end mt-4">
                <Button 
                  onClick={ipManagementTab === 'blacklist' ? fetchBlacklist : fetchWhitelist} 
                  disabled={ipListLoading}
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {ipListLoading ? 'Refreshing...' : 'Refresh List'}
                </Button>
              </div>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-3">Bulk IP Management</h3>
              <p className="text-gray-500 mb-4">
                Add multiple IP addresses at once by uploading a CSV file or entering a comma-separated list.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-medium mb-2">Quick Actions</h4>
                  <Button
                    variant="outline"
                    className="mr-2 mb-2"
                    onClick={() => {
                      // Find IPs with multiple bot visits
                      if (analytics?.topIPs) {
                        const botIPs = analytics.topIPs
                          .filter(ip => {
                            const ipLogs = logs.filter(log => log.ipAddress === ip.ip);
                            const botCount = ipLogs.filter(log => log.isBotConfirmed).length;
                            return botCount > 0 && botCount / ipLogs.length > 0.8; // 80% of requests are bot requests
                          })
                          .map(ip => ip.ip);
                        
                        if (botIPs.length > 0) {
                          setIpManagementTab('blacklist');
                          toast({
                            title: "Bot IPs Selected",
                            description: `Found ${botIPs.length} IP addresses with high bot activity`,
                          });
                          setNewIPAddress(botIPs[0]);
                        } else {
                          toast({
                            title: "No Bot IPs Found",
                            description: "Couldn't find any IP addresses with significant bot activity",
                          });
                        }
                      }
                    }}
                  >
                    Add Recent Bot IP
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="mr-2 mb-2"
                    onClick={() => {
                      // Find IPs with bypass attempts
                      const bypassIPs = logs
                        .filter(log => log.bypassAttempt)
                        .map(log => log.ipAddress);
                      
                      if (bypassIPs.length > 0) {
                        const uniqueIPs = bypassIPs.filter((ip, index, self) => 
                          self.indexOf(ip) === index
                        );
                        
                        setIpManagementTab('blacklist');
                        toast({
                          title: "Bypass IPs Selected",
                          description: `Found ${uniqueIPs.length} IP addresses with bypass attempts`,
                        });
                        setNewIPAddress(uniqueIPs[0]);
                      } else {
                        toast({
                          title: "No Bypass IPs Found",
                          description: "Couldn't find any IP addresses with bypass attempts",
                        });
                      }
                    }}
                  >
                    Add Bypass Attempt IP
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="mb-2"
                    onClick={() => {
                      if (ipFilter) {
                        setNewIPAddress(ipFilter);
                        toast({
                          title: "IP Added from Filter",
                          description: `Added ${ipFilter} from your current filter`,
                        });
                      } else {
                        toast({
                          title: "No Filter Active",
                          description: "You don't have an IP filter active in the logs tab",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    Add from Current Filter
                  </Button>
                </div>
                
                <div>
                  <h4 className="text-md font-medium mb-2">View Options</h4>
                  <Button
                    variant="outline"
                    className="mr-2 mb-2"
                    onClick={() => {
                      // Export blacklist as CSV
                      if (blacklist.length > 0) {
                        const csvContent = "data:text/csv;charset=utf-8," 
                          + "IP Address,Added On,Reason\n"
                          + blacklist.map(row => {
                              return `${row.ipAddress},${new Date(row.addedAt).toISOString()},"${row.reason || ""}"`;
                            }).join("\n");
                        
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", "ip_blacklist.csv");
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } else {
                        toast({
                          title: "Empty Blacklist",
                          description: "There are no IP addresses in the blacklist to export",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    Export Blacklist
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="mb-2"
                    onClick={() => {
                      // Export whitelist as CSV
                      if (whitelist.length > 0) {
                        const csvContent = "data:text/csv;charset=utf-8," 
                          + "IP Address,Added On,Reason\n"
                          + whitelist.map(row => {
                              return `${row.ipAddress},${new Date(row.addedAt).toISOString()},"${row.reason || ""}"`;
                            }).join("\n");
                        
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", "ip_whitelist.csv");
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } else {
                        toast({
                          title: "Empty Whitelist",
                          description: "There are no IP addresses in the whitelist to export",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    Export Whitelist
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        );
      
      case 'bot-policy':
        return (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold">Bot Protection Configuration</h2>
              <p className="text-gray-500 mb-4">
                Configure how the bot protection system works, including detection settings, 
                challenge types, and custom messages.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-lg font-medium">Bot Protection</h3>
                    <p className="text-sm text-gray-500">Enable or disable bot protection</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant={botPolicy.enabled ? "default" : "outline"}
                      onClick={() => setBotPolicy({...botPolicy, enabled: true})}
                      className="px-3 py-1 h-9"
                    >
                      Enabled
                    </Button>
                    <Button 
                      variant={!botPolicy.enabled ? "default" : "outline"}
                      onClick={() => setBotPolicy({...botPolicy, enabled: false})}
                      className="px-3 py-1 h-9"
                    >
                      Disabled
                    </Button>
                  </div>
                </div>
                
                <div className="border-b pb-4">
                  <h3 className="text-lg font-medium mb-2">Bot Detection Threshold</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    Confidence level required to identify a visitor as a bot
                  </p>
                  <div className="flex items-center">
                    <Input 
                      type="range"
                      min={0}
                      max={100}
                      value={botPolicy.threshold}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setBotPolicy({
                          ...botPolicy,
                          threshold: parseInt(e.target.value)
                        });
                      }}
                      className="w-full"
                    />
                    <span className="ml-2 w-10 text-center">{botPolicy.threshold}%</span>
                  </div>
                </div>
                
                <div className="border-b pb-4">
                  <h3 className="text-lg font-medium mb-2">Challenge Type</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    Type of challenge to present to suspected bots
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant={botPolicy.challengeType === 'simple' ? "default" : "outline"}
                      onClick={() => setBotPolicy({...botPolicy, challengeType: 'simple'})}
                      className="w-full"
                    >
                      Simple
                    </Button>
                    <Button 
                      variant={botPolicy.challengeType === 'complex' ? "default" : "outline"}
                      onClick={() => setBotPolicy({...botPolicy, challengeType: 'complex'})}
                      className="w-full"
                    >
                      Complex
                    </Button>
                    <Button 
                      variant={botPolicy.challengeType === 'captcha' ? "default" : "outline"}
                      onClick={() => setBotPolicy({...botPolicy, challengeType: 'captcha'})}
                      className="w-full"
                    >
                      CAPTCHA
                    </Button>
                  </div>
                </div>
                
                <div className="border-b pb-4">
                  <h3 className="text-lg font-medium mb-2">Block Duration (hours)</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    How long to block confirmed bots
                  </p>
                  <Input
                    type="number"
                    min={1}
                    max={720}
                    value={botPolicy.blockDuration}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value > 0) {
                        setBotPolicy({
                          ...botPolicy,
                          blockDuration: value
                        });
                      }
                    }}
                    className="w-32"
                  />
                </div>
                
                <div className="border-b pb-4">
                  <h3 className="text-lg font-medium mb-2">Custom Messages</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">Bot Detection Message</p>
                      <Input
                        value={botPolicy.customMessages.detected}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setBotPolicy({
                            ...botPolicy,
                            customMessages: {
                              ...botPolicy.customMessages,
                              detected: e.target.value
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Blocked Access Message</p>
                      <Input
                        value={botPolicy.customMessages.blocked}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setBotPolicy({
                            ...botPolicy,
                            customMessages: {
                              ...botPolicy.customMessages,
                              blocked: e.target.value
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Challenge Message</p>
                      <Input
                        value={botPolicy.customMessages.challenge}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setBotPolicy({
                            ...botPolicy,
                            customMessages: {
                              ...botPolicy.customMessages,
                              challenge: e.target.value
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Success Message</p>
                      <Input
                        value={botPolicy.customMessages.success}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setBotPolicy({
                            ...botPolicy,
                            customMessages: {
                              ...botPolicy.customMessages,
                              success: e.target.value
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={fetchBotPolicy}
                    disabled={policyLoading}
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={updateBotPolicy}
                    disabled={policyLoading}
                  >
                    {policyLoading ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        );
      
      case 'cloudflare':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">CloudFlare Integration</h2>
            <p className="text-gray-600">Connect to your CloudFlare account to view security logs and integrate with your bot protection.</p>
            
            {/* CloudFlare Credentials Form */}
            <Card className="p-4">
              <h3 className="text-lg font-medium mb-4">CloudFlare Credentials</h3>
              {cloudflareCredentials.isConfigured ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">API Key</p>
                      <p className="font-medium">••••••••••••{cloudflareCredentials.apiKey.slice(-4)}</p>
                    </div>
                    {cloudflareCredentials.email && (
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{cloudflareCredentials.email}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Zone ID</p>
                      <p className="font-medium">{cloudflareCredentials.zoneId}</p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={clearCloudflareCredentials}
                      disabled={cloudflareCredentialsLoading}
                    >
                      {cloudflareCredentialsLoading ? 'Processing...' : 'Remove Credentials'}
                    </Button>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="text-md font-medium mb-2">CloudFlare Logs</h4>
                    
                    {/* Toggle Mock Mode */}
                    <div className="flex items-center mb-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={cloudflareCredentials.useMockMode}
                          onChange={(e) => setCloudflareCredentials({
                            ...cloudflareCredentials,
                            useMockMode: e.target.checked
                          })}
                        />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ms-3 text-sm font-medium text-gray-900">Use Mock Data for Testing</span>
                      </label>
                    </div>
                    
                    {/* Filtering controls */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="block text-sm mb-1">Start Date</label>
                        <Input 
                          type="date" 
                          value={cloudflareLogFilters.startDate}
                          onChange={(e) => setCloudflareLogFilters({...cloudflareLogFilters, startDate: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">End Date</label>
                        <Input 
                          type="date" 
                          value={cloudflareLogFilters.endDate}
                          onChange={(e) => setCloudflareLogFilters({...cloudflareLogFilters, endDate: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">IP Address</label>
                        <Input 
                          type="text" 
                          placeholder="Filter by IP" 
                          value={cloudflareLogFilters.ipAddress}
                          onChange={(e) => setCloudflareLogFilters({...cloudflareLogFilters, ipAddress: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Bot Score</label>
                        <Input 
                          type="number" 
                          placeholder="Max bot score" 
                          min="1"
                          max="100"
                          value={cloudflareLogFilters.botScore}
                          onChange={(e) => setCloudflareLogFilters({...cloudflareLogFilters, botScore: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="flex space-x-4 mb-4">
                      <Button 
                        onClick={() => {
                          setCloudflareLogFilters({...cloudflareLogFilters, page: 1});
                          fetchCloudflareLogs();
                        }}
                        disabled={cloudflareLogsLoading}
                      >
                        {cloudflareLogsLoading ? 'Loading...' : 'Filter Logs'}
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={importCloudflareLogs}
                        disabled={cloudflareLogsLoading || cloudflareLogs.length === 0}
                      >
                        Import to Local Storage
                      </Button>
                    </div>
                    
                    {/* CloudFlare Logs Table */}
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Country</TableHead>
                            <TableHead>Path</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Bot Score</TableHead>
                            <TableHead>Bot Category</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cloudflareLogsLoading ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-4">Loading logs...</TableCell>
                            </TableRow>
                          ) : cloudflareLogs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-4">No Cloudflare logs found.</TableCell>
                            </TableRow>
                          ) : (
                            cloudflareLogs.map((log) => (
                              <TableRow key={log.id}>
                                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                                <TableCell>{log.ipAddress}</TableCell>
                                <TableCell>{log.country || 'Unknown'}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{log.path || 'N/A'}</TableCell>
                                <TableCell>
                                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                    log.action === 'block' 
                                      ? 'bg-red-100 text-red-800' 
                                      : log.action === 'challenge' || log.action === 'jschallenge'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-green-100 text-green-800'
                                  }`}>
                                    {log.action || 'allow'}
                                  </span>
                                </TableCell>
                                <TableCell>{log.botScore !== null ? log.botScore : 'N/A'}</TableCell>
                                <TableCell>{log.botCategory || 'N/A'}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Pagination controls */}
                    {cloudflareLogs.length > 0 && (
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-gray-500">
                          Showing {(cloudflarePagination.page - 1) * cloudflarePagination.limit + 1} to {Math.min(cloudflarePagination.page * cloudflarePagination.limit, cloudflarePagination.total)} of {cloudflarePagination.total} logs
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={cloudflarePagination.page <= 1 || cloudflareLogsLoading}
                            onClick={() => handleCloudflarePageChange(cloudflarePagination.page - 1)}
                          >
                            Previous
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={cloudflarePagination.page * cloudflarePagination.limit >= cloudflarePagination.total || cloudflareLogsLoading}
                            onClick={() => handleCloudflarePageChange(cloudflarePagination.page + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1">API Key <span className="text-red-500">*</span></label>
                      <Input 
                        type="password" 
                        placeholder="Your CloudFlare API Key" 
                        value={cloudflareCredentials.apiKey}
                        onChange={(e) => setCloudflareCredentials({...cloudflareCredentials, apiKey: e.target.value})}
                      />
                      <p className="text-xs text-gray-500 mt-1">Create an API token in your CloudFlare dashboard with Security Events permissions</p>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Email</label>
                      <Input 
                        type="email" 
                        placeholder="Your CloudFlare account email (optional)" 
                        value={cloudflareCredentials.email}
                        onChange={(e) => setCloudflareCredentials({...cloudflareCredentials, email: e.target.value})}
                      />
                      <p className="text-xs text-gray-500 mt-1">Required for some accounts, can be left blank if using API tokens</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1">Account ID</label>
                      <Input 
                        type="text" 
                        placeholder="Your CloudFlare Account ID (optional)" 
                        value={cloudflareCredentials.accountId}
                        onChange={(e) => setCloudflareCredentials({...cloudflareCredentials, accountId: e.target.value})}
                      />
                      <p className="text-xs text-gray-500 mt-1">Found in your CloudFlare dashboard URL</p>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Zone ID <span className="text-red-500">*</span></label>
                      <Input 
                        type="text" 
                        placeholder="Your CloudFlare Zone ID" 
                        value={cloudflareCredentials.zoneId}
                        onChange={(e) => setCloudflareCredentials({...cloudflareCredentials, zoneId: e.target.value})}
                      />
                      <p className="text-xs text-gray-500 mt-1">Found in the Overview tab in CloudFlare dashboard</p>
                    </div>
                  </div>
                  
                  {/* Development Options */}
                  <div className="border p-3 rounded-md bg-gray-50">
                    <h5 className="text-sm font-medium mb-2">Development Options</h5>
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={cloudflareCredentials.skipValidation}
                          onChange={(e) => setCloudflareCredentials({
                            ...cloudflareCredentials,
                            skipValidation: e.target.checked
                          })}
                        />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ms-3 text-sm font-medium text-gray-900">Skip Validation</span>
                      </label>
                      
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={cloudflareCredentials.useMockMode}
                          onChange={(e) => setCloudflareCredentials({
                            ...cloudflareCredentials,
                            useMockMode: e.target.checked
                          })}
                        />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ms-3 text-sm font-medium text-gray-900">Use Mock Data</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">For testing without valid CloudFlare credentials</p>
                  </div>
                  
                  <Button 
                    onClick={saveCloudflareCredentials} 
                    disabled={cloudflareCredentialsLoading || (!cloudflareCredentials.skipValidation && (!cloudflareCredentials.apiKey || !cloudflareCredentials.zoneId))}
                  >
                    {cloudflareCredentialsLoading ? 'Validating...' : 'Connect to CloudFlare'}
                  </Button>
                </div>
              )}
            </Card>
            
            {/* Documentation Card */}
            <Card className="p-4 bg-blue-50">
              <h3 className="text-lg font-medium mb-2">How to Connect</h3>
              <ol className="list-decimal ml-5 space-y-2">
                <li>Go to your <a href="https://dash.cloudflare.com" target="_blank" className="text-blue-600 hover:underline">CloudFlare Dashboard</a></li>
                <li>Navigate to My Profile → API Tokens</li>
                <li>Create a new API token with "Security Events: Read" permissions</li>
                <li>Copy your Zone ID from the domain Overview page</li>
                <li>Enter the credentials above and click "Connect to CloudFlare"</li>
              </ol>
              <p className="mt-4 text-sm text-gray-600">This integration allows you to view CloudFlare security logs, analyze bot traffic patterns, and import CloudFlare logs into your local database for unified reporting.</p>
            </Card>
          </div>
        );
      default:
        return <div>Select a tab to view content</div>;
    }
  };

  // Fetch bot policy
  const fetchBotPolicy = async () => {
    if (!isAuthenticated) return;
    
    try {
      setPolicyLoading(true);
      const response = await fetch(`/api/bot-policy?key=${encodeURIComponent(apiKey.trim())}`);
      
      if (response.status === 401) {
        toast({
          title: "Authentication Failed",
          description: "Invalid API key. Please check and try again.",
          variant: "destructive"
        });
        setIsAuthenticated(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch bot policy');
      }
      
      const data = await response.json();
      setBotPolicy(data.policy);
    } catch (error) {
      console.error('Error fetching bot policy:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bot policy configuration.",
        variant: "destructive"
      });
    } finally {
      setPolicyLoading(false);
    }
  };
  
  // Update bot policy
  const updateBotPolicy = async () => {
    if (!isAuthenticated) return;
    
    try {
      setPolicyLoading(true);
      const response = await fetch(`/api/bot-policy?key=${encodeURIComponent(apiKey.trim())}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          policy: botPolicy
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update bot policy');
      }
      
      toast({
        title: "Success",
        description: "Bot policy configuration updated successfully.",
      });
    } catch (error) {
      console.error('Error updating bot policy:', error);
      toast({
        title: "Error",
        description: "Failed to update bot policy configuration.",
        variant: "destructive"
      });
    } finally {
      setPolicyLoading(false);
    }
  };

  // Fetch blacklist
  const fetchBlacklist = async () => {
    if (!isAuthenticated) return;
    
    try {
      setIpListLoading(true);
      const response = await fetch(`/api/ip-blacklist?key=${encodeURIComponent(apiKey.trim())}`);
      
      if (response.status === 401) {
        toast({
          title: "Authentication Failed",
          description: "Invalid API key. Please check and try again.",
          variant: "destructive"
        });
        setIsAuthenticated(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch blacklist');
      }
      
      const data = await response.json();
      setBlacklist(data.blacklist || []);
    } catch (error) {
      console.error('Error fetching blacklist:', error);
      toast({
        title: "Error",
        description: "Failed to fetch IP blacklist.",
        variant: "destructive"
      });
    } finally {
      setIpListLoading(false);
    }
  };
  
  // Fetch whitelist
  const fetchWhitelist = async () => {
    if (!isAuthenticated) return;
    
    try {
      setIpListLoading(true);
      const response = await fetch(`/api/ip-whitelist?key=${encodeURIComponent(apiKey.trim())}`);
      
      if (response.status === 401) {
        toast({
          title: "Authentication Failed",
          description: "Invalid API key. Please check and try again.",
          variant: "destructive"
        });
        setIsAuthenticated(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch whitelist');
      }
      
      const data = await response.json();
      setWhitelist(data.whitelist || []);
    } catch (error) {
      console.error('Error fetching whitelist:', error);
      toast({
        title: "Error",
        description: "Failed to fetch IP whitelist.",
        variant: "destructive"
      });
    } finally {
      setIpListLoading(false);
    }
  };
  
  // Add IP to blacklist
  const addToBlacklist = async () => {
    if (!isAuthenticated || !newIPAddress.trim()) return;
    
    try {
      setIpListLoading(true);
      const response = await fetch(`/api/ip-blacklist?key=${encodeURIComponent(apiKey.trim())}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ipAddress: newIPAddress.trim(),
          reason: newIPReason.trim() || 'Manually blocked from admin',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add IP to blacklist');
      }
      
      toast({
        title: "Success",
        description: `IP ${newIPAddress} added to blacklist.`,
      });
      
      // Clear form and refresh blacklist
      setNewIPAddress('');
      setNewIPReason('');
      fetchBlacklist();
    } catch (error) {
      console.error('Error adding to blacklist:', error);
      toast({
        title: "Error",
        description: "Failed to add IP to blacklist.",
        variant: "destructive"
      });
    } finally {
      setIpListLoading(false);
    }
  };
  
  // Remove IP from blacklist
  const removeFromBlacklist = async (ipAddress: string) => {
    if (!isAuthenticated) return;
    
    try {
      setIpListLoading(true);
      const response = await fetch(`/api/ip-blacklist/${encodeURIComponent(ipAddress)}?key=${encodeURIComponent(apiKey.trim())}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove IP from blacklist');
      }
      
      toast({
        title: "Success",
        description: `IP ${ipAddress} removed from blacklist.`,
      });
      
      // Refresh blacklist
      fetchBlacklist();
    } catch (error) {
      console.error('Error removing from blacklist:', error);
      toast({
        title: "Error",
        description: "Failed to remove IP from blacklist.",
        variant: "destructive"
      });
    } finally {
      setIpListLoading(false);
    }
  };
  
  // Add IP to whitelist
  const addToWhitelist = async () => {
    if (!isAuthenticated || !newIPAddress.trim()) return;
    
    try {
      setIpListLoading(true);
      const response = await fetch(`/api/ip-whitelist?key=${encodeURIComponent(apiKey.trim())}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ipAddress: newIPAddress.trim(),
          reason: newIPReason.trim() || 'Manually whitelisted from admin',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add IP to whitelist');
      }
      
      toast({
        title: "Success",
        description: `IP ${newIPAddress} added to whitelist.`,
      });
      
      // Clear form and refresh whitelist
      setNewIPAddress('');
      setNewIPReason('');
      fetchWhitelist();
    } catch (error) {
      console.error('Error adding to whitelist:', error);
      toast({
        title: "Error",
        description: "Failed to add IP to whitelist.",
        variant: "destructive"
      });
    } finally {
      setIpListLoading(false);
    }
  };
  
  // Remove IP from whitelist
  const removeFromWhitelist = async (ipAddress: string) => {
    if (!isAuthenticated) return;
    
    try {
      setIpListLoading(true);
      const response = await fetch(`/api/ip-whitelist/${encodeURIComponent(ipAddress)}?key=${encodeURIComponent(apiKey.trim())}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove IP from whitelist');
      }
      
      toast({
        title: "Success",
        description: `IP ${ipAddress} removed from whitelist.`,
      });
      
      // Refresh whitelist
      fetchWhitelist();
    } catch (error) {
      console.error('Error removing from whitelist:', error);
      toast({
        title: "Error",
        description: "Failed to remove IP from whitelist.",
        variant: "destructive"
      });
    } finally {
      setIpListLoading(false);
    }
  };

  // Fetch Cloudflare credentials
  const fetchCloudflareCredentials = async () => {
    if (!isAuthenticated) return;
    
    try {
      const params = new URLSearchParams();
      params.append('key', apiKey.trim());
      
      const response = await fetch(`/api/cloudflare/credentials?${params.toString()}`);
      
      if (response.status === 401) {
        toast({
          title: "Authentication Failed",
          description: "Invalid API key. Please check and try again.",
          variant: "destructive"
        });
        setIsAuthenticated(false);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Fetch CloudFlare credentials error:', errorData);
        
        // Keep the current state if there's an error fetching credentials
        // This prevents controlled component warnings
        return;
      }
      
      const data = await response.json();
      console.log('CloudFlare credentials response:', data);
      
      if (data.credentials) {
        setCloudflareCredentials({
          ...cloudflareCredentials,
          ...data.credentials,
          isConfigured: true,
          // Preserve the development options
          skipValidation: cloudflareCredentials.skipValidation,
          useMockMode: cloudflareCredentials.useMockMode
        });
      } else {
        // If no credentials returned, set as not configured but keep form values
        // This prevents controlled component warnings when switching back to the form
        setCloudflareCredentials({
          ...cloudflareCredentials,
          isConfigured: false
        });
      }
    } catch (error) {
      console.error('Error fetching CloudFlare credentials:', error);
      // Don't reset the form on error to prevent controlled component warnings
    }
  };
  
  // Save Cloudflare credentials
  const saveCloudflareCredentials = async () => {
    if (!isAuthenticated) return;
    
    try {
      setCloudflareCredentialsLoading(true);
      
      // Build query parameters for skipValidation option
      const params = new URLSearchParams();
      params.append('key', apiKey.trim());
      
      // Skip validation in development mode or if explicitly requested
      if (cloudflareCredentials.skipValidation) {
        params.append('skipValidation', 'true');
        console.log('Skipping CloudFlare credentials validation');
      }
      
      console.log('Saving CloudFlare credentials with params:', params.toString());
      const response = await fetch(`/api/cloudflare/credentials?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentials: {
            apiKey: cloudflareCredentials.apiKey || '',
            email: cloudflareCredentials.email || '',
            accountId: cloudflareCredentials.accountId || '',
            zoneId: cloudflareCredentials.zoneId || '',
          }
        }),
      });
      
      const data = await response.json();
      console.log('Save CloudFlare credentials response:', data);
      
      if (!response.ok) {
        console.error('Save CloudFlare credentials error:', data);
        
        // Display toast with suggestion if available
        if (data.suggestion) {
          toast({
            title: "Error",
            description: `${data.error}. ${data.suggestion}`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: data.error || 'Failed to save CloudFlare credentials',
            variant: "destructive"
          });
        }
        return;
      }
      
      toast({
        title: "Success",
        description: "CloudFlare credentials saved successfully.",
      });
      
      // Refresh credentials to get the updated state
      await fetchCloudflareCredentials();
    } catch (error) {
      console.error('Error saving CloudFlare credentials:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save CloudFlare credentials.",
        variant: "destructive"
      });
    } finally {
      setCloudflareCredentialsLoading(false);
    }
  };
  
  // Clear Cloudflare credentials
  const clearCloudflareCredentials = async () => {
    if (!isAuthenticated) return;
    
    // Confirm with the user before deleting
    if (!window.confirm('Are you sure you want to remove your Cloudflare credentials? This action cannot be undone.')) {
      return;
    }
    
    try {
      setCloudflareCredentialsLoading(true);
      const response = await fetch(`/api/cloudflare/credentials?key=${encodeURIComponent(apiKey.trim())}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear Cloudflare credentials');
      }
      
      toast({
        title: "Success",
        description: "Cloudflare credentials removed successfully.",
      });
      
      setCloudflareCredentials({
        apiKey: '',
        email: '',
        accountId: '',
        zoneId: '',
        isConfigured: false
      });
      setCloudflareLogs([]);
    } catch (error) {
      console.error('Error clearing Cloudflare credentials:', error);
      toast({
        title: "Error",
        description: "Failed to clear Cloudflare credentials.",
        variant: "destructive"
      });
    } finally {
      setCloudflareCredentialsLoading(false);
    }
  };
  
  // Fetch Cloudflare logs
  const fetchCloudflareLogs = async () => {
    if (!isAuthenticated) return;
    
    try {
      setCloudflareLogsLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('key', apiKey.trim());
      
      if (cloudflareLogFilters.startDate) {
        params.append('startDate', cloudflareLogFilters.startDate);
      }
      
      if (cloudflareLogFilters.endDate) {
        params.append('endDate', cloudflareLogFilters.endDate);
      }
      
      if (cloudflareLogFilters.ipAddress) {
        params.append('ipAddress', cloudflareLogFilters.ipAddress);
      }
      
      if (cloudflareLogFilters.botScore) {
        params.append('botScore', cloudflareLogFilters.botScore);
      }
      
      // Add mockMode=true for testing without real credentials
      if (!cloudflareCredentials.isConfigured || cloudflareCredentials.useMockMode) {
        params.append('mockMode', 'true');
        console.log('Using mock mode for CloudFlare logs');
      }
      
      params.append('page', cloudflareLogFilters.page.toString());
      params.append('limit', cloudflareLogFilters.limit.toString());
      
      console.log('Fetching CloudFlare logs with params:', params.toString());
      const response = await fetch(`/api/cloudflare/logs?${params.toString()}`);
      
      if (response.status === 401) {
        toast({
          title: "Authentication Failed",
          description: "Invalid API key. Please check and try again.",
          variant: "destructive"
        });
        setIsAuthenticated(false);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('CloudFlare logs error response:', errorData);
        
        if (errorData.suggestion) {
          toast({
            title: "Error",
            description: `${errorData.error}. ${errorData.suggestion}`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: errorData.error || 'Failed to fetch CloudFlare logs',
            variant: "destructive"
          });
        }
        return;
      }
      
      const data = await response.json();
      console.log('CloudFlare logs response:', data);
      
      if (!data || (!data.logs && !Array.isArray(data))) {
        console.error('Invalid CloudFlare logs format:', data);
        toast({
          title: "Error",
          description: "Invalid response format from server",
          variant: "destructive"
        });
        return;
      }
      
      // Handle both response formats - direct array or data.logs
      const logsArray = Array.isArray(data) ? data : (Array.isArray(data.logs) ? data.logs : []);
      setCloudflareLogs(logsArray);
      
      if (data.pagination) {
        setCloudflarePagination(data.pagination);
      }
      
      toast({
        title: "Success",
        description: `Retrieved ${logsArray.length} CloudFlare logs.`,
      });
    } catch (error) {
      console.error('Error fetching CloudFlare logs:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch CloudFlare logs.",
        variant: "destructive"
      });
    } finally {
      setCloudflareLogsLoading(false);
    }
  };
  
  // Import Cloudflare logs to local storage
  const importCloudflareLogs = async () => {
    if (!isAuthenticated || !cloudflareCredentials.isConfigured || cloudflareLogs.length === 0) return;
    
    // Confirm with the user before importing logs
    if (!window.confirm(`Are you sure you want to import ${cloudflareLogs.length} Cloudflare logs to your local storage?`)) {
      return;
    }
    
    try {
      setCloudflareLogsLoading(true);
      const response = await fetch(`/api/cloudflare/import-logs?key=${encodeURIComponent(apiKey.trim())}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: cloudflareLogs
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to import Cloudflare logs');
      }
      
      const data = await response.json();
      
      toast({
        title: "Success",
        description: `Imported ${data.importedCount} Cloudflare logs to local storage.`,
      });
      
      // Refresh the logs tab
      fetchLogs();
    } catch (error) {
      console.error('Error importing Cloudflare logs:', error);
      toast({
        title: "Error",
        description: "Failed to import Cloudflare logs.",
        variant: "destructive"
      });
    } finally {
      setCloudflareLogsLoading(false);
    }
  };
  
  // Handle page change for Cloudflare logs pagination
  const handleCloudflarePageChange = (newPage: number) => {
    setCloudflareLogFilters({
      ...cloudflareLogFilters,
      page: newPage
    });
  };
  
  // Load Cloudflare data when authenticated
  useEffect(() => {
    if (isAuthenticated && activeTab === 'cloudflare') {
      fetchCloudflareCredentials();
    }
  }, [isAuthenticated, activeTab]);
  
  // Load Cloudflare logs when credentials are configured
  useEffect(() => {
    if (isAuthenticated && activeTab === 'cloudflare' && cloudflareCredentials.isConfigured) {
      fetchCloudflareLogs();
    }
  }, [isAuthenticated, activeTab, cloudflareCredentials.isConfigured, cloudflareLogFilters.page]);

  // When tab changes to ip-management, fetch ip lists
  useEffect(() => {
    if (activeTab === 'ip-management' && isAuthenticated) {
      if (ipManagementTab === 'blacklist') {
        fetchBlacklist();
      } else {
        fetchWhitelist();
      }
    }
  }, [activeTab, isAuthenticated, ipManagementTab]);

  // Fetch appropriate data when tab changes
  useEffect(() => {
    if (isAuthenticated) {
      switch (activeTab) {
        case 'analytics':
          fetchAnalytics();
          break;
        case 'logs':
          fetchLogs();
          break;
        case 'ip-management':
          if (ipManagementTab === 'blacklist') {
            fetchBlacklist();
          } else {
            fetchWhitelist();
          }
          break;
        case 'bot-policy':
          fetchBotPolicy();
          break;
      }
    }
  }, [activeTab, isAuthenticated, ipManagementTab]);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Bot Protection Admin</h1>
      
      {!isAuthenticated ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <div className="flex gap-2 mb-4">
            <Input 
              type="password" 
              placeholder="Enter API Key" 
              value={apiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleAuthenticate()}
            />
            <Button onClick={handleAuthenticate} disabled={loading}>
              {loading ? 'Authenticating...' : 'Authenticate'}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Tabbed Navigation */}
          <div className="flex border-b mb-6">
            <button 
              className={`px-4 py-2 font-medium flex items-center ${activeTab === 'analytics' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('analytics')}
            >
              <PieChart className="w-4 h-4 mr-2" />
              Analytics
            </button>
            <button 
              className={`px-4 py-2 font-medium flex items-center ${activeTab === 'logs' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('logs')}
            >
              <List className="w-4 h-4 mr-2" />
              Logs
            </button>
            <button 
              className={`px-4 py-2 font-medium flex items-center ${activeTab === 'ip-management' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('ip-management')}
            >
              <Settings className="w-4 h-4 mr-2" />
              IP Management
            </button>
            <button 
              className={`px-4 py-2 font-medium flex items-center ${activeTab === 'bot-policy' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('bot-policy')}
            >
              <Shield className="w-4 h-4 mr-2" />
              Bot Policy
            </button>
            <button 
              className={`px-4 py-2 font-medium flex items-center ${activeTab === 'cloudflare' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('cloudflare')}
            >
              <FileText className="w-4 h-4 mr-2" />
              CloudFlare
            </button>
          </div>
          
          {/* Render the active tab content */}
          {renderTabContent()}
        </>
      )}
    </div>
  );
};

export default AdminPage;
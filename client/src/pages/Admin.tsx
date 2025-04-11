import { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, PieChart, List, Activity, FileText, Users, Shield, Cloud } from 'lucide-react';
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
type TabType = 'analytics' | 'logs' | 'fastly';

// COLORS for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

const AdminPage = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [fastlyLogs, setFastlyLogs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  
  // States for UI controls
  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const [loading, setLoading] = useState(false);
  const [fastlyLoading, setFastlyLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // User inputs
  const [apiKey, setApiKey] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [fastlyApiKey, setFastlyApiKey] = useState('');
  const [fastlyServiceId, setFastlyServiceId] = useState('');
  const [fastlyConfigured, setFastlyConfigured] = useState(false);
  
  // For log polling
  const [lastLogCount, setLastLogCount] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

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

  // Function to fetch Fastly CDN logs
  const fetchFastlyLogs = async (isRefresh = false) => {
    try {
      setFastlyLoading(true);
      
      // Fetch logs from our own server storage instead of directly from Fastly
      const response = await fetch(`/api/logs?source=fastly&key=${encodeURIComponent(apiKey.trim())}`);
      
      if (response.status === 401) {
        toast({
          title: "Authentication Failed",
          description: "Invalid API key. Please check and try again.",
          variant: "destructive"
        });
        setIsAuthenticated(false);
        setFastlyLoading(false);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Fastly logs error:', errorData);
        throw new Error(errorData.error || `Failed to fetch Fastly logs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Filter for Fastly logs only
      const fastlyLogs = data.logs ? data.logs.filter((log: any) => log.source === 'fastly') : [];
      
      if (fastlyLogs.length > 0) {
        setFastlyLogs(fastlyLogs);
        
        if (!isRefresh) {
          toast({
            title: "Success",
            description: `Loaded ${fastlyLogs.length} Fastly CDN logs`,
            variant: "default"
          });
        }
      } else {
        setFastlyLogs([]);
        
        if (!isRefresh) {
          toast({
            title: "No Logs Found",
            description: "No Fastly CDN logs available yet. Check your Fastly configuration to ensure logs are being sent to your endpoint.",
            variant: "default"
          });
        }
      }
    } catch (error) {
      console.error('Error fetching Fastly logs:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch Fastly logs",
        variant: "destructive"
      });
    } finally {
      setFastlyLoading(false);
    }
  };

  // Function to save Fastly credentials
  const saveFastlyCredentials = async () => {
    try {
      setFastlyLoading(true);
      
      if (!fastlyApiKey || !fastlyServiceId) {
        toast({
          title: "Missing Fields",
          description: "Please enter both API Key and Service ID",
          variant: "destructive"
        });
        setFastlyLoading(false);
        return;
      }
      
      const response = await fetch('/api/fastly-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey.trim()
        },
        body: JSON.stringify({
          apiKey: fastlyApiKey,
          serviceId: fastlyServiceId
        })
      });
      
      if (response.status === 401) {
        toast({
          title: "Authentication Failed",
          description: "Invalid API key. Please check and try again.",
          variant: "destructive"
        });
        setIsAuthenticated(false);
        setFastlyLoading(false);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save Fastly credentials');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setFastlyConfigured(true);
        
        // Save to localStorage for convenience
        localStorage.setItem('fastlyApiKey', fastlyApiKey);
        localStorage.setItem('fastlyServiceId', fastlyServiceId);
        
        toast({
          title: "Success",
          description: "Fastly credentials saved successfully",
          variant: "default"
        });
        
        // Fetch logs with the new credentials
        fetchFastlyLogs();
      }
    } catch (error) {
      console.error('Error saving Fastly credentials:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save Fastly credentials",
        variant: "destructive"
      });
    } finally {
      setFastlyLoading(false);
    }
  };

  // Function to check if Fastly is configured
  const checkFastlyConfiguration = async () => {
    try {
      if (!isAuthenticated || !apiKey) {
        return;
      }
      
      setFastlyLoading(true);
      const response = await fetch(`/api/fastly-credentials?key=${encodeURIComponent(apiKey.trim())}`);
      
      if (!response.ok) {
        console.error('Failed to check Fastly configuration:', response.status, response.statusText);
        setFastlyConfigured(false);
        setFastlyLoading(false);
        return;
      }
      
      const data = await response.json();
      
      // Only set configured if we have both serviceId and a valid API key
      if (data.success && data.isConfigured && data.serviceId) {
        // Get API key from localStorage
        const storedApiKey = localStorage.getItem('fastlyApiKey');
        
        if (storedApiKey) {
          setFastlyApiKey(storedApiKey);
          setFastlyServiceId(data.serviceId || '');
          setFastlyConfigured(true);
        } else {
          // We have a stored configuration but missing API key in localStorage
          setFastlyConfigured(false);
          toast({
            title: "Incomplete Configuration",
            description: "Fastly Service ID found, but API Key is missing. Please re-enter your credentials.",
            variant: "destructive"
          });
        }
      } else {
        setFastlyConfigured(false);
      }
      setFastlyLoading(false);
    } catch (error) {
      console.error('Error checking Fastly configuration:', error);
      setFastlyConfigured(false);
      setFastlyLoading(false);
    }
  };

  // Setup automatic polling for new logs
  useEffect(() => {
    // Clear any existing interval when component mounts or unmounts
    if (pollRef.current) {
      clearInterval(pollRef.current);
    }
    
    // Only start polling if authenticated and auto-refresh is enabled
    if (isAuthenticated) {
      console.log('Starting real-time log polling...');
      
      // Poll every 5 seconds for new logs (silently)
      pollRef.current = setInterval(() => {
        console.log('Polling for new logs...');
        fetchLogs(false, true);
      }, 5000);
    }
    
    // Cleanup interval on unmount
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [isAuthenticated]);

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

  // Clear system logs (admin, dev paths)
  const clearSystemLogs = async () => {
    if (!isAuthenticated) return;
    
    if (!confirm('This will remove all logs for admin and development paths. Continue?')) {
      return;
    }
    
    try {
      setLoading(true);
      toast({
        title: "Processing",
        description: "Clearing system logs...",
      });
      
      const response = await fetch(`/api/clear-system-logs?key=${encodeURIComponent(apiKey.trim())}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey.trim()
        }
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
        throw new Error('Failed to clear system logs');
      }
      
      toast({
        title: "Success",
        description: "System logs have been cleared.",
      });
      
      // Refresh logs
      fetchLogs(true);
    } catch (error) {
      console.error('Error clearing system logs:', error);
      toast({
        title: "Error",
        description: "Failed to clear system logs.",
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

  // Format path for display
  const formatPath = (path: string | null): string => {
    if (!path) return 'N/A';
    
    // Format root path
    if (path === '/') return 'home';
    
    // Format API paths
    if (path.startsWith('/api/')) return `API: ${path.substring(5)}`;
    
    // Format Vite/dev paths
    if (path.startsWith('/@')) return `Dev: ${path}`;
    
    return path;
  };

  // Format bot type for display
  const formatBotType = (botType: string | null): string => {
    if (!botType) return 'N/A';
    
    // Map technical bot types to user-friendly descriptions
    const botTypeMap: Record<string, string> = {
      'search_engine': 'Search Engine Bot',
      'crawler': 'Web Crawler',
      'automation': 'Automation Tool',
      'generic_bot': 'Generic Bot',
      'ai_assistant': 'AI Assistant',
      'scraping_tool': 'Scraping Tool',
      'possible_ai': 'Potential AI User',
      'timing_anomaly': 'Behavioral Anomaly',
      'authorized_bot': 'Authorized Bot',
      'human': 'Human Visitor',
      'unknown': 'Unknown'
    };
    
    return botTypeMap[botType] || botType;
  };

  // Get color class for bot type
  const getBotTypeColorClass = (botType: string | null): string => {
    if (!botType) return 'text-gray-500';
    
    // Color mapping for different bot types
    if (['search_engine', 'authorized_bot'].includes(botType)) {
      return 'text-green-600 font-medium'; // Known good bots
    } else if (['crawler', 'scraping_tool'].includes(botType)) {
      return 'text-amber-600 font-medium'; // Neutral bots
    } else if (['automation', 'timing_anomaly', 'possible_ai'].includes(botType)) {
      return 'text-blue-600 font-medium'; // Potentially suspicious
    } else if (['ai_assistant', 'generic_bot'].includes(botType)) {
      return 'text-purple-600 font-medium'; // AI-related
    } else if (botType === 'human') {
      return 'text-green-700 font-medium'; // Human visitors
    }
    
    return 'text-gray-600'; // Default for unknown types
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
        name: formatPath(path),
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
                <ResponsiveContainer width="100%" height={350}>
                  <RechartPieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <Pie
                      data={sourceDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      cornerRadius={3}
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={true}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sourceDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} visits`, name]} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" />
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
            <div className="flex justify-between items-center mb-4">
              <div className="flex space-x-2">
                <Button onClick={() => fetchLogs(true)} disabled={loading} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={exportLogs} disabled={loading} variant="outline" size="sm">
                  Export Logs
                </Button>
                <Button onClick={clearSystemLogs} disabled={loading} variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50">
                  Clear System Logs
                </Button>
                <Button onClick={clearAllLogs} disabled={loading} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                  Clear All
                </Button>
              </div>
              <div className="flex space-x-2">
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
                          <TableCell>{formatPath(log.path)}</TableCell>
                          <TableCell>{log.country || 'N/A'}</TableCell>
                          <TableCell>
                            <span className={log.isBotConfirmed ? 'text-red-500' : 'text-green-500'}>
                              {log.isBotConfirmed ? 'Yes' : 'No'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={getBotTypeColorClass(log.botType)}>
                              {formatBotType(log.botType)}
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
              <p>Real-time updates: Enabled</p>
            </div>
          </>
        );
      
      case 'fastly':
        return (
          <>
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Fastly CDN Logs</h2>
              
              {!fastlyConfigured ? (
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">Configure Fastly Credentials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Fastly API Key</label>
                      <Input 
                        type="password" 
                        placeholder="Enter Fastly API Key" 
                        value={fastlyApiKey}
                        onChange={(e) => setFastlyApiKey(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Find this in your Fastly account under Personal API tokens
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fastly Service ID</label>
                      <Input 
                        type="text" 
                        placeholder="Enter Fastly Service ID" 
                        value={fastlyServiceId}
                        onChange={(e) => setFastlyServiceId(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Find this in your service configuration or URL
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={saveFastlyCredentials}
                      disabled={fastlyLoading || !fastlyApiKey || !fastlyServiceId}
                    >
                      {fastlyLoading ? 'Saving...' : 'Save Credentials'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        if (fastlyApiKey && fastlyServiceId) {
                          fetchFastlyLogs();
                        } else {
                          toast({
                            title: "Missing Fields",
                            description: "Please enter both API Key and Service ID",
                            variant: "destructive"
                          });
                        }
                      }}
                      disabled={fastlyLoading || !fastlyApiKey || !fastlyServiceId}
                    >
                      Test Connection
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    You can find your Fastly API key in your Fastly account settings under "Personal API tokens" and your Service ID in the service configuration.
                  </p>
                </div>
              ) : (
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Service ID:</span> {fastlyServiceId}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Endpoint:</span> https://rt.fastly.com/v1/channel/{fastlyServiceId}/logs
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFastlyConfigured(false)}
                    >
                      Change Credentials
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fetchFastlyLogs(true)}
                      disabled={fastlyLoading}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Client IP</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cache</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>Bytes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fastlyLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4">
                          Loading Fastly logs...
                        </TableCell>
                      </TableRow>
                    ) : fastlyLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4">
                          No Fastly logs available. {!fastlyConfigured && 'Configure your Fastly credentials to view logs.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      fastlyLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{formatDate(log.timestamp)}</TableCell>
                          <TableCell>{log.clientIP}</TableCell>
                          <TableCell>{log.method || 'N/A'}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={log.url}>
                            {log.url || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <span className={
                              log.status >= 200 && log.status < 300 ? 'text-green-500' :
                              log.status >= 400 && log.status < 500 ? 'text-orange-500' :
                              log.status >= 500 ? 'text-red-500' : 'text-gray-500'
                            }>
                              {log.status || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>{log.cacheStatus || 'N/A'}</TableCell>
                          <TableCell>{log.country || 'N/A'}</TableCell>
                          <TableCell>{log.responseTime ? `${log.responseTime}ms` : 'N/A'}</TableCell>
                          <TableCell>{log.bytesSent ? `${(log.bytesSent / 1024).toFixed(2)}KB` : 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                <p>Total logs: {fastlyLogs.length}</p>
                <p>Last updated: {new Date().toLocaleString()}</p>
              </div>
            </Card>
          </>
        );
      default:
        return <div>Select a tab to view content</div>;
    }
  };

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
        case 'fastly':
          checkFastlyConfiguration();
          if (fastlyConfigured) {
            fetchFastlyLogs();
          }
          break;
      }
    }
  }, [activeTab, isAuthenticated]);

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
              className={`px-4 py-2 font-medium ${activeTab === 'analytics' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('analytics')}
            >
              <PieChart className="w-4 h-4 mr-2" />
              Analytics
            </button>
            <button 
              className={`px-4 py-2 font-medium ${activeTab === 'logs' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('logs')}
            >
              <List className="w-4 h-4 mr-2" />
              Logs
            </button>
            <button 
              className={`px-4 py-2 font-medium ${activeTab === 'fastly' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('fastly')}
            >
              <Cloud className="w-4 h-4 mr-2" />
              Fastly CDN
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
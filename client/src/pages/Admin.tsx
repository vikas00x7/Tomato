import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface BotLog {
  id: number;
  timestamp: string;
  ipAddress: string;
  userAgent: string | null;
  path: string | null;
  country: string | null;
  isBotConfirmed: boolean;
  bypassAttempt: boolean;
  source: string | null;
}

const AdminPage = () => {
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ipFilter, setIpFilter] = useState('');
  const { toast } = useToast();

  // Function to fetch logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      console.log('Using API key:', apiKey);
      
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
      setLogs(data.logs || []);
      setIsAuthenticated(true);
      
      // Success toast
      toast({
        title: "Success",
        description: "Authentication successful!",
      });
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch logs. Check your API key.",
        variant: "destructive"
      });
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to fetch logs by IP
  const fetchLogsByIp = async () => {
    if (!ipFilter.trim()) {
      fetchLogs();
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/logs/ip/${ipFilter}?key=${encodeURIComponent(apiKey.trim())}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching logs by IP:', error);
      toast({
        title: "Error",
        description: "Failed to fetch logs by IP.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to export logs
  const exportLogs = async () => {
    try {
      window.open(`/api/logs/export?key=${encodeURIComponent(apiKey.trim())}`, '_blank');
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        title: "Error",
        description: "Failed to export logs.",
        variant: "destructive"
      });
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
        description: "Please enter an API key.",
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
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Bot Protection Admin</h1>
      
      {!isAuthenticated ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAuthenticate();
          }} className="mb-4">
            <div className="flex gap-4">
              <Input
                type="password"
                placeholder="Enter API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="max-w-md"
                autoFocus
              />
              <Button type="submit">Authenticate</Button>
            </div>
          </form>
          <div className="text-sm text-gray-500 space-y-2">
            <p>You need an API key to access this page. Contact the administrator for access.</p>
            <p>Default API Key for testing: <code className="bg-gray-100 p-1 rounded">tomato-api-key-9c8b7a6d5e4f3g2h1i</code></p>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-start">
            <Card className="p-4 w-full md:w-auto">
              <div className="flex gap-4 items-center">
                <Input
                  type="text"
                  placeholder="Filter by IP address"
                  value={ipFilter}
                  onChange={(e) => setIpFilter(e.target.value)}
                  className="w-64"
                />
                <Button onClick={handleFilterByIp} disabled={loading}>
                  {loading ? 'Loading...' : 'Filter'}
                </Button>
                <Button onClick={() => {setIpFilter(''); fetchLogs()}} variant="outline" disabled={loading}>
                  Clear
                </Button>
              </div>
            </Card>
            
            <div className="ml-auto flex gap-2">
              <Button 
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/add-test-log?key=${encodeURIComponent(apiKey.trim())}`);
                    if (response.ok) {
                      toast({
                        title: "Success",
                        description: "Test log added successfully",
                      });
                      fetchLogs();
                    } else {
                      throw new Error('Failed to add test log');
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to add test log",
                      variant: "destructive"
                    });
                  }
                }} 
                variant="outline"
              >
                Add Test Log
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
                    <TableHead>Bypass</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">No logs found</TableCell>
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
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPage;
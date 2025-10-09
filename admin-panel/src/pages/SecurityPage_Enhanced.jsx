import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  LocationOn as LocationIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { securityAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';

const getActivityColor = (activityType) => {
  const colors = {
    login_success: 'success',
    login_failed: 'error',
    password_change: 'info',
    account_banned: 'error',
    account_activated: 'success',
    suspicious_activity: 'warning',
  };
  return colors[activityType] || 'default';
};

const getActivityLabel = (activityType) => {
  const labels = {
    login_success: 'Başarılı Giriş',
    login_failed: 'Başarısız Giriş',
    password_change: 'Şifre Değişikliği',
    account_banned: 'Hesap Banlandı',
    account_activated: 'Hesap Aktif Edildi',
    suspicious_activity: 'Şüpheli Aktivite',
  };
  return labels[activityType] || activityType;
};

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
  <Card sx={{ 
    height: '100%',
    background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
    border: `1px solid ${color}30`,
  }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography color="text.secondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Typography variant="caption" sx={{ 
              color: trend > 0 ? 'error.main' : 'success.main',
              mt: 0.5,
              display: 'block'
            }}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% önceki haftaya göre
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: 2,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 14px 0 ${color}40`,
          }}
        >
          <Icon sx={{ color: 'white', fontSize: 32 }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function SecurityPageEnhanced() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  
  // Filtreler
  const [activityType, setActivityType] = useState('all');
  const [dateRange, setDateRange] = useState('7days');
  const [searchIP, setSearchIP] = useState('');

  // İstatistikler
  const [stats, setStats] = useState({
    totalEvents: 0,
    failedLogins: 0,
    suspiciousActivities: 0,
    successfulLogins: 0,
    blockedIPs: 0,
    trends: {}
  });

  useEffect(() => {
    fetchEvents();
    fetchStats();
  }, [page, rowsPerPage, activityType, dateRange, searchIP]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await securityAPI.getEvents({
        page: page + 1,
        limit: rowsPerPage,
        activityType: activityType !== 'all' ? activityType : undefined,
        dateRange,
        searchIP,
      });
      
      setEvents(response.data.events);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching security events:', error);
      toast.error('Güvenlik olayları yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    // Gerçek API'ye bağlanınca bu kısım çalışacak
    // Şimdilik mock data
    setStats({
      totalEvents: events.length,
      failedLogins: events.filter(e => e.activity_type === 'login_failed').length,
      suspiciousActivities: events.filter(e => e.activity_type === 'suspicious_activity').length,
      successfulLogins: events.filter(e => e.activity_type === 'login_success').length,
      blockedIPs: 3,
      trends: {
        failedLogins: 15,
        suspiciousActivities: -10,
      }
    });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRefresh = () => {
    fetchEvents();
    fetchStats();
    toast.success('Veriler güncellendi');
  };

  const handleExport = () => {
    // CSV export fonksiyonu
    const csv = [
      ['Tarih', 'Kullanıcı', 'Email', 'Aktivite', 'Açıklama', 'IP'],
      ...events.map(event => [
        format(new Date(event.created_at), 'dd/MM/yyyy HH:mm:ss'),
        `${event.first_name || ''} ${event.last_name || ''}`,
        event.email || '',
        getActivityLabel(event.activity_type),
        event.description,
        event.ip_address || '-'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-events-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Rapor indirildi');
  };

  return (
    <Box>
      {/* Başlık ve Aksiyonlar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          🔒 Güvenlik Merkezi
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Yenile
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
          >
            Rapor İndir
          </Button>
        </Box>
      </Box>

      {/* Uyarı Mesajları */}
      {stats.suspiciousActivities > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
          <strong>Dikkat!</strong> Son 24 saatte {stats.suspiciousActivities} şüpheli aktivite tespit edildi.
        </Alert>
      )}

      {/* İstatistik Kartları */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Toplam Olay"
            value={total}
            subtitle="Son 7 gün"
            icon={AccessTimeIcon}
            color="#3b82f6"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Başarısız Giriş"
            value={stats.failedLogins}
            subtitle="Dikkat gerektirir"
            icon={ErrorIcon}
            color="#ef4444"
            trend={stats.trends.failedLogins}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Şüpheli Aktivite"
            value={stats.suspiciousActivities}
            subtitle="İnceleme gerekli"
            icon={WarningIcon}
            color="#f59e0b"
            trend={stats.trends.suspiciousActivities}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Bloklu IP"
            value={stats.blockedIPs}
            subtitle="Aktif yasaklar"
            icon={BlockIcon}
            color="#dc2626"
          />
        </Grid>
      </Grid>

      {/* Filtreler */}
      <Paper sx={{ mb: 3, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FilterIcon />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Filtrele
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Aktivite Türü</InputLabel>
              <Select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                label="Aktivite Türü"
              >
                <MenuItem value="all">Tümü</MenuItem>
                <MenuItem value="login_failed">Başarısız Giriş</MenuItem>
                <MenuItem value="login_success">Başarılı Giriş</MenuItem>
                <MenuItem value="suspicious_activity">Şüpheli Aktivite</MenuItem>
                <MenuItem value="password_change">Şifre Değişikliği</MenuItem>
                <MenuItem value="account_banned">Hesap Banlandı</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Tarih Aralığı</InputLabel>
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                label="Tarih Aralığı"
              >
                <MenuItem value="24hours">Son 24 Saat</MenuItem>
                <MenuItem value="7days">Son 7 Gün</MenuItem>
                <MenuItem value="30days">Son 30 Gün</MenuItem>
                <MenuItem value="90days">Son 90 Gün</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="IP Adresi Ara..."
              value={searchIP}
              onChange={(e) => setSearchIP(e.target.value)}
              InputProps={{
                startAdornment: <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Güvenlik Olayları Tablosu */}
      <Paper>
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Güvenlik Olayları
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Toplam {total} olay kaydı
          </Typography>
        </Box>

        <TableContainer>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : events.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Henüz güvenlik olayı yok
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Kullanıcı giriş denemeleri ve diğer güvenlik olayları burada görünecek
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tarih/Saat</TableCell>
                  <TableCell>Kullanıcı</TableCell>
                  <TableCell>Aktivite Türü</TableCell>
                  <TableCell>Açıklama</TableCell>
                  <TableCell>IP Adresi</TableCell>
                  <TableCell align="right">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {format(new Date(event.created_at), 'dd/MM/yyyy')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(event.created_at), 'HH:mm:ss')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {event.first_name} {event.last_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {event.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getActivityLabel(event.activity_type)}
                        color={getActivityColor(event.activity_type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{event.description}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {event.ip_address || '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="IP'yi Engelle">
                        <IconButton size="small" color="error">
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Sayfa başına satır:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </Paper>
    </Box>
  );
}


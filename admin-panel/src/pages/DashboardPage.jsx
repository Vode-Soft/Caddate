import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  CardMembership as SubscriptionIcon,
  Photo as PhotoIcon,
  Message as MessageIcon,
  DirectionsCar as VehicleIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { dashboardAPI } from '../services/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'react-toastify';

const StatCard = ({ title, value, subtitle, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            backgroundColor: color || 'primary.main',
            borderRadius: 2,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('İstatistikler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          İstatistikler yüklenemedi
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Backend'in çalıştığından ve database bağlantısının aktif olduğundan emin olun
        </Typography>
      </Box>
    );
  }

  // Boş veri kontrolü - Eğer hiç kullanıcı yoksa
  const hasData = stats.users?.total_users > 0;

  // Grafik verisini hazırla
  const userGrowthData = stats.userGrowth?.map(item => ({
    date: format(new Date(item.date), 'dd MMM', { locale: tr }),
    kullanicilar: parseInt(item.count),
  })).reverse() || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Dashboard
        </Typography>
        {!hasData && (
          <Typography variant="body2" color="warning.main" sx={{ 
            backgroundColor: 'warning.light', 
            px: 2, 
            py: 1, 
            borderRadius: 1 
          }}>
            ⚠️ Henüz veri yok - Test verisi eklemek için backend/scripts/ADD_TEST_DATA.sql çalıştırın
          </Typography>
        )}
      </Box>

      {/* Üst İstatistik Kartları */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Toplam Kullanıcı"
            value={stats.users?.total_users?.toLocaleString() || '0'}
            subtitle={`${stats.users?.active_users || 0} aktif kullanıcı`}
            icon={<PeopleIcon sx={{ color: 'white', fontSize: 32 }} />}
            color="#1976d2"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Premium Kullanıcılar"
            value={stats.users?.premium_users?.toLocaleString() || '0'}
            subtitle={`Aktif abonelikler: ${stats.subscriptions?.active_subscribers || 0}`}
            icon={<SubscriptionIcon sx={{ color: 'white', fontSize: 32 }} />}
            color="#f57c00"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Toplam Gelir (30 Gün)"
            value={`₺${parseFloat(stats.subscriptions?.revenue_last_30_days || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
            subtitle={`Toplam: ₺${parseFloat(stats.subscriptions?.total_revenue || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
            icon={<TrendingUpIcon sx={{ color: 'white', fontSize: 32 }} />}
            color="#388e3c"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Toplam Fotoğraf"
            value={stats.photos?.total_photos?.toLocaleString() || '0'}
            subtitle={`Bu ay: ${stats.photos?.photos_month || 0}`}
            icon={<PhotoIcon sx={{ color: 'white', fontSize: 28 }} />}
            color="#7b1fa2"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Toplam Mesaj"
            value={stats.messages?.total_messages?.toLocaleString() || '0'}
            subtitle={`Bu ay: ${stats.messages?.messages_month || 0}`}
            icon={<MessageIcon sx={{ color: 'white', fontSize: 28 }} />}
            color="#c2185b"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Araçlar"
            value={stats.vehicles?.total_vehicles?.toLocaleString() || '0'}
            subtitle={`Onaylı: ${stats.vehicles?.verified_vehicles || 0} | Bekleyen: ${stats.vehicles?.pending_vehicles || 0}`}
            icon={<VehicleIcon sx={{ color: 'white', fontSize: 28 }} />}
            color="#0288d1"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Yeni Kullanıcılar (7 Gün)"
            value={stats.users?.new_users_week?.toLocaleString() || '0'}
            subtitle={`Bu ay: ${stats.users?.new_users_month || 0}`}
            icon={<PeopleIcon sx={{ color: 'white', fontSize: 28 }} />}
            color="#00796b"
          />
        </Grid>
      </Grid>

      {/* Grafikler */}
      <Grid container spacing={3}>
        {/* Kullanıcı Artışı Grafiği */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Son 30 Günlük Kullanıcı Artışı
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userGrowthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1976d2" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#1976d2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="kullanicilar" 
                  stroke="#1976d2" 
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Abonelik Durumu */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Abonelik Durumu
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="textSecondary">Aktif Abonelikler</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#388e3c' }}>
                  {stats.subscriptions?.active_subscriptions || 0}
                </Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="textSecondary">İptal Edilenler</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#f57c00' }}>
                  {stats.subscriptions?.cancelled_subscriptions || 0}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Süresi Dolanlar</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
                  {stats.subscriptions?.expired_subscriptions || 0}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Güvenlik Özeti */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Güvenlik Özeti (7 Gün)
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography>Başarısız Giriş Denemeleri</Typography>
                <Typography sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
                  {stats.security?.failed_logins || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography>Şüpheli Aktiviteler</Typography>
                <Typography sx={{ fontWeight: 'bold', color: '#f57c00' }}>
                  {stats.security?.suspicious_activities || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Toplam Güvenlik Olayı</Typography>
                <Typography sx={{ fontWeight: 'bold' }}>
                  {stats.security?.security_events_week || 0}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* İçerik Özeti */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              İçerik Özeti
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography>Toplam Fotoğraf</Typography>
                <Typography sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                  {stats.photos?.total_photos?.toLocaleString() || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography>Son 7 Gün</Typography>
                <Typography sx={{ fontWeight: 'bold', color: '#388e3c' }}>
                  {stats.photos?.photos_week || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Son 30 Gün</Typography>
                <Typography sx={{ fontWeight: 'bold' }}>
                  {stats.photos?.photos_month || 0}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}


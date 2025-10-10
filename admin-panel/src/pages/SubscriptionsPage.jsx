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
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { subscriptionsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const StatCard = ({ title, value, subtitle, icon, color }) => (
  <Card>
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

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState(null);

  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage, filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subscriptionsRes, statsRes] = await Promise.all([
        subscriptionsAPI.getAll({
          page: page + 1,
          limit: rowsPerPage,
          status: filter,
        }),
        subscriptionsAPI.getStats(),
      ]);
      
      setSubscriptions(subscriptionsRes.data.subscriptions);
      setTotal(subscriptionsRes.data.pagination.total || subscriptionsRes.data.subscriptions.length);
      setStats(statsRes.data.stats);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Abonelikler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      cancelled: 'warning',
      expired: 'error',
      pending: 'info',
      failed: 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Aktif',
      cancelled: 'İptal Edildi',
      expired: 'Süresi Doldu',
      pending: 'Bekliyor',
      failed: 'Başarısız',
    };
    return labels[status] || status;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Abonelik Yönetimi
      </Typography>

      {/* İstatistikler */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Aktif Aboneler"
              value={stats.active_subscribers || '0'}
              subtitle={`${stats.active_subscriptions || 0} abonelik`}
              icon={<CheckCircleIcon sx={{ color: 'white', fontSize: 32 }} />}
              color="#388e3c"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="İptal Edilenler"
              value={stats.cancelled_subscriptions || '0'}
              icon={<CancelIcon sx={{ color: 'white', fontSize: 32 }} />}
              color="#f57c00"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Süresi Dolanlar"
              value={stats.expired_subscriptions || '0'}
              icon={<AccessTimeIcon sx={{ color: 'white', fontSize: 32 }} />}
              color="#d32f2f"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Son 30 Gün Gelir"
              value={`₺${parseFloat(stats.revenue_last_30_days || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
              subtitle={`Toplam: ₺${parseFloat(stats.total_revenue || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
              icon={<TrendingUpIcon sx={{ color: 'white', fontSize: 32 }} />}
              color="#1976d2"
            />
          </Grid>
        </Grid>
      )}

      {/* Filtre */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Durum</InputLabel>
          <Select
            value={filter || ''}
            onChange={(e) => {
              setFilter(e.target.value || null);
              setPage(0);
            }}
            label="Durum"
          >
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="active">Aktif</MenuItem>
            <MenuItem value="cancelled">İptal Edildi</MenuItem>
            <MenuItem value="expired">Süresi Doldu</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Tablo */}
      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Kullanıcı</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Başlangıç</TableCell>
                <TableCell>Bitiş</TableCell>
                <TableCell>Ödenen Tutar</TableCell>
                <TableCell>Ödeme Yöntemi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subscriptions.map((subscription) => (
                <TableRow key={subscription.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {subscription.first_name} {subscription.last_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {subscription.user_email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {subscription.plan_name_tr || subscription.plan_name || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(subscription.status)}
                      color={getStatusColor(subscription.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(subscription.start_date), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    {format(new Date(subscription.end_date), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    {subscription.amount_paid ? `₺${parseFloat(subscription.amount_paid).toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>{subscription.payment_method || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
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
      </TableContainer>
    </Box>
  );
}


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
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { 
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  CheckCircle as ResolveIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';
import { supportAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const statusColors = {
  open: 'error',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default',
};

const statusLabels = {
  open: 'Açık',
  in_progress: 'İşlemde',
  resolved: 'Çözüldü',
  closed: 'Kapalı',
};

const priorityColors = {
  low: 'success',
  normal: 'default',
  high: 'warning',
  urgent: 'error',
};

const priorityLabels = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  urgent: 'Acil',
};

const categoryLabels = {
  account: 'Hesap Sorunları',
  technical: 'Teknik Sorunlar',
  privacy: 'Gizlilik ve Güvenlik',
  features: 'Özellikler',
};

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      
      const response = await supportAPI.getAllTickets(params);
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Destek talepleri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await supportAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleViewDetails = (ticket) => {
    setSelectedTicket(ticket);
    setAdminResponse(ticket.admin_response || '');
    setDetailsOpen(true);
  };

  const handleUpdateTicket = async (status) => {
    if (!selectedTicket) return;
    
    try {
      await supportAPI.updateTicket(selectedTicket.id, {
        status,
        admin_response: adminResponse.trim() || undefined,
      });
      
      toast.success('Destek talebi güncellendi');
      setDetailsOpen(false);
      fetchTickets();
      fetchStats();
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Destek talebi güncellenirken hata oluştu');
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Bu destek talebini silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      await supportAPI.deleteTicket(ticketId);
      toast.success('Destek talebi silindi');
      fetchTickets();
      fetchStats();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error('Destek talebi silinirken hata oluştu');
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedTickets = tickets.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Destek Talepleri
      </Typography>

      {/* İstatistikler */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Toplam Talep
                </Typography>
                <Typography variant="h4">{stats.total || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: 3, borderColor: 'error.main' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Açık Talepler
                </Typography>
                <Typography variant="h4" color="error.main">
                  {stats.open || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: 3, borderColor: 'warning.main' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  İşlemde
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {stats.in_progress || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: 3, borderColor: 'success.main' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Çözüldü
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.resolved || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtreler */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Durum</InputLabel>
          <Select
            value={statusFilter}
            label="Durum"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="open">Açık</MenuItem>
            <MenuItem value="in_progress">İşlemde</MenuItem>
            <MenuItem value="resolved">Çözüldü</MenuItem>
            <MenuItem value="closed">Kapalı</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Öncelik</InputLabel>
          <Select
            value={priorityFilter}
            label="Öncelik"
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="low">Düşük</MenuItem>
            <MenuItem value="normal">Normal</MenuItem>
            <MenuItem value="high">Yüksek</MenuItem>
            <MenuItem value="urgent">Acil</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Tablo */}
      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Kullanıcı</TableCell>
                  <TableCell>Kategori</TableCell>
                  <TableCell>Mesaj</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell>Öncelik</TableCell>
                  <TableCell>Tarih</TableCell>
                  <TableCell align="right">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">
                        Destek talebi bulunamadı
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTickets.map((ticket) => (
                    <TableRow key={ticket.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar 
                            src={ticket.user_profile_picture} 
                            alt={ticket.user_name}
                            sx={{ width: 32, height: 32 }}
                          />
                          <Box>
                            <Typography variant="body2">
                              {ticket.user_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {ticket.user_email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={categoryLabels[ticket.category] || ticket.category}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            maxWidth: 300, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {ticket.message}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={statusLabels[ticket.status]}
                          color={statusColors[ticket.status]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={priorityLabels[ticket.priority]}
                          color={priorityColors[ticket.priority]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: tr })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(ticket.created_at), 'HH:mm')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewDetails(ticket)}
                          color="primary"
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteTicket(ticket.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={tickets.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Sayfa başına satır:"
              labelDisplayedRows={({ from, to, count }) => 
                `${from}-${to} / ${count !== -1 ? count : `${to}'den fazla`}`
              }
            />
          </>
        )}
      </TableContainer>

      {/* Detay Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Destek Talebi Detayları
        </DialogTitle>
        <DialogContent>
          {selectedTicket && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar 
                      src={selectedTicket.user_profile_picture}
                      sx={{ width: 56, height: 56 }}
                    />
                    <Box>
                      <Typography variant="h6">
                        {selectedTicket.user_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedTicket.user_email}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Kategori
                  </Typography>
                  <Typography variant="body1">
                    {categoryLabels[selectedTicket.category] || selectedTicket.category}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Tarih
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedTicket.created_at), 'dd MMMM yyyy HH:mm', { locale: tr })}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Durum
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip 
                      label={statusLabels[selectedTicket.status]}
                      color={statusColors[selectedTicket.status]}
                      size="small"
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Öncelik
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip 
                      label={priorityLabels[selectedTicket.priority]}
                      color={priorityColors[selectedTicket.priority]}
                      size="small"
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Kullanıcı Mesajı
                  </Typography>
                  <Paper sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                    <Typography variant="body1">
                      {selectedTicket.message}
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Admin Yanıtı"
                    multiline
                    rows={4}
                    fullWidth
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    placeholder="Kullanıcıya yanıtınızı yazın..."
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            İptal
          </Button>
          <Button 
            onClick={() => handleUpdateTicket('in_progress')}
            color="warning"
            variant="outlined"
          >
            İşleme Al
          </Button>
          <Button 
            onClick={() => handleUpdateTicket('resolved')}
            color="success"
            variant="contained"
          >
            Çözüldü Olarak İşaretle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


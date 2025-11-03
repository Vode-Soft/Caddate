import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TextField,
  Button,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { usersAPI, subscriptionsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);
  const [premiumData, setPremiumData] = useState({
    planId: '',
    durationDays: 30,
    reason: ''
  });
  const [plans, setPlans] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, [page, rowsPerPage, search, filter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll({
        page: page + 1,
        limit: rowsPerPage,
        search,
        filter,
      });
      
      setUsers(response.data.users);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Kullanıcılar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await subscriptionsAPI.getPlans();
      setPlans(response.data.plans);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleMenuClick = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewUser = () => {
    navigate(`/users/${selectedUser.id}`);
    handleMenuClose();
  };

  const handleToggleBan = async () => {
    if (!selectedUser.is_active) {
      // Kullanıcı banlı, aktif et
      try {
        await usersAPI.toggleBan(selectedUser.id, 'Admin tarafından aktif edildi');
        toast.success('Kullanıcı aktif edildi');
        fetchUsers();
      } catch (error) {
        toast.error('Kullanıcı aktif edilirken hata oluştu');
      }
      handleMenuClose();
    } else {
      // Ban dialog aç
      setBanDialogOpen(true);
      handleMenuClose();
    }
  };

  const handleBanConfirm = async () => {
    try {
      await usersAPI.toggleBan(selectedUser.id, banReason);
      toast.success('Kullanıcı banlandı');
      setBanDialogOpen(false);
      setBanReason('');
      fetchUsers();
    } catch (error) {
      toast.error('Kullanıcı banlanırken hata oluştu');
    }
  };

  const handleGivePremium = () => {
    setPremiumData({
      planId: plans[0]?.id || '',
      durationDays: 30,
      reason: ''
    });
    setPremiumDialogOpen(true);
    handleMenuClose();
  };

  const handleRevokePremium = async () => {
    try {
      await subscriptionsAPI.revokePremium({
        userId: selectedUser.id,
        reason: 'Admin tarafından iptal edildi'
      });
      toast.success('Premium üyelik iptal edildi');
      fetchUsers();
    } catch (error) {
      toast.error('Premium üyelik iptal edilirken hata oluştu');
    }
    handleMenuClose();
  };

  const handlePremiumConfirm = async () => {
    try {
      await subscriptionsAPI.givePremium({
        userId: selectedUser.id,
        planId: premiumData.planId,
        durationDays: premiumData.durationDays,
        reason: premiumData.reason
      });
      toast.success('Premium üyelik verildi');
      setPremiumDialogOpen(false);
      setPremiumData({ planId: '', durationDays: 30, reason: '' });
      fetchUsers();
    } catch (error) {
      toast.error('Premium üyelik verilirken hata oluştu');
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(0);
  };

  const handleFilterChange = (event) => {
    setFilter(event.target.value);
    setPage(0);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Kullanıcı Yönetimi
      </Typography>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Email, isim veya soyisim ile ara..."
            value={search}
            onChange={handleSearchChange}
            variant="outlined"
            size="small"
            sx={{ flexGrow: 1, minWidth: 250 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filtre</InputLabel>
            <Select value={filter} onChange={handleFilterChange} label="Filtre">
              <MenuItem value="all">Tümü</MenuItem>
              <MenuItem value="active">Aktif</MenuItem>
              <MenuItem value="premium">Premium</MenuItem>
              <MenuItem value="banned">Banlı</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : users.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {search ? 'Arama sonucu bulunamadı' : 'Henüz kullanıcı yok'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {search 
                ? 'Farklı bir arama terimi deneyin' 
                : 'Kayıtlı kullanıcılar burada görünecek'}
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Kullanıcı</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Premium</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Kayıt Tarihi</TableCell>
                <TableCell align="right">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={user.profile_picture} alt={user.first_name}>
                        {user.first_name?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {user.first_name} {user.last_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {user.id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <Chip label="Aktif" color="success" size="small" />
                    ) : (
                      <Chip label="Banlı" color="error" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_premium ? (
                      <Chip label="Premium" color="warning" size="small" />
                    ) : (
                      <Chip label="Free" variant="outlined" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'User'}
                      color={user.role !== 'user' ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={(e) => handleMenuClick(e, user)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
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

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleViewUser}>
          <VisibilityIcon sx={{ mr: 1 }} />
          Detayları Gör
        </MenuItem>
        <MenuItem onClick={handleToggleBan}>
          {selectedUser?.is_active ? (
            <>
              <BlockIcon sx={{ mr: 1 }} />
              Banla
            </>
          ) : (
            <>
              <CheckCircleIcon sx={{ mr: 1 }} />
              Aktif Et
            </>
          )}
        </MenuItem>
        {selectedUser?.is_premium ? (
          <MenuItem onClick={handleRevokePremium}>
            <StarBorderIcon sx={{ mr: 1 }} />
            Premium İptal Et
          </MenuItem>
        ) : (
          <MenuItem onClick={handleGivePremium}>
            <StarIcon sx={{ mr: 1 }} />
            Premium Ver
          </MenuItem>
        )}
      </Menu>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onClose={() => setBanDialogOpen(false)}>
        <DialogTitle>Kullanıcıyı Banla</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {selectedUser?.first_name} {selectedUser?.last_name} kullanıcısını banlamak istediğinizden emin misiniz?
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Ban Sebebi (Opsiyonel)"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBanDialogOpen(false)}>İptal</Button>
          <Button onClick={handleBanConfirm} variant="contained" color="error">
            Banla
          </Button>
        </DialogActions>
      </Dialog>

      {/* Premium Dialog */}
      <Dialog open={premiumDialogOpen} onClose={() => setPremiumDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Premium Üyelik Ver</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            {selectedUser?.first_name} {selectedUser?.last_name} kullanıcısına premium üyelik vermek istediğinizden emin misiniz?
          </DialogContentText>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Plan Seçin</InputLabel>
            <Select
              value={premiumData.planId}
              onChange={(e) => setPremiumData({ ...premiumData, planId: e.target.value })}
              label="Plan Seçin"
            >
              {plans.map((plan) => (
                <MenuItem key={plan.id} value={plan.id}>
                  {plan.name_tr || plan.name} - ₺{plan.price}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            type="number"
            label="Süre (Gün)"
            value={premiumData.durationDays}
            onChange={(e) => setPremiumData({ ...premiumData, durationDays: parseInt(e.target.value) || 30 })}
            sx={{ mb: 2 }}
            inputProps={{ min: 1, max: 365 }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Sebep (Opsiyonel)"
            value={premiumData.reason}
            onChange={(e) => setPremiumData({ ...premiumData, reason: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPremiumDialogOpen(false)}>İptal</Button>
          <Button onClick={handlePremiumConfirm} variant="contained" color="primary">
            Premium Ver
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


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
} from '@mui/icons-material';
import { usersAPI } from '../services/api';
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
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
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
    </Box>
  );
}


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
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Avatar,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { vehiclesAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, [page, rowsPerPage, filter]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await vehiclesAPI.getAll({
        page: page + 1,
        limit: rowsPerPage,
        filter,
      });
      
      setVehicles(response.data.vehicles);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Araçlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (vehicleId, isVerified) => {
    try {
      await vehiclesAPI.verify(vehicleId, isVerified);
      toast.success(isVerified ? 'Araç onaylandı' : 'Araç onayı kaldırıldı');
      fetchVehicles();
    } catch (error) {
      toast.error('İşlem başarısız oldu');
    }
  };

  const handleDeleteClick = (vehicle) => {
    setSelectedVehicle(vehicle);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await vehiclesAPI.delete(selectedVehicle.id);
      toast.success('Araç silindi');
      setDeleteDialogOpen(false);
      fetchVehicles();
    } catch (error) {
      toast.error('Araç silinirken hata oluştu');
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Araç Yönetimi
      </Typography>

      <Paper sx={{ mb: 3, p: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filtre</InputLabel>
          <Select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
            label="Filtre"
          >
            <MenuItem value="all">Tümü</MenuItem>
            <MenuItem value="verified">Onaylı</MenuItem>
            <MenuItem value="pending">Onay Bekliyor</MenuItem>
          </Select>
        </FormControl>
      </Paper>

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
                <TableCell>Plaka</TableCell>
                <TableCell>Marka/Model</TableCell>
                <TableCell>Yıl</TableCell>
                <TableCell>Renk</TableCell>
                <TableCell>Yakıt</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Kayıt Tarihi</TableCell>
                <TableCell align="right">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        {vehicle.first_name} {vehicle.last_name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {vehicle.plate_number}
                    </Typography>
                  </TableCell>
                  <TableCell>{vehicle.brand} {vehicle.model}</TableCell>
                  <TableCell>{vehicle.year || '-'}</TableCell>
                  <TableCell>{vehicle.color || '-'}</TableCell>
                  <TableCell>{vehicle.fuel_type || '-'}</TableCell>
                  <TableCell>
                    {vehicle.is_verified ? (
                      <Chip label="Onaylı" color="success" size="small" />
                    ) : (
                      <Chip label="Bekliyor" color="warning" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(vehicle.created_at), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => handleVerify(vehicle.id, !vehicle.is_verified)}
                      color={vehicle.is_verified ? 'warning' : 'success'}
                      title={vehicle.is_verified ? 'Onayı Kaldır' : 'Onayla'}
                    >
                      {vehicle.is_verified ? <CancelIcon /> : <CheckCircleIcon />}
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteClick(vehicle)}
                      color="error"
                      title="Sil"
                    >
                      <DeleteIcon />
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

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Aracı Sil</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedVehicle?.brand} {selectedVehicle?.model} ({selectedVehicle?.plate_number}) aracını silmek istediğinizden emin misiniz?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


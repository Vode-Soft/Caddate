import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Avatar,
  Chip,
  Button,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { usersAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

export default function UserDetailsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [securityHistory, setSecurityHistory] = useState([]);
  const [activities, setActivities] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getById(userId);
      const data = response.data;
      
      setUser(data.user);
      setSubscription(data.subscription);
      setVehicles(data.vehicles || []);
      setPhotos(data.photos || []);
      setSecurityHistory(data.securityHistory || []);
      setActivities(data.activities || []);
      setStatistics(data.statistics);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Kullanıcı detayları yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBan = async () => {
    try {
      await usersAPI.toggleBan(userId, user.is_active ? 'Admin tarafından banlandı' : 'Admin tarafından aktif edildi');
      toast.success(user.is_active ? 'Kullanıcı banlandı' : 'Kullanıcı aktif edildi');
      fetchUserDetails();
    } catch (error) {
      toast.error('İşlem başarısız oldu');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography>Kullanıcı bulunamadı</Typography>
        <Button onClick={() => navigate('/users')} sx={{ mt: 2 }}>
          Geri Dön
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/users')}
        sx={{ mb: 2 }}
      >
        Geri Dön
      </Button>

      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Kullanıcı Detayları
      </Typography>

      <Grid container spacing={3}>
        {/* Kullanıcı Bilgileri */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Avatar
                src={user.profile_picture}
                alt={user.first_name}
                sx={{ width: 120, height: 120, margin: '0 auto', mb: 2 }}
              >
                {user.first_name?.charAt(0)}
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {user.first_name} {user.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Durum</Typography>
              {user.is_active ? (
                <Chip label="Aktif" color="success" size="small" sx={{ mt: 0.5 }} />
              ) : (
                <Chip label="Banlı" color="error" size="small" sx={{ mt: 0.5 }} />
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Premium</Typography>
              {user.is_premium ? (
                <Chip label="Premium" color="warning" size="small" sx={{ mt: 0.5 }} />
              ) : (
                <Chip label="Free" variant="outlined" size="small" sx={{ mt: 0.5 }} />
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Rol</Typography>
              <Chip
                label={user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'User'}
                color={user.role !== 'user' ? 'primary' : 'default'}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Kayıt Tarihi</Typography>
              <Typography variant="body1">
                {format(new Date(user.created_at), 'dd/MM/yyyy HH:mm')}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Doğum Tarihi</Typography>
              <Typography variant="body1">
                {user.birth_date ? format(new Date(user.birth_date), 'dd/MM/yyyy') : '-'}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Cinsiyet</Typography>
              <Typography variant="body1">
                {user.gender === 'male' ? 'Erkek' : user.gender === 'female' ? 'Kadın' : user.gender || '-'}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Button
              fullWidth
              variant={user.is_active ? 'outlined' : 'contained'}
              color={user.is_active ? 'error' : 'success'}
              startIcon={user.is_active ? <BlockIcon /> : <CheckCircleIcon />}
              onClick={handleToggleBan}
              sx={{ mb: 1 }}
            >
              {user.is_active ? 'Banla' : 'Aktif Et'}
            </Button>
          </Paper>
        </Grid>

        {/* Sağ Kolon */}
        <Grid item xs={12} md={8}>
          {/* İstatistikler */}
          {statistics && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Kullanıcı İstatistikleri
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#e3f2fd', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {statistics.messages.sent}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Gönderilen Mesaj</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f3e5f5', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                      {statistics.messages.received}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Alınan Mesaj</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#e8f5e9', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {statistics.friendships.friends}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Arkadaş</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#fff3e0', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                      {statistics.profileVisits}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Profil Ziyareti</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Aktiviteler */}
          {activities.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Son Aktiviteler ({activities.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                {activities.slice(0, 10).map((activity) => (
                  <Box key={activity.id} sx={{ 
                    p: 2, 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: 1,
                    borderLeft: '3px solid',
                    borderLeftColor: 'primary.main'
                  }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {activity.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(activity.created_at), 'dd/MM/yyyy HH:mm')}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
          {/* Abonelik Bilgileri */}
          {subscription && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Abonelik Bilgileri
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Plan</Typography>
                  <Typography variant="body1">{subscription.name_tr || subscription.name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Durum</Typography>
                  <Chip label={subscription.status} color="success" size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Başlangıç</Typography>
                  <Typography variant="body1">
                    {format(new Date(subscription.start_date), 'dd/MM/yyyy')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Bitiş</Typography>
                  <Typography variant="body1">
                    {format(new Date(subscription.end_date), 'dd/MM/yyyy')}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Araçlar */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Araçlar ({vehicles.length})
            </Typography>
            {vehicles.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {vehicles.map((vehicle) => (
                  <Card key={vehicle.id} variant="outlined">
                    <CardContent>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {vehicle.brand} {vehicle.model}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Plaka: {vehicle.plate_number}
                      </Typography>
                      <Chip
                        label={vehicle.is_verified ? 'Onaylı' : 'Bekliyor'}
                        color={vehicle.is_verified ? 'success' : 'warning'}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">Kayıtlı araç yok</Typography>
            )}
          </Paper>

          {/* Fotoğraflar */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Fotoğraflar ({photos.length})
            </Typography>
            {photos.length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 2 }}>
                {photos.map((photo) => (
                  <Box
                    key={photo.id}
                    component="img"
                    src={`http://localhost:3000${photo.photo_url}`}
                    alt="User photo"
                    sx={{
                      width: '100%',
                      height: 150,
                      objectFit: 'cover',
                      borderRadius: 1,
                    }}
                  />
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">Fotoğraf yok</Typography>
            )}
          </Paper>

          {/* Güvenlik Geçmişi */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Güvenlik Geçmişi (Son 20)
            </Typography>
            {securityHistory.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Aktivite</TableCell>
                      <TableCell>Açıklama</TableCell>
                      <TableCell>Tarih</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {securityHistory.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{event.activity_type}</TableCell>
                        <TableCell>{event.description}</TableCell>
                        <TableCell>
                          {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary">Güvenlik olayı yok</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

